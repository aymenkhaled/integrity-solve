# 06 — Phase 1: Foundation & Auth (M1 + M2)

**Duration:** Weeks 1–3 · **Goal:** working multi-tenant auth, workspace isolation, RBAC, business registration, restricted dashboard.

---

## Milestone 1 — Core Foundation (Weeks 1–2)

### M1 backend tasks (Express + Drizzle)

| Task | File | Detail |
|------|------|--------|
| Express bootstrap | `server/index.ts`, `server/app.ts` | App factory pattern (testable). Pino logger, request-id, helmet, CORS limited to portal origin, JSON body limit 5MB. |
| Drizzle init + schema | `shared/schema.ts` (file 04), `drizzle.config.ts` | `npm run db:push` creates all tables. Then run audit-log hardening SQL (file 02 §2.3). |
| Seed | `server/seed.ts` | Platform admin + demo workspace + a few demo customers. |
| Env validation | `server/env.ts` | Zod schema validates `process.env` at startup; fail fast on missing required vars. |
| Logger | `server/logger.ts` | Pino with `workspaceId`, `userId`, `requestId` fields. JSON in prod, pretty in dev. |
| Auth module | `server/routes/auth.routes.ts`, `server/services/auth.service.ts` | Routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/verify-email`, `POST /auth/verify-mobile`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`. bcrypt cost 12. Sessions table-backed. |
| Email service | `server/services/email.service.ts` | Nodemailer + Gmail SMTP. `sendEmail({ to, subject, react })` renders React Email components. |
| SMS service | `server/services/sms.service.ts` | Twilio Verify or direct Twilio SMS. |
| `requireAuth` | `server/middleware/requireAuth.ts` | Reads `sid` cookie, looks up session, attaches `req.user`. Refreshes `lastSeenAt`. |
| `withWorkspace` | `server/middleware/withWorkspace.ts` | Reads `workspaceId` from `req.user.session` (active workspace) or `X-Workspace-Id` header (API). Validates active membership. Attaches `req.workspace` and `req.membership`. |
| `requireAction(action)` | `server/middleware/requireAction.ts` | Decorator that calls `can(req.membership.role, action)`. 403 JSON on deny. |
| `withAudit({entity, action})` | `server/middleware/withAudit.ts` | Loads `before`, runs handler, captures `after`, inserts audit row including `req.body.reason`. |
| Workspaces module | `server/routes/workspaces.routes.ts`, `server/services/workspace.service.ts` | CRUD + `GET /workspaces/:id/setup-progress` returning per-step status. |
| Memberships module | `server/routes/memberships.routes.ts`, `server/storage/membership.storage.ts` | Invite by email, accept invite, change role, revoke. Token-based invitation. |
| Workspace state service | `server/services/workspace-state.service.ts` | Explicit transitions: `registered → identity_verified → business_verified → setup_in_progress → setup_complete → active`. Each transition logs audit. |
| Rate limiting | `server/middleware/rateLimit.ts` | Tiers from file 02 §2.7. |
| Health check | `server/routes/health.ts` | `GET /healthz` — DB ping + Redis (if configured). |

### M1 frontend tasks (React + Vite + Wouter)

| Task | Component | Detail |
|------|-----------|--------|
| Vite + Tailwind setup | `vite.config.ts`, `tailwind.config.ts` | Path aliases `@/`, `@shared/`. Tailwind with shadcn theme tokens. |
| Theme provider | `client/src/components/ThemeProvider.tsx` | Light/dark toggle, system default, persisted in localStorage. |
| App router | `client/src/App.tsx` | Wouter `<Switch>` with `<Route>`s. Lazy-loaded pages via `React.lazy`. Suspense boundary with `<PageSkeleton>`. |
| API client | `client/src/lib/api.ts` | `fetchJson(url, init)` with cookie credentials, 401 refresh, 403 toast. |
| TanStack Query setup | `client/src/lib/queryClient.ts` | Global `QueryClient`, `staleTime: 30s` default, `refetchOnWindowFocus: true`. |
| `useAuth` hook | `client/src/hooks/useAuth.ts` | Wraps `GET /auth/me` query; helpers `isAuthenticated`, `user`, `logout()`. |
| `useWorkspace` hook | `client/src/hooks/useWorkspace.ts` | Wraps `GET /workspaces/me/active`; `switchWorkspace(id)`. |
| `usePermission` hook | `client/src/hooks/usePermission.ts` | `can('action.name')` returns boolean. |
| `<ProtectedRoute>` | `client/src/components/auth/ProtectedRoute.tsx` | Redirects to `/login?next=` if unauthenticated. Optional `requireAction` prop. Optional `requireImplementationStatus` prop (e.g., 'COMPLETE') redirects to `/app/dashboard-onboarding` otherwise. |
| `<PermissionGate>` | `client/src/components/auth/PermissionGate.tsx` | Renders nothing when `can(action)` is false. |
| Register page | `pages/auth/Register.tsx` | Multi-step: account → email verify → mobile OTP. RHF + Zod. Progress indicator. |
| Login page | `pages/auth/Login.tsx` | Email + password. "Forgot password?" link. SSO placeholder for later. |
| Verify email | `pages/auth/VerifyEmail.tsx` | 6-digit code input, resend cooldown 60s, max 3 attempts. |
| Verify mobile | `pages/auth/VerifyMobile.tsx` | Same shape; SMS via Twilio. |
| Verify identity | `pages/auth/VerifyIdentity.tsx` | M1 stub — show "Identity verification: skipped in MVP, mark verified" button. M8 wires real Facia. |
| App shell | `pages/app/_layout.tsx` (handled by route) | Sidebar + topbar + main + mobile-bottom-nav. |
| Sidebar | `components/layout/Sidebar.tsx` | Sections gated by `<PermissionGate>`. Workspace switcher at top. |
| Topbar | `components/layout/TopBar.tsx` | Notification bell, theme toggle, user avatar dropdown. |
| Mobile bottom nav | `components/layout/MobileBottomNav.tsx` | 4 icons (Dashboard, Clients, Reviews, More). |
| Notification bell | `components/notifications/NotificationBell.tsx` | Polls `/notifications/unread-count` every 30s; opens panel; WebSocket pushes update count live. |

