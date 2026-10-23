# BriefCraft AI — AI Meeting Brief Generator (PRD)

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
