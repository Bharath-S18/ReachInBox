# 🛠️ ReachInbox Scheduler – Engineering & Development Journal

This journal serves as the single source of truth for **how** each phase and subtask was planned, built, tested, and debugged. It candidly captures technical architecture decisions, concrete test suites used for verification, the real-world engineering hurdles encountered along the way, and how they were resolved.

---

## 📌 Document Structure
For every phase, we document:
1. **What We Built & How We Proceeded**: Granular breakdown of implementation decisions, file changes, and data flow.
2. **How Testing Was Conducted**: The exact scripts, test harnesses, edge cases, and logs used to validate functionality.
3. **Engineering Challenges & Solutions**: Real bugs, environmental blockers, runtime surprises, and the exact fixes applied.
4. **Current Status & Transition**: Readiness state before advancing to the next phase.

---

# 🔹 Phase 1: Project Scaffolding & Infrastructure

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

# 🔹 Phase 2: Relational Database Schema & Prisma ORM Layer

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

# 🔹 Phase 3: BullMQ Queue Engine, Rate Limiting & Concurrency

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
🧪 Starting Phase 3 (BullMQ & Rate Limiting) Verification Suite...

👉 [3.1] Testing Redis & Queue Initialization...
🔌 Connected to Redis successfully
⚙️ BullMQ Email Worker ready with concurrency: 5
   ✅ Redis ping: OK
   ✅ BullMQ Queue instantiated.

👉 [3.4] Testing Redis-backed Hourly Rate Limiting...
   Initial check: allowed=true, count=0
   After 3 sends: count=3, allowed=true
   4th check (exceeding limit): allowed=false, count=3
   ✅ Redis rate limiter successfully enforced hourly boundary and counted atomically

👉 [3.2, 3.3, 3.5, 3.6] Testing End-to-End Worker Processing & Idempotency...
   Enqueuing Job 1 (under limit)...
[Worker] Processing Job phase3-job-1 for recipient: lead1@test.local
⏱️ [Worker] Applying throttling delay: 200ms
✅ [Worker] Successfully processed job phase3-job-1 to lead1@test.local
✨ Job phase3-job-1 completed with status: SENT
   Job 1 DB Status: SENT
   ✅ Job 1 completed and marked SENT in database
   Testing Idempotency: re-enqueuing Job 1...
[Worker] Job phase3-job-1 already marked as SENT. Skipping.
✨ Job phase3-job-1-retry completed with status: SKIPPED
   ✅ Idempotency verified: duplicate job skipped cleanly
   Enqueuing Job 2 (exceeding limit of 1/hr)...
⚠️ [Worker] Sender phase3-test-sender hit hourly rate limit (1/1). Rescheduling job to next hour window
   📢 [Alert Hook] Live Rate Limit Alert received: sender=phase3-test-sender, count=1/1
   Job 2 DB Status: RESCHEDULED
   ✅ Job 2 successfully moved to delayed state with status RESCHEDULED
   ✅ Live Alert handler triggered for Phase 4 Slack integration

🧹 Cleaning up test records...

🎉 ALL PHASE 3 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### ⚠️ Challenge 1: Windows Host vs. WSL2 Redis Networking Isolation
- **Problem**: Docker was unavailable on the Windows host machine. We installed `redis-server` in Ubuntu WSL2, but Windows Node.js connections to `localhost:6379` threw `ECONNREFUSED`. Connecting directly to the WSL virtual IP (`172.29.51.8`) was blocked by the Windows Hyper-V firewall (`vEthernet WSL`).
- **Diagnosis**: WSL2 runs inside a virtual NAT switch. Windows automatic port forwarding only functions under specific conditions or with elevated firewall rules.
- **Solution**: We searched WinGet for non-admin, native Windows Redis distributions and discovered `taizod1024.redis-windows-fork` (version 8.10.2), which is an official MSYS2-compiled portable Redis package. Installed via WinGet and launched directly as a background Windows daemon:
  ```powershell
  redis-server.exe --port 6379
  ```
  Result: Instant, native port 6379 access without virtualization overhead or firewall conflicts.

#### ⚠️ Challenge 2: Node.js IPv6 Resolution vs. Redis IPv4 Loopback
- **Problem**: When configuring `ioredis` with `host: 'localhost'`, Node.js v24 resolved `localhost` to IPv6 `::1` first. Since Redis was bound to IPv4 `127.0.0.1`, `ioredis` crashed with repeated `ECONNREFUSED 127.0.0.1:6379` connection retries.
- **Solution**: Updated `backend/src/config/redis.ts` to strictly sanitize the host:
  ```typescript
  host: process.env.REDIS_HOST === 'localhost' || !process.env.REDIS_HOST ? '127.0.0.1' : process.env.REDIS_HOST
  ```
  Additionally sanitized `REDIS_PASSWORD` so empty string `""` values are coerced to `undefined`, preventing unneeded Redis AUTH commands.

