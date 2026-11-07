# Implementation Plan: SaaS Landing Page & Gmail-Style Database Drafts

## Overview
This plan implements two major features requested by the user:
1. **Full Marketing Landing Page**: Replaces the isolated login box with a modern SaaS marketing landing page featuring a sticky header, hero section with interactive preview, feature pillars, and Google OAuth sign-in CTAs.
2. **Gmail-Style Database Drafts**: Fully persistent drafts system with Prisma model, backend REST API, auto-save in `ComposeView`, a dedicated `Drafts` tab in the sidebar with live counts, and click-to-resume functionality.

---

## Technical Specifications

### Feature 1: SaaS Marketing Landing Page (`frontend/src/components/landing/LandingPage.tsx`)
- **Structure**:
  - Sticky Top Nav: ReachInbox logo, architecture highlights link, and Google Sign-In button.
  - Hero Section: Headline ("Distributed Cold Outreach & Intelligent Email Scheduler"), live status badges, "Continue with Google" primary CTA, and an interactive mockup preview of the mail dashboard.
  - Core Feature Pillars:
    - Distributed BullMQ Queuing with Redis ZSET delayed dispatch.
    - Multi-Sender SMTP Rotation with hourly rate-limit throttling (2,000ms inter-email sleep).
    - Slack Rate-Limit Webhook alerting.
    - Ethereal SMTP live preview URL generation.
  - Footer: Monorepo tech stack & architecture specs.
- **Auth Flow**: Clicking any Google button invokes `useGoogleLogin` and transitions seamlessly into the authenticated app upon success.

### Feature 2: Gmail-Style Database Drafts
- **Backend Schema (`backend/prisma/schema.prisma`)**:
  - `model EmailDraft`: `id`, `userId`, `recipientEmail`, `subject`, `body`, `senderAccountId`, `delaySeconds`, `createdAt`, `updatedAt`.
- **Backend API (`backend/src/controllers/draft.controller.ts` & `backend/src/routes/draft.routes.ts`)**:
  - `GET /api/drafts` - Fetch user's drafts with total count.
  - `POST /api/drafts` - Upsert draft (create new or update existing by `id`).
  - `DELETE /api/drafts/:id` - Delete draft on discard or when scheduled.
- **Frontend Integration**:
  - `frontend/src/types.ts`: Define `EmailDraft`.
  - `frontend/src/services/api.ts`: Add `draftApi`.
  - `Sidebar.tsx`: Add `Drafts` tab with draft count pill between `Scheduled` and `Sent`.
  - `ComposeView.tsx`: Debounced auto-save (1000ms), "Draft saved" footer indicator, and draft cleanup on dispatch.
  - `EmailListView.tsx` & `App.tsx`: Render drafts list view with click-to-resume in `ComposeView`.

---

## Verification Plan
1. Monorepo TypeScript & Vite build verification (`npm run build`).
2. Schema migration verification (`npx prisma db push` / `prisma generate`).
3. Manual testing:
   - Land on marketing page when logged out.
   - Click "Continue with Google" to log in.
   - Open Compose, type an email, observe "Draft saved".
   - Close compose, navigate to "Drafts" tab in sidebar, verify draft appears with correct count.
   - Click draft to re-open and schedule it, verify draft disappears from Drafts and appears in Scheduled.
