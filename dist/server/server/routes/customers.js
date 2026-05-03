/**
 * server/routes/customers.ts — Customer lifecycle endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { customers, beneficialOwners } from '../../shared/schema.js';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { CreateCustomerSchema, UpdateCustomerSchema, UpdateRiskRatingSchema, CreateBeneficialOwnerSchema, PaginationSchema, } from '../../shared/validators.js';
import { validateBody, validateQuery, ok, paginated } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId, assertCustomerOwnership } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
const router = Router();
// ─── GET /api/customers ───────────────────────────────────────────────────────
router.get('/', requireWorkspace, validateQuery(PaginationSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const { page, limit, search } = req.query;
        const offset = (page - 1) * limit;
        const baseCondition = search
            ? and(eq(customers.workspaceId, workspaceId), or(ilike(customers.entityName, `%${search}%`), ilike(customers.familyName, `%${search}%`), ilike(customers.givenNames, `%${search}%`), ilike(customers.referenceNumber, `%${search}%`)))
            : eq(customers.workspaceId, workspaceId);
        const [countResult] = await db
            .select({ count: sql `count(*)` })
            .from(customers)
            .where(baseCondition);
        const items = await db
            .select()
            .from(customers)
            .where(baseCondition)
            .orderBy(desc(customers.createdAt))
            .limit(limit)
            .offset(offset);
        paginated(res, items, Number(countResult?.count ?? 0), page, limit);
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/customers ──────────────────────────────────────────────────────
router.post('/', requireWorkspace, validateBody(CreateCustomerSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        const role = req.session.workspace.role;
        if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'ONBOARDING_USER'].includes(role)) {
            throw new ForbiddenError('Insufficient permissions to create customers');
        }
        const body = req.body;
        // Generate sequential-like reference number
        const refNum = `C-${Date.now().toString(36).toUpperCase()}`;
        const [customer] = await db.insert(customers).values({
            ...body,
            workspaceId,
            referenceNumber: refNum,
            status: 'DRAFT',
            riskRating: 'UNRATED',
            cddLevel: 'STANDARD',
            onboardedBy: userId,
        }).returning();
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'customer.created', entityType: 'customer', entityId: customer.id, newValue: customer });
        ok(res, customer, 201);
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/customers/:id ───────────────────────────────────────────────────
router.get('/:id', requireWorkspace, async (req, res, next) => {
    try {
        await assertCustomerOwnership(req, req.params['id']);
        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, req.params['id']))
            .limit(1);
        if (!customer)
            throw new NotFoundError('Customer');
        // Enrich with beneficial owners
        const bos = await db
            .select()
            .from(beneficialOwners)
            .where(eq(beneficialOwners.customerId, customer.id));
        ok(res, { ...customer, beneficialOwners: bos });
    }
    catch (err) {
        next(err);
    }
});
// ─── PATCH /api/customers/:id ─────────────────────────────────────────────────
router.patch('/:id', requireWorkspace, validateBody(UpdateCustomerSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        await assertCustomerOwnership(req, req.params['id']);
        const body = req.body;
        const { reason, ...updateData } = body;
        const [before] = await db.select().from(customers).where(eq(customers.id, req.params['id'])).limit(1);
        const [updated] = await db
            .update(customers)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(customers.id, req.params['id']))
            .returning();
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'customer.updated', entityType: 'customer', entityId: req.params['id'], oldValue: before, newValue: updated, reason });
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
});
// ─── PATCH /api/customers/:id/risk-rating ────────────────────────────────────
router.patch('/:id/risk-rating', requireWorkspace, validateBody(UpdateRiskRatingSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        await assertCustomerOwnership(req, req.params['id']);
        const { riskRating, reason, riskNotes } = req.body;
        const [before] = await db.select({ riskRating: customers.riskRating }).from(customers).where(eq(customers.id, req.params['id'])).limit(1);
        const [updated] = await db
            .update(customers)
            .set({ riskRating, riskNotes, updatedAt: new Date() })
            .where(eq(customers.id, req.params['id']))
            .returning();
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, {
            action: 'customer.riskRating.updated',
            entityType: 'customer',
            entityId: req.params['id'],
            oldValue: before,
            newValue: { riskRating, riskNotes },
            reason,
        });
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
});
// ─── PATCH /api/customers/:id/status ─────────────────────────────────────────
router.patch('/:id/status', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        await assertCustomerOwnership(req, req.params['id']);
        const { status, reason } = req.body;
        if (!reason || reason.trim().length < 10) {
            throw new Error('Reason must be at least 10 characters');
        }
        const [before] = await db.select({ status: customers.status }).from(customers).where(eq(customers.id, req.params['id'])).limit(1);
        const [updated] = await db
            .update(customers)
            .set({
            status: status,
            updatedAt: new Date(),
            ...(status === 'EXITED' ? { exitedAt: new Date(), exitReason: reason } : {}),
        })
            .where(eq(customers.id, req.params['id']))
            .returning();
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'customer.status.changed', entityType: 'customer', entityId: req.params['id'], oldValue: before, newValue: { status }, reason });
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
});
// ─── Beneficial Owners ────────────────────────────────────────────────────────
router.get('/:id/beneficial-owners', requireWorkspace, async (req, res, next) => {
    try {
        await assertCustomerOwnership(req, req.params['id']);
        const bos = await db
            .select()
            .from(beneficialOwners)
            .where(eq(beneficialOwners.customerId, req.params['id']));
        ok(res, bos);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/beneficial-owners', requireWorkspace, validateBody(CreateBeneficialOwnerSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        await assertCustomerOwnership(req, req.params['id']);
        const body = req.body;
        const [bo] = await db.insert(beneficialOwners).values({
            givenNames: body.givenNames,
            familyName: body.familyName,
            dateOfBirth: body.dateOfBirth,
            nationality: body.nationality,
            ownershipPct: body.ownershipPct !== undefined ? String(body.ownershipPct) : undefined,
            isController: body.isController,
            roleTitle: body.roleTitle,
            customerId: req.params['id'],
            workspaceId,
        }).returning();
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'beneficial_owner.created', entityType: 'beneficial_owner', entityId: bo.id, newValue: bo });
        ok(res, bo, 201);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=customers.js.map