/**
 * server/routes/audit.ts — Audit log viewer endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { auditLog } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { paginated } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId } from '../lib/workspace-guard.js';
import { ForbiddenError } from '../lib/errors.js';
import { sql } from 'drizzle-orm';
const router = Router();
router.get('/', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const role = req.session.workspace.role;
        if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER', 'READ_ONLY', 'PLATFORM_ADMIN'].includes(role)) {
            throw new ForbiddenError('Insufficient permissions to view audit log');
        }
        const page = parseInt(req.query['page'] ?? '1', 10);
        const limit = Math.min(parseInt(req.query['limit'] ?? '50', 10), 100);
        const entityType = req.query['entityType'];
        const entityId = req.query['entityId'];
        const offset = (page - 1) * limit;
        const conditions = [eq(auditLog.workspaceId, workspaceId)];
        if (entityType)
            conditions.push(eq(auditLog.entityType, entityType));
        if (entityId)
            conditions.push(eq(auditLog.entityId, entityId));
        const [countResult] = await db
            .select({ count: sql `count(*)` })
            .from(auditLog)
            .where(and(...conditions));
        const items = await db
            .select()
            .from(auditLog)
            .where(and(...conditions))
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
//# sourceMappingURL=audit.js.map