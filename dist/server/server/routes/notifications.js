/**
 * server/routes/notifications.ts — In-app notification endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { notifications } from '../../shared/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireAuth } from '../lib/auth-session.js';
import { getUserId } from '../lib/workspace-guard.js';
import { NotFoundError } from '../lib/errors.js';
const router = Router();
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const unreadOnly = req.query['unread'] === 'true';
        const conditions = [eq(notifications.userId, userId)];
        if (unreadOnly)
            conditions.push(isNull(notifications.readAt));
        const items = await db
            .select()
            .from(notifications)
            .where(and(...conditions))
            .orderBy(desc(notifications.createdAt))
            .limit(50);
        ok(res, items);
    }
    catch (err) {
        next(err);
    }
});
router.post('/:id/read', requireAuth, async (req, res, next) => {
    try {
        const userId = getUserId(req);
        const [notif] = await db
            .select()
            .from(notifications)
            .where(and(eq(notifications.id, req.params['id']), eq(notifications.userId, userId)))
            .limit(1);
        if (!notif)
            throw new NotFoundError('Notification');
        const [updated] = await db
            .update(notifications)
            .set({ readAt: new Date() })
            .where(eq(notifications.id, notif.id))
            .returning();
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
});
router.post('/read-all', requireAuth, async (req, res, next) => {
    try {
        const userId = getUserId(req);
        await db
            .update(notifications)
            .set({ readAt: new Date() })
            .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
        ok(res, { message: 'All notifications marked as read' });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=notifications.js.map