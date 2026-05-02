# 02 — Architecture

## 2.1 Multi-tenant isolation (load-bearing)

**Rule:** Every table that holds tenant data has a `workspace_id` column (`text` or `uuid`) with `NOT NULL` and a foreign key to `workspaces(id) ON DELETE RESTRICT`.

**Defense in depth — three layers, not optional:**

1. **Express middleware `withWorkspace`** runs on every authenticated route. It resolves `workspaceId` from the active session (or `X-Workspace-Id` header for API clients), verifies the user has a `workspace_membership` row with status `ACTIVE`, attaches `req.workspace` and `req.membership`, and rejects with 403 otherwise.

2. **Storage layer convention.** Every storage function takes `workspaceId` as its first argument and includes `eq(table.workspaceId, workspaceId)` in every query. Code review rule: if you see a Drizzle query without a `workspaceId` filter and the table has that column, the PR is rejected.

3. **PostgreSQL row-level security (RLS).** Enable RLS on all tenant tables. Set a session variable `app.current_workspace` at connection acquisition time (Drizzle `transaction()` callback), and create a policy:
   ```sql
   CREATE POLICY workspace_isolation ON customers
     USING (workspace_id = current_setting('app.current_workspace')::text);
   ```
   This is the final backstop if a developer ever forgets the storage convention.

**Test:** A user with a valid JWT for Workspace A who passes Workspace B's id explicitly must receive 403, never data.

## 2.2 RBAC matrix

8 roles, defined as a TypeScript enum and mirrored in a Postgres enum:

```ts
export enum UserRole {
  WORKSPACE_ADMIN     = 'WORKSPACE_ADMIN',
  COMPLIANCE_OFFICER  = 'COMPLIANCE_OFFICER',
  PROGRAM_CONTRIBUTOR = 'PROGRAM_CONTRIBUTOR',
  ONBOARDING_USER     = 'ONBOARDING_USER',
  REVIEWER            = 'REVIEWER',
  READ_ONLY           = 'READ_ONLY',
  PLATFORM_ADMIN      = 'PLATFORM_ADMIN',
  SUPPORT             = 'SUPPORT',
}
```

Permission matrix lives in `shared/rbac.ts`:

```ts
export type Action =
  | 'workspace.update' | 'workspace.delete' | 'members.invite' | 'members.changeRole'
  | 'program.read' | 'program.editForm' | 'program.submit' | 'program.regenerate'
  | 'customer.create' | 'customer.read' | 'customer.editCdd' | 'customer.uploadEvidence'
  | 'customer.runCheck' | 'customer.transitionState' | 'customer.approve' | 'customer.decline'
  | 'ecdd.complete' | 'ecdd.approve' | 'sof.complete' | 'escalation.assign' | 'escalation.decide'
  | 'periodicReview.complete' | 'audit.read' | 'audit.export'
  | 'billing.read' | 'billing.update' | 'integrations.configure'
  | 'training.recordOwn' | 'training.recordOthers' | 'support.access' | 'platform.admin';

export const PERMISSIONS: Record<UserRole, Set<Action>> = { /* ... see file 06 ... */ };

export function can(role: UserRole, action: Action): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}
```

Express decorator pattern:
```ts
router.post('/customer-files/:id/transition',
  requireAuth, withWorkspace, requireAction('customer.transitionState'),
  async (req, res) => { /* ... */ });
```

React component pattern:
```tsx
<PermissionGate action="customer.approve">
  <Button onClick={approve}>Approve</Button>
</PermissionGate>
```

Backend authorisation is the source of truth. Frontend hiding is decorative.

## 2.3 Audit log — append-only

Schema (full version in file 04):
```ts
export const auditLog = pgTable('audit_log', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  actorUserId: text('actor_user_id').notNull(),
  action:      text('action').notNull(),
  entityType:  text('entity_type').notNull(),
  entityId:    text('entity_id').notNull(),
  oldValue:    jsonb('old_value'),
  newValue:    jsonb('new_value'),
  reason:      text('reason'),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  requestId:   text('request_id').notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Database hardening (run as migration after `db:push`):**
```sql
-- Revoke UPDATE and DELETE from the application role
REVOKE UPDATE, DELETE ON audit_log FROM CURRENT_USER;
GRANT INSERT, SELECT ON audit_log TO CURRENT_USER;

-- Trigger as backstop
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
```

**Express interceptor.** Wrap mutation routes with `withAudit({ entityType, action })`. The interceptor captures the `before` snapshot (loads the row), runs the handler, captures the `after` snapshot, and inserts the audit row. Reason is read from `req.body.reason` (Zod-validated, min 10 chars).

## 2.4 Cron / background jobs

**Primary path:** BullMQ + Redis (Upstash). Each job type lives in `server/jobs/<name>.job.ts`.

**Fallback path (no Redis available):** In-process scheduler using StrategyNavigator's existing pattern:

```ts
// server/jobs/scheduler.ts
import { db } from '../db';
import { jobLocks } from '@shared/schema';

