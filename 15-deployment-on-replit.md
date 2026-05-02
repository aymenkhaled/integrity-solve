# 15 — Deployment on Replit

> Use the `deployment` skill (read it FIRST). This file gives the high-level plan; the skill has the exact tool calls.

---

## 15.1 Deployment type: Reserved VM

**Why Reserved VM, not Autoscale:**
- Long-running BullMQ workers + WebSocket connections need a stable instance.
- Provider polls and webhook reconciliation rely on consistent process lifetime.
- Cron jobs use the `job_locks` distributed-lock table which works on Autoscale too, but Reserved VM is simpler for a single-instance MVP.

**Suggested size:**
- 1 vCPU + 2 GB RAM for MVP (≤100 active workspaces)
- 2 vCPU + 4 GB RAM after first 100 paying workspaces

Upgrade signals: p95 API latency > 300ms; document generation queue depth > 5; CPU sustained > 70%.

## 15.2 Workflow

Single workflow named **"Integrity Solve"**:

```
NODE_ENV=development npm run dev
```

In production the build command is `npm run build` (Vite + tsc on server) and the start command is `NODE_ENV=production npm run start`.

Bind the server to `0.0.0.0` (not `127.0.0.1`) and read the port from `process.env.PORT`. Express `app.listen(env.PORT, '0.0.0.0')`.

## 15.3 Replit Postgres

Use the `database` skill to provision Replit's built-in Postgres in dev. `DATABASE_URL` is auto-set. For production:
- Replit Postgres for early production
- Migrate to Neon (or AWS RDS) when you need read replicas, larger storage, or PgBouncer

When the schema changes:
- Dev: `npm run db:push` (Drizzle Kit) — destructive-safe in dev
- Production: generate migration with `npm run db:generate`, review the SQL, apply with `npm run db:migrate`

## 15.4 Custom domain

Configure on Replit Deployments → Domains → "Connect a custom domain". TLS handled automatically. Update `APP_URL` env var after switch.

## 15.5 Health checks

Replit deployment uses `GET /healthz` (configure in deployment settings). Endpoint should:
- Return 200 with `{ ok: true, db: 'ok', redis: 'ok' | 'unconfigured' }`
- Return 503 if DB ping fails
- No auth (must be reachable by load balancer)

## 15.6 Static files

Vite builds to `dist/public/`. In production, Express serves it via `app.use(express.static('dist/public', { maxAge: '1y', immutable: true }))` (hashed asset names allow long cache). Index HTML is served with `no-cache`.

## 15.7 Secrets

Use Replit Secrets (not env files). Use the `environment-secrets` skill to add/check/remove. Production deployment inherits from the project secrets but you can set deployment-only overrides.

## 15.8 Backups

- **Database:** Daily automated backups via Neon (or Replit Postgres equivalent). Retain 30 days. Run a manual restore drill once before launch.
- **R2:** Enable versioning on the bucket. Lifecycle: keep current + previous 1 version forever for `program-documents/*`, current + last 3 for `evidence/*`.
- **Audit log:** Daily incremental export to a separate R2 bucket (audit log is irreplaceable — extra paranoia warranted).

## 15.9 Domains for the customer portal

Diamond 7 (customer-facing portal) lives on a separate subdomain. Two options:
- **Recommended:** path-based — `/customer-portal/*` on the same domain. Simpler TLS; same deployment.
- **Alternative:** subdomain — `portal.yourdomain.com`. Requires separate Replit deployment OR a single deployment that handles both Host headers in Express.

For MVP, use path-based.

## 15.10 Pre-deploy checklist

- [ ] All env vars set on production (use `environment-secrets`)
- [ ] `NODE_ENV=production` set
- [ ] `npm run build` succeeds locally
- [ ] DB migration applied (no destructive `db:push` in prod)
- [ ] R2 bucket created with lifecycle policies
- [ ] Stripe production keys + webhook endpoint configured
- [ ] Stripe webhook URL registered: `https://yourdomain/webhooks/stripe`
- [ ] Provider webhook URLs registered with each provider
- [ ] Sentry release tagged + source maps uploaded
- [ ] DNS pointed to Replit deployment
- [ ] TLS certificate active
- [ ] Status page set up
- [ ] Initial platform admin account created (use seed script with PROD admin email)
- [ ] Smoke test: log in as platform admin, create a test workspace, complete one wizard step, log out

## 15.11 Post-deploy verification

Within first hour after deploy:
- Hit `/healthz` from external — 200
- Register a real account end-to-end
- Verify email arrives
- Complete one wizard step
- Open browser DevTools → no 4xx/5xx in console
- Check Sentry — no new errors
- Check Pino logs (Replit deployment logs) — clean

If any of these fail, use the **deployment** skill's `fetch_deployment_logs` to investigate.
