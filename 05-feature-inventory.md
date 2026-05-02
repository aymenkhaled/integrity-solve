# 05 — Feature inventory: what to copy from StrategyNavigator

> **The most valuable file in this package.** StrategyNavigator already has roughly 60% of the load-bearing infrastructure Integrity Solve needs. Lifting it saves multiple weeks of work. The receiving agent will not have access to StrategyNavigator's source — but the patterns described here are precise enough to re-implement faithfully.

## How to use this file

For each row:
- **What it is** — the capability.
- **Pattern** — the architectural shape to replicate.
- **Cost to lift** — Trivial / Easy / Moderate. Trivial = copy as-is. Easy = small renames. Moderate = adapt the pattern, write the code.
- **Adapt for Integrity Solve** — what changes in the new context.

---

## A. Authentication & sessions

### A1. httpOnly cookie auth + JWT refresh

| | |
|---|---|
| **What** | Email/password login → bcrypt hash → opaque session token in `httpOnly`, `Secure`, `SameSite=Lax` cookie. Short-lived access claims with refresh-on-roll. |
| **Pattern** | `POST /auth/login` returns `Set-Cookie: sid=<opaque>; Max-Age=...`. `requireAuth` middleware reads cookie, looks up `sessions` row, checks `expiresAt`, rolls forward `lastSeenAt`. Logout deletes the row. |
| **Cost** | Easy — the schema differs slightly (we add `workspaceId` to sessions). |
| **Adapt** | Add identity verification status check (`identityStatus !== 'VERIFIED'` → only allow `/verify-*` routes). |

### A2. Email + mobile OTP verification

| | |
|---|---|
| **What** | 6-digit codes hashed with bcrypt, 10-minute expiry, max 3 attempts before lockout, resend cooldown 60s. |
| **Pattern** | `verification_codes` table with `channel`, `destination`, `codeHash`, `attempts`, `expiresAt`, `consumedAt`. Send via `email.service.ts` or `sms.service.ts`. |
| **Cost** | Easy. Twilio is new; Nodemailer is identical. |
| **Adapt** | Mobile OTP is now mandatory (Australian AML/CTF). |

### A3. Password reset / forgot password flow

| | |
|---|---|
| **What** | Tokenised reset link emailed; one-time consumption; 1-hour expiry. |
| **Pattern** | Same `verification_codes` table but `channel = 'EMAIL'` and `purpose = 'password_reset'` (extend the enum). |
| **Cost** | Trivial. |
| **Adapt** | None. |

### A4. Session expiry handling on the client

| | |
|---|---|
| **What** | `lib/api.ts` fetch wrapper detects 401 → triggers refresh attempt → if refresh fails, redirect to `/login?next=<current>`. Avoids a UX where the user clicks a button and silently nothing happens. |
| **Pattern** | Single fetch wrapper. TanStack Query `onError` plugged in. |
| **Cost** | Trivial. |
| **Adapt** | None. |

---

## B. Multi-tenancy & RBAC

### B1. Multi-tenant `company_id`/`workspace_id` isolation

| | |
|---|---|
| **What** | Every tenant table has `companyId` (in StrategyNavigator). Every storage function takes it as the first arg. Middleware resolves it from the session. |
| **Pattern** | `withCompany` middleware → `req.company`. Storage convention: `getXById(companyId, id)`. |
| **Cost** | Trivial — rename `companyId` → `workspaceId`. |
| **Adapt** | Add Postgres RLS as a third defensive layer (file 02). |

### B2. RBAC permission matrix + `can()` helper

| | |
|---|---|
| **What** | StrategyNavigator has 3 roles (`user`, `admin`, `super_admin`); we expand to 8 (file 02). Pattern is `Set<Action>` per role; `can(role, action)` is a pure function used by both Express and React. |
| **Pattern** | `shared/rbac.ts` — pure data + pure function. |
| **Cost** | Easy — write the new 8×N matrix; helper is identical. |
| **Adapt** | New action names; same shape. |

