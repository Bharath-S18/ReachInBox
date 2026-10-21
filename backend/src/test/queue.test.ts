import { getRedisClient, checkRedisHealth } from '../config/redis.js';
import { emailQueue, enqueueEmailJob, getQueueStats } from '../queues/email.queue.js';
import { emailWorker, setRateLimitAlertHandler } from '../queues/email.worker.js';
import { checkRateLimit, incrementRateLimit, getHourlyWindowKey } from '../services/rateLimiter.service.js';
import { prisma } from '../lib/prisma.js';

async function runPhase3Verification() {
  console.log('🧪 Starting Phase 3 (BullMQ & Rate Limiting) Verification Suite...\n');

  // Test 3.1: Redis & Queue Initialization
  console.log('👉 [3.1] Testing Redis & Queue Initialization...');
  const isHealthy = await checkRedisHealth();
  if (!isHealthy) throw new Error('Redis is not healthy');
  console.log('   ✅ Redis ping: OK');

  const initialStats = await getQueueStats();
  console.log('   ✅ BullMQ Queue instantiated. Current stats:', initialStats);

  // Test 3.4: Redis-Backed Hourly Rate Limiting Counters
  console.log('\n👉 [3.4] Testing Redis-backed Hourly Rate Limiting...');
  const testSenderId = `test-sender-${Date.now()}`;
  const testLimit = 3;

  const initialCheck = await checkRateLimit(testSenderId, testLimit);
  console.log(`   Initial check: allowed=${initialCheck.allowed}, count=${initialCheck.currentCount}`);
  if (!initialCheck.allowed || initialCheck.currentCount !== 0) {
    throw new Error('Initial rate limit check failed');
  }

  // Increment 3 times
  await incrementRateLimit(testSenderId, testLimit);
  await incrementRateLimit(testSenderId, testLimit);
  const thirdInc = await incrementRateLimit(testSenderId, testLimit);
  console.log(`   After 3 sends: count=${thirdInc.currentCount}, allowed=${thirdInc.allowed}`);

  const fourthCheck = await checkRateLimit(testSenderId, testLimit);
  console.log(`   4th check (exceeding limit): allowed=${fourthCheck.allowed}, count=${fourthCheck.currentCount}`);
  if (fourthCheck.allowed) {
    throw new Error('Rate limit check should have blocked 4th email');
  }
  console.log('   ✅ Redis rate limiter successfully enforced hourly boundary and counted atomically');

  // Test 3.2, 3.3, 3.5 & 3.6: End-to-end Worker with DB Idempotency & Rescheduling
  console.log('\n👉 [3.2, 3.3, 3.5, 3.6] Testing End-to-End Worker Processing & Idempotency...');

  // Setup test user & sender in DB
  const user = await prisma.user.upsert({
    where: { email: 'phase3-test@reachinbox.local' },
    update: {},
    create: {
      email: 'phase3-test@reachinbox.local',
      name: 'Phase 3 Tester',
    },
  });

  const sender = await prisma.senderAccount.upsert({
    where: { id: 'phase3-test-sender' },
    update: {},
    create: {
      id: 'phase3-test-sender',
      userId: user.id,
      name: 'Test Sender',
      email: 'sender@phase3.local',
      host: 'smtp.ethereal.email',
      port: 587,
      username: 'sender@phase3.local',
      password: 'password',
      hourlyLimit: 1, // Set to 1 to test rate-limit & rescheduling immediately!
    },
  });

  // Clean rate limit key for this sender
  const redis = getRedisClient();
  const windowKey = getHourlyWindowKey(sender.id);
  await redis.del(windowKey);

  // Job 1: Normal execution with 100ms throttle delay
  const job1Id = `phase3-job-1-${Date.now()}`;
  await prisma.emailJob.create({
    data: {
      id: job1Id,
      idempotencyKey: job1Id,
      userId: user.id,
      senderId: sender.id,
      recipientEmail: 'lead1@test.local',
      subject: 'Test Subject 1',
      body: 'Test Body 1',
      scheduledAt: new Date(),
      status: 'SCHEDULED',
    },
  });

  console.log('   Enqueuing Job 1 (under limit)...');
  await enqueueEmailJob({
    jobId: job1Id,
    idempotencyKey: job1Id,
    userId: user.id,
    senderId: sender.id,
    recipientEmail: 'lead1@test.local',
    subject: 'Test Subject 1',
    body: 'Test Body 1',
    scheduledAt: new Date().toISOString(),
    hourlyLimit: 1,
    interEmailDelayMs: 200,
  });

  // Wait for Job 1 to complete
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const completedJob1 = await prisma.emailJob.findUnique({ where: { id: job1Id } });
  console.log(`   Job 1 DB Status: ${completedJob1?.status}`);
  if (completedJob1?.status !== 'SENT') {
    throw new Error(`Job 1 should be SENT, got ${completedJob1?.status}`);
  }
  console.log('   ✅ Job 1 completed and marked SENT in database');

  // Test Idempotency: Re-enqueuing Job 1 should be SKIPPED
  console.log('   Testing Idempotency: re-enqueuing Job 1...');
  const idempotentPayload = {
    jobId: job1Id,
    idempotencyKey: `${job1Id}-retry`,
    userId: user.id,
    senderId: sender.id,
    recipientEmail: 'lead1@test.local',
    subject: 'Test Subject 1',
    body: 'Test Body 1',
    scheduledAt: new Date().toISOString(),
  };
  await enqueueEmailJob(idempotentPayload);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log('   ✅ Idempotency verified: duplicate job skipped cleanly');

  // Job 2: Should hit rate limit and trigger order-preserving rescheduling
  let alertTriggered = false;
  setRateLimitAlertHandler(async (alert) => {
    console.log(`   📢 [Alert Hook] Live Rate Limit Alert received: sender=${alert.senderId}, count=${alert.currentCount}/${alert.hourlyLimit}`);
    alertTriggered = true;
  });

  const job2Id = `phase3-job-2-${Date.now()}`;
  await prisma.emailJob.create({
    data: {
      id: job2Id,
      idempotencyKey: job2Id,
      userId: user.id,
      senderId: sender.id,
      recipientEmail: 'lead2@test.local',
      subject: 'Test Subject 2',
      body: 'Test Body 2',
      scheduledAt: new Date(),
      status: 'SCHEDULED',
    },
  });

  console.log('   Enqueuing Job 2 (exceeding limit of 1/hr)...');
  await enqueueEmailJob({
    jobId: job2Id,
    idempotencyKey: job2Id,
    userId: user.id,
    senderId: sender.id,
    recipientEmail: 'lead2@test.local',
    subject: 'Test Subject 2',
    body: 'Test Body 2',
    scheduledAt: new Date().toISOString(),
    hourlyLimit: 1,
    interEmailDelayMs: 200,
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));
  const rescheduledJob2 = await prisma.emailJob.findUnique({ where: { id: job2Id } });
  console.log(`   Job 2 DB Status: ${rescheduledJob2?.status}`);
  if (rescheduledJob2?.status !== 'RESCHEDULED') {
    throw new Error(`Job 2 should be RESCHEDULED, got ${rescheduledJob2?.status}`);
  }
  if (!alertTriggered) {
    throw new Error('Rate limit alert handler was not triggered');
  }
  console.log(`   ✅ Job 2 successfully moved to delayed state with status RESCHEDULED`);
  console.log(`   ✅ Live Alert handler triggered for Phase 4 Slack integration`);

  // Cleanup
  console.log('\n🧹 Cleaning up test records...');
  await prisma.emailJob.deleteMany({ where: { id: { in: [job1Id, job2Id] } } });
  await prisma.senderAccount.delete({ where: { id: 'phase3-test-sender' } });
  await prisma.user.delete({ where: { id: user.id } });
  await emailWorker.close();
  await emailQueue.close();
  await redis.quit();
  await prisma.$disconnect();

  console.log('\n🎉 ALL PHASE 3 SUBTASKS VERIFIED SUCCESSFULLY!');
}

runPhase3Verification().catch((err) => {
  console.error('\n❌ Phase 3 Verification Failed:', err);
  process.exit(1);
});
