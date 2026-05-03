/**
 * server/routes/programs.ts — AML Program wizard endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { programForms, programVersions } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { SaveProgramStepSchema, PublishProgramSchema } from '../../shared/validators.js';
import { validateBody, ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { addYears } from 'date-fns';

const router = Router();

// ─── GET /api/programs ────────────────────────────────────────────────────────

router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const forms = await db
      .select()
      .from(programForms)
      .where(eq(programForms.workspaceId, workspaceId))
      .orderBy(desc(programForms.createdAt));
    ok(res, forms);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/programs ───────────────────────────────────────────────────────

router.post('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const role = req.session!.workspace!.role;

    if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'PROGRAM_CONTRIBUTOR'].includes(role)) {
      throw new ForbiddenError('Insufficient permissions to create program');
    }

    const { title, pathway } = req.body as { title?: string; pathway?: string };

    const [form] = await db.insert(programForms).values({
      workspaceId,
      title:    title ?? 'AML/CTF Program',
      pathway:  pathway as typeof programForms.$inferInsert['pathway'] ?? null,
      status:   'NOT_STARTED',
      currentStep: 0,
      formData: {},
      createdBy: userId,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'program.created', entityType: 'program_form', entityId: form!.id },
    );

    ok(res, form, 201);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/programs/:id ────────────────────────────────────────────────────

router.get('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const [form] = await db
      .select()
      .from(programForms)
      .where(and(eq(programForms.id, (req.params['id'] as string)), eq(programForms.workspaceId, workspaceId)))
      .limit(1);

    if (!form) throw new NotFoundError('Program form');

    const versions = await db
      .select()
      .from(programVersions)
      .where(eq(programVersions.programFormId, form.id))
      .orderBy(desc(programVersions.publishedAt));

    ok(res, { ...form, versions });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/programs/:id/step ─────────────────────────────────────────────

router.patch('/:id/step', requireWorkspace, validateBody(SaveProgramStepSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const [form] = await db
      .select()
      .from(programForms)
      .where(and(eq(programForms.id, (req.params['id'] as string)), eq(programForms.workspaceId, workspaceId)))
      .limit(1);

    if (!form) throw new NotFoundError('Program form');
    if (form.lockedAt) throw new ForbiddenError('Program is locked and cannot be edited');

    const { step, data, reason } = req.body as typeof SaveProgramStepSchema._type;

    // Merge step data into existing formData
    const currentData = (form.formData as Record<string, unknown>) ?? {};
    const updatedData = {
      ...currentData,
      [`step_${step}`]: data,
    };

    const newStatus = step > 0 ? 'IN_PROGRESS' : form.status;

    const [updated] = await db
      .update(programForms)
      .set({
        formData:    updatedData,
        currentStep: Math.max(form.currentStep, step),
        status:      newStatus as typeof programForms.$inferInsert['status'],
        updatedAt:   new Date(),
      })
      .where(eq(programForms.id, (req.params['id'] as string)))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'program.step.saved', entityType: 'program_form', entityId: (req.params['id'] as string), newValue: { step, data }, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/programs/:id/publish ──────────────────────────────────────────

router.post('/:id/publish', requireWorkspace, validateBody(PublishProgramSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const role = req.session!.workspace!.role;

    if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
      throw new ForbiddenError('Only Compliance Officers and Admins can publish programs');
    }

    const [form] = await db
      .select()
      .from(programForms)
      .where(and(eq(programForms.id, (req.params['id'] as string)), eq(programForms.workspaceId, workspaceId)))
      .limit(1);

    if (!form) throw new NotFoundError('Program form');

    const { notes, reason } = req.body as typeof PublishProgramSchema._type;

    // Get next version number
    const existingVersions = await db
      .select({ versionNumber: programVersions.versionNumber })
      .from(programVersions)
      .where(eq(programVersions.programFormId, form.id))
      .orderBy(desc(programVersions.versionNumber))
      .limit(1);

    const nextVersion = (existingVersions[0]?.versionNumber ?? 0) + 1;
    const reviewDueAt = addYears(new Date(), 1); // Annual review

    const [version] = await db.insert(programVersions).values({
      programFormId: form.id,
      workspaceId,
      versionNumber: nextVersion,
      snapshotData:  form.formData as Record<string, unknown>,
      publishedBy:   userId,
      publishedAt:   new Date(),
      reviewDueAt,
      notes,
    }).returning();

    // Update form status and lock
    await db
      .update(programForms)
      .set({
        status:    'COMPLETE',
        lockedAt:  new Date(),
        lockedBy:  userId,
        updatedAt: new Date(),
      })
      .where(eq(programForms.id, form.id));

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'program.published', entityType: 'program_version', entityId: version!.id, reason },
    );

    ok(res, { ...version, reviewDueAt: reviewDueAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

export default router;