### B3. `<PermissionGate>` React component

| | |
|---|---|
| **What** | `<PermissionGate action="customer.approve">{children}</PermissionGate>` renders nothing when the user lacks permission. |
| **Pattern** | Reads role from `useAuth()`, calls `can(role, action)`. |
| **Cost** | Trivial. |
| **Adapt** | None. |

### B4. Workspace switcher

| | |
|---|---|
| **What** | Top-bar dropdown listing all workspaces the user belongs to. Switching writes `workspaceId` into the session and reloads. |
| **Pattern** | `PATCH /sessions/me { workspaceId }`. Server validates membership. |
| **Cost** | Easy. |
| **Adapt** | None — Diamond feature 4 (group structure) is a sub-case. |

---

## C. Invitations & onboarding

### C1. Unified invitation system (token-based)

| | |
|---|---|
| **What** | `invitations` table with `token`, `email`, `role`, `expiresAt`. `/accept-invite?token=...` page validates email match, status pending, not expired; auto-creates membership. |
| **Pattern** | 7-day expiry; status enum `pending/accepted/rejected/expired`. |
| **Cost** | Easy — copy verbatim, extend role enum. |
| **Adapt** | Customer Portal (Diamond 7) reuses the same primitive with a different audience. |

### C2. Welcome modal + guided tour

| | |
|---|---|
| **What** | First login triggers a welcome modal; an opt-in 4-step product tour highlights the dashboard, wizard, customer list, and billing. |
| **Pattern** | `users.completedTour: boolean` flag; `react-joyride` library. |
| **Cost** | Easy. |
| **Adapt** | Tour points at the wizard, customer list, and escalation queue. |

### C3. Persona-aware onboarding questionnaire

| | |
|---|---|
| **What** | Right after registration, a 5-question survey asks role, company size, primary goal — feeds the dashboard widget order. |
| **Pattern** | `users.onboardingAnswersJson`. |
| **Cost** | Easy. |
| **Adapt** | Question set: industry pathway, customer count, current AML tooling. |

---

## D. Notifications & email

### D1. Email infrastructure with Nodemailer + Gmail SMTP

| | |
|---|---|
| **What** | `email.service.ts` wraps Nodemailer. Templates are React components rendered to HTML at send time using `@react-email/render`. |
| **Pattern** | `sendEmail({ to, subject, react: <VerifyEmail token={...} />, replyTo })`. |
| **Cost** | Trivial. |
| **Adapt** | Add ~10 new templates (escalation assigned, review due, billing past-due, customer portal invite, document ready, digest). |

### D2. In-app notification bell + counter + WebSocket

| | |
|---|---|
| **What** | Top-bar bell shows unread count; opens panel listing notifications; click navigates and marks as read. WebSocket pushes new ones live. |
| **Pattern** | `notifications` table; broadcast via `WebSocketService`. |
| **Cost** | Easy. |
| **Adapt** | Notification types are domain-specific (escalation, ECDD requested, check completed). |

### D3. Notification preferences (per-user opt-out)

| | |
|---|---|
| **What** | Settings page lets user mute notification types and disable email. |
| **Pattern** | `notification_preferences` table; checked before send. |
| **Cost** | Trivial. |
| **Adapt** | Some notifications are mandatory (regulatory) and cannot be muted. |

### D4. Daily digest emails (cron)

| | |
|---|---|
| **What** | At 9 AM each user's local time, send a single email summarising overnight activity (escalations, reviews due, check results). |
| **Pattern** | `notification-digest.job.ts` daily cron with timezone bucketing. |
| **Cost** | Easy. |
| **Adapt** | None. |

---

## E. Background jobs

### E1. Distributed lock pattern (`job_locks` table)

