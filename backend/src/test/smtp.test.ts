import { prisma } from '../lib/prisma.js';
import { SmtpService } from '../services/smtp.service.js';
import { enqueueEmailJob, emailQueue } from '../queues/email.queue.js';
import { emailWorker } from '../queues/email.worker.js';
import { checkRedisHealth, getRedisClient } from '../config/redis.js';

async function runSmtpVerificationSuite() {
  console.log('🧪 Starting Phase 5 (Multi-Sender SMTP Dispatcher & Ethereal) Verification Suite...\n');

  // Verify Redis connectivity first
  const redisHealthy = await checkRedisHealth();
  if (!redisHealthy) {
    throw new Error('Redis is not accessible. Please ensure Redis server is running on port 6379.');
  }

  const testUserId = `phase5-test-user-${Date.now()}`;
  let sender1: any = null;
  let sender2: any = null;
  let faultySender: any = null;

  try {
    // 0. Setup test user
    console.log('👉 [Setup] Creating transient test User...');
    const user = await prisma.user.create({
      data: {
        id: testUserId,
        email: `tester-${Date.now()}@reachinbox.local`,
        name: 'Phase 5 Tester',
      },
    });
    console.log(`   User created: ${user.id} (${user.email})\n`);

    // =========================================================================
    // 5.1 Nodemailer Transporter & Ethereal Auto-Provisioning
    // =========================================================================
    console.log('👉 [5.1] Testing Nodemailer Transporter with Real Ethereal SMTP Provisioning...');
    sender1 = await SmtpService.provisionEtherealAccount(user.id, 'Ethereal Test Sender Alpha');
    console.log(`   ✅ Sender 1 provisioned on Ethereal: ${sender1.email} (Host: ${sender1.host}:${sender1.port})`);

    const isSender1Healthy = await SmtpService.verifySenderConnection(sender1.id);
    if (!isSender1Healthy) {
      throw new Error('SMTP connection verification failed for Sender 1');
    }
    console.log('   ✅ Sender 1 SMTP connection verified with active connection pool\n');

    // =========================================================================
    // 5.2 Multi-Sender Rotation
    // =========================================================================
    console.log('👉 [5.2] Testing Multi-Sender Rotation & Recipient Distribution...');
    sender2 = await SmtpService.provisionEtherealAccount(user.id, 'Ethereal Test Sender Beta');
    console.log(`   ✅ Sender 2 provisioned on Ethereal: ${sender2.email}`);

    // Test Round-Robin User Selection
    const firstSelected = await SmtpService.getNextSenderForUser(user.id);
    const secondSelected = await SmtpService.getNextSenderForUser(user.id);
    const thirdSelected = await SmtpService.getNextSenderForUser(user.id);

    console.log(`   Round-Robin Sequence: [1] ${firstSelected.name} -> [2] ${secondSelected.name} -> [3] ${thirdSelected.name}`);
    if (firstSelected.id === secondSelected.id || firstSelected.id !== thirdSelected.id) {
      throw new Error('Round-robin rotation did not cycle sender accounts alternately.');
    }
    console.log('   ✅ Multi-sender user round-robin selection verified');

    // Test Batch Distribution
    const leads = ['leadA@test.com', 'leadB@test.com', 'leadC@test.com', 'leadD@test.com'];
    const distribution = SmtpService.distributeRecipientsAcrossSenders([sender1, sender2], leads);
    console.log('   Recipient batch distribution:');
    distribution.forEach((item, idx) => {
      console.log(`     Lead ${idx + 1} (${item.recipientEmail}) -> Sender: ${item.sender.name}`);
    });

    if (
      distribution[0].sender.id !== sender1.id ||
      distribution[1].sender.id !== sender2.id ||
      distribution[2].sender.id !== sender1.id ||
      distribution[3].sender.id !== sender2.id
    ) {
      throw new Error('Batch recipient distribution did not alternate senders correctly.');
    }
    console.log('   ✅ Multi-sender batch lead distribution verified\n');

    // =========================================================================
    // 5.3 Direct SMTP Dispatch & Ethereal Test Message URL Capture
    // =========================================================================
    console.log('👉 [5.3] Testing Direct SMTP Send & Ethereal Message URL Capture...');
    const directResult = await SmtpService.sendMailWithSender({
      senderId: sender1.id,
      to: 'recipient-direct@example.com',
      subject: 'Phase 5 Direct Ethereal Delivery',
      body: 'Hello! This email validates live Ethereal SMTP delivery and preview URL capture.',
    });

    console.log(`   Message ID: ${directResult.messageId}`);
    console.log(`   Ethereal Preview URL: ${directResult.previewUrl}`);

    if (!directResult.previewUrl || !directResult.previewUrl.includes('ethereal.email')) {
      throw new Error(`Invalid or missing Ethereal preview URL: ${directResult.previewUrl}`);
    }
    console.log('   ✅ Direct Ethereal SMTP dispatch succeeded and preview URL captured\n');

    // =========================================================================
    // 5.3 (Worker Integration) Full BullMQ Worker End-to-End Processing
    // =========================================================================
    console.log('👉 [5.3 Worker Integration] Testing BullMQ Worker End-to-End Processing...');
    const queueJobId = `phase5-queue-job-${Date.now()}`;

    // Create EmailJob record in PostgreSQL
    const emailJobRecord = await prisma.emailJob.create({
      data: {
        id: queueJobId,
        idempotencyKey: `idemp-phase5-${Date.now()}`,
        userId: user.id,
        senderId: sender2.id,
        recipientEmail: 'queue-lead@example.com',
        subject: 'BullMQ Queue Dispatch Test',
        body: 'Email dispatched through BullMQ worker with full Nodemailer Ethereal transport.',
        scheduledAt: new Date(),
        status: 'PENDING',
      },
    });

    console.log(`   Created DB EmailJob ${emailJobRecord.id} with status PENDING`);

    // Enqueue into BullMQ with minimal delay
    await enqueueEmailJob({
      jobId: emailJobRecord.id,
      idempotencyKey: emailJobRecord.idempotencyKey,
      userId: user.id,
      senderId: sender2.id,
      recipientEmail: emailJobRecord.recipientEmail,
      subject: emailJobRecord.subject,
      body: emailJobRecord.body,
      scheduledAt: emailJobRecord.scheduledAt.toISOString(),
      hourlyLimit: 50,
      interEmailDelayMs: 100, // Small delay for quick test
    });

    console.log('   Enqueued job into BullMQ. Waiting for worker to process...');

    // Wait up to 15 seconds for worker to process
    let processedJob: any = null;
    const startTime = Date.now();
    while (Date.now() - startTime < 15000) {
      processedJob = await prisma.emailJob.findUnique({
        where: { id: queueJobId },
      });
      if (processedJob && (processedJob.status === 'SENT' || processedJob.status === 'FAILED')) {
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`   Final DB Status: ${processedJob?.status}`);
    console.log(`   Sent At: ${processedJob?.sentAt?.toISOString()}`);
    console.log(`   Ethereal Message URL in DB: ${processedJob?.etherealMessageUrl}`);

    if (processedJob?.status !== 'SENT') {
      throw new Error(`Worker did not mark job as SENT. Current status: ${processedJob?.status}`);
    }
    if (!processedJob.etherealMessageUrl || !processedJob.etherealMessageUrl.includes('ethereal.email')) {
      throw new Error('Ethereal preview URL was not stored in EmailJob record.');
    }
    console.log('   ✅ End-to-end BullMQ worker execution verified with database persistence\n');

    // =========================================================================
    // 5.4 Delivery Error Handling
    // =========================================================================
    console.log('👉 [5.4] Testing Delivery Error Handling & Failure Logging...');
    faultySender = await prisma.senderAccount.create({
      data: {
        userId: user.id,
        name: 'Faulty SMTP Account',
        email: 'broken@example.com',
        host: 'smtp.ethereal.email',
        port: 587,
        username: 'invalid-user-for-testing',
        password: 'invalid-password-12345',
        hourlyLimit: 50,
      },
    });

    const failedJobId = `phase5-failed-job-${Date.now()}`;
    await prisma.emailJob.create({
      data: {
        id: failedJobId,
        idempotencyKey: `idemp-failed-${Date.now()}`,
        userId: user.id,
        senderId: faultySender.id,
        recipientEmail: 'broken-lead@example.com',
        subject: 'Failing Email Test',
        body: 'This should fail gracefully.',
        scheduledAt: new Date(),
        status: 'PENDING',
      },
    });

    // Enqueue faulty job
    await enqueueEmailJob({
      jobId: failedJobId,
      idempotencyKey: `idemp-failed-${Date.now()}`,
      userId: user.id,
      senderId: faultySender.id,
      recipientEmail: 'broken-lead@example.com',
      subject: 'Failing Email Test',
      body: 'This should fail gracefully.',
      scheduledAt: new Date().toISOString(),
      hourlyLimit: 50,
      interEmailDelayMs: 0,
    });

    // Wait for failure handling
    let failedJobRecord: any = null;
    const failStart = Date.now();
    while (Date.now() - failStart < 15000) {
      failedJobRecord = await prisma.emailJob.findUnique({
        where: { id: failedJobId },
      });
      if (failedJobRecord && failedJobRecord.status === 'FAILED') {
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`   Faulty Job DB Status: ${failedJobRecord?.status}`);
    console.log(`   Captured Error Message: ${failedJobRecord?.errorMessage}`);

    if (failedJobRecord?.status !== 'FAILED') {
      throw new Error(`Faulty job was not marked as FAILED. Status: ${failedJobRecord?.status}`);
    }
    if (!failedJobRecord?.errorMessage) {
      throw new Error('Error message was not captured in EmailJob record.');
    }
    console.log('   ✅ Delivery error captured and logged cleanly to database without crashing\n');

  } finally {
    // Teardown
    console.log('🧹 Cleaning up test records and shutting down connections...');
    try {
      await prisma.emailJob.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.senderAccount.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      }).catch(() => null);

      SmtpService.closeAllTransporters();
      await emailWorker.close();
      await emailQueue.close();
      await getRedisClient().quit();
      await prisma.$disconnect();
    } catch (cleanupErr: any) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log('🎉 ALL PHASE 5 SUBTASKS VERIFIED SUCCESSFULLY!\n');
}

runSmtpVerificationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Phase 5 Verification Failed:', err);
    process.exit(1);
  });
