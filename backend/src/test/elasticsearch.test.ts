import http from 'http';
import axios from 'axios';
import { Client } from '@elastic/elasticsearch';
import { prisma } from '../lib/prisma.js';
import { checkElasticsearchHealth } from '../config/elasticsearch.js';
import { ElasticsearchService, EmailJobDocument } from '../services/elasticsearch.service.js';
import express from 'express';
import emailRouter from '../routes/email.routes.js';

async function runElasticsearchVerificationSuite() {
  console.log(' Starting Phase 6 (Elasticsearch Indexing & Full-Text Search) Verification Suite...\n');

  const testUserId = `phase6-user-${Date.now()}`;
  let mockServer: http.Server | null = null;
  let testExpressServer: http.Server | null = null;

  try {
    // =========================================================================
    // 6.1 Elasticsearch Client Setup & Health Check with Graceful Fallback
    // =========================================================================
    console.log(' [6.1] Testing Elasticsearch Client Health Check (Offline Graceful Fallback)...');
    const defaultHealth = await checkElasticsearchHealth();
    console.log('   Default Node Health:', defaultHealth);
    if (defaultHealth.healthy) {
      console.log('    Real Elasticsearch node detected online on port 9200');
    } else {
      console.log('    Offline state cleanly handled without unhandled exceptions');
    }

    // =========================================================================
    // 6.2 & 6.3 & 6.4 Active Elasticsearch Client & Search Verification (Mock Cluster)
    // =========================================================================
    console.log('\n [6.2 & 6.3] Testing Active Elasticsearch Pipeline with Transient Cluster...');
    const MOCK_PORT = 9205;
    let indexCreated = false;
    const indexedDocuments: Record<string, any> = {};

    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', () => {
        const url = req.url || '';
        const method = req.method || 'GET';

        const esHeaders = {
          'Content-Type': 'application/json',
          'x-elastic-product': 'Elasticsearch',
        };

        // Health check
        if (url.includes('/_cluster/health')) {
          res.writeHead(200, esHeaders);
          res.end(JSON.stringify({ cluster_name: 'test-es-cluster', status: 'green' }));
          return;
        }

        // Index existence check
        if (method === 'HEAD' && url.includes('/test-emails')) {
          if (indexCreated) {
            res.writeHead(200, { 'x-elastic-product': 'Elasticsearch' });
          } else {
            res.writeHead(404, { 'x-elastic-product': 'Elasticsearch' });
          }
          res.end();
          return;
        }

        // Index creation with mappings
        if (method === 'PUT' && url.includes('/test-emails') && !url.includes('/_doc/')) {
          indexCreated = true;
          res.writeHead(200, esHeaders);
          res.end(JSON.stringify({ acknowledged: true, index: 'test-emails' }));
          return;
        }

        // Index document
        if ((method === 'PUT' || method === 'POST') && url.includes('/test-emails/_doc/')) {
          const docId = url.split('/_doc/')[1]?.split('?')[0];
          const parsed = JSON.parse(body);
          indexedDocuments[docId] = parsed;
          res.writeHead(200, esHeaders);
          res.end(JSON.stringify({ _index: 'test-emails', _id: docId, result: 'created' }));
          return;
        }

        // Update document
        if (method === 'POST' && url.includes('/test-emails/_update/')) {
          const docId = url.split('/_update/')[1]?.split('?')[0];
          const parsed = JSON.parse(body);
          if (indexedDocuments[docId]) {
            Object.assign(indexedDocuments[docId], parsed.doc);
          }
          res.writeHead(200, esHeaders);
          res.end(JSON.stringify({ _index: 'test-emails', _id: docId, result: 'updated' }));
          return;
        }

        // Search endpoint
        if (method === 'POST' && url.includes('/test-emails/_search')) {
          const hits = Object.entries(indexedDocuments).map(([id, doc]) => ({
            _index: 'test-emails',
            _id: id,
            _score: 1.0,
            _source: doc,
          }));

          res.writeHead(200, esHeaders);
          res.end(
            JSON.stringify({
              took: 5,
              timed_out: false,
              hits: {
                total: { value: hits.length, relation: 'eq' },
                max_score: 1.0,
                hits,
              },
            })
          );
          return;
        }

        res.writeHead(200, esHeaders);
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise<void>((resolve) => mockServer!.listen(MOCK_PORT, '127.0.0.1', () => resolve()));
    console.log(`   Mock Elasticsearch server running on http://127.0.0.1:${MOCK_PORT}`);

    const mockEsClient = new Client({
      node: `http://127.0.0.1:${MOCK_PORT}`,
      requestTimeout: 2000,
    });

    // Point service to mock client
    ElasticsearchService.setClient(mockEsClient);

    const clusterHealth = await checkElasticsearchHealth(mockEsClient);
    console.log(`   Cluster health: healthy=${clusterHealth.healthy}, clusterName=${clusterHealth.clusterName}`);
    if (!clusterHealth.healthy) {
      throw new Error('Mock Elasticsearch health check failed');
    }
    console.log('    Cluster health check verified');

    // Test index initialization with schema mappings
    const initResult = await ElasticsearchService.initIndex('test-emails');
    if (!initResult || !indexCreated) {
      throw new Error('ElasticsearchService.initIndex failed');
    }
    console.log('    Index test-emails created with schema mappings');

    // Test document indexing
    const testDoc: EmailJobDocument = {
      jobId: 'es-test-job-001',
      userId: testUserId,
      senderId: 'sender-001',
      recipientEmail: 'founder@fintech.io',
      subject: 'Series A Funding Pitch',
      body: 'ReachInbox email scheduling platform details.',
      status: 'SCHEDULED',
      scheduledAt: new Date(),
    };

    const indexSuccess = await ElasticsearchService.indexEmailJob(testDoc, 'test-emails');
    if (!indexSuccess || !indexedDocuments['es-test-job-001']) {
      throw new Error('Document indexing failed');
    }
    console.log('    Document indexed in real time into Elasticsearch');

    // Test document status update
    const updateSuccess = await ElasticsearchService.updateEmailJobStatus(
      'es-test-job-001',
      'SENT',
      {
        sentAt: new Date(),
        etherealMessageUrl: 'https://ethereal.email/message/test-preview-123',
      },
      'test-emails'
    );
    if (!updateSuccess || indexedDocuments['es-test-job-001']?.status !== 'SENT') {
      throw new Error('Document update in Elasticsearch failed');
    }
    console.log('    Real-time status update to SENT verified in Elasticsearch index');

    // Test search via Elasticsearch
    const esSearchResults = await ElasticsearchService.searchEmails(
      {
        userId: testUserId,
        query: 'Series A',
      },
      'test-emails'
    );

    console.log(`   Search results via ES: total=${esSearchResults.total}, source=${esSearchResults.source}`);
    if (esSearchResults.source !== 'ELASTICSEARCH' || esSearchResults.total === 0) {
      throw new Error('Elasticsearch search execution failed');
    }
    console.log('    Elasticsearch multi-field search execution verified\n');

    // Close mock cluster and reset service to test database fallback
    mockServer.close();
    mockServer = null;
    ElasticsearchService.resetClient();

    // =========================================================================
    // 6.3 & 6.4 Graceful Fallback & PostgreSQL Full-Text Search
    // =========================================================================
    console.log(' [6.3 & 6.4] Testing Graceful Fallback with PostgreSQL Full-Text Search...');

    // Create transient user and sender
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `phase6-${Date.now()}@test.local`,
        name: 'Phase 6 User',
      },
    });

    const sender = await prisma.senderAccount.create({
      data: {
        userId: testUserId,
        name: 'Phase 6 Sender',
        email: 'sender6@test.local',
        host: 'smtp.ethereal.email',
        port: 587,
        username: 'user6',
        password: 'pass6',
      },
    });

    // Seed 3 distinct jobs in Supabase PostgreSQL
    await prisma.emailJob.createMany({
      data: [
        {
          id: `job-1-${Date.now()}`,
          idempotencyKey: `idemp-1-${Date.now()}`,
          userId: testUserId,
          senderId: sender.id,
          recipientEmail: 'alex.investor@venture-capital.com',
          subject: 'Q3 Seed Investment Deck',
          body: 'Enclosed is our traction report and metric benchmarks.',
          scheduledAt: new Date(Date.now() + 100000),
          status: 'SCHEDULED',
        },
        {
          id: `job-2-${Date.now()}`,
          idempotencyKey: `idemp-2-${Date.now()}`,
          userId: testUserId,
          senderId: sender.id,
          recipientEmail: 'sarah.engineer@cloudinfra.io',
          subject: 'Distributed Queue Architecture',
          body: 'BullMQ and Redis sliding window rate limiter specifications.',
          scheduledAt: new Date(Date.now() - 50000),
          sentAt: new Date(),
          etherealMessageUrl: 'https://ethereal.email/message/test-cloud-arch',
          status: 'SENT',
        },
        {
          id: `job-3-${Date.now()}`,
          idempotencyKey: `idemp-3-${Date.now()}`,
          userId: testUserId,
          senderId: sender.id,
          recipientEmail: 'lead.outreach@growth-agency.net',
          subject: 'B2B Cold Outreach Campaign',
          body: 'Optimized sequences and conversion triggers for enterprise sales.',
          scheduledAt: new Date(Date.now() - 100000),
          errorMessage: 'Invalid login: 535 Authentication failed',
          status: 'FAILED',
        },
      ],
    });

    console.log('   Seeded 3 diverse test jobs in PostgreSQL database');

    // 1. Multi-match search: by subject word 'Investment'
    const searchSubjectResult = await ElasticsearchService.searchEmails({
      userId: testUserId,
      query: 'investment',
    });
    console.log(`   Search 'investment' -> Total: ${searchSubjectResult.total}, Source: ${searchSubjectResult.source}`);
    if (searchSubjectResult.total !== 1 || searchSubjectResult.source !== 'DATABASE_FALLBACK') {
      throw new Error(`Expected 1 match from database fallback, got: ${searchSubjectResult.total}`);
    }
    console.log('    Subject query verified via database fallback');

    // 2. Multi-match search: by recipient domain 'cloudinfra.io'
    const searchRecipientResult = await ElasticsearchService.searchEmails({
      userId: testUserId,
      query: 'cloudinfra.io',
    });
    console.log(`   Search 'cloudinfra.io' -> Total: ${searchRecipientResult.total}`);
    if (searchRecipientResult.total !== 1) {
      throw new Error(`Expected 1 match for recipient search, got: ${searchRecipientResult.total}`);
    }
    console.log('    Recipient email query verified via database fallback');

    // 3. Multi-match search: by body keyword 'BullMQ'
    const searchBodyResult = await ElasticsearchService.searchEmails({
      userId: testUserId,
      query: 'BullMQ',
    });
    console.log(`   Search 'BullMQ' -> Total: ${searchBodyResult.total}`);
    if (searchBodyResult.total !== 1) {
      throw new Error(`Expected 1 match for body search, got: ${searchBodyResult.total}`);
    }
    console.log('    Body text query verified via database fallback');

    // 4. Status filter test: status = 'SENT'
    const searchStatusResult = await ElasticsearchService.searchEmails({
      userId: testUserId,
      status: 'SENT',
    });
    console.log(`   Status filter 'SENT' -> Total: ${searchStatusResult.total}`);
    if (searchStatusResult.total !== 1 || searchStatusResult.data[0].status !== 'SENT') {
      throw new Error(`Expected 1 SENT email, got: ${searchStatusResult.total}`);
    }
    console.log('    Status filtering verified');

    // 5. Pagination test: limit = 2
    const searchPaginationResult = await ElasticsearchService.searchEmails({
      userId: testUserId,
      limit: 2,
      page: 1,
    });
    console.log(`   Pagination limit=2 -> Total: ${searchPaginationResult.total}, Page Items: ${searchPaginationResult.data.length}, TotalPages: ${searchPaginationResult.totalPages}`);
    if (searchPaginationResult.data.length !== 2 || searchPaginationResult.totalPages !== 2) {
      throw new Error('Pagination calculations failed');
    }
    console.log('    Pagination verified\n');

    // =========================================================================
    // 6.4 Express HTTP Search API Route Test (GET /api/emails/search)
    // =========================================================================
    console.log(' [6.4] Testing Express Search API Route (GET /api/emails/search)...');
    const app = express();
    app.use(express.json());
    app.use('/api/emails', emailRouter);

    const API_PORT = 5056;
    testExpressServer = app.listen(API_PORT, '127.0.0.1');

    const apiResponse = await axios.get(
      `http://127.0.0.1:${API_PORT}/api/emails/search?userId=${testUserId}&q=investment`
    );

    console.log('   API Response Status:', apiResponse.status);
    console.log('   API Response Payload:', {
      success: apiResponse.data.success,
      total: apiResponse.data.total,
      source: apiResponse.data.source,
      dataCount: apiResponse.data.data?.length,
    });

    if (!apiResponse.data.success || apiResponse.data.total !== 1) {
      throw new Error('Express API search endpoint returned unexpected response');
    }
    console.log('    Express GET /api/emails/search endpoint verified with axios\n');

  } finally {
    console.log(' Cleaning up test resources...');
    if (mockServer) {
      mockServer.close();
    }
    if (testExpressServer) {
      testExpressServer.close();
    }

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

      await prisma.$disconnect();
    } catch (cleanupErr: any) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log(' ALL PHASE 6 SUBTASKS VERIFIED SUCCESSFULLY!\n');
}

runElasticsearchVerificationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(' Phase 6 Verification Failed:', err);
    process.exit(1);
  });
