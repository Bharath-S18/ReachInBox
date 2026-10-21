# 📋 ReachInbox Email Job Scheduler – Master Progress Checklist

This document tracks all implementation phases and granular subtasks for building the production-grade email scheduler service and dashboard.

---

## 📌 Overall Progress Summary
- [x] **Phase 1: Project Scaffolding & Infrastructure** (6/6 completed)
- [x] **Phase 2: Relational Database Schema & Prisma ORM Layer** (7/7 completed)
- [ ] **Phase 3: BullMQ Queue Engine, Rate Limiting & Concurrency** (0/6 completed)
- [ ] **Phase 4: Slack OAuth Integration & Live Alerting** (0/5 completed)
- [ ] **Phase 5: Multi-Sender SMTP Dispatcher (Ethereal Email)** (0/4 completed)
- [ ] **Phase 6: Elasticsearch Indexing & Full-Text Search** (0/4 completed)
- [ ] **Phase 7: Bull-Board & Express API Endpoints** (0/7 completed)
- [ ] **Phase 8: Frontend Dashboard (Figma-Matched UI)** (0/10 completed)
- [ ] **Phase 9: Testing, Load Simulation & Resilience Verification** (0/4 completed)
- [ ] **Phase 10: Submission Kit & Documentation** (0/4 completed)

---

## 🔹 Phase 1: Project Scaffolding & Infrastructure
- [x] **1.1 Monorepo Setup**: Initialize root `package.json` with workspace configuration and unified run scripts (`npm run dev`, `npm run build`).
- [x] **1.2 Backend Scaffolding**: Setup `backend/` directory with `package.json`, `tsconfig.json`, and initial TypeScript build pipeline.
- [x] **1.3 Frontend Scaffolding**: Setup `frontend/` directory with React, TypeScript, and Tailwind CSS.
- [x] **1.4 Docker Compose Configuration**: Create `docker-compose.yml` for PostgreSQL, Redis, and Elasticsearch.
- [x] **1.5 Environment Templates**: Create `.env.example` files for backend and frontend documenting all required variables.
- [x] **1.6 Repository Hygiene**: Add `.gitignore` to prevent committing `node_modules`, build artifacts, and secrets.

---

## 🔹 Phase 2: Relational Database Schema & Prisma ORM Layer
- [x] **2.1 Prisma Setup**: Initialize Prisma with PostgreSQL for Supabase-hosted relational storage and generate the Prisma Client.
- [x] **2.2 User Model**: Define `User` model for Google OAuth profiles (`id`, `email`, `name`, `avatar`, `createdAt`).
- [x] **2.3 SenderAccount Model**: Define `SenderAccount` model for multi-sender SMTP credentials (`id`, `email`, `host`, `port`, `user`, `pass`, `hourlyLimit`).
- [x] **2.4 EmailJob Model**: Define `EmailJob` model with idempotency, status enum (`PENDING`, `SCHEDULED`, `SENDING`, `SENT`, `FAILED`, `RESCHEDULED`), scheduled time, delivery time, preview URL, and metadata.
- [x] **2.5 SlackIntegration Model**: Define `SlackIntegration` model (`userId`, `accessToken`, `channelId`, `channelName`, `incomingWebhookUrl`, `connectedAt`).
- [x] **2.6 Database Migrations**: Generate and apply the initial PostgreSQL migration to the configured Supabase database.
- [x] **2.7 Seeding Utility**: Create and run the automated seed script to provision a configured Ethereal sender account in Supabase.

---

## 🔹 Phase 3: BullMQ Queue Engine, Rate Limiting & Concurrency
- [ ] **3.1 Queue Initialization**: Create BullMQ `emailQueue` and `emailWorker` with persistent Redis connection.
- [ ] **3.2 Worker Concurrency**: Support configurable worker concurrency via `WORKER_CONCURRENCY` env variable.
- [ ] **3.3 Inter-Email Throttling Delay**: Enforce minimum delay between consecutive email sends (e.g., 2000ms) to avoid provider throttling.
- [ ] **3.4 Redis-Backed Hourly Rate Limiting**: Implement distributed hourly window counter (`rate_limit:{senderId}:{YYYYMMDDHH}`) safe across multiple workers.
- [ ] **3.5 Order-Preserving Rescheduling**: When hourly cap is exceeded, calculate milliseconds to next hour window and re-queue delayed job without dropping it.
- [ ] **3.6 Restart Resilience & Idempotency**: Verify BullMQ delayed jobs persist across server restarts, and DB status checks prevent duplicate sends.

---

## 🔹 Phase 4: Slack OAuth Integration & Live Alerting
- [ ] **4.1 Slack OAuth Flow Initiation**: Create `GET /api/slack/authorize` to redirect user to Slack OAuth approval screen with required scopes.
- [ ] **4.2 Slack OAuth Callback**: Create `GET /api/slack/callback` to exchange code for bot access token and incoming webhook URL.
- [ ] **4.3 Slack Status & Disconnect**: Create `GET /api/slack/status` and `POST /api/slack/disconnect` endpoints for managing the connection.
- [ ] **4.4 Real-Time Rate Limit Alert Dispatcher**: Trigger a formatted Slack message immediately when a sender hits the hourly limit.
- [ ] **4.5 Graceful Fallback**: Ensure rate limit events log cleanly without crashing if the user has not connected Slack.

