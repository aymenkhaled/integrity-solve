/**
 * server/lib/audit.ts — Append-only audit log helper.
 * All mutations that touch customer/program/escalation data must call writeAudit.
 */
import { db } from '../db.js';
import { auditLog } from '../../shared/schema.js';
import type { AuditAction } from '../../shared/types.js';
import logger from './logger.js';

export interface AuditContext {
  workspaceId: string;
  actorUserId: string;
  requestId:   string;
  ipAddress?:  string;
  userAgent?:  string;
}

export async function writeAudit(
  ctx: AuditContext,
  action: AuditAction,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.actorUserId,
      requestId:   ctx.requestId,
      ipAddress:   ctx.ipAddress,
      userAgent:   ctx.userAgent,
      action:      action.action,
      entityType:  action.entityType,
      entityId:    action.entityId,
      oldValue:    action.oldValue as Record<string, unknown> | null ?? null,
      newValue:    action.newValue as Record<string, unknown> | null ?? null,
      reason:      action.reason,
    });
  } catch (err) {
    // Audit log failure must NEVER suppress the main operation — log and continue
    logger.error({ err, ctx, action }, 'Failed to write audit log entry');
  }
}
