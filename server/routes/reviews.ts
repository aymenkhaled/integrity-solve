/**
 * server/routes/reviews.ts — Periodic Review endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { periodicReviews, customers } from '../../shared/schema.js';
import { eq, and, desc, lt } from 'drizzle-orm';
import { z } from 'zod';
import { ok, validateBody } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

const router = Router();

const CreateReviewSchema = z.object({
  customerId:  z.string().min(1),
  dueAt:       z.string().min(1),
  reviewType:  z.string().default('ANNUAL'),
  notes:       z.string().optional(),
});

const CompleteReviewSchema = z.object({
  newRating:  z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNRATED']),
  findings:   z.array(z.unknown()).default([]),
  notes:      z.string().min(10, 'Notes must be at least 10 characters'),
  reason:     z.string().min(10, 'Reason must be at least 10 characters'),
});

// GET /api/reviews — list reviews (optionally filter by status, customerId)
router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { customerId, status } = req.query as { customerId?: string; status?: string };

    const conditions = [eq(periodicReviews.workspaceId, workspaceId)];
    if (customerId) conditions.push(eq(periodicReviews.customerId, customerId));
    if (status)     conditions.push(eq(periodicReviews.status, status as typeof periodicReviews.$inferInsert['status']));

    const reviews = await db
      .select()
      .from(periodicReviews)
      .where(and(...conditions))
      .orderBy(desc(periodicReviews.dueAt))
      .limit(200);

    ok(res, reviews);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/overdue — convenience: overdue reviews
router.get('/overdue', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const now = new Date();

    const overdue = await db
      .select()
      .from(periodicReviews)
      .where(
        and(
          eq(periodicReviews.workspaceId, workspaceId),
          eq(periodicReviews.status, 'SCHEDULED'),
          lt(periodicReviews.dueAt, now),
        ),
      )
      .orderBy(periodicReviews.dueAt)
      .limit(100);

    ok(res, overdue);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews — schedule a periodic review
router.post('/', requireWorkspace, validateBody(CreateReviewSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const body = req.body as typeof CreateReviewSchema._type;

    // Verify customer belongs to workspace
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.workspaceId, workspaceId)))
      .limit(1);

    if (!customer) throw new NotFoundError('Customer');

    const [review] = await db.insert(periodicReviews).values({
      workspaceId,
      customerId:    body.customerId,
      dueAt:         new Date(body.dueAt),
      reviewType:    body.reviewType,
      notes:         body.notes,
      previousRating: customer.riskRating,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'review.scheduled', entityType: 'periodic_review', entityId: review!.id, newValue: body },
    );

    ok(res, review, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/:id
router.get('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const [review] = await db
      .select()
      .from(periodicReviews)
      .where(and(eq(periodicReviews.id, id), eq(periodicReviews.workspaceId, workspaceId)))
      .limit(1);

    if (!review) throw new NotFoundError('Review');
    ok(res, review);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/:id/start — mark review as in-progress
router.post('/:id/start', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };

    const [existing] = await db
      .select()
      .from(periodicReviews)
      .where(and(eq(periodicReviews.id, id), eq(periodicReviews.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Review');
    if (existing.status !== 'SCHEDULED' && existing.status !== 'OVERDUE') {
      throw new ValidationError('Review cannot be started in its current state');
    }

    const [updated] = await db
      .update(periodicReviews)
      .set({ status: 'IN_PROGRESS', startedAt: new Date() })
      .where(eq(periodicReviews.id, id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'review.started', entityType: 'periodic_review', entityId: id },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/:id/complete — complete a review and update customer risk
router.post('/:id/complete', requireWorkspace, validateBody(CompleteReviewSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const body = req.body as typeof CompleteReviewSchema._type;

    const [existing] = await db
      .select()
      .from(periodicReviews)
      .where(and(eq(periodicReviews.id, id), eq(periodicReviews.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Review');

    const now = new Date();

    const [updated] = await db
      .update(periodicReviews)
      .set({
        status:      'COMPLETE',
        completedAt: now,
        completedBy: userId,
        newRating:   body.newRating,
        findings:    body.findings as Record<string, unknown>[],
        notes:       body.notes,
      })
      .where(eq(periodicReviews.id, id))
      .returning();

    // Update customer's risk rating and last review timestamps
    await db
      .update(customers)
      .set({
        riskRating:     body.newRating,
        lastReviewedAt: now,
        lastReviewedBy: userId,
        updatedAt:      now,
      })
      .where(eq(customers.id, existing.customerId));

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      {
        action: 'review.completed',
        entityType: 'periodic_review',
        entityId: id,
        oldValue: existing,
        newValue: updated,
        reason: body.reason,
      },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/:id/cancel
router.post('/:id/cancel', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const { reason } = req.body as { reason?: string };

    const [existing] = await db
      .select()
      .from(periodicReviews)
      .where(and(eq(periodicReviews.id, id), eq(periodicReviews.workspaceId, workspaceId)))
      .limit(1);

    if (!existing) throw new NotFoundError('Review');

    const [updated] = await db
      .update(periodicReviews)
      .set({ status: 'CANCELLED' })
      .where(eq(periodicReviews.id, id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'review.cancelled', entityType: 'periodic_review', entityId: id, reason },
    );

    ok(res, updated);
  } catch (err) {
    next(err);
  }
});

export default router;
