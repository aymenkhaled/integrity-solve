# INTEGRITY SOLVE — AML/CTF Compliance SaaS Platform

## Overview
Production-grade AML/CTF compliance SaaS platform for Australian reporting entities. Full-stack TypeScript application with 3D glassmorphism premium UI. All Diamond features complete.

## Architecture
- **Frontend**: React 18 + Vite (port 5000) + Wouter routing + TanStack Query v5 + shadcn/ui + Tailwind v3
- **Backend**: Express on port 3000 (proxied via Vite in dev)
- **Database**: PostgreSQL via Drizzle ORM (43 tables, 28 enums)
- **Auth**: httpOnly cookie sessions (bcrypt passwords, rate limiting)
- **Dev server**: Vite (port 5000) proxies `/api` → Express (port 3000)

## Key Commands
- `npm run dev` — starts both Express (port 3000) and Vite (port 5000) via concurrently
- `npm run db:push` — push Drizzle schema to database
- `npm run build` — production build
- `npm run db:seed` — seed database

## Workflow
- **Name**: Start application
- **Command**: `npm run dev`
- **Port**: 5000 (webview)

## Environment Variables (Required)
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — httpOnly session secret

## Environment Variables (Optional)
- `SMTP_*` — Email configuration
- `TWILIO_*` — SMS via Twilio
- `STRIPE_*` — Billing (stub checkout/portal active without key)
- `R2_*` — Cloudflare R2 storage
- `REDIS_URL` — BullMQ job queue
- `ANTHROPIC_API_KEY` — AI features
- `SENTRY_DSN` — Error tracking
- `GREENID_API_KEY`, `EQUIFAX_API_KEY`, `REFINITIV_API_KEY`, `TRULIOO_API_KEY` — Identity providers

## Project Structure
```
shared/
  schema.ts        — 43-table Drizzle schema (single source of truth)
  enums.ts         — RBAC matrix + all platform enums
  types.ts         — TypeScript types
  validators.ts    — Zod validation schemas

server/
  index.ts         — Entry point
  app.ts           — Express app factory (all routes mounted)
  db.ts            — Drizzle + pg pool
  env.ts           — Env validation (fail-fast)
  lib/             — logger, request-id, errors, audit, auth-session, workspace-guard
  routes/
    auth.ts        — register, login, logout, verify-email, verify-mobile, refresh
    workspaces.ts  — workspace CRUD + member management
    customers.ts   — customer lifecycle (CDD/EDD/SDD), beneficial owners
    checks.ts      — check engine, mock identity/sanctions/PEP adapters
    escalations.ts — SMR workflow (PENDING→APPROVED→SUBMITTED)
    programs.ts    — 12-step AML program wizard, draft/publish lifecycle
    tasks.ts       — task management
    audit.ts       — append-only audit log (reason ≥10 chars enforced)
    notifications.ts
    billing.ts     — overview, usage, checkout (stub), portal (stub)
    documents.ts   — generate/list/download/delete (text-based, /tmp store)
    admin.ts       — platform admin (stats, workspaces, users, global audit)
    training.ts    — staff training records
    alerts.ts      — smart alerts (OPEN→ACKNOWLEDGED→RESOLVED/FALSE_POSITIVE)
    reviews.ts     — periodic reviews scheduler
    risk.ts        — D1: Risk Intelligence Engine (analytics + signals)
    analytics.ts   — D6+D7: SMR Analytics + Training Analytics + Reviews Analytics
    providers.ts   — D4: Provider Marketplace (8 providers, stats, activity log)
    groups.ts      — D2: Group Workspaces (parent/child hierarchy, aggregated stats)
    gateway.ts     — D8: API Gateway (key gen/revoke, scopes, usage chart)
    whitelabel.ts  — D5: White-label branding (logo, colours, domain, watermark)
    health.ts      — health check
  services/        — check-engine, notifications

client/src/
  App.tsx          — Wouter router (28 routes)
  pages/
    LandingPage.tsx
    DashboardPage.tsx
    auth/          — Login, Register, VerifyEmail
    customers/     — CustomersPage, CustomerDetailPage, NewCustomerPage
    programs/      — ProgramsPage, ProgramWizardPage
    escalations/   — EscalationsPage, EscalationDetailPage
    billing/       — BillingPage
    documents/     — DocumentsPage
    admin/         — AdminPage (platform admin only)
    training/      — TrainingPage
    alerts/        — AlertsPage
    reviews/       — ReviewsPage
    risk/          — RiskIntelligencePage (D1)
    analytics/     — AnalyticsPage (D6+D7)
    providers/     — ProvidersPage (D4)
    groups/        — GroupWorkspacesPage (D2)
    gateway/       — ApiGatewayPage (D8)
    whitelabel/    — WhiteLabelPage (D5)
    TasksPage, AuditPage, SettingsPage, MembersPage
  components/
    layout/AppLayout.tsx  — 4-group nav (Core/Compliance/Operations/Workspace), mobile sidebar
    ui/             — shadcn primitives (badge, button, card, checkbox, dialog,
                      dropdown-menu, input, label, select, separator, skeleton,
                      switch, tabs, textarea)
    shared/         — RiskBadge, StatusBadge, PageHeader, EmptyState
  hooks/           — useAuth, useCustomers, useLogout
  lib/
    api.ts         — all API clients (auth, workspace, customers, checks,
                     escalations, programs, tasks, audit, notifications,
                     billing, documents, admin, training, alerts, reviews,
                     riskApi, analyticsApi, providersApi, groupsApi,
                     gatewayApi, whitelabelApi)
    utils.ts       — cn, initials, formatDate, formatRelative, formatDateTime
```

