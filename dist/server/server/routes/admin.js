/**
 * server/routes/admin.ts — Platform admin endpoints.
 * All routes require PLATFORM_ADMIN role (isPlatformAdmin flag on user).
 */
import { Router } from 'express';
import { db } from '../db.js';
import { workspaces, users, workspaceMemberships, auditLog, customers, tasks, } from '../../shared/schema.js';
import { eq, desc, sql, ilike } from 'drizzle-orm';
import { ok, paginated } from '../lib/validate.js';
import { requireAuth } from '../lib/auth-session.js';
import { ForbiddenError } from '../lib/errors.js';
const router = Router();
// Admin guard — all admin routes require platform admin
function requireAdmin(req, _res, next) {
    requireAuth(req, _res, (err) => {
        if (err)
            return next(err);
        if (!req.session?.user?.isPlatformAdmin) {
            return next(new ForbiddenError('Platform admin access required'));
        }
        next();
    });
}
router.use(requireAdmin);
// GET /api/admin/stats — platform-wide stats
router.get('/stats', async (_req, res, next) => {
    try {
        const [wsCount] = await db.select({ count: sql `count(*)` }).from(workspaces);
        const [userCount] = await db.select({ count: sql `count(*)` }).from(users);
        const [custCount] = await db.select({ count: sql `count(*)` }).from(customers);
        const [taskCount] = await db.select({ count: sql `count(*)` }).from(tasks);
        // Tier breakdown
        const tierBreakdown = await db
            .select({
            tier: workspaces.subscriptionTier,
            count: sql `count(*)`,
        })
            .from(workspaces)
            .groupBy(workspaces.subscriptionTier);
        // Billing status breakdown
        const billingBreakdown = await db
            .select({
            status: workspaces.billingStatus,
            count: sql `count(*)`,
        })
            .from(workspaces)
            .groupBy(workspaces.billingStatus);
        ok(res, {
            totals: {
                workspaces: Number(wsCount?.count ?? 0),
                users: Number(userCount?.count ?? 0),
                customers: Number(custCount?.count ?? 0),
                tasks: Number(taskCount?.count ?? 0),
            },
            tierBreakdown,
            billingBreakdown,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/workspaces — list all workspaces (paginated)
router.get('/workspaces', async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query['page'] ?? 1));
        const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20)));
        const search = req.query['search']?.trim();
        const offset = (page - 1) * limit;
        const condition = search
            ? ilike(workspaces.legalName, `%${search}%`)
            : undefined;
        const [countResult] = await db
            .select({ count: sql `count(*)` })
            .from(workspaces)
            .where(condition);
        const items = await db
            .select()
            .from(workspaces)
            .where(condition)
            .orderBy(desc(workspaces.createdAt))
            .limit(limit)
            .offset(offset);
        paginated(res, items, Number(countResult?.count ?? 0), page, limit);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/workspaces/:id — workspace detail with members
router.get('/workspaces/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [workspace] = await db
            .select()
            .from(workspaces)
            .where(eq(workspaces.id, id))
            .limit(1);
        if (!workspace) {
            return ok(res, null);
        }
        const members = await db
            .select({
            userId: workspaceMemberships.userId,
            role: workspaceMemberships.role,
            status: workspaceMemberships.status,
            joinedAt: workspaceMemberships.joinedAt,
            fullName: users.fullName,
            email: users.email,
            avatarUrl: users.avatarUrl,
        })
            .from(workspaceMemberships)
            .leftJoin(users, eq(workspaceMemberships.userId, users.id))
            .where(eq(workspaceMemberships.workspaceId, id));
        const [custCount] = await db
            .select({ count: sql `count(*)` })
            .from(customers)
            .where(eq(customers.workspaceId, id));
        ok(res, { workspace, members, customerCount: Number(custCount?.count ?? 0) });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/admin/workspaces/:id — update workspace tier/status
router.patch('/workspaces/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { billingStatus, subscriptionTier, trialEndsAt } = req.body;
        const updates = { updatedAt: new Date() };
        if (billingStatus)
            updates.billingStatus = billingStatus;
        if (subscriptionTier)
            updates.subscriptionTier = subscriptionTier;
        if (trialEndsAt)
            updates.trialEndsAt = new Date(trialEndsAt);
        const [updated] = await db
            .update(workspaces)
            .set(updates)
            .where(eq(workspaces.id, id))
            .returning();
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/users — list all users (paginated)
router.get('/users', async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query['page'] ?? 1));
        const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20)));
        const search = req.query['search']?.trim();
        const offset = (page - 1) * limit;
        const condition = search
            ? ilike(users.email, `%${search}%`)
            : undefined;
        const [countResult] = await db
            .select({ count: sql `count(*)` })
            .from(users)
            .where(condition);
        const items = await db
            .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            isPlatformAdmin: users.isPlatformAdmin,
            isActive: users.isActive,
            identityStatus: users.identityStatus,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
        })
            .from(users)
            .where(condition)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);
        paginated(res, items, Number(countResult?.count ?? 0), page, limit);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/admin/audit — global audit log (paginated)
router.get('/audit', async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query['page'] ?? 1));
        const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
        const offset = (page - 1) * limit;
        const [countResult] = await db
            .select({ count: sql `count(*)` })
            .from(auditLog);
        const items = await db
            .select()
            .from(auditLog)
            .orderBy(desc(auditLog.createdAt))
            .limit(limit)
            .offset(offset);
        paginated(res, items, Number(countResult?.count ?? 0), page, limit);
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=admin.js.map