# ReachInBox Master Task List

## Track 1: Local Full-Stack Launch & Verification

### Task 1.1: Verify & Boot Local Backend Services
**Description:** Ensure Redis is active, apply any pending Prisma migrations, and start the Express backend server on port 5000.

**Acceptance criteria:**
- [ ] Redis responds on `localhost:6379`.
- [ ] Express server starts with HTTP 200 on `http://localhost:5000/health`.
- [ ] Bull-Board queue dashboard accessible at `http://localhost:5000/admin/queues`.

**Verification:**
- [ ] Run `curl http://localhost:5000/health` or open in browser.
- [ ] Check Bull-Board displays `emailQueue`.

**Dependencies:** None  
**Files likely touched:** None (operational)  
**Estimated scope:** Small

---

### Task 1.2: Launch React Frontend Application
**Description:** Start Vite development server for the React frontend with proxy to backend.

**Acceptance criteria:**
- [ ] Frontend launches on `http://localhost:5173` (or configured port).
- [ ] Gmail UI renders cleanly without console errors.
- [ ] Authentication works (Demo Login / Google OAuth).

**Verification:**
- [ ] Open frontend in browser, login with Demo User.

**Dependencies:** Task 1.1  
**Files likely touched:** None (operational)  
**Estimated scope:** Small

---

### Task 1.3: End-to-End Campaign Delivery Verification
**Description:** Execute a real scheduled email campaign in the browser to verify the entire pipeline from UI to Ethereal inbox.

**Acceptance criteria:**
- [ ] Compose email with 3 recipients (or attach a test CSV).
- [ ] Set inter-email delay to 2 seconds and click Schedule.
- [ ] Observe jobs appear under "Scheduled" tab and inside Bull-Board.
- [ ] Wait for jobs to execute; observe status transition to "Sent".
- [ ] Click "View Preview" link on a sent email and inspect actual rendered HTML in Ethereal.

**Verification:**
- [ ] Confirm Ethereal preview URL opens and displays formatted message.

**Dependencies:** Task 1.2  
**Estimated scope:** Small

---

## Checkpoint: Core Local Pipeline Validated
- [ ] Backend and Frontend running simultaneously without errors.
- [ ] Campaign scheduled, executed, and delivered to Ethereal SMTP.
- [ ] User confirms the local app behavior is satisfactory.

---

## Track 2: Submission Kit & Evaluation Assets

### Task 2.1: Generate Pre-packaged CSV Test Files
**Description:** Create sample CSV files (`sample-leads-5.csv`, `sample-leads-50.csv`, `sample-leads-mixed-invalid.csv`) in `tests/fixtures/` or `sample_data/` so evaluators and testers can test lead upload in one click.

**Acceptance criteria:**
- [ ] Standard CSV with headers (`email,name,company`).
- [ ] Mixed CSV with valid and invalid addresses to demonstrate syntax validation.

**Verification:**
- [ ] Drop file into ComposeView and verify lead count badge.

**Dependencies:** None  
**Files likely touched:** `sample_data/leads.csv`  
**Estimated scope:** Small

---

### Task 2.2: 5-Minute Demo Video Walkthrough Script
**Description:** Review and refine the recorded video checklist in `CHECKLIST.md` (covering Architecture, Scheduler, Concurrency, Rate Limiting & Rescheduling, Search, and Ethereal Delivery) for smooth recording.

**Acceptance criteria:**
- [ ] Step-by-step 5-minute timed script ready for screen recording.

**Verification:**
- [ ] Review checklist with user.

**Dependencies:** Checkpoint 1  
**Estimated scope:** Small

---

## Track 3: Deployment (Optional / Cloud Hosting)

### Task 3.1: Single-Command Docker Compose Test
**Description:** Test spinning up the entire stack using `docker compose up --build` to verify container networking between Postgres, Redis, Elasticsearch, Backend, and Frontend Nginx.

**Acceptance criteria:**
- [ ] Containers build and start without error.
- [ ] Web app reachable at `http://localhost:3000`.

**Dependencies:** None  
**Files likely touched:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`  
**Estimated scope:** Medium

---

### Task 3.2: Cloud Platform Deployment (Vercel + Railway/Render)
**Description:** Connect GitHub repository to Vercel (Frontend) and Railway (Backend + DB + Redis) for public live URLs.

**Acceptance criteria:**
- [ ] Live public frontend URL working.
- [ ] Live backend API communicating with frontend via `VITE_API_URL`.

**Dependencies:** GitHub repo pushed  
**Estimated scope:** Medium
