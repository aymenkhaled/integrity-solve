# Integrity Solve — AML/CTF Compliance Portal

## Overview
A production-grade AML/CTF (Anti-Money Laundering / Counter-Terrorism Financing) compliance portal built for Australian regulated entities. It automates compliance programs, customer onboarding (KYC/KYB), risk assessments, and audit trail management under the AML/CTF Act 2006.

## Architecture
- **Frontend**: React 18 + Vite (port 5000 in dev), Wouter routing, Radix UI + shadcn/ui, TanStack Query
- **Backend**: Express.js + TypeScript (port 3000), cookie-based session auth stored in DB
- **Database**: PostgreSQL via Replit's built-in DB, Drizzle ORM (43 tables)
- **Shared**: `/shared/` contains Drizzle schema, Zod validators, TypeScript types

## How to Run
- **Development**: `npm run dev` — starts Express (port 3000) + Vite (port 5000) concurrently
- **Database schema**: `npx drizzle-kit push --force` to sync schema changes
- **Build**: `npm run build` + `npm start` for production
- **API tests**: `node scripts/test-api.mjs` (existing suite) and `node scripts/test-milestone1.mjs` (Milestone 1)

## Environment Variables
Required (already configured as Replit secrets):
- `DATABASE_URL` — Replit PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Secret for signing session cookies

Optional (feature-flagged off by default):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc. — Enable with `ENABLE_STRIPE=true`
- `TWILIO_*` — SMS OTP. Enable with `ENABLE_SMS=true`
- `SMTP_*` — Email. Enable with `ENABLE_EMAIL=true`
- `ANTHROPIC_API_KEY` — AI features
- `R2_*` — Cloudflare R2 file storage
- `REDIS_URL` — BullMQ background jobs (defaults to `redis://localhost:6379`)
- `SENTRY_DSN` — Error monitoring

Milestone 1 — Didit integration:
- `DIDIT_MODE` — `mock` (default) or `live`. In mock mode, the Didit API is never called; sessions return realistic mocked results.
- `DIDIT_API_KEY` — Didit API key (only required when `DIDIT_MODE=live`)
- `DIDIT_WEBHOOK_SECRET` — HMAC secret for Didit webhook signature verification
- `DIDIT_WORKFLOW_ID_KYC` — Didit workflow ID for KYC checks
- `DIDIT_WORKFLOW_ID_KYB` — Didit workflow ID for KYB checks

## Key Files
- `server/index.ts` — Entry point, bootstraps DB check + Express
- `server/app.ts` — Express app factory, all routes registered here
- `server/env.ts` — All environment variable declarations (fail-fast validation)
- `server/lib/auth-session.ts` — httpOnly cookie session management (DB-backed). Exports `requireAuth`, `requireWorkspace`, `requirePermission` middleware
- `server/lib/workspace-guard.ts` — Triple-layer tenant isolation helpers (`getWorkspaceId`, `getUserId`, `assertCustomerOwnership`)
- `shared/schema.ts` — Single source of truth for all 43 DB tables
- `client/src/App.tsx` — Frontend routing (all routes, including Milestone 1 cases/wizard pages)
- `drizzle.config.ts` — Drizzle Kit configuration

## Feature Flags
- `ENABLE_MOCK_PROVIDERS=true` (default) — Uses mock KYC/AML provider instead of real ones
- `DIDIT_MODE=mock` (default) — Mock Didit API responses
- `ENABLE_STRIPE=false` — Billing disabled by default
- `ENABLE_SMS=false` — Twilio SMS disabled by default
- `ENABLE_EMAIL=false` — SMTP email disabled by default

## Multi-tenancy
All tenant data is strictly scoped by `workspace_id` at the storage layer. Every query includes a `workspaceId` WHERE clause. The `requireWorkspace` middleware must be applied to every authenticated route.

## Authentication
Custom cookie-based auth (not Replit Auth). Sessions stored in the `sessions` DB table. Users register/login via `/api/auth/register` and `/api/auth/login`. In development, OTP codes are logged to the server console.

---

## Milestone 1 — Wizard-Led Flows + Didit Integration (COMPLETE)

