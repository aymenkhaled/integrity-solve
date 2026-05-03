/**
 * server/services/notifications.ts — Notification delivery service.
 */
import { db } from '../db.js';
import { notifications, workspaceMemberships } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import type { NotificationPayload } from '../../shared/types.js';
import logger from '../lib/logger.js';

export async function createNotification(
  workspaceId: string,
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    await db.insert(notifications).values({
      workspaceId,
      userId,
      channel:    'IN_APP',
      title:      payload.title,
      body:       payload.body,
      entityType: payload.entityType,
      entityId:   payload.entityId,
    });
  } catch (err) {
    logger.error({ err, workspaceId, userId }, 'Failed to create notification');
  }
}

export async function notifyWorkspaceAdmins(
  workspaceId: string,
  payload: NotificationPayload,
): Promise<void> {
  const admins = await db
    .select({ userId: workspaceMemberships.userId })
    .from(workspaceMemberships)
    .where(
      and(
        eq(workspaceMemberships.workspaceId, workspaceId),
        eq(workspaceMemberships.status, 'ACTIVE'),
        eq(workspaceMemberships.role, 'WORKSPACE_ADMIN'),
      ),
    );

  await Promise.allSettled(
    admins.map((a) => createNotification(workspaceId, a.userId, payload)),
  );
}

export async function notifyComplianceOfficers(
  workspaceId: string,
  payload: NotificationPayload,
): Promise<void> {
  const officers = await db
    .select({ userId: workspaceMemberships.userId })
    .from(workspaceMemberships)
    .where(
      and(
        eq(workspaceMemberships.workspaceId, workspaceId),
        eq(workspaceMemberships.status, 'ACTIVE'),
        eq(workspaceMemberships.role, 'COMPLIANCE_OFFICER'),
      ),
    );

  await Promise.allSettled(
    officers.map((o) => createNotification(workspaceId, o.userId, payload)),
  );
}
