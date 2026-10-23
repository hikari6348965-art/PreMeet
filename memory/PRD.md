# PreMeet — AI Meeting Brief Generator (PRD)

## Original problem statement
SaaS that prepares users for meetings by collecting context (calendar, CRM, notes, email) and generating a one-page personalized meeting brief.
MVP Phase 1: JWT email+password auth, onboarding, manual meeting + notes entry, AI brief with source attribution (Claude Sonnet 5.5 via Emergent LLM key), client memory, usage/quota, pricing (Razorpay), premium minimal B2B light theme.

## Architecture
- Backend: FastAPI + Motor (MongoDB). Files: server.py, auth.py, brief_service.py, billing.py, seed.py, models.py, database.py
- Frontend: Vite + React 19 + Tailwind v4 + React Router. Pages: Landing, Login, Register, Onboarding, Dashboard, Meetings, BriefViewer, ClientMemory, Integrations, Settings, Admin

## Implemented
- 2026 (session 1): Backend fully built; most frontend pages
- 2026-06 (session 2): Settings page (preferences, plan/usage card), Admin page (stats, users, editable plans, audit). Fixes: brute-force lockout uses X-Forwarded-For; /auth/refresh 401 for missing user; tenant-scoped company/contact lookups; plan update validation (ge=0) + UI validation; error states; "Setup required" badge on OAuth integration cards. Testing: iteration_1 — 18/18 backend pytest pass after fixes, all frontend flows pass.

## Mocked / not configured
- Calendar/CRM/Email OAuth: show "Setup required" (no credentials)
- Razorpay: LIVE integration with user's TEST keys (rzp_test). Prices shown USD, charged INR at fixed rate 88 (billing.USD_INR_RATE). One-time 30-day payments, no auto-renew.

## Billing (2026-06, session 3)
- /app/billing page (plans, current plan, payment history, downgrade confirm), Razorpay Checkout.js (lib/checkout.js)
- Orders stored in db.payment_orders; verify uses stored plan; idempotent; webhook payment.captured/order.paid activates (amount checked)
- Paid plans expire after 30 days -> auto-downgrade to free
- Upgrade dialog on 402 quota exceeded; landing pricing shows INR note
- Tests: iteration_2 + fixes; 28/28 backend pytest pass

## Backlog
- P1: Renewal reminder email before 30-day period ends
- P1: Swap native select/checkbox/datetime for shadcn components
- P2: Background job for auto brief generation, email notifications for ready briefs, Google/Outlook calendar OAuth
- P3: CRM integrations (HubSpot/Salesforce), forgotten-commitment detection
- Tech: split server.py into routers

## Session 3 (2026-06): Email, Google, Video, Notes, Redesign
- Brief-ready emails (Emergent managed Resend, email_service.py); auto after generation if preference on; POST /api/briefs/{id}/email (409 while sending, 60s limit after sent)
- Google Calendar + Gmail OAuth (google_service.py, routes_extra.py): /api/integrations/{google_calendar|gmail}/connect -> authorization_url; callback /api/integrations/google/callback; POST /api/integrations/google/sync imports 30 days of events; Gmail thread snippets added to brief context. Refresh token Fernet-encrypted (key from JWT_SECRET).
  - BLOCKER (user config): add redirect URI https://meeting-brief-8.preview.emergentagent.com/api/integrations/google/callback (+ prod domain) in Google Cloud OAuth client; add test users.
- Video rooms (Daily.co, video_service.py): POST /api/meetings/{id}/room, guest invite /join/:meetingId?k=, POST /api/public/rooms/{id}/join. Daily plan has no cloud recording -> rooms created without recording (cached flag).
  - BLOCKER (user config): Daily account needs a payment method; joins fail with account-missing-payment-method.
- Meeting notes: GET/PUT /api/meetings/{id}/notes (manual), POST .../notes/upload (Emergent object storage -> imageio-ffmpeg -> whisper-1 -> Claude extraction -> action items to commitments, deduped), POST .../notes/process (Daily cloud recording, only when plan allows), GET .../notes/pdf (reportlab). Stale processing >20min auto-fails.
- Redesign "Crisp and confident": Space Grotesk display, ink #0B0F1A, indigo primary, signal lime #C6F432, dark sidebar, hard-shadow cards, marquee, staggered rises.
- Tests: iteration_4 + fixes; backend pytest all pass.
- Outlook/HubSpot/Salesforce: "Coming soon" (need developer apps)

## Session 4 (2026-06)
- Renamed product to PreMeet (UI, emails EMAIL_FROM_NAME, PDF, title). Storage namespace 'briefcraft' and admin email admin@briefcraft.ai intentionally unchanged.
- Google login/signup (Emergent managed): POST /api/auth/google-session links by email, issues app JWT. AuthCallback on /app#session_id. See /app/auth_testing.md.
- Microsoft/Outlook integration: removed at user request (none written). MICROSOFT_CLIENT_ID/SECRET secrets exist but unused.
- Tests iteration_5: all pass except brief emails failing due to Emergent email insufficient_credits (environment).
- Logo (2026-06): user-supplied PreMeet logo processed into /app/frontend/public/brand/ (logo-white.png, logo-ink.png, mark-*.png, favicon.png, apple-touch-icon.png). Rendered via components/Logo.jsx across landing nav/footer, login/register, onboarding, app sidebar, mobile header, guest join. Favicon + meta description updated in index.html.
