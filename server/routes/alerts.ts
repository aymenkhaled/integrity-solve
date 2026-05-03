/**
 * server/routes/alerts.ts — Smart Alerts endpoints (Diamond D3).
 * Stores, queries, acknowledges, and resolves compliance alerts.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { smartAlerts } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { ok, validateBody } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

const router = Router();

const CreateAlertSchema = z.object({
  severity:    z.enum(['INFO', 'WARNING', 'HIGH', 'CRITICAL']),
  alertType:   z.string().min(1).max(100),
  title:       z.string().min(1).max(300),
  description: z.string().min(1),
  customerId:  z.string().optional(),
  ruleId:      z.string().optional(),
  matchData:   z.record(z.unknown()).optional(),
  assignedTo:  z.string().optional(),
});

const ResolveAlertSchema = z.object({
  resolutionNote: z.string().min(10, 'Resolution note must be at least 10 characters'),
});

// GET /api/alerts — list alerts
router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { status, severity } = req.query as { status?: string; severity?: string };

    const conditions = [eq(smartAlerts.workspaceId, workspaceId)];
    if (status)   conditions.push(eq(smartAlerts.status, status as typeof smartAlerts.$inferInsert['status']));
    if (severity) conditions.push(eq(smartAlerts.severity, severity as typeof smartAlerts.$inferInsert['severity']));

    const alerts = await db
      .select()
      .from(smartAlerts)
      .where(and(...conditions))
      .orderBy(desc(smartAlerts.createdAt))
      .limit(200);

    ok(res, alerts);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts — create alert (usually system-generated, but can be manual)
router.post('/', requireWorkspace, validateBody(CreateAlertSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const body = req.body as typeof CreateAlertSchema._type;

    const [alert] = await db.insert(smartAlerts).values({
      workspaceId,
      ...body,
      matchData: body.matchData ?? {},
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'alert.created', entityType: 'smart_alert', entityId: alert!.id, newValue: body },
    );

    ok(res, alert, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/alerts/:id
router.get('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const [alert] = await db
      .select()
      .from(smartAlerts)
      .where(and(eq(smartAlerts.id, id), eq(smartAlerts.workspaceId, workspaceId)))
      .limit(1);

    if (!alert) throw new NotFoundError('Alert');
    ok(res, alert);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };

    const [existing] = await db
      .select()
      .from(smartAlerts)
      .where(and(eq(smartAlerts.id, id), eq(smartAlerts.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Alert');
    if (existing.status !== 'OPEN') throw new ValidationError('Alert is not in OPEN status');

    const [updated] = await db
      .update(smartAlerts)
      .set({
        status:           'ACKNOWLEDGED',
        acknowledgedBy:   userId,
        acknowledgedAt:   new Date(),
        updatedAt:        new Date(),
      })
      .where(eq(smartAlerts.id, id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'alert.acknowledged', entityType: 'smart_alert', entityId: id, oldValue: existing, newValue: updated },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/resolve
router.post('/:id/resolve', requireWorkspace, validateBody(ResolveAlertSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const { resolutionNote } = req.body as typeof ResolveAlertSchema._type;

    const [existing] = await db
      .select()
      .from(smartAlerts)
      .where(and(eq(smartAlerts.id, id), eq(smartAlerts.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Alert');

    const [updated] = await db
      .update(smartAlerts)
      .set({
        status:         'RESOLVED',
        resolvedBy:     userId,
        resolvedAt:     new Date(),
        resolutionNote,
        updatedAt:      new Date(),
      })
      .where(eq(smartAlerts.id, id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'alert.resolved', entityType: 'smart_alert', entityId: id, oldValue: existing, newValue: updated },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/false-positive
router.post('/:id/false-positive', requireWorkspace, validateBody(ResolveAlertSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const { resolutionNote } = req.body as typeof ResolveAlertSchema._type;

    const [existing] = await db
      .select()
      .from(smartAlerts)
      .where(and(eq(smartAlerts.id, id), eq(smartAlerts.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Alert');

    const [updated] = await db
      .update(smartAlerts)
      .set({
        status:         'FALSE_POSITIVE',
        resolvedBy:     userId,
        resolvedAt:     new Date(),
        resolutionNote,
        updatedAt:      new Date(),
      })
      .where(eq(smartAlerts.id, id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'alert.false_positive', entityType: 'smart_alert', entityId: id, oldValue: existing, newValue: updated },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

export default router;
