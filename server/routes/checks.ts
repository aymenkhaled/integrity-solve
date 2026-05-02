/**
 * server/routes/checks.ts — Check engine endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { checkRequests, checkResults, customers } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { RunCheckSchema, ManualOverrideSchema } from '../../shared/validators.js';
import { validateBody, ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId, assertCustomerOwnership } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError, AppError } from '../lib/errors.js';
import { runProviderCheck } from '../services/check-engine.js';
import { addMinutes } from 'date-fns';

const router = Router();

// ─── POST /api/checks/run ─────────────────────────────────────────────────────

router.post('/run', requireWorkspace, validateBody(RunCheckSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const body = req.body as typeof RunCheckSchema._type;

    // Validate subject ownership
    if (body.subjectType === 'CUSTOMER') {
      await assertCustomerOwnership(req, body.subjectId);
    }

    // Create check request
    const [checkReq] = await db.insert(checkRequests).values({
      workspaceId,
      customerId:      body.subjectType === 'CUSTOMER' ? body.subjectId : undefined,
      checkType:       body.checkType as typeof checkRequests.$inferInsert['checkType'],
      provider:        body.provider as typeof checkRequests.$inferInsert['provider'],
      status:          'PENDING',
      timeoutAt:       addMinutes(new Date(), 5), // G5: timeout guard
      requestedBy:     userId,
      requestPayload:  body.options ?? {},
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'check.requested', entityType: 'check_request', entityId: checkReq!.id, reason: body.reason },
    );

    // Run check asynchronously (fire-and-respond pattern)
    // The actual execution happens in check-engine service
    void runProviderCheck(checkReq!.id, workspaceId).catch((err: unknown) => {
      console.error('Check engine error:', err);
    });

    ok(res, { checkRequestId: checkReq!.id, status: 'PENDING' }, 202);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/checks/:checkId ─────────────────────────────────────────────────

router.get('/:checkId', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const [check] = await db
      .select()
      .from(checkRequests)
      .where(
        and(
          eq(checkRequests.id, req.params['checkId']!),
          eq(checkRequests.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!check) throw new NotFoundError('Check request');

    const results = await db
      .select()
      .from(checkResults)
      .where(eq(checkResults.checkRequestId, check.id))
      .orderBy(desc(checkResults.createdAt));

    ok(res, { ...check, results });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/checks — list by customer ───────────────────────────────────────

router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { customerId } = req.query as { customerId?: string };

    const conditions = [eq(checkRequests.workspaceId, workspaceId)];
    if (customerId) {
      await assertCustomerOwnership(req, customerId);
      conditions.push(eq(checkRequests.customerId, customerId));
    }

    const checks = await db
      .select()
      .from(checkRequests)
      .where(and(...conditions))
      .orderBy(desc(checkRequests.createdAt))
      .limit(100);

    ok(res, checks);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/checks/:checkId/override ──────────────────────────────────────

router.post('/:checkId/override', requireWorkspace, validateBody(ManualOverrideSchema), async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { outcome, reason } = req.body as typeof ManualOverrideSchema._type;

    const [check] = await db
      .select()
      .from(checkRequests)
      .where(
        and(
          eq(checkRequests.id, req.params['checkId']!),
          eq(checkRequests.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!check) throw new NotFoundError('Check request');

    // Insert a manual override result
    const [result] = await db.insert(checkResults).values({
      checkRequestId: check.id,
      workspaceId,
      outcome:        outcome as typeof checkResults.$inferInsert['outcome'],
      rawResponse:    { type: 'MANUAL_OVERRIDE' },
      parsedData:     { overriddenBy: userId, reason },
      hitDetails:     [],
      manualOverride: true,
      overrideBy:     userId,
      overrideReason: reason,
    }).returning();

    await db.update(checkRequests).set({
      status:      'PASS',
      completedAt: new Date(),
    }).where(eq(checkRequests.id, check.id));

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      {
        action: 'check.manually_overridden',
        entityType: 'check_result',
        entityId: result!.id,
        newValue: { outcome, overriddenBy: userId },
        reason,
      },
    );

    ok(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
