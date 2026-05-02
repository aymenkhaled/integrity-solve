# Integrity Solve

## Overview
Integrity Solve is an AML/CTF (Anti-Money Laundering / Counter-Terrorism Financing) compliance portal SaaS for reporting entities (accountants, lawyers, real estate agents, financial advisers, gambling operators) operating under Australia's AML/CTF Act and equivalent regimes. It transforms a regulated business's static, document-driven compliance program into a live operating system: a structured 6-step wizard creates the program, customer onboarding flows through an audit-grade state machine, screening calls go through swappable provider adapters, and every action lands in an append-only audit trail.

## User Preferences
- Single Replit repo (no monorepo). One `npm run dev` workflow runs frontend + backend + worker.
- Stack mirrors StrategyNavigator.ai for code reuse: React 18 + Vite + Wouter + Tailwind + shadcn/ui on the frontend; Express + TypeScript + Drizzle on the backend; PostgreSQL via Drizzle.
- Plain English in user-facing copy; avoid jargon-stuffing.
- Compliance-grade quality: every decision needs a reason field, every state transition needs an audit entry, every download is signed-URL with expiry.

## System Architecture
**Technology Stack:**
- **Frontend**: React 18 + TypeScript + Vite + Wouter + TanStack Query v5 + Radix UI + shadcn/ui + Tailwind CSS + Three.js / @react-three/fiber + GSAP (landing 3D)
- **Backend**: Node 20 + Express + TypeScript + Drizzle ORM
- **Database**: PostgreSQL 15 (Replit Postgres in dev, Neon in prod)
- **Auth**: httpOnly cookie sessions + JWT refresh + bcrypt
- **File storage**: Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`
- **Background jobs**: BullMQ + Redis (optional) with `job_locks` distributed-lock fallback
- **Email**: Nodemailer + Gmail SMTP, templates via `@react-email/render`
- **SMS**: Twilio (Verify service for OTP)
- **Payments**: Stripe Subscriptions + Metered Usage
- **Document generation**: `docx` for DOCX, `pdf-lib` for PDF
- **Monitoring**: Sentry + Pino structured logs

**Core architectural decisions & features:**
- **Multi-tenant workspace isolation (load-bearing)**: every tenant table has `workspace_id` NOT NULL FK. Three layers: (1) `withWorkspace` middleware, (2) storage convention `getX(workspaceId, ...)`, (3) Postgres RLS with `app.current_workspace` session var.
- **8-role RBAC**: WORKSPACE_ADMIN, COMPLIANCE_OFFICER, PROGRAM_CONTRIBUTOR, ONBOARDING_USER, REVIEWER, READ_ONLY, PLATFORM_ADMIN, SUPPORT. Permission matrix in `shared/rbac.ts`. Backend authorisation is the source of truth; frontend `<PermissionGate>` is decorative.
- **Append-only audit log**: `audit_log` has REVOKE UPDATE/DELETE + Postgres trigger. Every mutation logs actor/workspace/entity/before/after/reason/IP/UA/requestId.
- **Customer-file state machine**: 12 states (DRAFT → CDD_IN_PROGRESS → ... → APPROVED/DECLINED/CLOSED). Server-validated transitions; role-gated; reason-mandatory.
- **Provider adapter pattern**: UI/workflow code requests a capability (IDENTITY_VERIFICATION, AML_SCREENING, KYB_VERIFICATION). `ProviderRegistry` resolves to the workspace's configured adapter. Mock adapter ships first; Facia + AML Watcher + ABR plug in later.
- **Idempotency**: every check has `idempotencyKey = sha256(workspace|subject|capability|day)`. Webhooks deduplicated via `(providerName, providerEventId)` UNIQUE.
- **Document generation pipeline**: ProgramVersion (immutable snapshot) → 4 BullMQ jobs (Risk Assessment, Policy, Procedures, Governance Summary) → DOCX + PDF → R2 with SHA-256 checksum → versioned with supersession.
- **Cron jobs with distributed lock**: `job_locks` table allows safe multi-instance scheduling. Catalog: document-generate, check-poll/reconcile, review-scheduler, recurring-screening, watchlist-delta, regulatory-feed, billing-usage-report, evidence-pack-generate, notification-digest.
- **Billing guards**: `requireBillingActive()` middleware returns HTTP 402 with structured JSON (`code`, `userMessage`, `action`, `link`) — never silent.
- **Diamond features**: AI risk narrative (Anthropic), smart monitoring engine, compliance evidence pack ZIP generator, group/multi-workspace structure, in-portal training, regulatory update feed, customer-facing CDD portal, anonymised industry benchmarking.
- **Modern landing page**: Three.js + R3F + GSAP 3D hero (crystalline shield + orbiting evidence cards), 11 sections, conversion-optimised, `prefers-reduced-motion` honored.

**Critical architectural patterns:**
- **Reason field mandatory**: every approve/hold/decline/override/ECDD/SOF/SOW/periodic-review requires a non-empty `reason` (≥10 chars) validated by Zod.
- **Loud failures**: no silent fallbacks. Provider timeout → pending task, never false-clear. Billing inactive → 402, never silent skip.
- **Pino structured logging**: every log includes `workspaceId`, `userId`, `requestId`, `action`.
- **Real-time via native WebSocket**: `WebSocketService` with `broadcastToUser(userId, event)` and `broadcastToWorkspace(wsId, event)` patterns. Used for check status updates, document-generated events, notification bell counter.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Anthropic Claude**: AI narrative drafting (Diamond 1).
- **Cloudflare R2**: Document + evidence file storage.
- **BullMQ + Redis (Upstash)**: Background job processing (optional in dev).
- **Stripe**: Subscription + metered usage billing.
- **Gmail SMTP via Nodemailer**: Transactional emails.
- **Twilio**: SMS OTP (Twilio Verify recommended).
- **Sentry**: Error tracking + performance monitoring.
- **Facia**: Identity verification provider (real, M8 onwards).
- **AML Watcher / Personr**: AML screening provider (real, M8 onwards).
- **ABR**: Australian Business Register (free) — KYB lookup.