### What was built
Milestone 1 adds the wizard-led compliance workflow engine and a Didit-ready identity verification integration, all fully tested.

### New Database Tables (7 added, `npx drizzle-kit push --force` applied)
| Table | Purpose |
|---|---|
| `cases` | Top-level compliance case (PROGRAM_SETUP or TRANSACTION_CDD type) |
| `wizard_runs` | A single run of a wizard (attached to a case) |
| `wizard_steps` | Individual step answers within a wizard run |
| `didit_sessions` | Didit identity verification sessions (KYC/KYB/AML screening) |
| `didit_results` | Normalised results from Didit webhooks or mock-complete |
| `didit_webhook_events` | Raw inbound Didit webhook events (idempotency deduplication) |
| `case_outputs` | Structured outputs generated from completed cases |

### New API Endpoints

#### Cases
| Method | Path | Description |
|---|---|---|
| POST | `/api/cases` | Create a new compliance case |
| GET | `/api/cases` | List all cases for workspace |
| GET | `/api/cases/:id/summary` | Full case summary (wizard runs, checks, audit) |
| GET | `/api/cases/:id/pdf` | Download PDF case summary pack |

#### Wizard
| Method | Path | Description |
|---|---|---|
| POST | `/api/wizard/start` | Start a wizard run for a case |
| PATCH | `/api/wizard/:id/step` | Save a step + get routing result |
| GET | `/api/wizard/:id` | Get full wizard run with steps |
| GET | `/api/wizard/case/:caseId` | Get all wizard runs for a case |

#### Didit / Identity Verification
| Method | Path | Description |
|---|---|---|
| POST | `/api/providers/didit/session` | Create a Didit verification session (mock-safe) |
| POST | `/api/providers/didit/webhook` | Receive and process Didit webhook events |
| GET | `/api/providers/didit/sessions` | List sessions (optionally filtered by caseId) |
| GET | `/api/providers/didit/sessions/:id` | Get single session + results |
| POST | `/api/providers/didit/mock-complete/:id` | Simulate webhook outcome (mock mode only) |

### New Server Services
| File | Purpose |
|---|---|
| `server/services/workflowRouter.ts` | Pure decision engine — `routeProgramWizard()` and `routeTransactionWizard()` produce structured routing decisions (risk level, recommended checks, outputs, escalations) from wizard answers |
| `server/services/didit.ts` | Didit API client (`createDiditSession`) — live mode calls real Didit API, mock mode returns realistic mocked session objects |
| `server/services/diditWebhook.ts` | HMAC-SHA256 webhook signature verification |
| `server/services/normalizeDidit.ts` | Normalises raw Didit decision payloads to a standard internal schema |

### New Frontend Pages
| Route | Component | Description |
|---|---|---|
| `/cases` | `CasesPage` | List all cases, create new case via modal |
| `/cases/:id` | `CaseDetailPage` | Case detail with wizard, checks, audit tabs |
| `/cases/:caseId/wizard/program/:runId` | `CaseProgramWizardPage` | 5-step AML Program Setup wizard |
| `/cases/:caseId/wizard/transaction/:runId` | `CaseTransactionWizardPage` | 4-step Transaction/CDD wizard |

### Wizard Routing Logic

**Program Setup Wizard (5 steps)**
1. **Industry** — Select regulated industry sector
2. **Designated Services** — Choose services under AML/CTF Act
3. **Business Structure** — Entity type, ABN, staff count
4. **Locations** — Operational locations
5. **Program Readiness** — Existing program, compliance officer, risk approach

Output: `completionStatus`, `missing[]`, `riskSignals[]`, `outputs[]`

**Transaction/CDD Wizard (4 steps)**
1. **Service** — Which designated service is being provided
2. **Party** — Individual / Company / Trust / Beneficial Owner + new customer flag
3. **Risk** — PEP, adverse media, high-risk jurisdiction, complex ownership, source of funds
4. **Transaction Value** — Amount + currency (TTR alert at ≥$10,000 AUD)

Output: `riskLevel` (low/medium/high), `recommendedChecks[]`, `approvalPath`, `escalations[]`

