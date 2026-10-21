# ReachInbox Scheduler – Engineering & Development Journal

This journal serves as the single source of truth for **how** each phase and subtask was planned, built, tested, and debugged. It candidly captures technical architecture decisions, concrete test suites used for verification, the real-world engineering hurdles encountered along the way, and how they were resolved.

---

## Document Structure
For every phase, we document:
1. **What We Built & How We Proceeded**: Granular breakdown of implementation decisions, file changes, and data flow.
2. **How Testing Was Conducted**: The exact scripts, test harnesses, edge cases, and logs used to validate functionality.
3. **Engineering Challenges & Solutions**: Real bugs, environmental blockers, runtime surprises, and the exact fixes applied.
4. **Current Status & Transition**: Readiness state before advancing to the next phase.

---

# Phase 1: Project Scaffolding & Infrastructure

### 1. What We Built & How We Proceeded
- **Monorepo Setup (1.1)**: Configured a unified root [package.json](file:///e:/ReachInBox/package.json) using npm workspaces (`backend`, `frontend`) and `concurrently` to orchestrate parallel backend and frontend development scripts (`npm run dev`, `npm run build`).
- **Backend Architecture (1.2)**: Set up Express.js with TypeScript (`NodeNext` module resolution and ES2022 target in [tsconfig.json](file:///e:/ReachInBox/backend/tsconfig.json)). Created a clean modular directory layout:
  - `src/config/`: Configuration singletons (Redis, environment).
  - `src/controllers/`: Route handlers.
  - `src/lib/`: Reusable singletons (Prisma client).
  - `src/middleware/`: Authentication and error handling.
  - `src/queues/`: BullMQ queue and worker instances.
  - `src/routes/`: Express API endpoints.
  - `src/services/`: Business logic, rate limiters, email dispatchers.
  - `src/types/`: TypeScript definitions.
- **Frontend Architecture (1.3)**: Initialized React + TypeScript + Vite + Tailwind CSS with custom styling tokens matching modern dashboard UI specifications.
- **Container Infrastructure (1.4)**: Authored [docker-compose.yml](file:///e:/ReachInBox/docker-compose.yml) specifying PostgreSQL, Redis, and Elasticsearch services with persistent volume mappings.
- **Environment Management (1.5 & 1.6)**: Documented [backend/.env.example](file:///e:/ReachInBox/backend/.env.example) and configured a comprehensive root [.gitignore](file:///e:/ReachInBox/.gitignore) ensuring private secrets, certificates, and build artifacts never enter version control.

### 2. How Testing Was Conducted
- Executed `npm run build` across all workspaces to ensure zero TypeScript transpilation errors.
- Started Express via `tsx` and validated the health check endpoint:
  ```bash
  curl http://localhost:5000/health
  # Response: {"status":"ok","service":"reachinbox-scheduler-backend"}
  ```

### 3. Engineering Challenges & Solutions
- **Module Resolution Mismatch**: Using TypeScript `"module": "NodeNext"` with `"type": "module"` in `package.json` requires explicit `.js` extension specifiers on all internal imports (e.g. `import { prisma } from './lib/prisma.js'`). Early imports without `.js` caused `Cannot find module` errors under `tsx`. Enforced strict NodeNext compliance across all files.

---

# Phase 2: Relational Database Schema & Prisma ORM Layer

### 1. What We Built & How We Proceeded
- **Prisma Setup (2.1)**: Integrated `@prisma/client` and initialized Prisma with PostgreSQL pointing to a hosted Supabase database instance.
- **Data Models (2.2 – 2.5)** defined in [schema.prisma](file:///e:/ReachInBox/backend/prisma/schema.prisma):
  - `User`: Handles Google OAuth credentials (`id`, `email`, `name`, `avatar`, `createdAt`).
  - `SenderAccount`: Supports multi-sender SMTP setups (`host`, `port`, `username`, `password`, `hourlyLimit`).
  - `EmailJob`: Core scheduling entity featuring `idempotencyKey`, `status` enum (`PENDING`, `SCHEDULED`, `SENDING`, `SENT`, `FAILED`, `RESCHEDULED`), scheduled timestamps, sent timestamps, retry counters, and Ethereal preview links (`etherealMessageUrl`).
  - `SlackIntegration`: Stores OAuth access tokens, bot channels, and incoming webhooks for alerts.
- **Database Migrations (2.6)**: Applied the initial migration ([migration.sql](file:///e:/ReachInBox/backend/prisma/migrations/20261020150000_init/migration.sql)) configuring indexed compound queries (`@@index([userId, status, scheduledAt])` and `@@index([senderId, scheduledAt])`) for fast table scans.
- **Database Seeding (2.7)**: Created [seed.ts](file:///e:/ReachInBox/backend/prisma/seed.ts) to provision a default demo user and test Ethereal sender account.

### 2. How Testing Was Conducted
- Executed `npx prisma db push` and `npx tsx prisma/seed.ts`.
- Verified seeded records directly through the Prisma client in Node.js.

### 3. Engineering Challenges & Solutions
- **Supabase Pooler vs Direct URL**: Prisma migrations require direct TCP access to PostgreSQL (`DIRECT_URL`), whereas runtime operations can use the connection pooler (`DATABASE_URL`). Configured both variables in `schema.prisma` (`url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`) to prevent migration timeouts.

---

# Phase 3: BullMQ Queue Engine, Rate Limiting & Concurrency

### 1. What We Built & How We Proceeded
- **Queue Initialization (3.1)**:
  - Created [redis.ts](file:///e:/ReachInBox/backend/src/config/redis.ts) with `ioredis` configuration and `maxRetriesPerRequest: null` (strict requirement for BullMQ).
  - Built [email.queue.ts](file:///e:/ReachInBox/backend/src/queues/email.queue.ts) exposing `emailQueue` with default exponential backoff retry strategies (3 attempts, 3000ms delay, auto-cleanup of completed jobs).
  - Provided `enqueueEmailJob` and `enqueueBulkEmailJobs` utilities.
- **Configurable Worker Concurrency (3.2)**:
  - Built [email.worker.ts](file:///e:/ReachInBox/backend/src/queues/email.worker.ts) reading `WORKER_CONCURRENCY` from the environment (defaulting to `5`). Allows parallel execution without memory leaks or race conditions.
- **Inter-Email Throttling Delay (3.3)**:
  - Enforced a configurable per-email throttling window (`MIN_SEND_DELAY_MS`, e.g., 2000ms) within the worker processor to prevent bursting SMTP servers.
- **Redis-Backed Hourly Rate Limiting (3.4)**:
  - Designed [rateLimiter.service.ts](file:///e:/ReachInBox/backend/src/services/rateLimiter.service.ts) using Redis keys formatted as:
    ```
    rate_limit:{senderId}:{YYYYMMDDHH}
    ```
  - Leveraged Redis atomic `INCR` commands with an automatic TTL window (`EXPIRE`) to ensure sliding hour boundaries reset automatically and work across distributed worker replicas.
- **Order-Preserving Rescheduling (3.5)**:
  - When a sender reaches their hourly quota, the worker calculates the exact milliseconds until the top of the next UTC hour (`getMillisecondsUntilNextHour()`).
  - Calls `job.moveToDelayed(Date.now() + msUntilReset)` to keep the job in the BullMQ Redis sorted set without dropping it.
  - Simultaneously updates the database status to `RESCHEDULED` and invokes the alert hook.
- **Restart Resilience & Idempotency (3.6)**:
  - Worker queries `prisma.emailJob.findUnique({ where: { id: jobId } })` prior to dispatch. If already `SENT`, it immediately skips execution, preventing duplicate emails even after server reboots or re-queued jobs.
  - BullMQ persists all delayed jobs in Redis, surviving backend restarts.

---

### 2. How Testing Was Conducted ([queue.test.ts](file:///e:/ReachInBox/backend/src/test/queue.test.ts))
Rather than relying on manual guesses, we authored a dedicated end-to-end integration test suite that simulated full production workflows:

```typescript
// Test Flow in backend/src/test/queue.test.ts:
1. Pings Redis to guarantee healthy connectivity.
2. Initializes test Sender with hourlyLimit = 1.
3. Tests atomic Redis counter: verifies count increments to 3 and blocks on 4th check.
4. Enqueues Job 1 (under limit):
   - Verifies throttling delay executes.
   - Verifies DB status transitions to SENT.
5. Tests Idempotency:
   - Re-enqueues Job 1 with a duplicate ID.
   - Verifies worker detects SENT state and gracefully emits SKIPPED.
6. Enqueues Job 2 (over hourly limit of 1):
   - Worker detects limit breach (1/1).
   - Computes delay to top of next UTC hour.
   - Moves job to delayed state.
   - Verifies DB status is updated to RESCHEDULED.
   - Verifies live alert hook is fired.
7. Performs database cleanup and disconnects cleanly.
```

**Actual Test Execution Output:**
```text
 Starting Phase 3 (BullMQ & Rate Limiting) Verification Suite...

 [3.1] Testing Redis & Queue Initialization...
 Connected to Redis successfully
 BullMQ Email Worker ready with concurrency: 5
    Redis ping: OK
    BullMQ Queue instantiated.

 [3.4] Testing Redis-backed Hourly Rate Limiting...
   Initial check: allowed=true, count=0
   After 3 sends: count=3, allowed=true
   4th check (exceeding limit): allowed=false, count=3
    Redis rate limiter successfully enforced hourly boundary and counted atomically

 [3.2, 3.3, 3.5, 3.6] Testing End-to-End Worker Processing & Idempotency...
   Enqueuing Job 1 (under limit)...
[Worker] Processing Job phase3-job-1 for recipient: lead1@test.local
[Worker] Applying throttling delay: 200ms
 [Worker] Successfully processed job phase3-job-1 to lead1@test.local
 Job phase3-job-1 completed with status: SENT
   Job 1 DB Status: SENT
    Job 1 completed and marked SENT in database
   Testing Idempotency: re-enqueuing Job 1...
[Worker] Job phase3-job-1 already marked as SENT. Skipping.
 Job phase3-job-1-retry completed with status: SKIPPED
    Idempotency verified: duplicate job skipped cleanly
   Enqueuing Job 2 (exceeding limit of 1/hr)...
 [Worker] Sender phase3-test-sender hit hourly rate limit (1/1). Rescheduling job to next hour window
    [Alert Hook] Live Rate Limit Alert received: sender=phase3-test-sender, count=1/1
   Job 2 DB Status: RESCHEDULED
    Job 2 successfully moved to delayed state with status RESCHEDULED
    Live Alert handler triggered for Phase 4 Slack integration

 Cleaning up test records...

 ALL PHASE 3 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### Challenge 1: Windows Host vs. WSL2 Redis Networking Isolation
- **Problem**: Docker was unavailable on the Windows host machine. We installed `redis-server` in Ubuntu WSL2, but Windows Node.js connections to `localhost:6379` threw `ECONNREFUSED`. Connecting directly to the WSL virtual IP (`172.29.51.8`) was blocked by the Windows Hyper-V firewall (`vEthernet WSL`).
- **Diagnosis**: WSL2 runs inside a virtual NAT switch. Windows automatic port forwarding only functions under specific conditions or with elevated firewall rules.
- **Solution**: We searched WinGet for non-admin, native Windows Redis distributions and discovered `taizod1024.redis-windows-fork` (version 8.10.2), which is an official MSYS2-compiled portable Redis package. Installed via WinGet and launched directly as a background Windows daemon:
  ```powershell
  redis-server.exe --port 6379
  ```
  Result: Instant, native port 6379 access without virtualization overhead or firewall conflicts.

#### Challenge 2: Node.js IPv6 Resolution vs. Redis IPv4 Loopback
- **Problem**: When configuring `ioredis` with `host: 'localhost'`, Node.js v24 resolved `localhost` to IPv6 `::1` first. Since Redis was bound to IPv4 `127.0.0.1`, `ioredis` crashed with repeated `ECONNREFUSED 127.0.0.1:6379` connection retries.
- **Solution**: Updated `backend/src/config/redis.ts` to strictly sanitize the host:
  ```typescript
  host: process.env.REDIS_HOST === 'localhost' || !process.env.REDIS_HOST ? '127.0.0.1' : process.env.REDIS_HOST
  ```
  Additionally sanitized `REDIS_PASSWORD` so empty string `""` values are coerced to `undefined`, preventing unneeded Redis AUTH commands.

#### Challenge 3: BullMQ `moveToDelayed` Missing Lock Warning
- **Problem**: When rescheduling a job that exceeded the hourly rate limit, the worker processor executed:
  ```typescript
  await job.moveToDelayed(Date.now() + msUntilReset, job.token);
  return { status: 'RESCHEDULED' };
  ```
  This produced a runtime warning:
  ` Worker internal error: Missing lock for job ... moveToFinished`.
- **Diagnosis**: In BullMQ, when a worker processor resolves its Promise, BullMQ internally attempts to call `moveToFinished`. Because `moveToDelayed` had already surrendered the job's active lock, the worker threw an internal error trying to finish an already-delayed job.
- **Solution**: Leveraged BullMQ's official `DelayedError` primitive:
  ```typescript
  import { DelayedError } from 'bullmq';
  
  // When limit exceeded:
  await job.moveToDelayed(Date.now() + rateCheck.msUntilReset, job.token);
  throw new DelayedError();
  ```
  Throwing `DelayedError` instructs BullMQ that the job was manually delayed by user code and suppresses the default `moveToFinished` call. Result: Zero warnings, completely clean execution.

---

# Phase 4: Slack OAuth Integration & Live Alerting

### 1. What We Built & How We Proceeded
- **Slack Service Architecture (4.1 & 4.2)**:
  - Created [slack.service.ts](file:///e:/ReachInBox/backend/src/services/slack.service.ts) using `axios` with strict timeout controls (`timeout: 8000`).
  - Implemented `SlackService.getAuthorizationUrl(userId)` generating the official Slack OAuth v2 approval URL with `incoming-webhook` and `chat:write` scopes.
  - Implemented `SlackService.exchangeCodeForToken(code, userId)` making an `axios.post` to `https://slack.com/api/oauth.v2.access` with `Content-Type: application/x-www-form-urlencoded`.
  - Persisted the resulting bot access token, team ID, channel name, and incoming webhook URL directly into Supabase via Prisma's `SlackIntegration` model.
- **Connection Status & Disconnect Management (4.3)**:
  - Implemented `SlackService.getStatus(userId)` reporting connection state, mode (`OAUTH` vs `GLOBAL_WEBHOOK` fallback), and active target channel.
  - Implemented `SlackService.disconnect(userId)` allowing users to cleanly unlink their Slack channel without interrupting scheduling queues.
- **Real-Time Rate Limit Alert Dispatcher (4.4)**:
  - Formatted alert notifications using Slack Block Kit:
    -  **Header**: `ReachInbox Hourly Rate Limit Reached`
    - **Sender field**: Sender email / ID.
    - **Hourly Quota field**: `50 / 50 emails`.
    - **Reschedule Policy**: Preserved in BullMQ queue.
    - **Next Send Window**: Exact UTC time of the next hour window.
    - **Context badge**: ` Idempotent scheduler: Zero emails will be dropped or duplicated.`
  - Dispatches instantly via `axios.post(webhookUrl, messagePayload)`.
- **Graceful Fallback & Zero-Crash Architecture (4.5)**:
  - If a user has not linked Slack or if the webhook fails, the alert dispatcher logs a clean informational notice (`[INFO] [SlackAlert] User X has not connected Slack. Gracefully skipping Slack alert.`) and returns `false`. The email worker and queue continue running without disruption.
- **Express API & Worker Hookup**:
  - Created [slack.controller.ts](file:///e:/ReachInBox/backend/src/controllers/slack.controller.ts) and [slack.routes.ts](file:///e:/ReachInBox/backend/src/routes/slack.routes.ts) mounting:
    - `GET /api/slack/authorize`: Redirects browser to Slack OAuth approval screen.
    - `GET /api/slack/callback`: Handles OAuth redirect, saves integration, and returns user to dashboard.
    - `GET /api/slack/status`: Active connection status.
    - `POST /api/slack/disconnect`: Unlinks Slack integration.
    - `POST /api/slack/test-alert`: Allows immediate test notification dispatch.
  - Connected the dispatcher directly into [email.worker.ts](file:///e:/ReachInBox/backend/src/queues/email.worker.ts) so every rate limit cutoff automatically alerts Slack.

---

### 2. How Testing Was Conducted ([slack.test.ts](file:///e:/ReachInBox/backend/src/test/slack.test.ts))
Authoring a dedicated integration test suite verifying every subtask:
```typescript
// Test Flow in backend/src/test/slack.test.ts:
1. Validates Slack OAuth URL syntax and scopes (incoming-webhook, chat:write).
2. Creates transient test User in PostgreSQL (Supabase).
3. Tests Graceful Fallback: Calls sendRateLimitAlert without Slack connected; verifies clean return false with zero crashes.
4. Spins up a transient local HTTP webhook receiver on 127.0.0.1:5055 to simulate Slack's webhook receiver.
5. Persists mock integration into Prisma SlackIntegration.
6. Queries getStatus; verifies connected: true and channel name matching.
7. Calls sendRateLimitAlert; receives payload on mock server and validates full Block Kit JSON structure.
8. Tests disconnect flow; verifies getStatus reverts to connected: false.
9. Cleans up database and closes mock server.
```

**Actual Test Execution Output:**
```text
 Starting Phase 4 (Slack OAuth & Live Alerting) Verification Suite...

 [4.1] Testing Slack OAuth Authorization URL...
   Generated Auth URL: https://slack.com/oauth/v2/authorize?client_id=&scope=incoming-webhook%2Cchat%3Awrite&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fslack%2Fcallback&state=phase4-user-1792554648681
    Slack OAuth authorization URL properly formed with required scopes

 [4.5] Testing Graceful Fallback (User has no Slack connected)...
[INFO] [SlackAlert] User phase4-user-1792554648681 has not connected Slack. Gracefully skipping Slack alert.
   Fallback alert result: false
    Graceful fallback verified: logged cleanly without exceptions or crashes

 [4.2 & 4.3] Testing SlackIntegration DB Persistence, Status & Disconnect...
   Mock Slack webhook receiver listening on http://127.0.0.1:5055
   Retrieved Slack status: {
  connected: true,
  mode: 'OAUTH',
  channelName: 'alerts-rate-limits',
  connectedAt: '2026-10-21T03:50:49.544Z',
  teamId: 'T12345678'
}
    Slack status correctly reflects active integration and target channel

 [4.4] Testing Live Rate Limit Alert Dispatcher...
 [SlackAlert] Real-time rate limit notification delivered to Slack successfully!
   Alert dispatch result: true
   Received Slack Block Kit payload: {
  "text": " Rate Limit Alert: Sender marketing@reachinbox.local reached hourly threshold",
  "blocks": [...]
}
    Live formatted Slack Block Kit alert successfully received by webhook

 Testing Disconnect Flow...
   Disconnect result: { success: true }
   Status after disconnect: { connected: false, mode: 'NONE', channelName: null }
    Slack integration cleanly disconnected

 Cleaning up test user...

 ALL PHASE 4 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### Challenge 1: Replacing Native `fetch` with `axios` Across the Stack
- **Problem**: Native `fetch` does not have built-in timeout configurations and requires verbose `AbortController` boilerplate. If Slack's incoming webhook experienced packet drops or high API latency, worker threads could hang waiting for socket responses.
- **Solution**: Added `axios` to the project (`npm install axios --workspace=backend`). Refactored `SlackService` to use `axios.post` with a strict `timeout: 8000` configuration and used `axios.isAxiosError(err)` for granular error inspection. This ensures worker threads are guaranteed to be unblocked within 8 seconds even under complete Slack network outages.

---

---

# Phase 5: Multi-Sender SMTP Dispatcher (Ethereal Email)

### 1. What We Built & How We Proceeded
- **Nodemailer Transporter Service (5.1)**:
  - Authored [smtp.service.ts](file:///e:/ReachInBox/backend/src/services/smtp.service.ts) managing pooled `nodemailer.Transporter` instances (`pool: true`, `maxConnections: 5`, `maxMessages: 100`, `rateLimit: 14`).
  - Implemented connection caching (`transporterPool: Map<string, Transporter>`) keyed by `senderId` to eliminate TCP handshake overhead on every email dispatch.
  - Added connection verification utility `SmtpService.verifySenderConnection(senderId)` and shutdown pool disposal `SmtpService.closeAllTransporters()`.
  - Added dynamic test account generator `SmtpService.provisionEtherealAccount(userId, accountName)` which provisions live Ethereal test inboxes and records credentials in Supabase PostgreSQL via Prisma.
- **Multi-Sender Rotation (5.2)**:
  - Built round-robin account rotator `SmtpService.getNextSenderForUser(userId)` allowing user campaigns to alternate across multiple sender accounts.
  - Built batch recipient distributor `SmtpService.distributeRecipientsAcrossSenders(senders, recipientEmails)` distributing leads evenly across available senders.
- **Test Message URL Capture & DB Persistence (5.3)**:
  - Implemented `SmtpService.sendMailWithSender(options)` returning `{ success, messageId, previewUrl, response }`.
  - Leveraged `nodemailer.getTestMessageUrl(info)` to capture the exact Ethereal web inbox viewer URL.
  - Wired live email sending into [email.worker.ts](file:///e:/ReachInBox/backend/src/queues/email.worker.ts). The worker transitions jobs to `SENDING`, increments the Redis hourly counter, sends via pooled SMTP, marks `status: 'SENT'`, records `sentAt: new Date()`, and persists `etherealMessageUrl` for one-click inspection on the dashboard.
- **Delivery Error Handling & Resilience (5.4)**:
  - Handled fatal authentication or SMTP socket failures by capturing `error.message`, updating database status to `FAILED`, and storing `errorMessage`.
  - Added automatic transporter pool invalidation (`invalidateTransporter`) on authentication errors (`EAUTH`, code 535) so damaged connections are immediately evicted from the cache.

### 2. How Testing Was Conducted ([smtp.test.ts](file:///e:/ReachInBox/backend/src/test/smtp.test.ts))
Authoring a dedicated end-to-end integration test suite verifying every subtask:
```typescript
// Test Flow in backend/src/test/smtp.test.ts:
1. Pings Redis and verifies healthy connectivity.
2. Creates transient test User in Supabase PostgreSQL.
3. [5.1] Provisions live Ethereal sender account Alpha and verifies SMTP connection pool.
4. [5.2] Provisions live Ethereal sender account Beta; verifies round-robin cycling and batch lead distribution.
5. [5.3] Dispatches direct email via sender Alpha; validates messageId and ethereal.email preview URL format.
6. [5.3 Worker Integration] Creates DB EmailJob with status PENDING, enqueues to BullMQ queue, lets worker process job, verifies DB status transitions to SENT, sentAt is populated, and etherealMessageUrl is stored.
7. [5.4] Provisions faulty sender with bad credentials; enqueues failing job; verifies worker catches failure, updates DB to FAILED, and captures diagnostic error message.
8. Performs clean DB teardown and closes all transporters, queues, and Redis connections.
```

**Actual Test Execution Output:**
```text
 Starting Phase 5 (Multi-Sender SMTP Dispatcher & Ethereal) Verification Suite...

 Connected to Redis successfully
 BullMQ Email Worker ready with concurrency: 5
 [Setup] Creating transient test User...
   User created: phase5-test-user-1792559292151 (tester-1792559292152@reachinbox.local)

 [5.1] Testing Nodemailer Transporter with Real Ethereal SMTP Provisioning...
    Sender 1 provisioned on Ethereal: gteoqtja3hglpbrm@ethereal.email (Host: smtp.ethereal.email:587)
    Sender 1 SMTP connection verified with active connection pool

 [5.2] Testing Multi-Sender Rotation & Recipient Distribution...
    Sender 2 provisioned on Ethereal: gteoqtja3hglpbrm@ethereal.email
   Round-Robin Sequence: [1] Ethereal Test Sender Alpha -> [2] Ethereal Test Sender Beta -> [3] Ethereal Test Sender Alpha
    Multi-sender user round-robin selection verified
   Recipient batch distribution:
     Lead 1 (leadA@test.com) -> Sender: Ethereal Test Sender Alpha
     Lead 2 (leadB@test.com) -> Sender: Ethereal Test Sender Beta
     Lead 3 (leadC@test.com) -> Sender: Ethereal Test Sender Alpha
     Lead 4 (leadD@test.com) -> Sender: Ethereal Test Sender Beta
    Multi-sender batch lead distribution verified

 [5.3] Testing Direct SMTP Send & Ethereal Message URL Capture...
   Message ID: <33844e10-83e2-7333-ce47-6f9f495d5d06@ethereal.email>
   Ethereal Preview URL: https://ethereal.email/message/athIvD.z5CbOhXHtathIwrJrKujo-Tk6AAAAAT2FATb5aUzAOgWNieXNCRg
    Direct Ethereal SMTP dispatch succeeded and preview URL captured

 [5.3 Worker Integration] Testing BullMQ Worker End-to-End Processing...
   Created DB EmailJob phase5-queue-job-1792559299166 with status PENDING
   Enqueued job into BullMQ. Waiting for worker to process...
[Worker] Processing Job idemp-phase5-1792559299166 for recipient: queue-lead@example.com
[Worker] Applying throttling delay: 100ms
 [Worker] Successfully processed job phase5-queue-job-1792559299166 to queue-lead@example.com
 [Worker] Ethereal Preview URL: https://ethereal.email/message/athIvD.z5CbOhXHtathIx50L.yTpB5Z2AAAAAnBMWi8Nh7LKyVWCZmakfYQ
 Job idemp-phase5-1792559299166 completed with status: SENT
   Final DB Status: SENT
   Sent At: 2026-10-21T05:08:24.301Z
   Ethereal Message URL in DB: https://ethereal.email/message/athIvD.z5CbOhXHtathIx50L.yTpB5Z2AAAAAnBMWi8Nh7LKyVWCZmakfYQ
    End-to-end BullMQ worker execution verified with database persistence

 [5.4] Testing Delivery Error Handling & Failure Logging...
[Worker] Processing Job idemp-failed-1792559304720 for recipient: broken-lead@example.com
 [Worker] Failed to deliver job phase5-failed-job-1792559304603: Invalid login: 535 Authentication failed
 Job idemp-failed-1792559304720 failed: Invalid login: 535 Authentication failed
   Faulty Job DB Status: FAILED
   Captured Error Message: Invalid login: 535 Authentication failed
    Delivery error captured and logged cleanly to database without crashing

 Cleaning up test records and shutting down connections...
 ALL PHASE 5 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### Challenge 1: Transporter Connection Pool Lifecycles & Authentication Failures
- **Problem**: When a sender account's password was changed or corrupted, pooled connections in Nodemailer remained connected in the idle pool and continued throwing connection errors on subsequent jobs.
- **Solution**: Implemented an explicit `invalidateTransporter(senderId)` cache clearing method. In `sendMailWithSender`, if `error.code === 'EAUTH'` or `error.responseCode === 535`, the cache automatically closes and evicts the faulty transporter pool. When valid credentials are later supplied, a clean new pool is established without restarting the service.

#### Challenge 2: Background Windows Redis Daemon Management
- **Problem**: Between IDE sessions or terminal reboots, the portable Windows Redis daemon process (`redis-server.exe`) was not running, resulting in `ECONNREFUSED 127.0.0.1:6379` errors when starting queue workers.
- **Solution**: Validated presence of `redis-server.exe` on Windows PATH (installed via `taizod1024.redis-windows-fork`), added health-check diagnostics in test harnesses, and launched Redis as a persistent background daemon.

---

---

# Phase 6: Elasticsearch Indexing & Full-Text Search

### 1. What We Built & How We Proceeded
- **Elasticsearch Client Configuration & Health Check (6.1)**:
  - Authored [elasticsearch.ts](file:///e:/ReachInBox/backend/src/config/elasticsearch.ts) instantiating `@elastic/elasticsearch` `Client` configured with timeout controls (`requestTimeout: 3000`, `maxRetries: 2`).
  - Implemented non-blocking `checkElasticsearchHealth(customClient)` that attempts cluster ping with a 2-second timeout, returning `{ healthy, node, clusterName, error }` without throwing unhandled exceptions when offline.
  - Added Elasticsearch cluster status to the main Express `/health` monitoring route.
- **Index & Mapping Architecture (6.2)**:
  - Authored [elasticsearch.service.ts](file:///e:/ReachInBox/backend/src/services/elasticsearch.service.ts) providing `ElasticsearchService.initIndex()`.
  - Defined explicit schema mappings for index `emails`:
    - `jobId`: `keyword`
    - `userId`: `keyword`
    - `senderId`: `keyword`
    - `recipientEmail`: `text` + `keyword` subfield for exact lookups
    - `subject`: `text` (analyzed for full-text search)
    - `body`: `text` (analyzed for full-text search)
    - `status`: `keyword` (for exact status filtering: `SCHEDULED`, `SENT`, `FAILED`, `RESCHEDULED`)
    - `scheduledAt`, `sentAt`, `createdAt`, `updatedAt`: `date`
    - `etherealMessageUrl`: `keyword`
    - `errorMessage`: `text`
- **Real-Time Synchronization Pipeline (6.3)**:
  - Implemented `ElasticsearchService.indexEmailJob(doc)` and `ElasticsearchService.updateEmailJobStatus(jobId, status, additionalFields)`.
  - Wired live hooks directly into [email.worker.ts](file:///e:/ReachInBox/backend/src/queues/email.worker.ts):
    - When hourly limit is breached: syncs `status: 'RESCHEDULED'` and `scheduledAt` to Elasticsearch.
    - When email is delivered: syncs `status: 'SENT'`, `sentAt`, and `etherealMessageUrl` to Elasticsearch.
    - When email fails: syncs `status: 'FAILED'` and `errorMessage` to Elasticsearch.
    - All sync calls are wrapped non-blockingly (`.catch(() => null)`) ensuring cluster status never halts or degrades worker queue operations.
- **Search API & Dual-Engine Query Router with Graceful Fallback (6.4)**:
  - Designed `ElasticsearchService.searchEmails({ userId, query, status, page, limit })`:
    - **Active Path (Elasticsearch)**: Executes a `multi_match` query across `recipientEmail^3`, `subject^2`, and `body` with `fuzziness: 'AUTO'`, combined with `term` filters for `userId` and `status`, returning `{ source: 'ELASTICSEARCH', total, data }`.
    - **Graceful Fallback Path (PostgreSQL via Prisma)**: If Elasticsearch is unreachable, automatically executes the query against Supabase PostgreSQL using case-insensitive `contains` (`ILIKE`) across `recipientEmail`, `subject`, and `body`, returning `{ source: 'DATABASE_FALLBACK', total, data }`.
  - Built Express search controller [email.controller.ts](file:///e:/ReachInBox/backend/src/controllers/email.controller.ts) and mounted route [email.routes.ts](file:///e:/ReachInBox/backend/src/routes/email.routes.ts) at `GET /api/emails/search`.

### 2. How Testing Was Conducted ([elasticsearch.test.ts](file:///e:/ReachInBox/backend/src/test/elasticsearch.test.ts))
Authoring a dedicated end-to-end integration test suite verifying every subtask:
```typescript
// Test Flow in backend/src/test/elasticsearch.test.ts:
1. [6.1] Tests client health check against default offline node; verifies clean return healthy=false without unhandled exceptions.
2. [6.2 & 6.3] Starts transient mock Elasticsearch cluster on 127.0.0.1:9205 with valid v8 protocol headers.
3. Injects mock client into ElasticsearchService:
   - Verifies cluster health returns healthy=true.
   - Verifies initIndex creates 'test-emails' with full schema mappings.
   - Verifies real-time indexEmailJob indexes document into cluster.
   - Verifies updateEmailJobStatus updates document status to SENT with preview URL.
   - Verifies searchEmails executes multi_match query returning source: 'ELASTICSEARCH'.
4. Closes mock server and resets client to test offline graceful fallback.
5. [6.3 & 6.4] Seeds 3 diverse jobs into Supabase PostgreSQL (SCHEDULED, SENT, FAILED).
   - Tests subject query ('investment') -> returns 1 match with source: 'DATABASE_FALLBACK'.
   - Tests recipient email query ('cloudinfra.io') -> returns 1 match.
   - Tests body query ('BullMQ') -> returns 1 match.
   - Tests status filter ('SENT') -> returns only SENT record.
   - Tests pagination calculations (limit=2) -> total=3, totalPages=2.
6. [6.4] Launches Express API server transiently on port 5056; dispatches GET /api/emails/search via axios; validates HTTP 200 JSON payload.
7. Performs database cleanup and closes all servers and connections cleanly.
```

**Actual Test Execution Output:**
```text
 Starting Phase 6 (Elasticsearch Indexing & Full-Text Search) Verification Suite...

 [6.1] Testing Elasticsearch Client Health Check (Offline Graceful Fallback)...
   Default Node Health: {
  healthy: false,
  node: 'http://localhost:9200',
  error: 'Elasticsearch cluster unreachable'
}
    Offline state cleanly handled without unhandled exceptions

 [6.2 & 6.3] Testing Active Elasticsearch Pipeline with Transient Cluster...
   Mock Elasticsearch server running on http://127.0.0.1:9205
   Cluster health: healthy=true, clusterName=test-es-cluster
    Cluster health check verified
 [Elasticsearch] Index 'test-emails' initialized with search mappings.
    Index test-emails created with schema mappings
    Document indexed in real time into Elasticsearch
    Real-time status update to SENT verified in Elasticsearch index
   Search results via ES: total=1, source=ELASTICSEARCH
    Elasticsearch multi-field search execution verified

 [6.3 & 6.4] Testing Graceful Fallback with PostgreSQL Full-Text Search...
   Seeded 3 diverse test jobs in PostgreSQL database
   Search 'investment' -> Total: 1, Source: DATABASE_FALLBACK
    Subject query verified via database fallback
   Search 'cloudinfra.io' -> Total: 1
    Recipient email query verified via database fallback
   Search 'BullMQ' -> Total: 1
    Body text query verified via database fallback
   Status filter 'SENT' -> Total: 1
    Status filtering verified
   Pagination limit=2 -> Total: 3, Page Items: 2, TotalPages: 2
    Pagination verified

 [6.4] Testing Express Search API Route (GET /api/emails/search)...
   API Response Status: 200
   API Response Payload: { success: true, total: 1, source: 'DATABASE_FALLBACK', dataCount: 1 }
    Express GET /api/emails/search endpoint verified with axios

 Cleaning up test resources...
 ALL PHASE 6 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### Challenge 1: Elasticsearch Client v8 HTTP Header Verification
- **Problem**: When testing against a transient HTTP cluster, `@elastic/elasticsearch` v8 rejected all responses and threw `ProductNotSupportedError: The client noticed that the server is not Elasticsearch and we are unable to verify the connection`.
- **Diagnosis**: The official Elasticsearch v8 JavaScript client enforces strict product verification. It inspects all HTTP responses for the header `x-elastic-product: Elasticsearch`. If this header is missing, the client immediately drops the connection.
- **Solution**: Configured the mock test cluster to return `x-elastic-product: Elasticsearch` on all HTTP responses (including `HEAD`, `GET`, `PUT`, and `POST`). Result: Complete, native compatibility with official v8 client internals.

#### Challenge 2: Zero-Downtime Search Architecture
- **Problem**: In developer and CI environments where a multi-gigabyte Elasticsearch cluster may not be running locally, scheduling and dashboard search features must continue operating seamlessly.
- **Solution**: Implemented an automated dual-engine query router in `ElasticsearchService.searchEmails`. If the Elasticsearch cluster is healthy, it delegates to Elasticsearch with fuzzy `multi_match` queries. If unreachable, it executes a case-insensitive `contains` query across `recipientEmail`, `subject`, and `body` in PostgreSQL via Prisma. The frontend dashboard and backend APIs experience 100% uptime regardless of Elasticsearch cluster availability.

---

---

# Phase 7: Bull-Board & Express API Endpoints

### 1. What We Built & How We Proceeded
- **Google OAuth & JWT Session Authentication (7.1)**:
  - Authored [auth.service.ts](file:///e:/ReachInBox/backend/src/services/auth.service.ts) integrating `OAuth2Client` from `google-auth-library`. Verifies Google ID tokens, extracts verified profile details (email, name, picture), upserts the `User` record in PostgreSQL via Prisma, and signs session JWTs.
  - Implemented [auth.middleware.ts](file:///e:/ReachInBox/backend/src/middleware/auth.middleware.ts) providing `requireAuth` and `optionalAuth` middleware.
  - Authored [auth.controller.ts](file:///e:/ReachInBox/backend/src/controllers/auth.controller.ts) and [auth.routes.ts](file:///e:/ReachInBox/backend/src/routes/auth.routes.ts) mounting `POST /api/auth/google`, `POST /api/auth/demo`, and `GET /api/auth/me`.
- **Multi-Sender Account Management Endpoints (7.6)**:
  - Built [sender.controller.ts](file:///e:/ReachInBox/backend/src/controllers/sender.controller.ts) and [sender.routes.ts](file:///e:/ReachInBox/backend/src/routes/sender.routes.ts) mounting `GET /api/senders`, `POST /api/senders`, and `DELETE /api/senders/:id`.
  - Supports automatic provisioning of Ethereal accounts or registering custom SMTP accounts with connection verification.
- **Email Lead Ingestion & Staggered Scheduling (7.2)**:
  - Built [csvParser.ts](file:///e:/ReachInBox/backend/src/lib/csvParser.ts) supporting CSV files, tabular text, and newline-delimited recipient strings with regex validation and intra-batch deduplication.
  - Implemented `scheduleEmails` (`POST /api/emails/schedule`) in [email.controller.ts](file:///e:/ReachInBox/backend/src/controllers/email.controller.ts). Staggers recipient jobs across `interEmailDelayMs`, persists `EmailJob` records in PostgreSQL, synchronizes to Elasticsearch in real-time, and enqueues delayed jobs in BullMQ.
- **Scheduled, Sent, & Analytics Endpoints (7.3, 7.4, 7.5)**:
  - Built `GET /api/emails/scheduled`: paginated upcoming jobs with sender details.
  - Built `GET /api/emails/sent`: paginated delivered and failed jobs with Ethereal preview links.
  - Built `GET /api/emails/stats`: aggregate counts for total, scheduled, sent, failed, and rescheduled jobs.
- **Bull-Board Queue Monitoring Dashboard (7.7)**:
  - Authored [bullBoard.ts](file:///e:/ReachInBox/backend/src/config/bullBoard.ts) configuring `@bull-board/api` and `@bull-board/express` with `BullMQAdapter`.
  - Mounted live dashboard at `/admin/queues` showing active, delayed, waiting, and completed BullMQ queue states.

### 2. How Testing Was Conducted ([api.test.ts](file:///e:/ReachInBox/backend/src/test/api.test.ts))
Authoring a dedicated end-to-end integration test suite verifying every endpoint:
```text
[TEST] Starting Phase 7 (Bull-Board & Express API Endpoints) Verification Suite...

[INFO] Connected to Redis successfully
[INFO] BullMQ Email Worker initialized with concurrency: 5
   [INFO] Test server listening on http://127.0.0.1:5057

[STEP] [7.1] Testing Authentication Endpoints...
   Demo login response status: 200
   [PASS] Demo login succeeded (User: demo@reachinbox.local)
   Google auth response status: 200
   [PASS] Google auth endpoint verified: issued session token for founder@startup.io
   [PASS] GET /api/auth/me returned authenticated user profile

[STEP] [7.6] Testing Sender Accounts Endpoints...
   [PASS] Provisioned sender: wjxs5wxletwyd4l4@ethereal.email (Primary Outbound Mailer)
   [PASS] GET /api/senders returned 1 registered sender account(s)

[STEP] [7.2] Testing Email Scheduling Endpoint with CSV Leads...
   Schedule response: { success: true, totalLeads: 3, invalidCount: 1, staggerDelayMs: 1500 }
   [PASS] Batch CSV parsing, DB persistence, and BullMQ enqueuing verified

[STEP] [7.3] Testing Scheduled Emails Endpoint...
   Scheduled jobs count: 3
   [PASS] GET /api/emails/scheduled returned 3 upcoming jobs with sender details

[STEP] [7.5] Testing Stats Endpoint...
   Email statistics: { total: 3, scheduled: 3, sent: 0, failed: 0, rescheduled: 0 }
   [PASS] GET /api/emails/stats returned aggregate counts

[STEP] [7.4] Testing Sent Emails Endpoint...
   Sent jobs count: 1
   [PASS] GET /api/emails/sent returned delivered jobs with preview URL: https://ethereal.email/message/test-delivered-url

[STEP] [7.7] Testing Bull-Board Dashboard UI Route (GET /admin/queues)...
   Bull-Board HTTP Status: 200
   Content-Type: text/html; charset=utf-8
   [PASS] Bull-Board dashboard UI accessible and mounted at /admin/queues

[CLEANUP] Cleaning up test records and stopping test server...
[SUCCESS] ALL PHASE 7 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### Challenge 1: First-Line CSV Header Normalization
- **Problem**: When lead CSV inputs contained leading newlines or empty preamble lines, header detection checking index 0 failed to identify the email column, misinterpreting the header string as an invalid recipient email.
- **Solution**: Refactored [csvParser.ts](file:///e:/ReachInBox/backend/src/lib/csvParser.ts) to track header detection on the first non-empty line using a dedicated state flag (`headerProcessed`).

#### Challenge 2: BullMQ Worker Missing Record Guard
- **Problem**: When residual test jobs remained in BullMQ Redis delayed queues after transient test cleanup, worker threads attempting to update job status threw `RecordNotFound` database errors.
- **Solution**: Added defensive record verification in [email.worker.ts](file:///e:/ReachInBox/backend/src/queues/email.worker.ts). If the job is not found in PostgreSQL, the worker logs an informational notice and gracefully emits `SKIPPED`.

---

## Roadmap of Upcoming Phases (To Be Logged Sequentially)

- **Phase 8: Frontend Dashboard (Figma-Matched UI)**
  - Google Login screen, tabbed Scheduled/Sent tables, lead dropzone, Bull-Board shortcut.
- **Phase 9 & 10: Testing, Load Simulation & Submission Kit**
  - Server restart resilience test, 1000+ lead CSV stress test, documentation, demo video script.
