import { db } from '../db.js';
import { sessions, users, workspaceMemberships } from '../../shared/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { addDays } from 'date-fns';
import { UnauthenticatedError, ForbiddenError } from './errors.js';
import { hasPermission } from '../../shared/enums.js';
const SESSION_COOKIE = 'is_session';
const SESSION_TTL_DAYS = 7;
export async function createSession(res, userId, workspaceId, meta) {
    const sessionId = createId();
    const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
    await db.insert(sessions).values({
        id: sessionId,
        userId,
        workspaceId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
        lastSeenAt: new Date(),
    });
    res.cookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
        path: '/',
    });
    return sessionId;
}
export async function destroySession(req, res) {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (sessionId) {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    res.clearCookie(SESSION_COOKIE, { path: '/' });
}
export function sessionMiddleware(_req, _res, next) {
    // Session is resolved lazily by requireAuth
    next();
}
export async function resolveSession(req) {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId)
        return null;
    const now = new Date();
    const [row] = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
        .limit(1);
    if (!row)
        return null;
    const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, row.userId), eq(users.isActive, true)))
        .limit(1);
    if (!user)
        return null;
    // Touch lastSeenAt (fire and forget)
    void db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, sessionId));
    let workspace = null;
    if (row.workspaceId) {
        const [membership] = await db
            .select()
            .from(workspaceMemberships)
            .where(and(eq(workspaceMemberships.userId, user.id), eq(workspaceMemberships.workspaceId, row.workspaceId), eq(workspaceMemberships.status, 'ACTIVE')))
            .limit(1);
        if (membership) {
            const { workspaces } = await import('../../shared/schema.js');
            const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, row.workspaceId)).limit(1);
            if (ws) {
                workspace = {
                    id: ws.id,
                    legalName: ws.legalName,
                    tradingName: ws.tradingName,
                    industryPathway: ws.industryPathway,
                    implementationStatus: ws.implementationStatus,
                    billingStatus: ws.billingStatus,
                    subscriptionTier: ws.subscriptionTier,
                    trialEndsAt: ws.trialEndsAt?.toISOString() ?? null,
                    role: membership.role,
                };
            }
        }
    }
    const sessionUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isPlatformAdmin: user.isPlatformAdmin,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        identityStatus: user.identityStatus,
    };
    return {
        user: sessionUser,
        workspace,
        sessionId: row.id,
    };
}
// Middleware: requires valid auth, attaches req.session
export function requireAuth(req, _res, next) {
    resolveSession(req)
        .then((session) => {
        if (!session)
            return next(new UnauthenticatedError());
        req.session = session;
        next();
    })
        .catch(next);
}
// Middleware: requires workspace context (session must have workspace)
export function requireWorkspace(req, _res, next) {
    requireAuth(req, _res, (err) => {
        if (err)
            return next(err);
        if (!req.session?.workspace) {
            return next(new ForbiddenError('Workspace context required'));
        }
        next();
    });
}
// Middleware: requires a specific permission
export function requirePermission(permission) {
    return (req, _res, next) => {
        requireWorkspace(req, _res, (err) => {
            if (err)
                return next(err);
            const role = req.session.workspace.role;
            if (!hasPermission(role, permission)) {
                return next(new ForbiddenError(`Missing permission: ${permission}`));
            }
            next();
        });
    };
}
//# sourceMappingURL=auth-session.js.map