/**
 * server/routes/tasks.ts — Task management endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { tasks } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { CreateTaskSchema, UpdateTaskSchema } from '../../shared/validators.js';
import { validateBody, ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError } from '../lib/errors.js';

const router = Router();

router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { status } = req.query as { status?: string };

    const conditions = [eq(tasks.workspaceId, workspaceId)];
    if (status) conditions.push(eq(tasks.status, status as typeof tasks.$inferSelect['status']));

    const items = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(200);

    ok(res, items);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireWorkspace, validateBody(CreateTaskSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const body = req.body as typeof CreateTaskSchema._type;

    const [task] = await db.insert(tasks).values({
      workspaceId,
      createdBy: userId,
      ...body,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'task.created', entityType: 'task', entityId: task!.id },
    );

    ok(res, task, 201);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────

router.get('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, (req.params['id'] as string)), eq(tasks.workspaceId, workspaceId)))
      .limit(1);

    if (!task) throw new NotFoundError('Task');

    ok(res, task);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────

router.patch('/:id', requireWorkspace, validateBody(UpdateTaskSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, (req.params['id'] as string)), eq(tasks.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Task');

    const body = req.body as typeof UpdateTaskSchema._type;
    const { dueAt: dueAtStr, ...bodyRest } = body;
    const updates: Partial<typeof tasks.$inferInsert> = { ...bodyRest, updatedAt: new Date() };
    if (dueAtStr) updates.dueAt = new Date(dueAtStr);
    if (body.status === 'COMPLETE') updates.completedAt = new Date();

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, (req.params['id'] as string)))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'task.updated', entityType: 'task', entityId: (req.params['id'] as string), oldValue: existing, newValue: updated },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

router.delete('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, (req.params['id'] as string)), eq(tasks.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Task');

    await db.delete(tasks).where(eq(tasks.id, (req.params['id'] as string)));

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'task.deleted', entityType: 'task', entityId: (req.params['id'] as string) },
    );

    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
