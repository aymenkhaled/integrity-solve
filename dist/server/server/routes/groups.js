/**
 * server/routes/groups.ts — D2: Group Workspaces.
 * A group workspace is a parent workspace that can manage child workspaces.
 * The `groupWorkspaceId` FK on workspaces table links children to their parent.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { workspaces, workspaceMemberships, customers, checkRequests, escalations } from '../../shared/schema.js';
import { eq, count, inArray } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
const router = Router();
// Helper: assert caller is a WORKSPACE_ADMIN
function assertAdmin(req) {
    if (req.session?.workspace?.role !== 'WORKSPACE_ADMIN') {
        throw new ForbiddenError('Only workspace admins can manage group workspaces');
    }
}
// ─── GET /api/groups — list child workspaces ──────────────────────────────────
router.get('/', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        // Fetch current workspace to get its group info
        const [current] = await db
            .select({
            id: workspaces.id,
            legalName: workspaces.legalName,
            groupWorkspaceId: workspaces.groupWorkspaceId,
            subscriptionTier: workspaces.subscriptionTier,
            industryPathway: workspaces.industryPathway,
        })
            .from(workspaces)
            .where(eq(workspaces.id, workspaceId));
        if (!current)
            throw new NotFoundError('Workspace');
        // Child workspaces of this workspace
        const children = await db
            .select({
            id: workspaces.id,
            legalName: workspaces.legalName,
            tradingName: workspaces.tradingName,
            abn: workspaces.abn,
            subscriptionTier: workspaces.subscriptionTier,
            implementationStatus: workspaces.implementationStatus,
            industryPathway: workspaces.industryPathway,
            createdAt: workspaces.createdAt,
        })
            .from(workspaces)
            .where(eq(workspaces.groupWorkspaceId, workspaceId));
        // Parent workspace if this is a child
        let parent = null;
        if (current.groupWorkspaceId) {
            const [p] = await db
                .select({ id: workspaces.id, legalName: workspaces.legalName, subscriptionTier: workspaces.subscriptionTier })
                .from(workspaces)
                .where(eq(workspaces.id, current.groupWorkspaceId));
            parent = p ?? null;
        }
        // Per-child stats
        const childIds = children.map((c) => c.id);
        let childStats = {};
        if (childIds.length > 0) {
            const [memberCounts, customerCounts, checkCounts, escalationCounts] = await Promise.all([
                db.select({ wid: workspaceMemberships.workspaceId, c: count() })
                    .from(workspaceMemberships)
                    .where(inArray(workspaceMemberships.workspaceId, childIds))
                    .groupBy(workspaceMemberships.workspaceId),
                db.select({ wid: customers.workspaceId, c: count() })
                    .from(customers)
                    .where(inArray(customers.workspaceId, childIds))
                    .groupBy(customers.workspaceId),
                db.select({ wid: checkRequests.workspaceId, c: count() })
                    .from(checkRequests)
                    .where(inArray(checkRequests.workspaceId, childIds))
                    .groupBy(checkRequests.workspaceId),
                db.select({ wid: escalations.workspaceId, c: count() })
                    .from(escalations)
                    .where(inArray(escalations.workspaceId, childIds))
                    .groupBy(escalations.workspaceId),
            ]);
            for (const id of childIds) {
                childStats[id] = {
                    members: Number(memberCounts.find((r) => r.wid === id)?.c ?? 0),
                    customers: Number(customerCounts.find((r) => r.wid === id)?.c ?? 0),
                    checks: Number(checkCounts.find((r) => r.wid === id)?.c ?? 0),
                    escalations: Number(escalationCounts.find((r) => r.wid === id)?.c ?? 0),
                };
            }
        }
        // Aggregate stats across all children
        const aggregate = {
            totalChildren: children.length,
            totalMembers: Object.values(childStats).reduce((s, v) => s + v.members, 0),
            totalCustomers: Object.values(childStats).reduce((s, v) => s + v.customers, 0),
            totalChecks: Object.values(childStats).reduce((s, v) => s + v.checks, 0),
            totalEscalations: Object.values(childStats).reduce((s, v) => s + v.escalations, 0),
        };
        return ok(res, {
            current: { ...current, isGroupParent: !current.groupWorkspaceId && children.length > 0 },
            parent,
            children: children.map((c) => ({ ...c, stats: childStats[c.id] ?? { members: 0, customers: 0, checks: 0, escalations: 0 } })),
            aggregate,
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/groups/link — link a child workspace ──────────────────────────
router.post('/link', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        assertAdmin(req);
        const { childWorkspaceId } = req.body ?? {};
        if (!childWorkspaceId || typeof childWorkspaceId !== 'string') {
            return res.status(400).json({ ok: false, error: { code: 'VALIDATION', message: 'childWorkspaceId required' } });
        }
        // Prevent circular links
        if (childWorkspaceId === workspaceId) {
            return res.status(400).json({ ok: false, error: { code: 'VALIDATION', message: 'Cannot link a workspace to itself' } });
        }
        const [child] = await db
            .select({ id: workspaces.id, groupWorkspaceId: workspaces.groupWorkspaceId })
            .from(workspaces)
            .where(eq(workspaces.id, childWorkspaceId));
        if (!child)
            throw new NotFoundError('Child workspace');
        if (child.groupWorkspaceId && child.groupWorkspaceId !== workspaceId) {
            return res.status(409).json({ ok: false, error: { code: 'CONFLICT', message: 'Workspace already belongs to another group' } });
        }
        await db
            .update(workspaces)
            .set({ groupWorkspaceId: workspaceId, updatedAt: new Date() })
            .where(eq(workspaces.id, childWorkspaceId));
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'group.child_linked', entityType: 'workspace', entityId: childWorkspaceId, reason: `Linked child workspace ${childWorkspaceId} to group` });
        return ok(res, { linked: true });
    }
    catch (err) {
        next(err);
    }
});
// ─── DELETE /api/groups/link/:childId — unlink a child workspace ─────────────
router.delete('/link/:childId', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        assertAdmin(req);
        const [child] = await db
            .select({ id: workspaces.id, groupWorkspaceId: workspaces.groupWorkspaceId })
            .from(workspaces)
            .where(eq(workspaces.id, req.params['childId']));
        if (!child)
            throw new NotFoundError('Child workspace');
        if (child.groupWorkspaceId !== workspaceId) {
            throw new ForbiddenError('Workspace is not a child of this group');
        }
        await db
            .update(workspaces)
            .set({ groupWorkspaceId: null, updatedAt: new Date() })
            .where(eq(workspaces.id, req.params['childId']));
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'group.child_unlinked', entityType: 'workspace', entityId: req.params['childId'], reason: `Unlinked child workspace from group` });
        return ok(res, { unlinked: true });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=groups.js.map