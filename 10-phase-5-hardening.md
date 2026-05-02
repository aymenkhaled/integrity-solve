# 10 — Phase 5: Hardening & Production (M10)

**Duration:** Weeks 19–23 · **Goal:** production-hardened platform — security review, audit completeness, performance tuning, monitoring, documented handover, go-live.

---

## M10 — Security checklist

| Area | Requirement | Validation |
|------|-------------|------------|
| **Workspace isolation** | Every DB query filtered by `workspaceId` at storage + middleware + Postgres RLS. No cross-tenant access possible even with valid JWT. | Automated test `tests/integration/workspace-isolation.test.ts`: User A with valid session cannot read User B's customer files. Cross-workspace query returns 403. |
| **RBAC completeness** | All 8 roles tested against all endpoints. Backend authorisation is authority — frontend hiding is decorative. | Role matrix test suite: 8 roles × all endpoints. Each blocked action returns 403, never 404 or 500. |
| **Provider secrets** | All API keys, webhook secrets in Replit Secrets. Never in DB plaintext. Never committed. | Secret scan in CI (`gitleaks` or `truffleHog`). Schema audit: no `*_key` or `*_secret` columns with raw values. |
| **PII encryption** | Sensitive provider payloads (ID documents, selfies) encrypted at rest in R2. Customer PII encrypted at field level using `pgcrypto` for sensitive columns. | Verify R2 bucket has `BucketEncryption: AES256`. Test that `raw_payload_ref` contents return decrypted only via service. |
| **Audit log immutability** | `audit_log` has no UPDATE/DELETE grants. Application can only INSERT. No soft-delete on audit records. | DB permission test: attempt UPDATE/DELETE on `audit_log` with app role → must fail. Trigger raises exception. No FK cascade delete from referenced entities. |
| **Webhook signature validation** | All provider webhooks HMAC-validated before processing. Invalid → log + 401 + zero data changes. Replay protection via `webhook_events.processedAt` check. | Test suite: send webhook with invalid signature → 401, no data changes. Send same webhook twice → second is no-op. |
| **Rate limiting** | API endpoints rate-limited per user and per workspace. Check trigger endpoints have lower limits to prevent runaway billing. | Load test: 100 rapid check requests from same user → later requests rate-limited. |
| **CSP / security headers** | Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on all responses. | Run `securityheaders.com` against staging URL → A+ rating. |
| **Input validation** | All routes use Zod via `zod-schemas.ts`. No raw user input in DB queries. | OWASP ZAP scan on staging. SQL injection tests on all input fields. |
| **Authentication hardening** | Bcrypt cost ≥12. Session tokens are CSPRNG. Session fixation prevented (regenerate on login). MFA-ready for Enterprise tier. | Manual review checklist + automated test for session regeneration. |
| **Dependency scanning** | `npm audit` in CI, fail on `high` / `critical`. Dependabot enabled. | CI gate. |

### Audit-log hardening migration (run once)

```sql
-- Revoke from app role
REVOKE UPDATE, DELETE ON audit_log FROM CURRENT_USER;
GRANT INSERT, SELECT ON audit_log TO CURRENT_USER;

-- Trigger backstop
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
```

### Postgres RLS migration

```sql
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_forms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodic_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_forms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- Repeat per table:
CREATE POLICY workspace_isolation ON customers
  USING (workspace_id = current_setting('app.current_workspace', true));
```

Server sets the session variable per request inside a transaction:
```ts
await db.transaction(async (tx) => {
  await tx.execute(sql`SET LOCAL app.current_workspace = ${workspaceId}`);
  // ... queries inside this tx are RLS-scoped
});
```

---

## M10 — Performance targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard initial load | < 2s p95 | Synthetic monitoring + browser performance API |
| API response (non-check) | < 300ms p95 | Pino logs + Sentry performance |
| Check trigger → status update | < 5s for sync providers | E2E test with mock provider |
| Document generation | < 90s per document | BullMQ job completion |
| Concurrent workspace sessions | > 50 simultaneous without degradation | k6 load test |
| Database connection saturation | < 70% of pool | Postgres pg_stat_activity |

### Performance optimizations

