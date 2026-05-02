# 09 — Phase 4: Provider Integrations & Billing (M8–M9)

**Duration:** Weeks 14–19 · **Goal:** real identity / AML / KYB checks via swappable provider adapters, Stripe subscription + metered billing, billing guards throughout.

---

## Milestone 8 — Provider API Layer (Weeks 14–17)

### M8 — Adapter pattern

The UI/workflow code never names a provider. It requests a **capability**. A `ProviderRegistry` resolves the capability against the workspace's configured `provider_connections` row and returns the right adapter.

```ts
// server/providers/types.ts
export interface ProviderAdapter {
  readonly capability: ProviderCapability;
  readonly providerName: string;
  createRequest(input: CheckRequestEnvelope): Promise<ProviderStartResult>;
  pollStatus(providerRequestId: string): Promise<NormalizedCheckResult>;
  normalizeResponse(raw: unknown): Promise<NormalizedCheckResult>;
  verifyWebhook(signature: string, body: Buffer): boolean;
  mapWebhookToRequestId(body: unknown): string;
}

// server/providers/registry.ts
export class ProviderRegistry {
  async resolve(workspaceId: string, capability: ProviderCapability): Promise<ProviderAdapter> {
    const conn = await getProviderConnection(workspaceId, capability);
    if (!conn) throw new AppError(409, 'PROVIDER_NOT_CONFIGURED', 'No provider configured for this capability');
    if (conn.status !== 'active') throw new AppError(503, 'PROVIDER_DISABLED', `Provider ${conn.providerName} is disabled`);
    return adapterFactory(conn);
  }
}
```

### M8 — Check request flow

```
UI: "Run identity check" button (visible only if billing ACTIVE)
  → POST /checks { workspaceId, customerFileId, capability, subjectType, subjectId, payload }
  → Service:
      idempotencyKey = sha256(`${workspaceId}|${subjectId}|${capability}|${dayBucket}`)
      INSERT check_requests ... ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING * → return existing if conflict
  → Enqueue check.submit job
  → Job:
      adapter = registry.resolve(workspaceId, capability)
      result = await adapter.createRequest(envelope)
      UPDATE check_requests SET status=PROCESSING, providerRequestId=result.providerRequestId
      Schedule check.poll job (60s delay) IF result.mode === 'poll'
      ELSE await webhook
  → Webhook arrives at POST /webhooks/<provider>:
      verify HMAC → INSERT webhook_events with signatureValid + processedAt=null
      ON CONFLICT (providerName, providerEventId) DO NOTHING (idempotency)
      Look up CheckRequest by providerRequestId
      adapter.normalizeResponse(payload) → CheckResult
      INSERT check_results
      INSERT usage_events (idempotency key = checkRequestId)
      Possibly transition CustomerFile state (CHECKS_RETURNED → ECDD_REQUIRED if match)
      Possibly create review task
      Audit log entry
      WebSocket broadcast to workspace members
      UPDATE webhook_events SET processedAt=now()
```

### M8 — Provider integrations

| Provider class | Initial candidate | Integration type | Implementation notes |
|----------------|-------------------|------------------|----------------------|
| Identity Verification / Liveness | **Facia** | Session-based SDK + webhook | Create liveness session → embed SDK in `<VerifyIdentity>` page → receive webhook → normalize to `identity_status + liveness_status + confidence_score`. Store `raw_payload_ref` (R2 key). Support retry with new session. |
| AML Screening (Individual) | **AML Watcher** or Personr | Synchronous API + optional webhook | POST screen with name + DOB + country → normalize to `sanctions_result + pep_result + adverse_media_result + match_count`. Any potential match → review task. Re-screen on demand. |
| AML Screening (Entity) | **AML Watcher** or My Data Boss | Synchronous API | Entity name + registration number → normalize. Same review-task spawn on match. |
| KYB / Business Registry | **ABR** (free) + KYB partner | REST API | ABR free for Australian entities. KYB partner for director/officer data. Prefill onboarding forms; require user confirmation before save. Trigger individual screening for returned directors. |
| Mock / Sandbox | Internal | Configurable | Returns configurable results (`always_pass`, `always_fail`, `random_match`). Used in dev + UAT. Toggled by env config. |

### M8 backend tasks

| Task | File | Detail |
|------|------|--------|
| Provider connection mgmt | `server/routes/integrations.routes.ts` | Per-workspace per-capability config. Credentials stored as `secretRef` (string pointer to env or secret manager — never raw in DB). Status active/disabled/error. |
| Mock adapters | `server/providers/mock/*.adapter.ts` | One per capability. Honors per-workspace mock config (`always_pass`/`always_fail`/`random_match`). Generates fake provider IDs. Supports webhook simulation via internal queue. |
| Check orchestrator | `server/services/check-orchestrator.service.ts` | `createCheck(input)` → resolves provider, builds idempotency key, inserts CheckRequest, enqueues job. |
| Check submit job | `server/jobs/check-submit.job.ts` | Calls `adapter.createRequest`. Handles provider timeouts (retry up to 3 with exponential backoff). On terminal failure → status=ERROR, create pending task, notify CO. **Never treats timeout as clear result.** |
| Check poll job | `server/jobs/check-poll.job.ts` | For poll-mode providers: every 60s, calls `adapter.pollStatus`. On final state → process like a webhook. |
| Webhook gateway | `server/routes/webhooks.routes.ts` | `POST /webhooks/:provider`. Reads raw body. Verifies HMAC via `adapter.verifyWebhook`. Rejects on bad signature (401 + log). Idempotent processing (UNIQUE on `(providerName, providerEventId)`). Timestamp validation: reject if event timestamp >5min old. |
| Reconciliation job | `server/jobs/check-reconcile.job.ts` | Daily 02:00. Finds CheckRequests in PROCESSING > configured timeout (provider-specific, default 1h). Polls provider once. If still unresolved → alert CO + Platform Admin. |
| Manual override | `POST /checks/:id/override` | CO or ADMIN only. Body: `{ outcome, reason }`. Sets status=MANUAL_OVERRIDE, inserts CheckResult with `reviewOutcome` and `reviewedBy`. Full audit. |

