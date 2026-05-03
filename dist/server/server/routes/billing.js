/**
 * server/routes/billing.ts — Billing endpoints.
 * Stripe-agnostic for now (no Stripe key required); records usage events and
 * exposes subscription status. Stripe checkout/portal can be wired once
 * STRIPE_SECRET_KEY is set in env.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { workspaces, usageEvents } from '../../shared/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { getUserId } from '../lib/workspace-guard.js';
const router = Router();
// GET /api/billing/overview — current subscription + trial info
router.get('/overview', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const [workspace] = await db
            .select({
            billingStatus: workspaces.billingStatus,
            subscriptionTier: workspaces.subscriptionTier,
            trialEndsAt: workspaces.trialEndsAt,
            currentPeriodEnd: workspaces.currentPeriodEnd,
            stripeCustomerId: workspaces.stripeCustomerId,
            stripeSubscriptionId: workspaces.stripeSubscriptionId,
        })
            .from(workspaces)
            .where(eq(workspaces.id, workspaceId))
            .limit(1);
        // Usage summary for current month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const usageSummary = await db
            .select({
            eventType: usageEvents.eventType,
            total: sql `sum(${usageEvents.quantity})`,
        })
            .from(usageEvents)
            .where(eq(usageEvents.workspaceId, workspaceId))
            .groupBy(usageEvents.eventType);
        ok(res, {
            workspace,
            usage: usageSummary,
            plans: PLAN_CONFIG,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/billing/usage — paginated usage event history
router.get('/usage', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const events = await db
            .select()
            .from(usageEvents)
            .where(eq(usageEvents.workspaceId, workspaceId))
            .orderBy(desc(usageEvents.createdAt))
            .limit(100);
        ok(res, events);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/billing/checkout — create Stripe checkout session (stub)
router.post('/checkout', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        const { tier } = req.body;
        // Stub: return a mock checkout URL
        // When STRIPE_SECRET_KEY is set, replace with real Stripe checkout session.
        const mockCheckoutUrl = `/billing?session=mock_${tier}_${Date.now()}`;
        await writeAudit({ workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip }, { action: 'billing.checkout_initiated', entityType: 'workspace', entityId: workspaceId, newValue: { tier } });
        ok(res, { url: mockCheckoutUrl, tier });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/billing/portal — customer portal link (stub)
router.post('/portal', requireWorkspace, async (_req, res, next) => {
    try {
        const mockPortalUrl = `/billing?portal=true&t=${Date.now()}`;
        ok(res, { url: mockPortalUrl });
    }
    catch (err) {
        next(err);
    }
});
// Plan configuration
const PLAN_CONFIG = [
    {
        tier: 'TRIAL',
        name: 'Free Trial',
        price: 0,
        currency: 'AUD',
        period: 'trial',
        seats: 3,
        checks: 50,
        customers: 25,
        features: ['AML/CTF Program Wizard', 'Customer Onboarding', 'Basic Checks', 'Audit Log'],
    },
    {
        tier: 'STARTER',
        name: 'Starter',
        price: 149,
        currency: 'AUD',
        period: 'month',
        seats: 5,
        checks: 200,
        customers: 100,
        features: ['Everything in Trial', 'SMR Workflow', 'Periodic Reviews', 'Email Notifications', 'Document Export'],
    },
    {
        tier: 'PROFESSIONAL',
        name: 'Professional',
        price: 349,
        currency: 'AUD',
        period: 'month',
        seats: 15,
        checks: 1000,
        customers: 500,
        features: ['Everything in Starter', 'Risk Intelligence Engine', 'Smart Alerts', 'Training Tracker', 'Provider Marketplace', 'Priority Support'],
    },
    {
        tier: 'ENTERPRISE',
        name: 'Enterprise',
        price: 0,
        currency: 'AUD',
        period: 'custom',
        seats: -1,
        checks: -1,
        customers: -1,
        features: ['Everything in Professional', 'Group Workspaces', 'White-label', 'API Gateway', 'Dedicated CSM', 'SLA'],
    },
];
export default router;
//# sourceMappingURL=billing.js.map