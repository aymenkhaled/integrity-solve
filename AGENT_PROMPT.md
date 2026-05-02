# Prompt to paste to the receiving Replit Agent

> Copy everything between the `===` lines and paste it into a fresh Replit project's chat with the agent. Attach this whole ZIP file to the same message.

```
================================================================================
You are going to build a production-grade AML/CTF (Anti-Money Laundering /
Counter-Terrorism Financing) compliance SaaS platform called "Integrity Solve".

I have attached a ZIP file `integrity-solve-handoff.zip`. Unzip it into the
project root before doing anything else. Inside you will find:

  - README.md                  → start here
  - AGENT_PROMPT.md            → this prompt (for reference)
  - 15 numbered plan documents covering every milestone, schema, and feature
  - templates/                 → drop-in starter files
  - reference/                 → the original Word doc + plain-text extract

READ EVERY FILE in numerical order BEFORE writing any code. The user has
explicitly stated: "don't hallucinate, deep analyze each detail and word,
don't skip nothing." Treat that as a hard constraint.

================================================================================
NON-NEGOTIABLE TECHNICAL CONSTRAINTS
================================================================================

1. STACK (must match StrategyNavigator.ai exactly so code can be ported):
   - Frontend: React 18 + TypeScript + Vite + Wouter + TanStack Query
     + Radix UI + shadcn/ui + Tailwind CSS + next-themes
   - Backend: Node 20 + Express + TypeScript + Drizzle ORM
   - Database: PostgreSQL 15 (Neon serverless)
   - Auth: httpOnly cookie sessions + JWT refresh (NOT Clerk)
   - File storage: Cloudflare R2 (S3-compatible)
   - Background jobs: BullMQ + Redis (Upstash). If Redis is unavailable,
     fall back to in-process scheduling using the same `job_locks` distributed
     lock pattern StrategyNavigator already uses.
   - Email: Nodemailer + Gmail SMTP (matches StrategyNavigator)
   - SMS: Twilio
   - Payments: Stripe (subscriptions + metered usage)
   - 3D landing page: Three.js + @react-three/fiber + @react-three/drei + GSAP
   - Document generation: docx + pdf-lib (or LibreOffice via subprocess)
   - Monorepo: NO. Single Replit repo with /client, /server, /shared layout
     identical to StrategyNavigator.

2. SINGLE WORKFLOW. The entire app — frontend dev server, backend, and worker —
   must run from one `npm run dev` command, just like StrategyNavigator. Use
   `tsx watch server/index.ts` and have Express serve Vite middleware in dev,
   static build in production. The user said: "Both frontend and backend should
   run from single workflow for simplicity."

3. WORKSPACE ISOLATION (load-bearing invariant):
   Every table that holds tenant data has a `workspace_id` column with NOT NULL
   and FK to `workspaces(id)`. Every query in every storage module filters by
   `workspaceId`. There is a global Express middleware `withWorkspace` that
   resolves the active workspace from the session and rejects requests with
   missing or invalid workspace context. There is also a Drizzle query helper
   `scopedTo(workspaceId)` used in every storage call. Two layers of defense.
   No exceptions.

4. AUDIT LOG IS APPEND-ONLY. The `audit_log` table accepts INSERTs only.
   Database role used by the app must NOT have UPDATE or DELETE on that table.
   Add a Postgres trigger that raises an exception on UPDATE/DELETE as a
   secondary check. The audit log captures: actor, workspace, entity, before,
   after, reason, IP, user agent, timestamp.

5. RBAC. 8 roles: WORKSPACE_ADMIN, COMPLIANCE_OFFICER, PROGRAM_CONTRIBUTOR,
   ONBOARDING_USER, REVIEWER, READ_ONLY, PLATFORM_ADMIN, SUPPORT.
   Build a permission matrix table in `shared/rbac.ts` mapping
   role × resource × action → allow/deny. Express decorator `requireRole(...)`
   and React component `<PermissionGate role="..." action="..." />` use the
   same matrix. Backend authorisation is the source of truth — frontend
   hiding is decorative.

6. EVERY DECISION REQUIRES A REASON. Approve, hold, decline, override,
   ECDD outcome, periodic review outcome — the request body must include a
   non-empty `reason` field validated by Zod (min length 10 chars). Backend
   rejects with 400 if missing.

7. PROVIDER ADAPTER PATTERN. UI/workflow code never names a specific provider.
   It requests a capability (IDENTITY_VERIFICATION, AML_SCREENING,
   KYB_VERIFICATION, etc.). A `ProviderRegistry` resolves the capability to
   the workspace's configured adapter. Adapters implement a common
   `ProviderAdapter` interface. Build a `MockProviderAdapter` for every
   capability before any real provider.

8. EVERY EXTERNAL CALL IS IDEMPOTENT. CheckRequest has an `idempotencyKey`
   column with a UNIQUE constraint. Webhook events have a `webhookEventId`
   that is checked before processing. Replays return 200 but do nothing.

9. NO SILENT FALLBACKS. If billing is inactive and a paid check is requested,
   return HTTP 402 with a clear JSON message. Do not fail open. Do not
   succeed-with-warning. Loud, explicit failures.

10. COMPLIANCE-GRADE LOGGING. Every log line includes workspace_id, user_id,
    request_id (UUID), and action. Use Pino (or the pre-configured logger
    StrategyNavigator uses). Do not use console.log in production code.

================================================================================
EXECUTION ORDER (DO NOT SKIP)
================================================================================

PHASE 0 — FOUNDATIONS (your first 90 minutes)
    a) Unzip the attached package.
    b) Read README.md, AGENT_PROMPT.md, then files 01–15 in order.
    c) Read templates/replit.md and copy it to the project root.
    d) Initialize package.json from templates/package.json.
    e) Install dependencies. Use the package manager skill. Do NOT edit
       package.json by hand.
    f) Set up Drizzle: copy templates/drizzle.config.ts, create
       shared/schema.ts from templates/schema-starter.ts, run
       `npm run db:push` once a Postgres database is available
       (use Replit's database tool — see file 15).
    g) Create the workflow "Integrity Solve" running `NODE_ENV=development npm run dev`.
       Use the workflows skill. The workflow must serve on the port given
       by process.env.PORT (default 5000) and bind to 0.0.0.0.

PHASE 1 — Build Milestones M1 → M2 from `06-phase-1-foundation.md`
PHASE 2 — Build Milestones M3 → M5 from `07-phase-2-program-wizard.md`
PHASE 3 — Build Milestones M6 → M7 from `08-phase-3-customer-onboarding.md`
PHASE 4 — Build Milestones M8 → M9 from `09-phase-4-providers-and-billing.md`
PHASE 5 — Build Milestone M10 from `10-phase-5-hardening.md`
PHASE 6 — Diamond features from `11-diamond-features.md` (in priority order
          listed in that file)
LANDING PAGE — Build the 3D landing page from `12-landing-page-design.md`
               in parallel with Phase 1 (it has no backend dependencies).

After EACH milestone:
  - Update replit.md with what changed
  - Run the test cases listed for that milestone
  - Commit-equivalent: tell the user the milestone is complete and what is
    demoable RIGHT NOW
  - Do not move to the next milestone until the current one's acceptance
    criteria are green

================================================================================
WHAT THE USER MUST PROVIDE
================================================================================

Before you can complete certain phases you will need secrets. Use the
environment-secrets skill (read it FIRST before asking) to request:

PHASE 0:    DATABASE_URL (use Replit's built-in Postgres — no secret needed),
            SESSION_SECRET (you generate it).
PHASE 1:    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Gmail app password),
            EMAIL_FROM_ADDRESS.
PHASE 2:    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
            R2_BUCKET_NAME, R2_PUBLIC_URL_BASE.
PHASE 3:    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
            (only when you reach SMS OTP — defer until then).
PHASE 4:    STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLIC_KEY,
            FACIA_API_KEY, FACIA_WEBHOOK_SECRET,
            AML_WATCHER_API_KEY,
            ABR_GUID (free, https://abr.business.gov.au/Tools/WebServicesGuide).
PHASE 5:    SENTRY_DSN, SENTRY_AUTH_TOKEN.
DIAMOND:    ANTHROPIC_API_KEY (for AI risk narratives — Diamond feature 1).

For each of these, check whether a Replit Integration exists FIRST (use the
integrations skill). For example, Stripe is available as a Replit Integration
and is preferable to manually entering keys.

================================================================================
QUALITY BAR
================================================================================

This is regulated compliance software. The end users are AML compliance
officers whose business depends on this being correct.

Definition of Done for every feature:
  ✅ Workspace-scoped queries (no cross-tenant leak possible)
  ✅ RBAC enforced server-side (frontend hiding is secondary)
  ✅ Audit log entry written for every mutation
  ✅ Reason field captured for every decision
  ✅ Loading, error, and empty states handled in UI
  ✅ Mobile responsive (375px → 1920px)
  ✅ Dark + light mode both look polished
  ✅ Vitest test for the storage function
  ✅ Vitest test for the Express route (auth, RBAC, validation)
  ✅ Playwright test for the user journey (where applicable)
  ✅ replit.md updated with the new feature

If you ever have to choose between speed and correctness, choose correctness.
Compliance officers will lose their license over a bug here.

================================================================================
HOW TO COMMUNICATE WITH ME
================================================================================

  - Tell me what you're about to build before you build it.
  - When you finish a milestone, summarise what works and how to test it.
  - If you need a secret, use the environment-secrets skill (do not ask me
    for raw values in chat).
  - If a decision is genuinely ambiguous and not covered in the plan files,
    ask me. Otherwise, decide and proceed.
  - Keep replit.md current — it is your long-term memory.

Begin by unzipping the attached file, reading every plan document in order,
and then giving me a one-paragraph summary that proves you understood the
scope. Then start Phase 0.

Go.
================================================================================
```