### M8 frontend tasks

| Task | Detail |
|------|--------|
| Check trigger UI | Per-form "Run Identity Check" / "Run AML Screen" buttons. Visible only when billing ACTIVE. **Disabled (not hidden)** when inactive — tooltip explains 402 reason and links to billing. |
| Check status panel | Customer file → Checks tab: list of all CheckRequests with status badge, provider, timestamp, result summary. Click to expand normalized result. "View raw evidence" → signed URL to R2. |
| Real-time check updates | WebSocket subscription `check.<requestId>.status`. Status badge transitions QUEUED → PROCESSING → PASSED without refresh. |
| Review match task | When AML returns `matchCount > 0`: auto-show `<ReviewMatchModal>`. CO/REVIEWER records: CLEARED / ACCEPTED_WITH_CONTROLS / ESCALATED. Decision feeds CheckResult.reviewOutcome and may transition file. |
| Provider configuration page | `/app/settings/integrations` — list of capabilities with connection status. Toggle SANDBOX ↔ PRODUCTION. Last check timestamp. Error count last 24h. |

### M8 acceptance criteria

- ✅ Mock adapter works for every capability in dev/sandbox.
- ✅ At least one real provider (identity OR AML) works end-to-end in staging.
- ✅ Webhook signature validation rejects tampered payloads (401 + 0 data changes).
- ✅ Duplicate webhook delivery is idempotent — second delivery is a no-op.
- ✅ Provider timeout creates a pending task — never a false clear result.
- ✅ Manual override requires reason and is fully audited.

---

## Milestone 9 — Billing & Usage (Weeks 17–19)

### M9 — Billing architecture

| Component | Detail |
|-----------|--------|
| **Stripe Customer** | Created at workspace registration. `stripeCustomerId` stored. Workspace admin is billing contact. Metadata: `workspaceId`, `legalName`. |
| **Subscription Plans** | Tier determines feature access (not check volume). Stripe Subscription with status webhooks. `billingStatus` updated from webhook. Tiers: TRIAL (30d) / STARTER / PROFESSIONAL / ENTERPRISE / GROUP / LIFETIME. |
| **Usage Events** | Each finalised CheckResult creates a `usage_events` row: `eventType`, `costCategory`, `quantity=1`, links to CheckRequest. Hourly cron pushes unreported events to Stripe Usage Records (idempotency via `idempotencyKey`). |
| **Billing Guards** | `requireBillingActive()` middleware applied to all check trigger endpoints. Returns 402 with structured JSON `{ code: 'BILLING_INACTIVE', userMessage, action: 'add_payment_method', link }`. Never silent. |
| **Payment Method** | Stripe Elements in `<PaymentMethodForm>`. Server stores only `stripePaymentMethodId`. Status surfaced in billing page. |
| **Invoice / Usage view** | Billing page: current subscription, next billing date, this period's usage by check type, recent invoices with PDF download. Pulls from Stripe API + local `usage_events` aggregations. |
| **Webhook handling** | `POST /webhooks/stripe` — raw body required for signature verification. Handles: `customer.subscription.{updated,deleted}`, `invoice.{payment_succeeded,payment_failed}`, `payment_method.attached`. Updates `workspaces.billingStatus`. Idempotent via `stripe_webhook_events` table. |

### M9 — Tier matrix (initial)

| Tier | Monthly | Features | Includes |
|------|---------|----------|----------|
| TRIAL | $0 (30 days) | All features, mock provider only | — |
| STARTER | $99 | Up to 3 users, 1 workspace, mock + sandbox providers | 0 paid checks |
| PROFESSIONAL | $299 | 10 users, real providers | 50 paid checks/month, then $4 each |
| ENTERPRISE | $799 | Unlimited users, custom branding, SSO ready, all Diamond features | 250 paid checks/month, then $3 each |
| GROUP | $1,499 | All Enterprise + group workspace structure (Diamond 4) | 1000 paid checks/month |
| LIFETIME | $9,999 one-time | All Enterprise features forever, no monthly | First 500 checks free |

### M9 — Past-due / suspension UX

- **PAST_DUE** (Stripe payment failed): banner on every page. 7-day grace before paid checks blocked. Email at day 0, 3, 6.
- **SUSPENDED** (30 days past due OR admin action): read-only mode. Banner explains. Wizard, customer creation, checks all blocked. Existing data fully visible.
- **CANCELLED** (90 days past due OR admin cancellation): hard read-only with 60-day data export window before scheduled deletion.

All states reversible by adding valid payment.

### M9 acceptance criteria

- ✅ Adding valid payment method changes `billingStatus` from INACTIVE to ACTIVE within 60s of Stripe webhook.
- ✅ Attempting paid check with inactive billing returns 402 with structured message.
- ✅ Each finalised check creates exactly one `usage_events` row (idempotency).
- ✅ Failed Stripe payment transitions `billingStatus` to PAST_DUE; banner appears in portal.
- ✅ Workspace admin can view current period usage broken down by check type.
- ✅ Cancelling subscription transitions to CANCELLED within 60s of Stripe webhook.

---

## Phase 4 deliverable

Real provider checks work end-to-end (identity, AML, KYB). Stripe subscriptions + metered usage are wired with reliable webhooks. Billing guards prevent runaway billing. Past-due / suspended states are graceful and recoverable.
