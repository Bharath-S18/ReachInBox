# Task Breakdown: Landing Page & Gmail-Style Drafts

- [x] 1. Backend: Add `EmailDraft` Prisma model and run `prisma generate` <!-- id: 1 -->
- [x] 2. Backend: Implement Drafts Controller & Routes (`GET /api/drafts`, `POST /api/drafts`, `DELETE /api/drafts/:id`) <!-- id: 2 -->
- [x] 3. Backend: Register draft routes in `backend/src/index.ts` <!-- id: 3 -->
- [x] 4. Frontend: Define `EmailDraft` type in `frontend/src/types.ts` and add `draftApi` in `frontend/src/services/api.ts` <!-- id: 4 -->
- [x] 5. Frontend: Build modern SaaS `LandingPage.tsx` with Google OAuth integration <!-- id: 5 -->
- [x] 6. Frontend: Integrate `LandingPage.tsx` into `frontend/src/App.tsx` for unauthenticated visitors <!-- id: 6 -->
- [x] 7. Frontend: Add `Drafts` tab and live count pill in `frontend/src/components/layout/Sidebar.tsx` <!-- id: 7 -->
- [x] 8. Frontend: Enhance `ComposeView.tsx` with auto-save, "Draft saved" indicator, and draft cleanup <!-- id: 8 -->
- [x] 9. Frontend: Support Drafts list and click-to-resume in `EmailListView.tsx` and `App.tsx` <!-- id: 9 -->
- [x] 10. Verification: Run monorepo build and test full flow <!-- id: 10 -->
- [x] 11. Frontend: Modernize Queue Telemetry with animated worker equalizer waves, interactive inspection modals, live auto-polling countdown, and responsive design <!-- id: 11 -->