#### ⚠️ Challenge 3: BullMQ `moveToDelayed` Missing Lock Warning
- **Problem**: When rescheduling a job that exceeded the hourly rate limit, the worker processor executed:
  ```typescript
  await job.moveToDelayed(Date.now() + msUntilReset, job.token);
  return { status: 'RESCHEDULED' };
  ```
  This produced a runtime warning:
  `💥 Worker internal error: Missing lock for job ... moveToFinished`.
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

# 🔹 Phase 4: Slack OAuth Integration & Live Alerting

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
    - ⚠️ **Header**: `ReachInbox Hourly Rate Limit Reached`
    - **Sender field**: Sender email / ID.
    - **Hourly Quota field**: `50 / 50 emails`.
    - **Reschedule Policy**: Preserved in BullMQ queue.
    - **Next Send Window**: Exact UTC time of the next hour window.
    - **Context badge**: `🔒 Idempotent scheduler: Zero emails will be dropped or duplicated.`
  - Dispatches instantly via `axios.post(webhookUrl, messagePayload)`.
- **Graceful Fallback & Zero-Crash Architecture (4.5)**:
  - If a user has not linked Slack or if the webhook fails, the alert dispatcher logs a clean informational notice (`ℹ️ [SlackAlert] User X has not connected Slack. Gracefully skipping Slack alert.`) and returns `false`. The email worker and queue continue running without disruption.
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
🧪 Starting Phase 4 (Slack OAuth & Live Alerting) Verification Suite...

👉 [4.1] Testing Slack OAuth Authorization URL...
   Generated Auth URL: https://slack.com/oauth/v2/authorize?client_id=&scope=incoming-webhook%2Cchat%3Awrite&redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fslack%2Fcallback&state=phase4-user-1792554648681
   ✅ Slack OAuth authorization URL properly formed with required scopes

👉 [4.5] Testing Graceful Fallback (User has no Slack connected)...
ℹ️ [SlackAlert] User phase4-user-1792554648681 has not connected Slack. Gracefully skipping Slack alert.
   Fallback alert result: false
   ✅ Graceful fallback verified: logged cleanly without exceptions or crashes

👉 [4.2 & 4.3] Testing SlackIntegration DB Persistence, Status & Disconnect...
   Mock Slack webhook receiver listening on http://127.0.0.1:5055
   Retrieved Slack status: {
  connected: true,
  mode: 'OAUTH',
  channelName: 'alerts-rate-limits',
  connectedAt: '2026-10-21T03:50:49.544Z',
  teamId: 'T12345678'
}
   ✅ Slack status correctly reflects active integration and target channel

👉 [4.4] Testing Live Rate Limit Alert Dispatcher...
📢 [SlackAlert] Real-time rate limit notification delivered to Slack successfully!
   Alert dispatch result: true
   Received Slack Block Kit payload: {
  "text": "⚠️ Rate Limit Alert: Sender marketing@reachinbox.local reached hourly threshold",
  "blocks": [...]
}
   ✅ Live formatted Slack Block Kit alert successfully received by webhook

👉 Testing Disconnect Flow...
   Disconnect result: { success: true }
   Status after disconnect: { connected: false, mode: 'NONE', channelName: null }
   ✅ Slack integration cleanly disconnected

🧹 Cleaning up test user...

🎉 ALL PHASE 4 SUBTASKS VERIFIED SUCCESSFULLY!
```

---

### 3. Engineering Challenges & Solutions

#### ⚠️ Challenge 1: Replacing Native `fetch` with `axios` Across the Stack
- **Problem**: Native `fetch` does not have built-in timeout configurations and requires verbose `AbortController` boilerplate. If Slack's incoming webhook experienced packet drops or high API latency, worker threads could hang waiting for socket responses.
- **Solution**: Added `axios` to the project (`npm install axios --workspace=backend`). Refactored `SlackService` to use `axios.post` with a strict `timeout: 8000` configuration and used `axios.isAxiosError(err)` for granular error inspection. This ensures worker threads are guaranteed to be unblocked within 8 seconds even under complete Slack network outages.

---

## 🔹 Roadmap of Upcoming Phases (To Be Logged Sequentially)

- **Phase 5: Multi-Sender SMTP Dispatcher (Ethereal Email)**
  - Dynamic Nodemailer transport per sender account with connection pooling.
  - Live capture and persistence of Ethereal preview URLs (`getTestMessageUrl`).
- **Phase 6: Elasticsearch Indexing & Full-Text Search**
  - Sync pipeline between Prisma updates and Elasticsearch index `emails`.
  - Full-text search endpoint across recipient, subject, and body.
- **Phase 7: Bull-Board & Express API Endpoints**
  - Google OAuth token verification (`google-auth-library`).
  - Lead CSV parser and bulk job enqueue endpoint (`POST /api/emails/schedule`).
  - Bull-Board dashboard mounted at `/admin/queues`.
- **Phase 8: Frontend Dashboard (Figma-Matched UI)**
  - Google Login screen, tabbed Scheduled/Sent tables, lead dropzone, Bull-Board shortcut.
- **Phase 9 & 10: Testing, Load Simulation & Submission Kit**
  - Server restart resilience test, 1000+ lead CSV stress test, documentation, demo video script.
