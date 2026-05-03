# INTEGRITY SOLVE — AML/CTF Compliance SaaS Platform

## Overview
Production-grade AML/CTF compliance SaaS platform for Australian reporting entities. Full-stack TypeScript application.

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
    health.ts      — health check
  services/        — check-engine, notifications

client/src/
  App.tsx          — Wouter router (all 20+ routes)
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
    TasksPage, AuditPage, SettingsPage, MembersPage
  components/
    layout/AppLayout.tsx  — 13-item nav, mobile sidebar, user dropdown
    ui/             — shadcn primitives
    shared/         — RiskBadge, StatusBadge, PageHeader, EmptyState
  hooks/           — useAuth, useCustomers, useLogout
  lib/
    api.ts         — all API clients (auth, workspace, customers, checks,
                     escalations, programs, tasks, audit, notifications,
                     billing, documents, admin, training, alerts, reviews)
    utils.ts       — cn, initials, formatDate
```

## Brand
- Navy: `#0B1A33`
- Emerald: `#10B981`
- Amber: `#F59E0B`

## Compliance Features Implemented
- G1: SMR workflow (PENDING_APPROVAL → APPROVED → SUBMITTED)
- G2: Orphan Customer Object guard (workspace-guard.ts)
- G5: Provider timeout → MANUAL_REVIEW fallback (check-engine.ts)
- G8: Row-level security note in db.ts
- Append-only audit log with reason ≥ 10 chars enforcement
- Triple-layer workspace isolation (session → workspace → resource)
- RBAC permission matrix (WORKSPACE_ADMIN, COMPLIANCE_OFFICER, ANALYST, VIEWER)

## Feature Completion Status
- ✅ T001: Phase 0 Bootstrap
- ✅ T002: M1 Schema + Auth System
- ✅ T003: M2 Workspace Isolation + RBAC
- ✅ T004: M3 AML Program Wizard (12-step)
- ✅ T005: M4 Customer Lifecycle + Check Engine
- ✅ T006: M5 SMR Workflow
- ✅ T007: M6 Periodic Review + Tasks
- ✅ T008: M7 Billing (stub checkout/portal, no Stripe key required)
- ✅ T009: M8 Document Engine (text-based generation, /tmp store)
- ✅ T010: M9 Platform Admin + Reporting
- ✅ T011: M10 Landing Page
- ✅ T012: Diamond Features — Smart Alerts, Periodic Reviews, Training Tracker

## Known Limitations / Future Work
- Billing: Stripe webhooks pending (requires STRIPE_SECRET_KEY)
- Documents: docxtemplater PDF generation pending (currently plain-text)
- Diamond D2 (Group Workspaces), D4 (Provider Marketplace), D5 (White-label), D6 (SMR Analytics), D8 (API Gateway) — routes stubbed
- Email/SMS: requires SMTP/Twilio credentials
- BullMQ workers: requires REDIS_URL