## Brand / Design System
- Navy: `#0B1A33`, Emerald: `#10B981`, Amber: `#F59E0B`
- CSS utilities: `.glass`, `.card-3d`, `.stat-card`, `.gradient-brand`, `.gradient-emerald`, `.gradient-mesh`, `.glow-emerald`, `.gradient-text`, `.float`, `.auth-bg`, `.orb-*`, `.nav-active`, `.counter`, `.bar-hover`

## Navigation Groups (sidebar)
- **Core**: Dashboard, Customers, AML Program
- **Compliance**: Risk Intelligence, Analytics, Escalations, Smart Alerts, Periodic Reviews
- **Operations**: Tasks, Documents, Training, Providers
- **Workspace**: Audit Log, Members, Billing, Group Workspaces, API Gateway, White-label, Settings

## API Endpoints (33 total — all passing auth gate)
```
GET  /api/health
POST /api/auth/register|login|logout
GET  /api/auth/me
POST /api/auth/verify-email|resend-verification|switch-workspace
GET|PATCH /api/workspaces/current
GET  /api/workspaces/members
POST /api/workspaces/members/invite
DEL  /api/workspaces/members/:id
GET  /api/customers         (paginated, search, risk filter)
POST /api/customers
GET|PATCH /api/customers/:id
PATCH /api/customers/:id/status|risk-rating
GET|POST /api/customers/:id/beneficial-owners
POST /api/checks/run
GET  /api/checks|checks/:id
POST /api/checks/:id/override
GET|POST /api/escalations
GET|PATCH /api/escalations/:id
POST /api/escalations/:id/escalate|close|smr
POST /api/escalations/:id/smr/:smrId/approve|submit
GET|POST /api/programs
GET|PATCH /api/programs/:id
PATCH /api/programs/:id/step
POST /api/programs/:id/publish
GET|POST /api/tasks
PATCH /api/tasks/:id
GET  /api/audit
GET|POST /api/notifications
POST /api/notifications/:id/read|read-all
GET  /api/billing/overview|usage
POST /api/billing/checkout|portal
GET  /api/documents
POST /api/documents/generate
GET  /api/documents/download/:id
DEL  /api/documents/:id
GET  /api/admin/stats|workspaces|users|audit
GET|PATCH /api/admin/workspaces/:id
GET|POST /api/training
PATCH|DEL /api/training/:id
GET|POST /api/alerts
GET  /api/alerts/:id
POST /api/alerts/:id/acknowledge|resolve|false-positive
GET|POST /api/reviews
GET  /api/reviews/overdue
GET  /api/reviews/:id
POST /api/reviews/:id/start|complete|cancel
GET  /api/risk/analytics
GET  /api/risk/signals
GET  /api/analytics/smr|training|reviews
GET  /api/providers
GET  /api/groups
POST /api/groups/link
DEL  /api/groups/link/:childId
GET  /api/gateway/keys
POST /api/gateway/keys
DEL  /api/gateway/keys/:id
GET  /api/gateway/usage
GET  /api/whitelabel
PATCH /api/whitelabel
```

## Compliance Features Implemented
- G1: SMR workflow (PENDING_APPROVAL → APPROVED → SUBMITTED)
- G2: Orphan Customer Object guard (workspace-guard.ts)
- G5: Provider timeout → MANUAL_REVIEW fallback (check-engine.ts)
- G8: Row-level security note in db.ts
- Append-only audit log with reason ≥ 10 chars enforcement
- Triple-layer workspace isolation (session → workspace → resource)
- RBAC permission matrix (WORKSPACE_ADMIN, COMPLIANCE_OFFICER, ANALYST, VIEWER)

## PageHeader Convention
- Accepts both `actions` (plural, preferred) and `action` (singular, backwards-compat) props

## shadcn/ui Components Available
badge, button, card, checkbox, dialog, dropdown-menu, input, label, select, separator, skeleton, switch, tabs, textarea

## Feature Completion Status — ALL COMPLETE ✅
- ✅ T001: Phase 0 Bootstrap
- ✅ T002: M1 Schema + Auth System
- ✅ T003: M2 Workspace Isolation + RBAC
- ✅ T004: M3 AML Program Wizard (12-step)
- ✅ T005: M4 Customer Lifecycle + Check Engine
- ✅ T006: M5 SMR Workflow
- ✅ T007: M6 Periodic Review + Tasks
- ✅ T008: M7 Billing (stub checkout/portal)
- ✅ T009: M8 Document Engine (text-based, /tmp store)
- ✅ T010: M9 Platform Admin + Reporting
- ✅ T011: M10 Landing Page
- ✅ T012: ALL Diamond Features
  - ✅ D1: Risk Intelligence Engine (composite gauge, live signals, watchlist)
  - ✅ D2: Group Workspaces (parent/child hierarchy, aggregated stats, link/unlink)
  - ✅ D3: Smart Alerts (OPEN→ACK→RESOLVED/FALSE_POSITIVE flow)
  - ✅ D4: Provider Marketplace (8 providers, config status, per-provider stats)
  - ✅ D5: White-label (logo, colours, domain, watermark, branding checklist)
  - ✅ D6: SMR Analytics (submission rate, status breakdown, monthly trend)
  - ✅ D7: Training Analytics (completion rate, module breakdown, avg score)
  - ✅ D8: API Gateway (key gen with scopes, revoke, usage chart, endpoint docs)

## Known Limitations / Future Work
- Billing: Stripe webhooks pending (requires STRIPE_SECRET_KEY)
- Documents: docxtemplater PDF generation pending (currently plain-text)
- API Gateway: keys stored in-process memory (would need a DB table in production)
- Email/SMS: requires SMTP/Twilio credentials
- BullMQ workers: requires REDIS_URL
