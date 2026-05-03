/**
 * server/lib/audit.ts — Append-only audit log helper.
 * All mutations that touch customer/program/escalation data must call writeAudit.
 */
import { db } from '../db.js';
import { auditLog } from '../../shared/schema.js';
import logger from './logger.js';
export async function writeAudit(ctx, action) {
    try {
        await db.insert(auditLog).values({
            workspaceId: ctx.workspaceId,
            actorUserId: ctx.actorUserId,
            requestId: ctx.requestId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            action: action.action,
            entityType: action.entityType,
            entityId: action.entityId,
            oldValue: action.oldValue ?? null,
            newValue: action.newValue ?? null,
            reason: action.reason,
        });
    }
    catch (err) {
        // Audit log failure must NEVER suppress the main operation — log and continue
        logger.error({ err, ctx, action }, 'Failed to write audit log entry');
    }
}
//# sourceMappingURL=audit.js.map