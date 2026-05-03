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

## Environment Variables
These are required (already configured as Replit secrets):
- `DATABASE_URL` — Replit PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Secret for signing session cookies

These are optional (feature-flagged off by default):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, etc. — Enable with `ENABLE_STRIPE=true`
- `TWILIO_*` — SMS OTP. Enable with `ENABLE_SMS=true`
- `SMTP_*` — Email. Enable with `ENABLE_EMAIL=true`
- `ANTHROPIC_API_KEY` — AI features
- `R2_*` — Cloudflare R2 file storage
- `REDIS_URL` — BullMQ background jobs (defaults to `redis://localhost:6379`)
- `SENTRY_DSN` — Error monitoring

## Key Files
- `server/index.ts` — Entry point, bootstraps DB check + Express
- `server/app.ts` — Express app factory, all routes registered here
- `server/env.ts` — All environment variable declarations (fail-fast validation)
- `server/lib/auth-session.ts` — httpOnly cookie session management (DB-backed)
- `shared/schema.ts` — Single source of truth for all 43 DB tables
- `client/src/App.tsx` — Frontend routing
- `drizzle.config.ts` — Drizzle Kit configuration

## Feature Flags
- `ENABLE_MOCK_PROVIDERS=true` (default) — Uses mock KYC/AML provider instead of real ones
- `ENABLE_STRIPE=false` — Billing disabled by default
- `ENABLE_SMS=false` — Twilio SMS disabled by default
- `ENABLE_EMAIL=false` — SMTP email disabled by default

## Multi-tenancy
All tenant data is strictly scoped by `workspace_id` at the storage layer. Every query includes a `workspaceId` WHERE clause.

## Authentication
Custom cookie-based auth (not Replit Auth). Sessions stored in the `sessions` DB table. Users register/login via `/api/auth/register` and `/api/auth/login`. In development, OTP codes are logged to the server console.
