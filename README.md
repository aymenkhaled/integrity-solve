# Integrity Solve — AML/CTF Compliance Portal

## Build handoff package

This ZIP contains everything a Replit Agent needs to build **Integrity Solve**, an AML/CTF (Anti-Money Laundering / Counter-Terrorism Financing) compliance SaaS platform.

The original spec was written for a Next.js 14 + NestJS + Prisma stack. This package **re-architects the entire plan** onto the same stack used by the existing **StrategyNavigator.ai** project, so that proven infrastructure (auth, multi-tenancy, RBAC, billing, audit log, notifications, email, cron jobs, file uploads, dashboards, theme system, ~50 shadcn/ui primitives) can be lifted directly.

---

## What you (the receiving agent) should read, in order

| # | File | Purpose |
|---|------|---------|
| 1 | `AGENT_PROMPT.md` | **Read this first.** It is the prompt the human will paste into your chat. It tells you exactly what to build, in what order, and what the success criteria are. |
| 2 | `01-overview-and-stack.md` | Project mission, target users, business model, complete technology stack with versions. |
| 3 | `02-architecture.md` | Multi-tenant isolation rules, RBAC matrix, audit log invariants, cron/job patterns, error handling. |
| 4 | `03-folder-structure.md` | Exact folder layout (single Replit repo — not a monorepo). |
| 5 | `04-database-schema.md` | Full Drizzle schema translated from the original Prisma spec. Includes every table, enum, index, and FK. |
| 6 | `05-feature-inventory.md` | What StrategyNavigator already solves and how to lift it. **This saves weeks of work.** |
| 7 | `06-phase-1-foundation.md` | Milestones M1–M2 (auth, workspaces, RBAC, restricted dashboard). |
| 8 | `07-phase-2-program-wizard.md` | Milestones M3–M5 (6-step wizard, document generation, version history). |
| 9 | `08-phase-3-customer-onboarding.md` | Milestones M6–M7 (CDD state machine, escalations, ECDD, SOF/SOW, periodic review). |
| 10 | `09-phase-4-providers-and-billing.md` | Milestones M8–M9 (provider adapters, Stripe billing, usage events). |
| 11 | `10-phase-5-hardening.md` | Milestone M10 (security checklist, performance, monitoring, launch). |
| 12 | `11-diamond-features.md` | 8 high-value differentiators (AI risk narratives, monitoring engine, evidence packs, group structures, training, regulatory feed, customer portal, benchmarking). |
| 13 | `12-landing-page-design.md` | Modern 3D landing page spec — Three.js + R3F + GSAP, sections, copy, conversion elements. |
| 14 | `13-testing-strategy.md` | Vitest + Playwright + load-test plan with concrete test cases. |
| 15 | `14-environment-and-secrets.md` | Every environment variable, secret, and API key with where to obtain it. |
| 16 | `15-deployment-on-replit.md` | Workflows, deployment, secrets, health checks, autoscaling. |

## Templates folder
Drop-in starter files:
- `templates/package.json` — exact dependency list
- `templates/drizzle.config.ts`
- `templates/tsconfig.json`
- `templates/vite.config.ts`
- `templates/tailwind.config.ts`
- `templates/replit.md` — project memory file (copy to project root)
- `templates/.env.example`
- `templates/schema-starter.ts` — minimal Drizzle schema to begin from

## Reference folder
- `reference/original-integrity-solve-plan.docx` — the original Word document
- `reference/original-integrity-solve-plan.txt` — plain-text extract for easy searching

---

## Critical rules for the receiving agent (summary)

1. **Use the StrategyNavigator stack — do not introduce Next.js, NestJS, or Prisma.** Use React 18 + Vite + Wouter (frontend) and Express + TypeScript + Drizzle (backend), single workflow.
2. **Workspace isolation is a load-bearing invariant.** Every database query must filter by `workspaceId`. This is enforced at the storage layer and double-checked by middleware. There is no opt-out.
3. **The audit log is append-only.** No `UPDATE` or `DELETE` is permitted on the `audit_log` table. This is a regulatory requirement.
4. **Mock provider adapters first, real providers last.** Build all UIs against deterministic mock adapters. Only wire real providers in M8.
5. **Honor every detail in the source documents.** The user explicitly said "don't hallucinate, deep analyze each detail and word, don't skip nothing." When in doubt, search `reference/original-integrity-solve-plan.txt` for the exact wording.
6. **Compliance-grade quality.** This is regulated software. Every decision needs a reason field. Every state transition needs an audit entry. Every download needs a signed URL with expiry.

Build with care. The end users are compliance officers whose business depends on this being correct.
