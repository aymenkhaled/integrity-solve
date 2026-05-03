/**
 * server/routes/training.ts — Training tracker endpoints (Diamond D7).
 * Accepts flexible input: courseTitle (alias for moduleName), userId optional (defaults to current user).
 */
import { Router } from 'express';
import { db } from '../db.js';
import { trainingRecords, users } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { ok, validateBody } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError } from '../lib/errors.js';

const router = Router();

const CreateTrainingSchema = z.object({
  userId:         z.string().optional(),
  moduleName:     z.string().min(1).max(200).optional(),
  courseTitle:    z.string().min(1).max(200).optional(),
  courseCode:     z.string().max(50).optional(),
  trainingType:   z.string().max(50).optional(),
  moduleVersion:  z.string().default('1.0'),
  passingScore:   z.number().int().min(0).max(100).default(80),
  scheduledAt:    z.string().optional(),
  dueAt:          z.string().optional(),
  notes:          z.string().optional(),
}).refine((d) => d.moduleName || d.courseTitle, {
  message: 'Either moduleName or courseTitle is required',
});

const UpdateTrainingSchema = z.object({
  status:         z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'FAILED']).optional(),
  score:          z.number().int().min(0).max(100).optional(),
  expiresAt:      z.string().optional(),
  certificateUrl: z.string().url().optional(),
  notes:          z.string().optional(),
});

// GET /api/training
router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { userId, status } = req.query as { userId?: string; status?: string };

    const conditions = [eq(trainingRecords.workspaceId, workspaceId)];
    if (userId)  conditions.push(eq(trainingRecords.userId, userId));
    if (status)  conditions.push(eq(trainingRecords.status, status as typeof trainingRecords.$inferSelect['status']));

    const records = await db
      .select({
        id:             trainingRecords.id,
        userId:         trainingRecords.userId,
        moduleName:     trainingRecords.moduleName,
        moduleVersion:  trainingRecords.moduleVersion,
        status:         trainingRecords.status,
        score:          trainingRecords.score,
        passingScore:   trainingRecords.passingScore,
        completedAt:    trainingRecords.completedAt,
        expiresAt:      trainingRecords.expiresAt,
        certificateUrl: trainingRecords.certificateUrl,
        attempts:       trainingRecords.attempts,
        createdAt:      trainingRecords.createdAt,
        updatedAt:      trainingRecords.updatedAt,
        userFullName:   users.fullName,
        userEmail:      users.email,
      })
      .from(trainingRecords)
      .leftJoin(users, eq(trainingRecords.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(trainingRecords.createdAt))
      .limit(200);

    ok(res, { records, total: records.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/training — enrol a user in a training module
router.post('/', requireWorkspace, validateBody(CreateTrainingSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const actorId = getUserId(req);
    const body = req.body as typeof CreateTrainingSchema._type;

    const resolvedUserId = body.userId ?? actorId;
    const resolvedModuleName = body.moduleName ?? body.courseTitle ?? 'Unknown Module';

    const [record] = await db.insert(trainingRecords).values({
      workspaceId,
      userId:        resolvedUserId,
      moduleName:    resolvedModuleName,
      moduleVersion: body.moduleVersion,
      passingScore:  body.passingScore,
      expiresAt:     body.dueAt ? new Date(body.dueAt) : undefined,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: actorId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'training.enrolled', entityType: 'training_record', entityId: record!.id, newValue: { moduleName: resolvedModuleName } },
    );

    ok(res, record, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/training/:id
router.patch('/:id', requireWorkspace, validateBody(UpdateTrainingSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const actorId = getUserId(req);
    const { id } = req.params as { id: string };
    const body = req.body as typeof UpdateTrainingSchema._type;

    const [existing] = await db
      .select()
      .from(trainingRecords)
      .where(and(eq(trainingRecords.id, id), eq(trainingRecords.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Training record');

    const updates: Partial<typeof trainingRecords.$inferInsert> = {
      updatedAt: new Date(),
      attempts:  existing.attempts + 1,
    };

    if (body.status) updates.status = body.status;
    if (body.score !== undefined) updates.score = body.score;
    if (body.certificateUrl) updates.certificateUrl = body.certificateUrl;
    if (body.status === 'COMPLETED') updates.completedAt = new Date();
    if (body.expiresAt) updates.expiresAt = new Date(body.expiresAt);

    const [updated] = await db
      .update(trainingRecords)
      .set(updates)
      .where(eq(trainingRecords.id, id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: actorId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'training.updated', entityType: 'training_record', entityId: id, oldValue: existing, newValue: updated },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/training/:id
router.delete('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const actorId = getUserId(req);
    const { id } = req.params as { id: string };

    const [existing] = await db
      .select()
      .from(trainingRecords)
      .where(and(eq(trainingRecords.id, id), eq(trainingRecords.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Training record');

    await db.delete(trainingRecords).where(eq(trainingRecords.id, id));

    await writeAudit(
      { workspaceId, actorUserId: actorId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'training.deleted', entityType: 'training_record', entityId: id },
    );

    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