| | |
|---|---|
| **What** | Multi-instance deployments can't double-fire cron jobs. The pattern: `INSERT INTO job_locks (id, jobName, acquiredAt) ON CONFLICT DO NOTHING RETURNING id`; if returning is empty, another instance has it. |
| **Pattern** | `withDistributedLock(jobName, fn)` helper. |
| **Cost** | Trivial. |
| **Adapt** | None — works as-is for Replit autoscale or Reserved VM. |

### E2. Cron scheduling with stagger

| | |
|---|---|
| **What** | All cron jobs registered in one place; stagger `:00`, `:00:30`, `:01:00`, etc. to avoid thundering herd on DB. |
| **Pattern** | `node-cron` with offset minutes. |
| **Cost** | Trivial. |
| **Adapt** | New job catalog (file 02 §2.4). |

### E3. AI request concurrency limiting

| | |
|---|---|
| **What** | Global semaphore that caps concurrent calls to AI providers (Anthropic, Groq) at ~5 to avoid 429s. |
| **Pattern** | `concurrency.service.ts` exports `limitAIRequest(fn)` returning a queued promise. |
| **Cost** | Trivial. |
| **Adapt** | Used by Diamond 1 (narratives), Diamond 2 (rule classification), Diamond 6 (regulatory tagging). |

---

## F. File handling

### F1. File upload with validation

