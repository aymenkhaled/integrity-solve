/**
 * server/routes/escalations.ts — Escalation and SMR workflow endpoints.
 * G1 fix: Complete SMR workflow with PENDING_APPROVAL → APPROVED → SUBMITTED.
 */
import { Router } from 'express';
import { db } from '../db.js';
import {
  escalations, smrDrafts, customers,
} from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import {
  CreateEscalationSchema, UpdateEscalationSchema,
  CreateSmrDraftSchema, SubmitSmrSchema, ApproveSmrSchema,
} from '../../shared/validators.js';
import { validateBody, ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError, ForbiddenError, assertReason } from '../lib/errors.js';

const router = Router();

// ─── GET /api/escalations ─────────────────────────────────────────────────────

router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const items = await db
      .select()
      .from(escalations)
      .where(eq(escalations.workspaceId, workspaceId))
      .orderBy(desc(escalations.createdAt))
      .limit(100);
    ok(res, items);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/escalations ────────────────────────────────────────────────────

router.post('/', requireWorkspace, validateBody(CreateEscalationSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const role = req.session!.workspace!.role;

    if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
      throw new ForbiddenError('Insufficient permissions to create escalations');
    }

    const body = req.body as typeof CreateEscalationSchema._type;

    const [escalation] = await db.insert(escalations).values({
      workspaceId,
      customerId:   body.customerId,
      subject:      body.subject,
      summary:      body.summary,
      grounds:      body.grounds,
      riskRating:   body.riskRating as typeof escalations.$inferInsert['riskRating'],
      status:       'DRAFT',
      raisedBy:     userId,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'escalation.created', entityType: 'escalation', entityId: escalation!.id, reason: body.reason },
    );

    ok(res, escalation, 201);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/escalations/:id ─────────────────────────────────────────────────

router.get('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const [escalation] = await db
      .select()
      .from(escalations)
      .where(and(eq(escalations.id, req.params['id']!), eq(escalations.workspaceId, workspaceId)))
      .limit(1);

    if (!escalation) throw new NotFoundError('Escalation');

    const smrs = await db
      .select()
      .from(smrDrafts)
      .where(eq(smrDrafts.escalationId, escalation.id))
      .orderBy(desc(smrDrafts.createdAt));

    ok(res, { ...escalation, smrDrafts: smrs });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/escalations/:id ───────────────────────────────────────────────

router.patch('/:id', requireWorkspace, validateBody(UpdateEscalationSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);

    const [existing] = await db
      .select()
      .from(escalations)
      .where(and(eq(escalations.id, req.params['id']!), eq(escalations.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Escalation');

    const { reason, ...updateData } = req.body as typeof UpdateEscalationSchema._type;

    const [updated] = await db
      .update(escalations)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(escalations.id, req.params['id']!))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'escalation.updated', entityType: 'escalation', entityId: req.params['id']!, oldValue: existing, newValue: updated, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/escalations/:id/escalate ──────────────────────────────────────

router.post('/:id/escalate', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { reason } = req.body as { reason?: string };
    assertReason(reason);

    const [existing] = await db
      .select()
      .from(escalations)
      .where(and(eq(escalations.id, req.params['id']!), eq(escalations.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Escalation');
    if (existing.status !== 'UNDER_REVIEW' && existing.status !== 'DRAFT') {
      throw new ForbiddenError('Escalation cannot be escalated in its current state');
    }

    const [updated] = await db
      .update(escalations)
      .set({ status: 'ESCALATED_TO_SMR', reviewedBy: userId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(escalations.id, req.params['id']!))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'escalation.escalated_to_smr', entityType: 'escalation', entityId: req.params['id']!, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/escalations/:id/close ─────────────────────────────────────────

router.post('/:id/close', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { reason, closeType } = req.body as { reason?: string; closeType?: string };
    assertReason(reason);

    const validCloseTypes = ['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE'] as const;
    const status = validCloseTypes.includes(closeType as typeof validCloseTypes[0])
      ? (closeType as 'CLOSED_NO_ACTION' | 'CLOSED_FALSE_POSITIVE')
      : 'CLOSED_NO_ACTION';

    const [updated] = await db
      .update(escalations)
      .set({ status, closedBy: userId, closedAt: new Date(), closeReason: reason, updatedAt: new Date() })
      .where(and(eq(escalations.id, req.params['id']!), eq(escalations.workspaceId, workspaceId)))
      .returning();

    if (!updated) throw new NotFoundError('Escalation');

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'escalation.closed', entityType: 'escalation', entityId: req.params['id']!, newValue: { status }, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// ─── SMR DRAFTS ───────────────────────────────────────────────────────────────

router.post('/:id/smr', requireWorkspace, validateBody(CreateSmrDraftSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const role = req.session!.workspace!.role;

    if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
      throw new ForbiddenError('Insufficient permissions to create SMR drafts');
    }

    const [existing] = await db
      .select()
      .from(escalations)
      .where(and(eq(escalations.id, req.params['id']!), eq(escalations.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Escalation');

    const body = req.body as typeof CreateSmrDraftSchema._type;

    const [smr] = await db.insert(smrDrafts).values({
      workspaceId,
      escalationId:    existing.id,
      reportingEntity: body.reportingEntity,
      narrativeText:   body.narrativeText,
      suspiciousActs:  body.suspiciousActs,
      subjectDetails:  body.subjectDetails,
      status:          'DRAFT',
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'smr.draft.created', entityType: 'smr_draft', entityId: smr!.id, reason: body.reason },
    );

    ok(res, smr, 201);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/escalations/:id/smr/:smrId/submit ─────────────────────────────

router.post('/:id/smr/:smrId/submit', requireWorkspace, validateBody(SubmitSmrSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { reason } = req.body as typeof SubmitSmrSchema._type;

    const [smr] = await db
      .select()
      .from(smrDrafts)
      .where(and(eq(smrDrafts.id, req.params['smrId']!), eq(smrDrafts.workspaceId, workspaceId)))
      .limit(1);

    if (!smr) throw new NotFoundError('SMR draft');
    if (smr.status !== 'APPROVED') {
      throw new ForbiddenError('SMR must be approved before submission. Current status: ' + smr.status);
    }

    const [updated] = await db
      .update(smrDrafts)
      .set({
        status:      'SUBMITTED',
        submittedAt: new Date(),
        submittedBy: userId,
        updatedAt:   new Date(),
      })
      .where(eq(smrDrafts.id, req.params['smrId']!))
      .returning();

    // Update escalation status
    await db
      .update(escalations)
      .set({ status: 'SMR_SUBMITTED', smrId: smr.id, updatedAt: new Date() })
      .where(eq(escalations.id, req.params['id']!));

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'smr.submitted', entityType: 'smr_draft', entityId: smr.id, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/escalations/:id/smr/:smrId/approve ────────────────────────────

router.post('/:id/smr/:smrId/approve', requireWorkspace, validateBody(ApproveSmrSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const role = req.session!.workspace!.role;
    const { reason } = req.body as typeof ApproveSmrSchema._type;

    if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
      throw new ForbiddenError('Insufficient permissions to approve SMR');
    }

    const [smr] = await db
      .select()
      .from(smrDrafts)
      .where(and(eq(smrDrafts.id, req.params['smrId']!), eq(smrDrafts.workspaceId, workspaceId)))
      .limit(1);

    if (!smr) throw new NotFoundError('SMR draft');
    if (smr.status !== 'PENDING_APPROVAL' && smr.status !== 'DRAFT') {
      throw new ForbiddenError('SMR cannot be approved in its current status: ' + smr.status);
    }

    const [updated] = await db
      .update(smrDrafts)
      .set({
        status:         'APPROVED',
        approvedBy:     userId,
        approvedAt:     new Date(),
        approvalReason: reason,
        updatedAt:      new Date(),
      })
      .where(eq(smrDrafts.id, req.params['smrId']!))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'smr.approved', entityType: 'smr_draft', entityId: smr.id, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

export default router;
