import http from 'http';
import { SlackService } from '../services/slack.service.js';
import { prisma } from '../lib/prisma.js';

async function runPhase4Verification() {
  console.log(' Starting Phase 4 (Slack OAuth & Live Alerting) Verification Suite...\n');

  // Test 4.1: Authorization URL Generation
  console.log(' [4.1] Testing Slack OAuth Authorization URL...');
  const testUserId = `phase4-user-${Date.now()}`;
  const authUrl = SlackService.getAuthorizationUrl(testUserId);
  console.log('   Generated Auth URL:', authUrl);

  if (
    !authUrl.includes('https://slack.com/oauth/v2/authorize') ||
    !authUrl.includes('incoming-webhook') ||
    !authUrl.includes('chat%3Awrite') ||
    !authUrl.includes(testUserId)
  ) {
    throw new Error('Authorization URL did not contain expected scopes and state');
  }
  console.log('    Slack OAuth authorization URL properly formed with required scopes');

  // Create test user in DB
  const user = await prisma.user.create({
    data: {
      id: testUserId,
      email: `${testUserId}@reachinbox.local`,
      name: 'Slack Integration Tester',
    },
  });

  // Test 4.5: Graceful Fallback (When Slack is NOT connected)
  console.log('\n [4.5] Testing Graceful Fallback (User has no Slack connected)...');
  const fallbackResult = await SlackService.sendRateLimitAlert(user.id, {
    senderId: 'demo-sender',
    senderEmail: 'demo-sender@test.local',
    currentCount: 50,
    hourlyLimit: 50,
    rescheduledTo: new Date(Date.now() + 3600000),
  });

  console.log(`   Fallback alert result: ${fallbackResult}`);
  if (fallbackResult !== false) {
    throw new Error('Expected sendRateLimitAlert to gracefully return false when disconnected');
  }
  console.log('    Graceful fallback verified: logged cleanly without exceptions or crashes');

  // Test 4.2 & 4.3: Integration Persistence, Status & Disconnect
  console.log('\n [4.2 & 4.3] Testing SlackIntegration DB Persistence, Status & Disconnect...');

  // Setup a lightweight mock Slack incoming webhook HTTP receiver
  let receivedPayload: any = null;
  const mockSlackServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        receivedPayload = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      } catch (e) {
        res.writeHead(400);
        res.end('bad json');
      }
    });
  });

  const mockPort = 5055;
  await new Promise<void>((resolve) => {
    mockSlackServer.listen(mockPort, '127.0.0.1', () => resolve());
  });
  console.log(`   Mock Slack webhook receiver listening on http://127.0.0.1:${mockPort}`);

  const mockWebhookUrl = `http://127.0.0.1:${mockPort}/webhook`;

  // Simulate OAuth connection completion by inserting record
  await prisma.slackIntegration.create({
    data: {
      userId: user.id,
      accessToken: 'xoxb-mock-access-token-12345',
      channelId: 'C12345678',
      channelName: 'alerts-rate-limits',
      incomingWebhookUrl: mockWebhookUrl,
      slackTeamId: 'T12345678',
    },
  });

  // Verify status endpoint
  const status = await SlackService.getStatus(user.id);
  console.log('   Retrieved Slack status:', status);
  if (!status.connected || status.channelName !== 'alerts-rate-limits') {
    throw new Error('Slack status did not reflect active connection');
  }
  console.log('    Slack status correctly reflects active integration and target channel');

  // Test 4.4: Real-Time Rate Limit Alert Dispatcher
  console.log('\n [4.4] Testing Live Rate Limit Alert Dispatcher...');
  const rescheduledTime = new Date(Date.now() + 3600000);

  const dispatchResult = await SlackService.sendRateLimitAlert(user.id, {
    senderId: 'phase4-sender',
    senderEmail: 'marketing@reachinbox.local',
    currentCount: 50,
    hourlyLimit: 50,
    rescheduledTo: rescheduledTime,
  });

  console.log(`   Alert dispatch result: ${dispatchResult}`);
  if (!dispatchResult) {
    throw new Error('Expected sendRateLimitAlert to deliver successfully to webhook');
  }

  // Inspect received Slack payload structure
  console.log('   Received Slack Block Kit payload:', JSON.stringify(receivedPayload, null, 2));
  if (
    !receivedPayload ||
    !receivedPayload.blocks ||
    !receivedPayload.text.includes('Rate Limit Alert')
  ) {
    throw new Error('Slack payload missing expected Block Kit formatting');
  }
  console.log('    Live formatted Slack Block Kit alert successfully received by webhook');

  // Test Disconnect
  console.log('\n Testing Disconnect Flow...');
  const disconnectResult = await SlackService.disconnect(user.id);
  console.log('   Disconnect result:', disconnectResult);

  const postDisconnectStatus = await SlackService.getStatus(user.id);
  console.log('   Status after disconnect:', postDisconnectStatus);
  if (postDisconnectStatus.connected) {
    throw new Error('Expected Slack to be disconnected');
  }
  console.log('    Slack integration cleanly disconnected');

  // Cleanup
  console.log('\n Cleaning up test user...');
  await prisma.user.delete({ where: { id: user.id } });
  await new Promise<void>((resolve) => mockSlackServer.close(() => resolve()));
  await prisma.$disconnect();

  console.log('\n ALL PHASE 4 SUBTASKS VERIFIED SUCCESSFULLY!');
}

runPhase4Verification().catch((err) => {
  console.error('\n Phase 4 Verification Failed:', err);
  process.exit(1);
});