- **Frontend code splitting:** every `/app/**` page lazy-loaded; landing 3D scene lazy + Suspense.
- **Image optimization:** all R2 image URLs have `?w=...&q=...` query params resolved server-side.
- **Index audit:** every WHERE clause field has an index. Use `EXPLAIN ANALYZE` on the 20 most common queries.
- **Connection pooling:** PgBouncer for production; `max: 20` for app, `max: 5` for worker.
- **TanStack Query staleness:** lists `staleTime: 30s`, detail pages `staleTime: 10s`, mutations invalidate.
- **N+1 elimination:** every list query that includes related entities uses Drizzle `with: { ... }` (or explicit joins) — never per-row queries in a loop.

---

## M10 — Monitoring setup

| What | Tool | Detail |
|------|------|--------|
| Error tracking | **Sentry** | Frontend `@sentry/react` + backend `@sentry/node`. Source maps uploaded on deploy. Release tagging. Alert on new error types and spike in error rate. |
| Structured logging | **Pino** | Every log line includes `workspaceId`, `userId`, `requestId`, `action`. Searchable in Datadog or Logtail. Console transport in dev; JSON in prod. |
| Background jobs | **BullMQ Board** (or `bull-board`) | Failed job alerts. Queue depth monitoring. Retry exhaustion alerts. |
| Stripe webhook health | Custom heartbeat | Alert if no webhook received in 24h from expected events. |
| Database | Slow query log + `pg_stat_statements` | Slow query alerts > 200ms. Connection pool exhaustion monitoring. |
| Provider health | Custom dashboard | Alert if provider error rate > 5% in any 1h window. |
| Uptime | External pinger (UptimeRobot or BetterStack) | `GET /healthz` every 60s from 3+ regions. |

---

## M10 — Documentation handover

- **`README.md`** — local dev setup, env vars, run commands.
- **`docs/architecture.md`** — system overview, data flow diagrams.
- **`docs/runbooks/`** — one per scenario:
  - `runbook-stripe-webhook-failure.md`
  - `runbook-provider-outage.md`
  - `runbook-document-generation-failure.md`
  - `runbook-customer-data-export.md`
  - `runbook-customer-data-deletion.md`
- **`docs/onboarding-new-engineer.md`** — first-week checklist for new team member.
- **`docs/security.md`** — security architecture summary for audits.
- **`docs/data-retention.md`** — exact retention rules + jobs that enforce them.
- **`replit.md`** — kept current throughout (project memory).

---

## M10 — Pre-launch checklist

- [ ] All M1–M9 acceptance criteria green
- [ ] All security checklist items validated
- [ ] All performance targets met under load test
- [ ] All runbooks written and reviewed
- [ ] Stripe production keys configured
- [ ] Real provider production credentials configured for at least one workspace (the company's own dogfood workspace)
- [ ] Sentry production project set up; source maps uploaded
- [ ] R2 bucket has lifecycle policies (7-year retention on `evidence/*` and `program-documents/*`)
- [ ] Daily DB backups verified (Neon automatic + manual restore test)
- [ ] DNS configured; TLS active (Replit Reserved VM Deployment handles this)
- [ ] CSP headers verified A+ on `securityheaders.com`
- [ ] Email DKIM/SPF/DMARC configured for `EMAIL_FROM_ADDRESS` domain
- [ ] Privacy policy + terms of service pages published
- [ ] Data Processing Agreement (DPA) template prepared for Enterprise customers
- [ ] Status page set up (BetterStack Status or similar)
- [ ] Customer support email + ticket workflow set up
- [ ] Initial training content uploaded for Diamond 5
- [ ] Regulatory feed sources configured for Diamond 6
- [ ] Internal team trained on platform admin tools

---

## M10 acceptance criteria

- ✅ Penetration test passed (or self-scan A+ on automated tools)
- ✅ Audit log demonstrably immutable (UPDATE/DELETE attempts fail)
- ✅ All cron jobs verified running per schedule on production
- ✅ All Stripe webhook events handled correctly (test with Stripe CLI)
- ✅ Sentry receiving events; alerts configured for error rate spikes
- ✅ Load test passes 50 concurrent users
- ✅ Documentation complete and reviewed
- ✅ Production deployment health-checked and stable for 48h
