# INTEGRITY SOLVE — Project Memory

## What This Project Is
A production-grade AML/CTF (Anti-Money Laundering / Counter-Terrorism Financing) compliance SaaS platform for Australian reporting entities. Replaces Word docs, CDD spreadsheets, and manual screening reminders with a single audit-grade operating system.

## Current Status
**ANALYSIS COMPLETE — PLANNING PHASE**

The comprehensive master build plan has been written to `MASTER_PLAN.md`. No application code has been written yet. The plan covers all 19 parts of the attached docx-generator document, identifies 12 critical gaps, documents 8 diamond features, and provides a complete production build guide.

## Key Files
- `MASTER_PLAN.md` — the definitive comprehensive build guide (read this first)
- `templates/package.json` — pre-configured dependency list (all versions pinned)
- `templates/vite.config.ts` — Vite config with chunk splitting
- `templates/tailwind.config.ts` — Tailwind v3 with brand tokens
- `templates/drizzle.config.ts` — Drizzle config pointing to `shared/schema.ts`
- `templates/schema-starter.ts` — Drizzle schema starting point
- `04-database-schema.md` — complete Drizzle schema (43 tables, 28 enums)
- `03-folder-structure.md` — exact file tree (97+ files)
- `02-architecture.md` — triple-layer isolation, RBAC, audit log, jobs, WebSockets
- `11-diamond-features.md` — all 8 diamond features with implementation detail
- `12-landing-page-design.md` — 3D hero scene spec, 11 sections, brand tokens

## Technology Stack (LOCKED — do not change)
- **Frontend:** React 18 + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind v3
- **Backend:** Express + TypeScript + Drizzle ORM + PostgreSQL
- **Jobs:** BullMQ + Redis (Upstash), with job_locks fallback
- **3D Landing:** Three.js + @react-three/fiber + @react-three/drei + GSAP + Lenis
- **Auth:** httpOnly cookie sessions (NOT Clerk, NOT localStorage JWT)
- **Routing:** Wouter (NOT React Router, NOT Next.js)
- **Files:** Cloudflare R2 (S3-compatible)
- **Billing:** Stripe (subscriptions + metered usage)
- **AI:** Anthropic Claude Sonnet (Diamond 1 only)

## Architecture Invariants
1. **Triple-layer workspace isolation:** Express middleware + storage convention + PostgreSQL RLS
2. **Audit log is append-only:** DB trigger prevents UPDATE/DELETE
3. **Every state transition:** must write to `file_state_history` (chain of custody)
4. **Every approval/decline:** `reason` field ≥ 10 chars, enforced at API level
5. **Provider timeouts:** never treated as CLEAR — always PROCESSING until human override
6. **Provider adapter:** capability-based, never reference provider name in UI code
7. **All IDs:** cuid2. All timestamps: `withTimezone: true`
8. **Deployment:** Reserved VM (not Autoscale) — BullMQ + WebSockets need stable process

## Database Summary
- 43 tables total (33 core + 10 diamond feature tables)
- 28 enums
- Single source of truth: `shared/schema.ts`
- Key tables: users, workspaces, workspace_memberships, customers, customer_files,
  file_state_history, check_requests, check_results, webhook_events, escalations,
  audit_log, usage_events, program_forms, program_versions, program_documents

## 12-State Customer File Machine
DRAFT → CDD_IN_PROGRESS → PENDING_CHECKS → CHECKS_RETURNED → ECDD_REQUIRED →
UNDER_REVIEW → APPROVED → APPROVED_WITH_CONTROLS → HELD → DECLINED → REVIEW_DUE → CLOSED

## 8 Roles
WORKSPACE_ADMIN, COMPLIANCE_OFFICER, PROGRAM_CONTRIBUTOR, ONBOARDING_USER,
REVIEWER, READ_ONLY, PLATFORM_ADMIN, SUPPORT

## Brand Tokens
- Navy: `#0B1A33` (primary background)
- Emerald: `#10B981` (trust / approved / CTA)
- Amber: `#F59E0B` (risk / caution)
- Red: `#EF4444` (critical / declined)
- Gold: `#F4C430` (premium trust marks)

## Critical Gaps Identified (fix during build)
- G1: SMR workflow missing — add in M7 (CRITICAL — regulatory non-compliance)
- G2: Orphan CO validation — add in M3 Step 5 (HIGH)
- G5: Provider timeout handling — add in M8 (HIGH)
- G7: Data retention cron missing — add in M10 (HIGH)
- G8: RLS only works in transactions — fix in Phase 0 db.ts (HIGH)
- G10: Identity verification stub must not reach production (HIGH)
- G3: Person record deduplication — fix in M6 (MEDIUM)
- G4: Mandatory notification types bypass — fix in M2 (MEDIUM)
- G6: PAST_DUE notifies only admin — fix in M9 (MEDIUM)
- G9: No virus scanning on uploads — add ClamAV in M6 (MEDIUM)
- G11: No document checksum test — add in M4 (MEDIUM)
- G12: Mobile exit-intent missing — replace with sticky bar on landing (LOW)

## Diamond Features Build Order
D2 (Monitoring) → D1 (AI Narratives) → D3 (Evidence Pack) →
D7 (Customer Portal) → D4 (Group Structure) → D6 (Regulatory Feed) →
D5 (Training Module) → D8 (Benchmarking)

## Secrets Required (36 total)
Phase 0: DATABASE_URL, SESSION_SECRET, NODE_ENV, PORT, APP_URL
Phase 1: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME
Phase 2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL_BASE, R2_REGION
Phase 3: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, TWILIO_VERIFY_SERVICE_SID
Phase 4: STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER,
         STRIPE_PRICE_PROFESSIONAL, STRIPE_PRICE_ENTERPRISE, STRIPE_PRICE_GROUP,
         STRIPE_PRICE_LIFETIME, STRIPE_PRICE_USAGE_CHECK,
         FACIA_API_KEY, FACIA_WEBHOOK_SECRET, FACIA_BASE_URL,
         AML_WATCHER_API_KEY, AML_WATCHER_WEBHOOK_SECRET
Phase 5: SENTRY_DSN
Diamond: ANTHROPIC_API_KEY, REDIS_URL

## Build Execution Order
Phase 0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10
→ Diamond Layer (D2→D1→D3→D7→D4→D6→D5→D8)
Landing page: parallel with Phase 1
