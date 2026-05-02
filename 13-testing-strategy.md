# 13 — Testing Strategy

## 13.1 Stack

- **Unit + integration**: **Vitest** (fast, native ESM, identical to StrategyNavigator's test setup)
- **HTTP integration**: `supertest` against the Express app factory (`server/app.ts`)
- **E2E browser**: **Playwright** (Chromium primary; Firefox + WebKit nightly)
- **Provider mocking**: **MSW** (Mock Service Worker) for outbound HTTP
- **Load testing**: **k6** (cloud or local, run pre-launch)
- **Test database**: ephemeral Postgres via `pg-mem` (in-process) for unit tests; real Postgres via Replit DB for integration

## 13.2 Coverage targets

| Layer | Target | Notes |
|-------|--------|-------|
| Unit tests | ≥ 80% on critical modules | risk calculator, state machines, RBAC, provider normalizers, document variable mapping |
| Integration tests | All module APIs | every route file has a `.test.ts` sibling |
| RBAC tests | 100% of role × action matrix | brute-force every combination, expect 200 or 403 (never 404 or 500 for auth failures) |
| E2E tests | Critical user journeys | see §13.5 |
| Provider adapter tests | All adapters | mock provider responses; webhook signature validation; invalid signature rejection; duplicate idempotency |
| Billing tests | All Stripe events | use Stripe CLI test mode + Stripe webhook signing |
| Security tests | Cross-tenant + auth | custom Vitest suite + OWASP ZAP automated baseline |
| Performance tests | Load + concurrency | 50 concurrent virtual users; dashboard load < 2s p95 |

## 13.3 Test layout

```
tests/
  unit/
    risk-calculator.test.ts
    customer-file-state.test.ts        # all transitions × all roles
    workspace-state.test.ts
    rbac.test.ts                       # PERMISSIONS matrix
    program-form-step-gate.test.ts
    template-variable-mapping.test.ts
    provider-normalizer.facia.test.ts
    provider-normalizer.aml-watcher.test.ts
    idempotency-key.test.ts
    document-checksum.test.ts
    risk-rating-calculator.test.ts
  integration/
    auth.routes.test.ts
    workspace-isolation.test.ts        # the cross-tenant proof
    audit-immutability.test.ts         # UPDATE/DELETE on audit_log must fail
    workspaces.routes.test.ts
    program-forms.routes.test.ts
    customer-files.routes.test.ts
    customer-files.state-transition.test.ts
    checks.routes.test.ts
    webhooks.routes.test.ts            # signature validation + replay
    stripe-webhook.test.ts             # all event types
    billing-guard.test.ts              # 402 enforcement
    notifications.routes.test.ts
    invitations.routes.test.ts
  e2e/
    register-and-onboard.spec.ts
    wizard-and-generate.spec.ts
    high-risk-escalation.spec.ts
    billing-paywall.spec.ts
    customer-portal-submission.spec.ts
    evidence-pack-generation.spec.ts
  fixtures/
    seed-test-workspace.ts             # consistent test data
    mock-provider-config.ts
    sample-program-form-data.ts
  utils/
    test-app.ts                        # creates Express app + ephemeral DB
    auth-helpers.ts                    # createTestUser, loginAs(role)
    db-helpers.ts                      # truncate, seed, withTransaction
```

## 13.4 Critical test cases (must-have, by milestone)

### M1
- ✅ Register → email verify → mobile verify → reach `/app/dashboard-onboarding`
- ✅ Cross-tenant attempt: User in WS-A passes WS-B id → 403
- ✅ Audit row written for login, role change, workspace creation
- ✅ Direct URL `/app/customers` for READ_ONLY → 403 not 404

### M2
- ✅ ABN lookup returns prefilled data; manual entry permitted with admin flag
- ✅ Workspace state transitions cannot skip
- ✅ Stripe customer created at registration

### M3
- ✅ Step 4 submit before step 3 complete → 409
- ✅ Conflict-of-interest flag in step 6 → task auto-created
- ✅ Autosave works across browser reload (write, reload, read same value)
- ✅ All 6 step JSON schemas validate sample-good data ✅, reject sample-bad data ❌

### M4
- ✅ Step 6 submit → 4 documents generated within 60s
- ✅ Same-version download → identical checksum
- ✅ Previous version remains downloadable after regeneration
- ✅ DOCX opens in Word; PDF renders in PDF.js

### M5
- ✅ Form edit → "pending regeneration" banner; documents NOT regenerated
- ✅ Program Review submission → new ProgramVersion + regeneration triggered
- ✅ Audit trail shows old/new for every form field change

### M6
- ✅ All 4 customer types creatable (Individual, Company, Trust, Partnership)
- ✅ Risk calculator deterministic across all rule combinations
- ✅ State transition without correct role → 403; without reason → 400
- ✅ Beneficial ownership > 100% → validation error
- ✅ Evidence upload → R2; download via signed URL → audited

### M7
- ✅ ECDD form: ONBOARDING_USER cannot complete; CO/REVIEWER can
- ✅ Escalation auto-assigns CO when no reviewer specified
- ✅ Periodic review scheduler creates tasks 30 days before due date
- ✅ Decline decision: requires reason ≥10 chars; double-confirm
- ✅ Unusual activity SMR flag: extra confirm step before submit

### M8
- ✅ Mock adapter: every capability returns configured result
- ✅ Webhook with bad signature → 401 + 0 data changes
- ✅ Duplicate webhook → second is no-op
- ✅ Provider timeout → pending task, NOT false-clear
- ✅ Manual override → MANUAL_OVERRIDE status + audit row with reason

### M9
- ✅ Add valid Stripe test card → billingStatus ACTIVE within 60s
- ✅ Paid check with INACTIVE billing → 402 with structured JSON
- ✅ Each finalized check → exactly 1 usage_event (idempotency)
- ✅ Failed payment → PAST_DUE + banner + email
- ✅ Cancellation → CANCELLED within 60s

### M10
- ✅ UPDATE/DELETE on audit_log → fails (DB trigger raises exception)
- ✅ All cron jobs run on schedule on staging
- ✅ Sentry receives test exception (frontend + backend)
- ✅ `securityheaders.com` rates the staging URL A+
- ✅ k6 load test: 50 concurrent users, p95 latency < 300ms

## 13.5 E2E user journeys (Playwright)

### UAT Script 1 — Low-risk individual onboarding
```
1. Register account → verify email → verify mobile → reach dashboard-onboarding
2. Register business via ABN lookup
3. Complete all 6 wizard steps
4. Wait for documents to generate; download Risk Assessment PDF
5. Create individual customer file
6. Complete CDD form (low-risk fields)
7. Run mock identity check (configured to PASS)
8. Run mock AML screen (configured to CLEAR)
9. Risk rating auto-calculates as LOW
10. Approve file → moves to APPROVED
11. Verify next_review_due is set 12 months out
```

### UAT Script 2 — High-risk entity with escalation
```
1. (assumes Script 1 setup) Create entity customer file (Company)
2. Complete CDD with high-risk indicators
3. Add 3 beneficial owners; one with PEP=true
4. Run AML screen (configured for one POTENTIAL_MATCH)
5. ReviewMatchModal appears → CO records ESCALATED
6. ECDD triggered → SOF form completed → escalation created
7. Reviewer assigned → decision: APPROVED_WITH_CONTROLS
8. Controls recorded → file moves to APPROVED_WITH_CONTROLS
9. Verify enhanced monitoring schedule set (3-monthly review)
10. Verify audit trail shows complete chain of custody
```

### UAT Script 3 — Billing paywall
```
1. Complete setup wizard (no payment method)
2. Attempt to run identity check on a new customer
3. System returns 402 with structured message
4. Navigate to /app/billing/setup → add Stripe test card 4242…4242
5. billingStatus → ACTIVE within 60s
6. Retry check → proceeds; usage event recorded
```

### UAT Script 4 — Customer portal submission (Diamond 7)
```
1. (logged-in CO) Open customer file → click "Send portal invite"
2. Enter customer email → invite sent (verify email mock receives)
3. Open invite link in incognito context (Playwright)
4. Submit identity documents + beneficial owners + SOF on portal
5. Back in main portal: verify CustomerFile has new evidence + BO records
6. Verify audit log shows submissions tagged "via customer-portal-invite"
```

### UAT Script 5 — Evidence pack (Diamond 3)
```
1. (logged-in CO with active workspace and 30+ days of activity)
2. Navigate to /app/compliance/evidence-packs
3. Set period: last 30 days; include customer files; anonymize
4. Generate → status GENERATING → COMPLETED within 5 min (smaller test data: 30s)
5. Download ZIP → contains all 10 expected components
6. index.pdf lists exactly what's in the ZIP
7. Audit log records the generation
```

## 13.6 CI pipeline

```yaml
# pseudocode — adapt to chosen CI
on_pr:
  - lint                  # ESLint + Prettier check
  - typecheck             # tsc --noEmit
  - unit                  # vitest run unit
  - integration           # vitest run integration (with ephemeral PG)
  - secret_scan           # gitleaks
  - audit                 # npm audit --audit-level=high
  - build                 # npm run build (vite + server)

on_main_merge:
  - all_pr_checks
  - deploy_staging
  - migrate              # drizzle push
  - smoke_tests          # 5 critical endpoints
  - e2e_smoke            # Register → wizard step 1 → save (Playwright headless)

on_release_tag:
  - all_main_checks
  - e2e_full             # all UAT scripts
  - manual_approval_gate
  - deploy_prod
  - health_check_60s
```

## 13.7 Test data discipline

- One `seedTestWorkspace()` helper creates the canonical baseline (1 workspace, 1 admin, 6 forms in mixed states, 3 customers in mixed states).
- Each test starts in a transaction and rolls back at the end (fast, isolated).
- E2E tests use a dedicated `e2e_` prefix on workspace and email so prod data is never touched.
- No tests use shared mutable state across files.

## 13.8 Manual QA before release

A 1-page checklist covering:
- Mobile (375px) end-to-end through register → wizard step 1 → save
- Dark and light mode visual sweep of every page
- Slow 3G throttle: landing page < 4s to interactive
- Screen reader sweep of Login + Register + Dashboard with VoiceOver/NVDA
- Real Stripe test cards (success, declined, 3D Secure required)
- Real provider sandbox: identity → AML → result flow