---

## 🔹 Phase 5: Multi-Sender SMTP Dispatcher (Ethereal Email)
- [ ] **5.1 Nodemailer Transporter**: Configure Nodemailer with Ethereal SMTP transport and connection pooling.
- [ ] **5.2 Multi-Sender Rotation**: Support rotating or assigned sender accounts per email campaign.
- [ ] **5.3 Test Message URL Capture**: Extract `nodemailer.getTestMessageUrl(info)` and save preview URLs to the database.
- [ ] **5.4 Delivery Error Handling**: Capture failure reasons, log error states, and update job status accordingly.

---

## 🔹 Phase 6: Elasticsearch Indexing & Full-Text Search
- [ ] **6.1 Elasticsearch Client Setup**: Initialize Elasticsearch client with health check and graceful fallback.
- [ ] **6.2 Index & Mapping Setup**: Create `emails` index with mappings for `recipientEmail`, `subject`, `body`, `status`, and timestamps.
- [ ] **6.3 Real-Time Sync Pipeline**: Automatically index/update email documents upon scheduling, rescheduling, and sending.
- [ ] **6.4 Search API Endpoint**: Create `GET /api/emails/search?q={query}&status={status}` with multi-field search and pagination.

---

## 🔹 Phase 7: Bull-Board & Express API Endpoints
- [ ] **7.1 Authentication Endpoints**:
  - `POST /api/auth/google` (Google ID token verification via `google-auth-library` and JWT issue).
  - `GET /api/auth/me` (retrieve active session and user profile).
- [ ] **7.2 Email Scheduling Endpoint**:
  - `POST /api/emails/schedule` (batch CSV recipient parsing, DB creation, and BullMQ delayed job enqueueing).
- [ ] **7.3 Scheduled Emails Endpoint**:
  - `GET /api/emails/scheduled` (paginated list of upcoming jobs with filters).
- [ ] **7.4 Sent Emails Endpoint**:
  - `GET /api/emails/sent` (paginated list of delivered and failed jobs with Ethereal preview links).
- [ ] **7.5 Stats Endpoint**:
  - `GET /api/emails/stats` (counts for scheduled, sent, failed, and rate-limited jobs).
- [ ] **7.6 Sender Accounts Endpoint**:
  - `GET /api/senders` & `POST /api/senders` (manage and inspect sender accounts).
- [ ] **7.7 Bull-Board UI**: Mount `@bull-board/express` at `/admin/queues` for real-time visual queue monitoring.

---

## 🔹 Phase 8: Frontend Dashboard (Figma-Matched UI)
- [ ] **8.1 Styling & Design System**: Tailwind CSS theme configuration matching Figma colors, typography, borders, and shadows.
- [ ] **8.2 Google OAuth Login**: Implement Google Login screen (`@react-oauth/google`) with clean authentication state handling.
- [ ] **8.3 Header & Profile Bar**: Display user avatar, name, email, Slack connection status badge ("Connect Slack" / "Slack Connected"), and Logout button.
- [ ] **8.4 Tabbed Interface**: Segment views cleanly into **Scheduled Emails** and **Sent Emails**.
- [ ] **8.5 Compose Email Modal**:
  - Subject and body inputs.
  - CSV / Text lead file dropzone with instant client-side lead count parser.
  - Scheduling start time picker.
  - Inter-email delay (seconds) input.
  - Hourly limit input.
  - Submit action with validation and toast alerts.
- [ ] **8.6 Scheduled Emails Table**: Recipient email, subject, scheduled time, status badge, and empty/loading states.
- [ ] **8.7 Sent Emails Table**: Recipient email, subject, sent time, status badge, and clickable "View in Ethereal" link.
- [ ] **8.8 Live Search Bar**: Debounced search input connected to the Elasticsearch search endpoint.
- [ ] **8.9 Slack Connection Modal / Redirect**: UI button triggering Slack OAuth flow and showing active channel.
- [ ] **8.10 Bull-Board Shortcut**: Dedicated button to open the live BullMQ queue dashboard.

---

## 🔹 Phase 9: Testing, Load Simulation & Resilience Verification
- [ ] **9.1 Server Restart Resilience Test**: Schedule jobs into future -> kill backend process -> restart -> verify execution on time without re-sending past emails.
- [ ] **9.2 Hourly Rate Limit & Slack Alert Test**: Enqueue batch exceeding hourly limit -> verify threshold cutoff, reschedule delay, and live Slack notification.
- [ ] **9.3 Concurrency & Throttling Test**: Run multiple jobs concurrently and verify inter-email delay is strictly respected.
- [ ] **9.4 High-Volume Lead Ingestion Test**: Ingest 1000 leads via CSV and verify queue integrity and system stability.

---

## 🔹 Phase 10: Submission Kit & Documentation
- [ ] **10.1 Comprehensive README.md**: Complete documentation of architecture, setup instructions, BullMQ scheduling mechanics, rate-limiting design, and concurrency.
- [ ] **10.2 Environment Configuration Guide**: Step-by-step instructions for Google OAuth, Slack App, Ethereal, and Docker.
- [ ] **10.3 5-Minute Demo Video Script**: Step-by-step checklist of flows to record for the demo video.
- [ ] **10.4 Final Code Review & Cleanup**: Remove debugging logs, verify TypeScript builds with zero errors, and check repository access permissions.