### M1 acceptance criteria

- ✅ User can register, verify email, (optional) verify mobile, and reach `/app/dashboard-onboarding`.
- ✅ Workspace is auto-created at register and the new user is assigned `WORKSPACE_ADMIN`.
- ✅ All data is workspace-scoped — verified by `tests/integration/workspace-isolation.test.ts`.
- ✅ Direct URL access to `/app/customers` returns 403 for `READ_ONLY` role attempting `customer.create`.
- ✅ Audit log entry is created for every login, logout, role change, and workspace creation.
- ✅ Test user in Workspace A passing Workspace B's id explicitly receives 403 (not data).
- ✅ `npm run dev` starts the entire app on a single port.

---

## Milestone 2 — Business Registration & Restricted State (Week 3)

### M2 backend tasks

| Task | File | Detail |
|------|------|--------|
| ABN/ACN registry adapter | `server/providers/abr/abr-kyb.adapter.ts` | Free ABR XML web service. Cache responses per ABN for 24h. Graceful fallback to manual entry on timeout. |
| Workspace setup-progress | `server/routes/workspaces.routes.ts` | `GET /workspaces/:id/setup-progress` returns `{ identityVerified, mobileVerified, businessVerified, programSteps: [{ step, status }], billingStatus }`. |
| Stripe customer init | `server/services/billing.service.ts` | `ensureStripeCustomer(workspace)` creates Stripe Customer at registration if not present. Stores `stripeCustomerId`. Sets `billingStatus = INACTIVE`. |
| Support access provisioning | `server/routes/memberships.routes.ts` | `POST /workspaces/:id/support-access` — platform admin requests; client admin must approve via in-portal action. Time-limited (24h default). |
| Workspace soft-delete | `server/routes/workspaces.routes.ts` | `DELETE /workspaces/:id` requires `WORKSPACE_ADMIN`, requires reason (≥30 chars), cascades to soft-disable all memberships. |

### M2 frontend tasks

| Task | Route/Component | Detail |
|------|-----------------|--------|
| Register business page | `pages/auth/RegisterBusiness.tsx` | ABN/ACN input → live lookup → prefill card → confirm form → submit. Authority declaration checkbox. |
| Restricted dashboard | `pages/app/DashboardOnboarding.tsx` | `<SetupProgressCard>` with 6 animated steps + `<LockedFeaturePreview>` for each major module + `<BillingStatusCard>` + `<SupportCard>`. |
| `<SetupProgressCard>` | `components/onboarding/SetupProgressCard.tsx` | Polls `setup-progress` every 30s + on focus. Click on a step → navigates to that wizard step. |
| `<LockedFeaturePreview>` | `components/onboarding/LockedFeaturePreview.tsx` | Greyed-out preview with padlock icon + tooltip explaining what unlocks it. Shown for: Clients (unlocks at wizard step 6), Escalations (unlocks at first APPROVED file), Provider checks (unlocks at billing active). |
| Billing setup page | `pages/app/billing/BillingSetup.tsx` | Plan picker + Stripe Elements payment method form. Skip option (warning that paid checks remain blocked). |
| Settings → workspace | `pages/app/settings/Workspace.tsx` | Edit legal/trading name, brand colors, brand logo upload (R2). Country pathway selector. |

### M2 acceptance criteria

- ✅ ABN lookup returns and pre-fills business data; manual entry permitted with admin flag.
- ✅ Workspace transitions through states in correct order; backend rejects skipping.
- ✅ Restricted dashboard shows meaningful locked previews — not blank grey boxes.
- ✅ Billing setup creates Stripe customer; `billingStatus` updates correctly from Stripe webhook.
- ✅ Support access creates auditable membership with `expiresAt`; revocable; surfaced in audit log.

---

## Phase 1 deliverable

A demoable workspace registration funnel:

1. Visit landing → click Sign up.
2. Create account, verify email + mobile.
3. Register business with ABN lookup.
4. Reach restricted dashboard with onboarding checklist.
5. (Optional) Add payment method.

End-state: working multi-tenant auth + first-login restricted portal, ready for the Program Wizard in Phase 2.