async function withDistributedLock(jobName: string, fn: () => Promise<void>) {
  const lockId = `${jobName}-${new Date().toISOString().slice(0,10)}-${new Date().getHours()}`;
  const acquired = await db.insert(jobLocks).values({
    id: lockId, jobName, acquiredAt: new Date(),
  }).onConflictDoNothing().returning();
  if (acquired.length === 0) return; // another instance has it
  try { await fn(); }
  finally { await db.delete(jobLocks).where(eq(jobLocks.id, lockId)); }
}
```

Schedule cron jobs in `server/jobs/index.ts` with `node-cron`, staggered by 30s offsets to avoid thundering herd.

**Job catalog:**
| Job | Schedule | Purpose |
|-----|----------|---------|
| `document.generate` | on-demand | Generate Risk Assessment / Policy / Procedures DOCX+PDF |
| `check.submit` | on-demand | Send check request to provider |
| `check.poll` | every 60s | Poll providers for in-progress checks past poll threshold |
| `check.reconcile` | daily 02:00 | Find PROCESSING checks older than provider timeout, alert |
| `webhook.process` | on-demand | Process inbound provider webhook (queued for idempotent processing) |
| `review.scheduler` | daily 03:00 | Find files where `nextReviewDue <= today + 30 days`, create REVIEW_DUE tasks |
| `screening.recurring` | daily 04:00 | Re-screen active customers per risk-tier cadence (Diamond 2) |
| `watchlist.delta` | daily 05:00 | Compare current screening results against updated watchlists (Diamond 2) |
| `regulatory.feed` | daily 06:00 | Fetch and tag regulatory updates (Diamond 6) |
| `billing.usage.report` | hourly | Push UsageEvents to Stripe |
| `evidence.pack.generate` | on-demand | Assemble compliance evidence pack ZIP (Diamond 3) |
| `notification.email.digest` | daily 09:00 | Send daily digest emails for unread notifications |

## 2.5 Error handling

- **Server:** Custom `AppError` class with `statusCode`, `code`, `userMessage`, `internalMessage`. Global Express error handler logs to Sentry + Pino, returns JSON `{ error: { code, message } }`.
- **Client:** Global React Error Boundary at root + per-route boundaries (matches StrategyNavigator). TanStack Query `onError` toast notifications. 401 triggers session refresh; 403 shows `<NotAuthorized>` panel; 5xx shows generic error page with retry.

## 2.6 Real-time updates

Native WebSocket server at `/ws`. Clients authenticate by sending the session cookie on the upgrade request. Server keeps a `Map<userId, Set<WebSocket>>`. Broadcast helpers:

```ts
broadcastToUser(userId, { type: 'check.completed', data });
broadcastToWorkspace(workspaceId, { type: 'task.assigned', data });
```

Use cases:
- Check status updates (`QUEUED → PROCESSING → PASSED`) without page refresh
- New escalation assigned to me
- Document generation completed
- Notification bell counter

## 2.7 Rate limiting

`express-rate-limit` with these tiers:
- Auth endpoints: 10 req/min per IP
- Standard mutations: 100 req/min per user
- Check trigger endpoints: 30 req/min per workspace (prevent runaway billing)
- File upload: 20 req/min per user
- Webhook endpoints: 1000 req/min per provider IP

## 2.8 Content Security Policy

```ts
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc:  ["'self'", "https://js.stripe.com", "https://m.stripe.network"],
    styleSrc:   ["'self'", "'unsafe-inline'"], // Tailwind needs inline at build, prod uses hashed
    imgSrc:     ["'self'", "data:", "blob:", "https://*.r2.cloudflarestorage.com"],
    connectSrc: ["'self'", "https://api.stripe.com", "wss://" + HOST, /* providers */],
    frameSrc:   ["https://js.stripe.com", "https://hooks.stripe.com"],
    fontSrc:    ["'self'", "https://fonts.gstatic.com"],
    objectSrc:  ["'none'"],
    upgradeInsecureRequests: [],
  },
});
```

## 2.9 Environment & deployment

Single `npm run dev` workflow. Express serves Vite middleware in dev, static `dist/public` in prod. Worker process is in-process by default; can be split later if scale demands.

Replit deployment:
- **Reserved VM** (not Autoscale) so background jobs and WebSockets are stable.
- Health check: `GET /healthz` returns 200 with DB ping.
- Secrets via Replit Secrets, never committed.
- Database: Replit Postgres in dev, Neon in production. `DATABASE_URL` read at startup.
