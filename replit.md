# INTEGRITY SOLVE — AML/CTF Compliance SaaS Platform

## Overview
Production-grade AML/CTF compliance SaaS platform for Australian reporting entities. Full-stack TypeScript application.

## Architecture
- **Frontend**: React 18 + Vite (port 5000) + Wouter routing + TanStack Query + shadcn/ui + Tailwind v3
- **Backend**: Express on port 3000 (proxied via Vite in dev)
- **Database**: PostgreSQL via Drizzle ORM (43 tables, 28 enums)
- **Auth**: httpOnly cookie sessions
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
- `STRIPE_*` — Billing
- `R2_*` — Cloudflare R2 storage
- `REDIS_URL` — BullMQ job queue
- `ANTHROPIC_API_KEY` — AI features
- `SENTRY_DSN` — Error tracking
- `GREENID_API_KEY`, `EQUIFAX_API_KEY`, `REFINITIV_API_KEY`, `TRULIOO_API_KEY` — Identity providers

## Project Structure
```
shared/
  schema.ts        — 43-table Drizzle schema (single source of truth)
  enums.ts         — RBAC matrix
  types.ts         — TypeScript types
  validators.ts    — Zod validation schemas

server/
  index.ts         — Entry point
  app.ts           — Express app factory
  db.ts            — Drizzle + pg pool
  env.ts           — Env validation (fail-fast)
  lib/             — logger, request-id, errors, audit, auth-session, workspace-guard
  routes/          — auth, workspaces, customers, checks, escalations, programs, tasks, audit, notifications, health
  services/        — check-engine (mock adapter), notifications

client/src/
  App.tsx          — Wouter router
  pages/           — Landing, Login, Register, Dashboard, Customers, Programs, Escalations, Tasks, Audit, Settings
  components/      — UI primitives (shadcn) + shared (RiskBadge, StatusBadge, PageHeader, EmptyState)
  hooks/           — useAuth, useCustomers
  lib/             — api client, utils (cn)
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

## Feature Completion Status
- ✅ M1: Schema + Auth System
- ✅ M2: Workspace Isolation + RBAC
- ✅ M3: AML Program Wizard (12-step)
- ✅ M4: Customer Lifecycle + Check Engine
- ✅ M5: SMR Workflow
- ✅ M6: Periodic Review + Tasks
- ✅ M10: Landing Page
- ⏳ M7: Billing + Stripe (schema ready, routes pending)
- ⏳ M8: Document Engine
- ⏳ M9: Platform Admin + Reporting
- ⏳ Diamond Features