Risk escalation rules:
- Any PEP flag → `riskLevel = high`, requires compliance officer review
- Transaction ≥ $10,000 AUD → TTR obligation flagged
- Multiple risk factors → escalation to reviewer
- High-risk jurisdiction → elevated CDD required

### Didit Integration Mode
- **Mock mode** (`DIDIT_MODE=mock`, default): All sessions are created locally with a `mock_` prefix. The `/mock-complete/:id` endpoint simulates any webhook outcome (Approved, Declined, Review). No external API calls.
- **Live mode** (`DIDIT_MODE=live`): Sessions are created via the real Didit REST API. Webhooks arrive at `/api/providers/didit/webhook` and are verified with HMAC-SHA256.
- **Idempotency**: Sessions are deduplicated on `(workspaceId, caseId, capability, subjectId)` — duplicate requests return the existing session.

### Bug Fixes Applied (post-M1 patch)

All 7 critical bugs corrected in a single autonomous pass:

| # | Bug | Fix |
|---|---|---|
| 1 | Frontend double-unwrapping of `data.data` | All pages updated to use `useQuery<T>` directly — `api.ts` already unwraps `data.data`; wizard `onSuccess` now uses `res.routeResult` and `run.wizardType` |
| 2 | "Create Case & Start Wizard" only created the case | `CasesPage` `createMutation` now calls `wizardApi.start()` after case creation and navigates to the wizard page |
| 3 | Backend raw `res.status(401).json(...)` error responses | All routes now throw `NotFoundError`, `UnauthenticatedError`, `ForbiddenError` and let `error-handler.ts` produce the standard envelope |
| 4 | Case summary only returned results for the first Didit session | `inArray(diditResults.diditSessionId, checkIds)` now fetches results for all sessions |
| 5 | Audit UI/PDF used `entry.detail` — field is `entry.reason` | `CaseDetailPage` and PDF generator updated to use `a.reason` throughout |
| 6 | Didit session response put `verificationUrl`/`mode` outside `data` | Both new-session (201) and idempotency-reuse (200) responses now wrap all fields inside `data: { session, verificationUrl, mode, reused }` |
| 7 | Mock Didit URL pointed to non-existent `/mock-didit/:id` page | `didit.ts` now returns `verificationUrl: null` in mock mode; UI shows "Mock mode" badge; the "Mock Complete" button is the correct mechanism |

Additional improvements:
- `server/env.ts` — added `DIDIT_BASE_URL` env var (defaults to `https://verification.didit.me`)
- `server/routes/wizard.ts` — writes `case_outputs` row on wizard completion (upsert)
- `CaseDetailPage` — added reviewer decision stub (Approve / Request info / Escalate)
- `CaseDetailPage` — audit trail uses `entry.reason` (Bug 5)
- `server/routes/cases.ts` — PDF audit lines use `a.reason` (Bug 5)
- Wouter `useLocation` navigate replaces all `window.location.href` assignments

### Test Suite
Run: `node scripts/test-milestone1.mjs`

**43/43 tests pass** covering:
0. Auth (register/login/me)
1. Cases CRUD (create program case, create transaction case, list, verify)
2. Program wizard (start + all 5 steps + routeResult verification)
3. Transaction wizard (start + all 4 steps + risk level + recommended checks)
4. Case summary (wizard runs, audit trail)
5. Didit sessions (create KYC, create AML screening, list 2 sessions, mock-complete, idempotency reuse → HTTP 200)
6. PDF generation (magic bytes, content-type)
7. Case status after wizard (COMPLETED, riskLevel = high propagated)

---

## Pre-Milestone 1 Features

### Core AML/CTF
- Customer management (KYC/KYB profiles, beneficial owners, risk ratings)
- AML Program management (Part A/B, annual review scheduling)
- Escalation management
- Periodic review scheduling and tracking

### Diamond Features
- Compliance Health Score dashboard
- Compliance Calendar (regulatory obligations)
- Transaction Monitoring Rules engine
- Risk Intelligence dashboard
- Smart Alerts system
- Analytics (SMR, training, reviews)
- Document management
- Training module management
- API Gateway (webhook endpoints, API key management)
- White-label/branding settings
- Group workspace management (multi-entity)
