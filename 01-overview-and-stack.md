# 01 — Overview & Stack

## 1.1 Mission

Integrity Solve is an **AML/CTF (Anti-Money Laundering / Counter-Terrorism Financing) compliance portal** for reporting entities (accountants, lawyers, real estate agents, financial advisers, gambling operators, etc.) operating under Australia's AML/CTF Act and equivalent regimes.

It transforms a regulated business's static, document-driven compliance program into a live operating system: a structured wizard creates the program, customer onboarding flows through an audit-grade state machine, screening calls go through swappable provider adapters, and every action lands in an append-only audit trail.

## 1.2 Primary users

| Role | What they do in the portal |
|------|----------------------------|
| Workspace Admin | Owns the account; manages billing, members, integrations |
| Compliance Officer (CO) | Owns the program; approves high-risk files; signs off ECDD |
| Program Contributor | Edits program forms but cannot approve customer files |
| Onboarding User | Creates customer files, completes CDD forms, uploads evidence |
| Reviewer | Reviews escalations and ECDD; can approve/decline files |
| Read Only | Auditors and external advisers |
| Platform Admin | Integrity Solve staff (cross-tenant) |
| Support | Integrity Solve staff (per-tenant, time-limited, opt-in) |

## 1.3 Business model

- **Subscription tiers** (Stripe Subscriptions) gate features, not check volume.
- **Metered usage** (Stripe Usage Events) bills per provider check (identity, AML, KYB).
- **Lifetime / Group / Enterprise** tiers available (mirrors StrategyNavigator's tier model).
- Setup wizard is completable **without** billing; only paid provider checks are billing-gated.

## 1.4 Technology stack — final decisions

| Layer | Choice | Why this not the original Word doc choice |
|-------|--------|-------------------------------------------|
| Frontend framework | React 18 + Vite + Wouter | Matches StrategyNavigator. Wouter is ~1KB, perfect for protected app shell. SSR is not required; this is a portal, not a marketing site. |
| UI primitives | Radix UI + shadcn/ui + Tailwind CSS | Identical to StrategyNavigator → ~50 components already shipped and themed. |
| State | Zustand for ephemeral wizard state, TanStack Query v5 for server state | TanStack Query already wired in StrategyNavigator. |
| Routing | Wouter + custom `<ProtectedRoute>` HOC | Same as StrategyNavigator. |
| Backend framework | Express + TypeScript | Matches StrategyNavigator. NestJS is overkill for a single-team build and would prevent code reuse. |
| ORM | Drizzle ORM | Type-safe, tree-shakeable, identical to StrategyNavigator schema patterns. Translation from Prisma is mechanical. |
| Database | PostgreSQL 15 (Neon serverless) | Same as StrategyNavigator. Use Replit's built-in Postgres in dev. |
| Auth | httpOnly cookie session + JWT refresh + bcrypt password hashing | Same as StrategyNavigator. **Do not** use Clerk — the user has never used it and we want code reuse. |
| Mobile OTP | Twilio Verify | Original doc choice; Replit Integration available. |
| File storage | Cloudflare R2 (S3-compatible) | Original doc choice; AWS SDK works against R2. |
| Background jobs | BullMQ + Redis (Upstash). Fallback: in-process cron with `job_locks` distributed-lock table. | Matches StrategyNavigator's cron pattern. Redis is optional in dev. |
| Email | Nodemailer + Gmail SMTP | StrategyNavigator already uses this end-to-end with templates. |
| Payments | Stripe (Subscriptions + Metered Usage + Webhooks) | Original doc choice. Stripe has a Replit Integration; check before manual setup. |
| Document generation | `docx` (Node) for DOCX, `pdf-lib` for PDF (or LibreOffice subprocess if richer fidelity needed) | Original doc choice. |
| Monitoring | Sentry + Pino structured logs | Original doc choice. |
| Real-time | Native WebSocket (`ws` package) — same `WebSocketService` shape as StrategyNavigator | StrategyNavigator already broadcasts events to subscribed users; copy the service verbatim. |
| 3D landing hero | Three.js + `@react-three/fiber` + `@react-three/drei` + GSAP + Lenis (smooth scroll) | Net-new for this project; see file 12. |
| AI (Diamond layer) | Anthropic Claude Sonnet for narrative drafting; OpenAI/Groq optional for cheap classification | Original doc choice. |

## 1.5 Stack changes from the original Word document

| Original Word doc | This package | Reason |
|---|---|---|
| Next.js 14 App Router | React 18 + Vite + Wouter | Code reuse with StrategyNavigator |
| NestJS | Express + TypeScript | Code reuse with StrategyNavigator |
| Prisma | Drizzle ORM | Code reuse with StrategyNavigator |
| Clerk | httpOnly cookie + JWT | Code reuse with StrategyNavigator |
| pnpm monorepo (apps/web + apps/api) | Single Replit repo with `/client`, `/server`, `/shared` | Single workflow, simpler Replit deployment |
| Vercel + Railway | Replit Reserved VM Deployment | Single deployment surface |
| Resend | Nodemailer + Gmail SMTP | Already configured in StrategyNavigator |

Everything else from the original document — multi-tenant isolation rules, RBAC matrix, provider adapter pattern, audit-log invariants, data model, milestones, acceptance criteria, diamond features — is preserved and re-expressed in this stack.
