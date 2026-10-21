import axios from 'axios';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { prisma } from '../lib/prisma.js';
import authRouter from '../routes/auth.routes.js';
import emailRouter from '../routes/email.routes.js';
import senderRouter from '../routes/sender.routes.js';
import { setupBullBoard } from '../config/bullBoard.js';
import { emailQueue } from '../queues/email.queue.js';
import { emailWorker } from '../queues/email.worker.js';
import { SmtpService } from '../services/smtp.service.js';
import { getRedisClient, checkRedisHealth } from '../config/redis.js';

async function runApiVerificationSuite() {
  console.log('[TEST] Starting Phase 7 (Bull-Board & Express API Endpoints) Verification Suite...\n');

  // Verify Redis connectivity
  const redisHealthy = await checkRedisHealth();
  if (!redisHealthy) {
    throw new Error('Redis is not accessible on port 6379.');
  }

  // Setup test Express app with exact routes
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/admin/queues', setupBullBoard());
  app.use('/api/auth', authRouter);
  app.use('/api/senders', senderRouter);
  app.use('/api/emails', emailRouter);

  const PORT = 5057;
  const baseUrl = `http://127.0.0.1:${PORT}`;
  let server: http.Server | null = null;
  let testUserId = '';
  let authToken = '';
  let senderId = '';

  try {
    server = app.listen(PORT, '127.0.0.1');
    console.log(`   [INFO] Test server listening on ${baseUrl}\n`);

    // =========================================================================
    // 7.1 Authentication Endpoints (POST /api/auth/google, POST /api/auth/demo, GET /api/auth/me)
    // =========================================================================
    console.log('[STEP] [7.1] Testing Authentication Endpoints...');

    // 1. Test Demo Login
    const demoRes = await axios.post(`${baseUrl}/api/auth/demo`);
    console.log('   Demo login response status:', demoRes.status);
    if (!demoRes.data.success || !demoRes.data.token) {
      throw new Error('POST /api/auth/demo failed');
    }
    console.log(`   [PASS] Demo login succeeded (User: ${demoRes.data.user.email})`);

    // 2. Test Google ID Token Verification Endpoint (using dev mock token)
    const testEmail = `founder-${Date.now()}@startup.io`;
    const googleRes = await axios.post(`${baseUrl}/api/auth/google`, {
      credential: `mock-google-token:${testEmail}:Alex Founder`,
    });

    console.log('   Google auth response status:', googleRes.status);
    if (!googleRes.data.success || !googleRes.data.token || googleRes.data.user.email !== testEmail) {
      throw new Error('POST /api/auth/google failed');
    }
    testUserId = googleRes.data.user.id;
    authToken = googleRes.data.token;
    console.log(`   [PASS] Google auth endpoint verified: issued session token for ${testEmail}`);

    // 3. Test GET /api/auth/me with Bearer token
    const meRes = await axios.get(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!meRes.data.success || meRes.data.user.id !== testUserId) {
      throw new Error('GET /api/auth/me failed');
    }
    console.log(`   [PASS] GET /api/auth/me returned authenticated user profile\n`);

    // =========================================================================
    // 7.6 Sender Accounts Endpoint (POST & GET /api/senders)
    // =========================================================================
    console.log('[STEP] [7.6] Testing Sender Accounts Endpoints...');

    // Auto-provision an Ethereal sender account
    const createSenderRes = await axios.post(
      `${baseUrl}/api/senders`,
      {
        type: 'ethereal',
        name: 'Primary Outbound Mailer',
        hourlyLimit: 50,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (!createSenderRes.data.success || !createSenderRes.data.data.id) {
      throw new Error('POST /api/senders failed');
    }
    senderId = createSenderRes.data.data.id;
    console.log(`   [PASS] Provisioned sender: ${createSenderRes.data.data.email} (${createSenderRes.data.data.name})`);

    // List senders
    const listSendersRes = await axios.get(`${baseUrl}/api/senders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!listSendersRes.data.success || listSendersRes.data.data.length === 0) {
      throw new Error('GET /api/senders failed to return sender accounts');
    }
    console.log(`   [PASS] GET /api/senders returned ${listSendersRes.data.data.length} registered sender account(s)\n`);

    // =========================================================================
    // 7.2 Email Scheduling Endpoint with CSV Lead Ingestion (POST /api/emails/schedule)
    // =========================================================================
    console.log('[STEP] [7.2] Testing Email Scheduling Endpoint with CSV Leads...');
    const rawCsvLeads = `
email,name,company
lead.alpha@example.com,Lead Alpha,AlphaCorp
lead.beta@example.com,Lead Beta,BetaLLC
lead.gamma@example.com,Lead Gamma,GammaTech
invalid-lead-syntax-omitted
`;

    const scheduleRes = await axios.post(
      `${baseUrl}/api/emails/schedule`,
      {
        subject: 'Phase 7 API Launch Announcement',
        body: 'Welcome to our automated outreach engine.',
        csvContent: rawCsvLeads,
        startTime: new Date(Date.now() + 60000).toISOString(), // 1 minute in future
        interEmailDelayMs: 1500,
        hourlyLimit: 50,
        senderId,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('   Schedule response:', {
      success: scheduleRes.data.success,
      totalLeads: scheduleRes.data.totalLeads,
      invalidCount: scheduleRes.data.invalidCount,
      staggerDelayMs: scheduleRes.data.staggerDelayMs,
    });

    if (!scheduleRes.data.success || scheduleRes.data.totalLeads !== 3 || scheduleRes.data.invalidCount !== 1) {
      throw new Error('POST /api/emails/schedule failed or parsed leads incorrectly');
    }
    console.log('   [PASS] Batch CSV parsing, DB persistence, and BullMQ enqueuing verified\n');

    // =========================================================================
    // 7.3 Scheduled Emails Endpoint (GET /api/emails/scheduled)
    // =========================================================================
    console.log('[STEP] [7.3] Testing Scheduled Emails Endpoint...');
    const scheduledRes = await axios.get(`${baseUrl}/api/emails/scheduled?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log(`   Scheduled jobs count: ${scheduledRes.data.total}`);
    if (!scheduledRes.data.success || scheduledRes.data.total < 3) {
      throw new Error('GET /api/emails/scheduled did not return scheduled jobs');
    }
    console.log(`   [PASS] GET /api/emails/scheduled returned ${scheduledRes.data.data.length} upcoming jobs with sender details\n`);

    // =========================================================================
    // 7.5 Stats Endpoint (GET /api/emails/stats)
    // =========================================================================
    console.log('[STEP] [7.5] Testing Stats Endpoint...');
    const statsRes = await axios.get(`${baseUrl}/api/emails/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log('   Email statistics:', statsRes.data.stats);
    if (!statsRes.data.success || statsRes.data.stats.scheduled < 3) {
      throw new Error('GET /api/emails/stats returned invalid statistics');
    }
    console.log('   [PASS] GET /api/emails/stats returned aggregate counts\n');

    // =========================================================================
    // 7.4 Sent Emails Endpoint (GET /api/emails/sent)
    // =========================================================================
    console.log('[STEP] [7.4] Testing Sent Emails Endpoint...');
    // Seed one delivered job with an Ethereal preview link
    await prisma.emailJob.create({
      data: {
        idempotencyKey: `idemp-sent-${Date.now()}`,
        userId: testUserId,
        senderId,
        recipientEmail: 'delivered.client@test.local',
        subject: 'Delivered Email Confirmation',
        body: 'This email was delivered.',
        scheduledAt: new Date(Date.now() - 30000),
        sentAt: new Date(),
        status: 'SENT',
        etherealMessageUrl: 'https://ethereal.email/message/test-delivered-url',
      },
    });

    const sentRes = await axios.get(`${baseUrl}/api/emails/sent?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    console.log(`   Sent jobs count: ${sentRes.data.total}`);
    if (!sentRes.data.success || sentRes.data.total === 0 || !sentRes.data.data[0].etherealMessageUrl) {
      throw new Error('GET /api/emails/sent failed or missing etherealMessageUrl');
    }
    console.log(`   [PASS] GET /api/emails/sent returned delivered jobs with preview URL: ${sentRes.data.data[0].etherealMessageUrl}\n`);

    // =========================================================================
    // 7.7 Bull-Board UI Dashboard Route (GET /admin/queues)
    // =========================================================================
    console.log('[STEP] [7.7] Testing Bull-Board Dashboard UI Route (GET /admin/queues)...');
    const bullBoardRes = await axios.get(`${baseUrl}/admin/queues/`);
    console.log('   Bull-Board HTTP Status:', bullBoardRes.status);
    console.log('   Content-Type:', bullBoardRes.headers['content-type']);

    if (bullBoardRes.status !== 200 || (!bullBoardRes.data.includes('BullMQ') && !bullBoardRes.data.includes('queue'))) {
      throw new Error('GET /admin/queues did not return Bull-Board dashboard HTML');
    }
    console.log('   [PASS] Bull-Board dashboard UI accessible and mounted at /admin/queues\n');

  } finally {
    console.log('[CLEANUP] Cleaning up test records and stopping test server...');
    if (server) {
      server.close();
    }

    try {
      if (testUserId) {
        await prisma.emailJob.deleteMany({ where: { userId: testUserId } });
        await prisma.senderAccount.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => null);
      }

      SmtpService.closeAllTransporters();
      await emailWorker.close();
      await emailQueue.close();
      await getRedisClient().quit();
      await prisma.$disconnect();
    } catch (cleanupErr: any) {
      console.warn('Cleanup note:', cleanupErr.message);
    }
  }

  console.log('[SUCCESS] ALL PHASE 7 SUBTASKS VERIFIED SUCCESSFULLY!\n');
}

runApiVerificationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FAIL] Phase 7 Verification Failed:', err);
    process.exit(1);
  });
