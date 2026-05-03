/**
 * server/routes/workspaces.ts — Workspace management endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { workspaces, workspaceMemberships, users, invitations, } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { UpdateWorkspaceSchema, InviteMemberSchema, AcceptInvitationSchema, } from '../../shared/validators.js';
import { validateBody, ok } from '../lib/validate.js';
import { requireAuth, requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { ForbiddenError, NotFoundError, ConflictError } from '../lib/errors.js';
import { writeAudit } from '../lib/audit.js';
import { createId } from '@paralleldrive/cuid2';
import { addDays } from 'date-fns';
import logger from '../lib/logger.js';
const router = Router();
// ─── GET /api/workspaces/current ─────────────────────────────────────────────
router.get('/current', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const [ws] = await db
            .select()
            .from(workspaces)
            .where(eq(workspaces.id, workspaceId))
            .limit(1);
        if (!ws)
            throw new NotFoundError('Workspace');
        ok(res, ws);
    }
    catch (err) {
        next(err);
    }
});
// ─── PATCH /api/workspaces/current ───────────────────────────────────────────
router.patch('/current', requireWorkspace, validateBody(UpdateWorkspaceSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        const role = req.session.workspace.role;
        if (!['WORKSPACE_ADMIN'].includes(role)) {
            throw new ForbiddenError('Only workspace admins can update workspace settings');
        }
        const [before] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
        const [updated] = await db
            .update(workspaces)
            .set({ ...req.body, updatedAt: new Date() })
            .where(eq(workspaces.id, workspaceId))
            .returning();
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'workspace.update', entityType: 'workspace', entityId: workspaceId, oldValue: before, newValue: updated });
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/workspaces/current/members (alias) + /api/workspaces/members ───
router.get('/current/members', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const members = await db
            .select({
            userId: workspaceMemberships.userId,
            role: workspaceMemberships.role,
            status: workspaceMemberships.status,
            joinedAt: workspaceMemberships.joinedAt,
            email: users.email,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
            lastLoginAt: users.lastLoginAt,
        })
            .from(workspaceMemberships)
            .innerJoin(users, eq(users.id, workspaceMemberships.userId))
            .where(eq(workspaceMemberships.workspaceId, workspaceId));
        ok(res, members);
    }
    catch (err) {
        next(err);
    }
});
router.get('/members', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const members = await db
            .select({
            userId: workspaceMemberships.userId,
            role: workspaceMemberships.role,
            status: workspaceMemberships.status,
            joinedAt: workspaceMemberships.joinedAt,
            email: users.email,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
            lastLoginAt: users.lastLoginAt,
        })
            .from(workspaceMemberships)
            .innerJoin(users, eq(users.id, workspaceMemberships.userId))
            .where(eq(workspaceMemberships.workspaceId, workspaceId));
        ok(res, members);
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/workspaces/members/invite ─────────────────────────────────────
router.post('/members/invite', requireWorkspace, validateBody(InviteMemberSchema), async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        const role = req.session.workspace.role;
        if (!['WORKSPACE_ADMIN'].includes(role)) {
            throw new ForbiddenError('Only workspace admins can invite members');
        }
        const { email, role: inviteRole } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        // Check if already a member
        const [existingUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);
        if (existingUser) {
            const [existingMembership] = await db
                .select()
                .from(workspaceMemberships)
                .where(and(eq(workspaceMemberships.userId, existingUser.id), eq(workspaceMemberships.workspaceId, workspaceId)))
                .limit(1);
            if (existingMembership && existingMembership.status === 'ACTIVE') {
                throw new ConflictError('User is already a member of this workspace');
            }
        }
        const token = createId();
        const expiresAt = addDays(new Date(), 7);
        const [invitation] = await db.insert(invitations).values({
            workspaceId,
            email: normalizedEmail,
            role: inviteRole,
            token,
            invitedBy: userId,
            expiresAt,
        }).returning();
        logger.info({ workspaceId, email: normalizedEmail, role: inviteRole }, 'Invitation sent');
        if (process.env.NODE_ENV !== 'production') {
            logger.info({ token, email: normalizedEmail }, '📧 Invitation token (dev only)');
        }
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'member.invited', entityType: 'invitation', entityId: invitation.id, newValue: { email: normalizedEmail, role: inviteRole } });
        ok(res, {
            invitationId: invitation.id,
            email: normalizedEmail,
            expiresAt: expiresAt.toISOString(),
            ...(process.env.NODE_ENV !== 'production' ? { _devToken: token } : {}),
        }, 201);
    }
    catch (err) {
        next(err);
    }
});
// ─── POST /api/workspaces/invitations/accept ─────────────────────────────────
router.post('/invitations/accept', requireAuth, validateBody(AcceptInvitationSchema), async (req, res, next) => {
    try {
        const { token } = req.body;
        const userId = getUserId(req);
        const now = new Date();
        const [invitation] = await db
            .select()
            .from(invitations)
            .where(and(eq(invitations.token, token), eq(invitations.status, 'PENDING')))
            .limit(1);
        if (!invitation || invitation.expiresAt < now) {
            throw new NotFoundError('Invitation (expired or invalid)');
        }
        await db.transaction(async (tx) => {
            // Create or update membership
            await tx.insert(workspaceMemberships).values({
                userId,
                workspaceId: invitation.workspaceId,
                role: invitation.role,
                status: 'ACTIVE',
                invitedBy: invitation.invitedBy,
                joinedAt: now,
            }).onConflictDoUpdate({
                target: [workspaceMemberships.userId, workspaceMemberships.workspaceId],
                set: { role: invitation.role, status: 'ACTIVE', joinedAt: now },
            });
            await tx
                .update(invitations)
                .set({ status: 'ACCEPTED', acceptedAt: now })
                .where(eq(invitations.id, invitation.id));
        });
        ok(res, { workspaceId: invitation.workspaceId, role: invitation.role });
    }
    catch (err) {
        next(err);
    }
});
// ─── DELETE /api/workspaces/members/:userId ───────────────────────────────────
router.delete('/members/:userId', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const actorId = getUserId(req);
        const targetUserId = req.params['userId'];
        const role = req.session.workspace.role;
        if (!['WORKSPACE_ADMIN'].includes(role)) {
            throw new ForbiddenError('Only workspace admins can remove members');
        }
        if (targetUserId === actorId) {
            throw new ForbiddenError('Cannot remove yourself from the workspace');
        }
        const [membership] = await db
            .select()
            .from(workspaceMemberships)
            .where(and(eq(workspaceMemberships.userId, targetUserId), eq(workspaceMemberships.workspaceId, workspaceId)))
            .limit(1);
        if (!membership)
            throw new NotFoundError('Membership');
        await db
            .update(workspaceMemberships)
            .set({ status: 'REVOKED' })
            .where(eq(workspaceMemberships.id, membership.id));
        await writeAudit({ workspaceId, actorUserId: actorId, requestId: req.requestId, ipAddress: req.ip }, { action: 'member.removed', entityType: 'membership', entityId: membership.id, reason: 'Removed by admin' });
        ok(res, { message: 'Member removed' });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=workspaces.js.map