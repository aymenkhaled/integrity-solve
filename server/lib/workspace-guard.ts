/**
 * server/lib/workspace-guard.ts — Triple-layer workspace isolation guard.
 *
 * Layer 1: Session middleware — session.workspace.id set at login
 * Layer 2: This guard — every route handler calls assertWorkspaceOwns()
 * Layer 3: Storage layer — all queries include WHERE workspace_id = $1
 *
 * G2 fix: Orphan CO validation — beneficial owners must be attached to a
 * customer that belongs to the workspace.
 */
import { db } from '../db.js';
import { customers, workspaceMemberships } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from './errors.js';
import type { Request } from 'express';

/** Asserts that a customer belongs to the session workspace. */
export async function assertCustomerOwnership(
  req: Request,
  customerId: string,
): Promise<void> {
  const workspaceId = req.session?.workspace?.id;
  if (!workspaceId) throw new ForbiddenError('Workspace context required');

  const [customer] = await db
    .select({ id: customers.id, workspaceId: customers.workspaceId })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.workspaceId, workspaceId)))
    .limit(1);

  if (!customer) throw new NotFoundError('Customer');
}

/** Asserts that a membership belongs to the session workspace. */
export async function assertMembershipOwnership(
  req: Request,
  userId: string,
): Promise<void> {
  const workspaceId = req.session?.workspace?.id;
  if (!workspaceId) throw new ForbiddenError('Workspace context required');

  const [membership] = await db
    .select({ id: workspaceMemberships.id })
    .from(workspaceMemberships)
    .where(
      and(
        eq(workspaceMemberships.userId, userId),
        eq(workspaceMemberships.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!membership) throw new NotFoundError('Membership');
}

/** Returns the workspace ID from the session, throwing if absent. */
export function getWorkspaceId(req: Request): string {
  const id = req.session?.workspace?.id;
  if (!id) throw new ForbiddenError('Workspace context required');
  return id;
}

/** Returns the authenticated user ID, throwing if absent. */
export function getUserId(req: Request): string {
  const id = req.session?.user?.id;
  if (!id) throw new ForbiddenError('Authentication required');
  return id;
}