| | |
|---|---|
| **What** | Multer for multipart; allowed mime types whitelist; max size enforcement; SHA-256 checksum. |
| **Pattern** | `evidence.routes.ts POST /customer-files/:id/evidence`. Returns the stored row + a signed download URL. |
| **Cost** | Easy — switch from local disk (StrategyNavigator's prototype) to R2. |
| **Adapt** | Add virus scanning (ClamAV via `clamscan` if available, or a Diamond enhancement). |

### F2. Cloudflare R2 / S3 wrapper

| | |
|---|---|
| **What** | Single `file-storage.service.ts` wraps `@aws-sdk/client-s3` against R2's S3-compatible endpoint. Methods: `upload`, `getSignedUrl(key, ttl)`, `delete`. Workspace-prefixed keys (`workspaces/<wsId>/customer-files/<fileId>/<filename>`). |
| **Pattern** | Sign URL with 1-hour expiry by default; downloads logged to audit. |
| **Cost** | Moderate — StrategyNavigator's R2 work is partial; we deliver it complete here. |
| **Adapt** | Lifecycle policy on bucket: 7-year retention for `evidence/*`, 7-year for `program-documents/*`, 30-day for `temporary/*`. |

---

## G. Audit log

### G1. Audit log table + interceptor

| | |
|---|---|
| **What** | StrategyNavigator has a SOC 2 compliant `user_audit_trail` already. Same pattern, stricter constraints (revoked UPDATE/DELETE grants + Postgres trigger). |
| **Pattern** | `withAudit({ entityType, action })` Express wrapper captures before/after, inserts row. |
| **Cost** | Easy. |
| **Adapt** | Make `reason` mandatory for state-changing actions (file 02 §2.3). |

### G2. Audit trail UI with filters and export

| | |
|---|---|
| **What** | Paginated, filterable, exportable to PDF/CSV. |
| **Pattern** | TanStack Table + signed URL CSV streaming. |
| **Cost** | Easy. |
| **Adapt** | Add per-customer-file audit view (only events for that file). |

---

## H. UI components & theming

### H1. ~50 shadcn/ui primitives

| | |
|---|---|
| **What** | Button, Input, Select, Dialog, Sheet, Tabs, Tooltip, Toast, DataTable wrapper, Form/FormField, Badge, Avatar, Separator, Card, ScrollArea, Skeleton, etc. |
| **Pattern** | `client/src/components/ui/*` — copy verbatim from shadcn (same versions). |
| **Cost** | Trivial. |
| **Adapt** | Re-skin with Integrity Solve brand tokens (file 12). |

### H2. Dark/light theme toggle (next-themes pattern adapted for Vite)

| | |
|---|---|
| **What** | System default + manual toggle, persists in localStorage, applied via `class="dark"` on `<html>`, all colors via CSS tokens. |
| **Pattern** | Custom `ThemeProvider` (we don't use `next-themes` because no Next; use a minimal CSS-class toggle). |
| **Cost** | Easy. |
| **Adapt** | Auth pages have intentionally dark left-rail branding, light right-rail form. |

### H3. Mobile bottom navigation

| | |
|---|---|
| **What** | 4-icon bottom bar visible only on mobile (md:hidden). |
| **Pattern** | Wouter `<Link>` with active state. |
| **Cost** | Trivial. |
| **Adapt** | Tabs: Dashboard / Clients / Reviews / More. |

### H4. Glassmorphism / cyan-blue gradient accents

| | |
|---|---|
| **What** | StrategyNavigator's premium aesthetic uses `backdrop-blur` + subtle gradients. We adopt a more compliance-grade palette: deep navy + emerald + warm amber for risk states. |
| **Pattern** | Tailwind gradient utilities + custom CSS variables. |
| **Cost** | Easy. |
| **Adapt** | More restrained — this is a serious compliance product. |

---

## I. Forms & validation

### I1. React Hook Form + Zod with shared schemas

| | |
|---|---|
| **What** | Every form uses `zodResolver`; the same Zod schema lives in `shared/zod-schemas.ts` and is reused on the backend in Express handlers. |
| **Pattern** | Single source of truth for shape and error messages. |
| **Cost** | Trivial. |
| **Adapt** | Plenty more forms; pattern is identical. |

### I2. Autosave with debounce

| | |
|---|---|
| **What** | StrategyNavigator's wizard already debounces and shows "Saving / Saved" indicator. |
| **Pattern** | `useAutosave(formValues, mutationFn, 2000)` hook. |
| **Cost** | Trivial. |
| **Adapt** | Apply to all 6 program steps + ECDD + SOF/SOW + periodic review forms. |

---

## J. Dashboards & reporting

### J1. Dashboard widgets framework

| | |
|---|---|
| **What** | Dashboard composed of cards. Each card is a self-contained component fetching its data via TanStack Query. Layout is responsive grid. |
| **Pattern** | `<DashboardCard title icon><CardContent>...</CardContent></DashboardCard>`. |
| **Cost** | Easy. |
| **Adapt** | New cards: program completeness, files by state, escalations open, training compliance, billing usage. |

### J2. Cross-tenant analytics for super admins

| | |
|---|---|
| **What** | Platform-wide aggregations (active workspaces, revenue, feature usage). |
| **Pattern** | Separate `/platform` route prefix protected by `requireAction('platform.admin')`. Pre-aggregated daily into a `platform_stats` table to avoid hot queries. |
| **Cost** | Moderate — different metrics. |
| **Adapt** | Cross-tenant view of provider health, escalation volume, billing health. |

### J3. Industry benchmarking (percentile bands)

| | |
|---|---|
| **What** | "You complete CDD 30% faster than peers in your industry." Uses anonymised aggregate snapshots. |
| **Pattern** | `benchmarking_snapshots` table populated weekly. Opt-in. |
| **Cost** | Moderate. |
| **Adapt** | This is Diamond 8. |

---

## K. Billing

### K1. Stripe subscriptions + webhooks (StrategyNavigator uses PayPal — pattern translates)

| | |
|---|---|
| **What** | Subscription tiers map to `subscriptionTier` enum on workspace. Webhook events keep `billingStatus` in sync. |
| **Pattern** | `stripe-webhook.service.ts` handles `customer.subscription.updated/deleted`, `invoice.payment_succeeded/failed`, `payment_method.attached`. |
| **Cost** | Moderate — must learn Stripe specifics; the orchestration shape is the same. |
| **Adapt** | Add metered usage for paid checks (Stripe Usage Records). |

### K2. Billing guards

| | |
|---|---|
| **What** | Routes that consume billable resources are wrapped with `requireBillingActive()` middleware that returns HTTP 402 when inactive. |
| **Pattern** | Returns JSON `{ code: 'BILLING_INACTIVE', userMessage: '...', action: 'add_payment_method', link: '/app/billing/setup' }`. |
| **Cost** | Trivial. |
| **Adapt** | Apply to all `/checks/*` mutate routes. |

### K3. Trial / grace periods / past-due handling

| | |
|---|---|
| **What** | 7-day grace before checks blocked; 30-day before full read-only suspension; 90-day before hard close. UI banners for each state. |
| **Pattern** | `currentPeriodEnd` + `billingStatus`; banner component checks both. |
| **Cost** | Easy. |
| **Adapt** | Add explicit messaging tailored to compliance context ("Checks are paused — your existing data is safe"). |

---

## L. Operations / ops-ready

### L1. Performance optimization patterns

| | |
|---|---|
| **What** | Extensive DB indexing, N+1 query fixes, code splitting with `React.lazy`. |
| **Pattern** | Hand-tuned per-table indexes; lazy load every route page. |
| **Cost** | Easy. |
| **Adapt** | Indexes already specified in file 04. |

### L2. Rate limiting (`express-rate-limit`)

| | |
|---|---|
| **What** | Per-IP for auth, per-user for mutations, per-workspace for check triggers. |
| **Pattern** | Tiered limits in `middleware/rateLimit.ts`. |
| **Cost** | Trivial. |
| **Adapt** | Tighter limits on `/checks/trigger` to prevent runaway billing. |

### L3. CSP, helmet, HSTS

| | |
|---|---|
| **What** | Production hardened headers. |
| **Pattern** | Helmet config (file 02 §2.8). |
| **Cost** | Trivial. |
| **Adapt** | Allow Stripe + R2 domains. |

### L4. Global React Error Boundary + Sentry

| | |
|---|---|
| **What** | Top-level boundary catches render errors, logs to Sentry, shows fallback. |
| **Pattern** | `ErrorBoundary` component + `@sentry/react`. |
| **Cost** | Trivial. |
| **Adapt** | Per-route boundaries for the wizard, customer file detail, and billing. |

### L5. Health check endpoint

| | |
|---|---|
| **What** | `GET /healthz` returns 200 with DB ping + Redis ping (if configured). |
| **Pattern** | Simple route, no auth. |
| **Cost** | Trivial. |
| **Adapt** | Add provider health check (last successful check per provider in 1h). |

---

## M. Things that are net-new (NOT in StrategyNavigator)

These have no existing pattern; the receiving agent builds them from the file 06–11 plans:

- **Document generation** (DOCX templates, PDF conversion, R2 storage with versioning)
- **Customer-file state machine** (12 states, role-gated transitions)
- **Provider adapter layer** (capability-based abstraction + adapters)
- **Webhook gateway with idempotency** (signature verification, replay protection)
- **3D landing page hero** (Three.js + R3F + GSAP)
- **AI risk narrative** generator (Anthropic Claude with structured prompts)
- **Customer-facing portal** (separate sub-app on a different subdomain)
- **Compliance evidence pack ZIP generator**
- **Identity verification provider integration** (Facia)
- **AML screening provider integration** (AML Watcher / Personr)

These are roughly 40% of the build by effort. Plan files 06–11 cover them in detail.

---

## N. Quick-start order for the receiving agent

1. **Day 1–2:** Set up A1, A2, B1, B2, B3, H1, H2, K2 (skeletal). You now have a tenant-isolated, role-aware app shell.
2. **Day 3–5:** Build Phase 1 (M1–M2) using A3, A4, C1, D1, G1, L1, L2, L3, L4, L5.
3. **Week 2:** Phase 2 wizard (I1, I2, J1) + first DOCX generation.
4. **Week 3+:** Customer file state machine (net-new), then provider adapters (net-new), then billing (K1, K3).
5. **Diamond features:** in priority order from file 11.
