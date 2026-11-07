import axios from 'axios';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import draftRouter from '../routes/draft.routes.js';
import authRouter from '../routes/auth.routes.js';

async function runDraftsTest() {
  console.log('[TEST] Starting Drafts & OAuth Security Test Suite...\n');

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/drafts', draftRouter);

  const PORT = 5059;
  const baseUrl = `http://127.0.0.1:${PORT}`;
  let server: http.Server | null = null;

  let userA: any = null;
  let userB: any = null;
  let tokenA = '';
  let tokenB = '';

  try {
    server = app.listen(PORT, '127.0.0.1');
    console.log(`[INFO] Test server running on ${baseUrl}`);

    // Create 2 test users
    userA = await prisma.user.upsert({
      where: { email: `test-user-a-${Date.now()}@test.reachinbox.local` },
      update: {},
      create: {
        email: `test-user-a-${Date.now()}@test.reachinbox.local`,
        name: 'User A',
      },
    });

    userB = await prisma.user.upsert({
      where: { email: `test-user-b-${Date.now()}@test.reachinbox.local` },
      update: {},
      create: {
        email: `test-user-b-${Date.now()}@test.reachinbox.local`,
        name: 'User B',
      },
    });

    tokenA = AuthService.generateSessionToken(userA);
    tokenB = AuthService.generateSessionToken(userB);

    // =========================================================================
    // 1. Unauthenticated Security Gate Verification
    // =========================================================================
    console.log('\n[STEP 1] Testing Unauthenticated Access Gate...');
    try {
      await axios.get(`${baseUrl}/api/drafts`);
      throw new Error('Unauthenticated request to GET /api/drafts should have failed');
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('   [PASS] GET /api/drafts rejected without token (401 Unauthorized)');
      } else {
        throw err;
      }
    }

    // Verify demo login endpoint is eliminated
    try {
      await axios.post(`${baseUrl}/api/auth/demo`);
      throw new Error('POST /api/auth/demo should not exist (must be 404)');
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('   [PASS] Legacy POST /api/auth/demo successfully eliminated (404 Not Found)');
      } else {
        throw err;
      }
    }

    // =========================================================================
    // 2. Draft Creation & Auto-Save
    // =========================================================================
    console.log('\n[STEP 2] Testing Draft Creation & Auto-Save for User A...');
    const createRes = await axios.post(
      `${baseUrl}/api/drafts`,
      {
        recipientEmail: 'client@acmecorp.com',
        subject: 'Initial Q4 Outreach Draft',
        body: 'Hi team, checking in on scheduling.',
        delaySeconds: 15,
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    if (!createRes.data.success || !createRes.data.draft?.id) {
      throw new Error('Draft creation failed');
    }
    const draftId = createRes.data.draft.id;
    console.log(`   [PASS] Created Draft with ID: ${draftId}`);
    if (createRes.data.draft.recipientEmail !== 'client@acmecorp.com') {
      throw new Error('Draft recipientEmail mismatch');
    }

    // =========================================================================
    // 3. Atomic Upsert (Debounced Auto-Save Update by ID)
    // =========================================================================
    console.log('\n[STEP 3] Testing Atomic Upsert (Updating existing draft)...');
    const updateRes = await axios.post(
      `${baseUrl}/api/drafts`,
      {
        id: draftId,
        recipientEmail: 'client@acmecorp.com',
        subject: 'Updated Q4 Outreach Draft (Revision 2)',
        body: 'Hi team, checking in on scheduling with revised numbers.',
        delaySeconds: 20,
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    if (!updateRes.data.success || updateRes.data.draft.id !== draftId) {
      throw new Error('Atomic upsert should preserve same draft ID');
    }
    if (updateRes.data.draft.subject !== 'Updated Q4 Outreach Draft (Revision 2)') {
      throw new Error('Draft subject was not updated');
    }
    console.log(`   [PASS] Successfully updated draft in-place without creating duplicate`);

    // =========================================================================
    // 4. User Isolation & Cross-Tenant Access Prevention
    // =========================================================================
    console.log('\n[STEP 4] Testing User Isolation (User B cannot access or modify User A draft)...');
    const userBDrafts = await axios.get(`${baseUrl}/api/drafts`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    if (userBDrafts.data.drafts.some((d: any) => d.id === draftId)) {
      throw new Error('Security Breach: User B can see User A drafts!');
    }
    console.log('   [PASS] User B draft list is isolated from User A');

    // Attempt delete by User B
    try {
      await axios.delete(`${baseUrl}/api/drafts/${draftId}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      throw new Error('User B should not be able to delete User A draft');
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('   [PASS] User B forbidden from deleting User A draft (404 Scoped Not Found)');
      } else {
        throw err;
      }
    }

    // =========================================================================
    // 5. User A List Drafts
    // =========================================================================
    console.log('\n[STEP 5] Testing User A Draft List Retrieval...');
    const userADrafts = await axios.get(`${baseUrl}/api/drafts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    if (!userADrafts.data.success || userADrafts.data.drafts.length !== 1) {
      throw new Error(`Expected exactly 1 draft for User A, found ${userADrafts.data.drafts.length}`);
    }
    console.log(`   [PASS] User A retrieved 1 active draft: "${userADrafts.data.drafts[0].subject}"`);

    // =========================================================================
    // 6. Draft Deletion (On Send or Discard)
    // =========================================================================
    console.log('\n[STEP 6] Testing Draft Deletion on Discard or Dispatch...');
    const deleteRes = await axios.delete(`${baseUrl}/api/drafts/${draftId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    if (!deleteRes.data.success) {
      throw new Error('Delete draft failed');
    }
    console.log('   [PASS] Draft successfully deleted from database');

    const verifyList = await axios.get(`${baseUrl}/api/drafts`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (verifyList.data.drafts.length !== 0) {
      throw new Error('Draft list should be empty after deletion');
    }
    console.log('   [PASS] Confirmed draft is purged from database');

    console.log('\n[SUCCESS] ALL DRAFTS & SECURITY TESTS PASSED PERFECTLY!\n');
  } finally {
    console.log('[CLEANUP] Tearing down test database records and closing server...');
    if (server) {
      server.close();
    }
    if (userA) {
      await prisma.emailDraft.deleteMany({ where: { userId: userA.id } });
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => null);
    }
    if (userB) {
      await prisma.emailDraft.deleteMany({ where: { userId: userB.id } });
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => null);
    }
    await prisma.$disconnect();
  }
}

runDraftsTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FAIL] Drafts Test Failed:', err);
    process.exit(1);
  });
