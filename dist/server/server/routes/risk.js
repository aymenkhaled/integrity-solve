/**
 * server/routes/risk.ts — D1: Risk Intelligence Engine analytics endpoints.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { customers, escalations, smartAlerts, checkResults } from '../../shared/schema.js';
import { eq, sql, and, gte, desc, count } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId } from '../lib/workspace-guard.js';
const router = Router();
// ─── GET /api/risk/analytics ──────────────────────────────────────────────────
router.get('/analytics', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        // Risk distribution by rating
        const riskDistribution = await db
            .select({ rating: customers.riskRating, count: count() })
            .from(customers)
            .where(eq(customers.workspaceId, workspaceId))
            .groupBy(customers.riskRating);
        // Customer status breakdown
        const statusBreakdown = await db
            .select({ status: customers.status, count: count() })
            .from(customers)
            .where(eq(customers.workspaceId, workspaceId))
            .groupBy(customers.status);
        // Customer type breakdown
        const typeBreakdown = await db
            .select({ type: customers.customerType, count: count() })
            .from(customers)
            .where(eq(customers.workspaceId, workspaceId))
            .groupBy(customers.customerType);
        // Total customers
        const [{ total }] = await db
            .select({ total: count() })
            .from(customers)
            .where(eq(customers.workspaceId, workspaceId));
        // High risk customers (last 5 updated)
        const highRiskCustomers = await db
            .select({
            id: customers.id,
            entityName: customers.entityName,
            familyName: customers.familyName,
            givenNames: customers.givenNames,
            riskRating: customers.riskRating,
            status: customers.status,
            customerType: customers.customerType,
            updatedAt: customers.updatedAt,
        })
            .from(customers)
            .where(and(eq(customers.workspaceId, workspaceId), sql `${customers.riskRating} IN ('HIGH','CRITICAL')`))
            .orderBy(desc(customers.updatedAt))
            .limit(8);
        // Open escalations count
        const [{ openEscalations }] = await db
            .select({ openEscalations: count() })
            .from(escalations)
            .where(and(eq(escalations.workspaceId, workspaceId), sql `${escalations.status} NOT IN ('CLOSED_NO_ACTION','CLOSED_FALSE_POSITIVE','SMR_SUBMITTED')`));
        // Open smartAlerts breakdown by severity
        const alertsBySeverity = await db
            .select({ severity: smartAlerts.severity, count: count() })
            .from(smartAlerts)
            .where(and(eq(smartAlerts.workspaceId, workspaceId), sql `${smartAlerts.status} = 'OPEN'`))
            .groupBy(smartAlerts.severity);
        // Alerts by type
        const alertsByType = await db
            .select({ alertType: smartAlerts.alertType, count: count() })
            .from(smartAlerts)
            .where(eq(smartAlerts.workspaceId, workspaceId))
            .groupBy(smartAlerts.alertType)
            .orderBy(desc(count()))
            .limit(6);
        // Check results pass/fail ratio (last 90 days)
        const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const checkPassFail = await db
            .select({ result: checkResults.outcome, count: count() })
            .from(checkResults)
            .where(and(eq(checkResults.workspaceId, workspaceId), gte(checkResults.createdAt, since90)))
            .groupBy(checkResults.outcome);
        // Recent risk upgrades (customers whose riskRating changed to HIGH/CRITICAL in last 30 days)
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentHighRisk = await db
            .select({ count: count() })
            .from(customers)
            .where(and(eq(customers.workspaceId, workspaceId), sql `${customers.riskRating} IN ('HIGH','CRITICAL')`, gte(customers.updatedAt, since30)));
        const riskScore = computeRiskScore({
            total: Number(total),
            riskDistribution,
            openEscalations: Number(openEscalations),
            alertsBySeverity,
        });
        return ok(res, {
            summary: {
                total: Number(total),
                openEscalations: Number(openEscalations),
                riskScore,
                recentHighRisk: Number(recentHighRisk[0]?.count ?? 0),
            },
            riskDistribution: riskDistribution.map((r) => ({ rating: r.rating, count: Number(r.count) })),
            statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: Number(s.count) })),
            typeBreakdown: typeBreakdown.map((t) => ({ type: t.type, count: Number(t.count) })),
            highRiskCustomers,
            alertsBySeverity: alertsBySeverity.map((a) => ({ severity: a.severity, count: Number(a.count) })),
            alertsByType: alertsByType.map((a) => ({ alertType: a.alertType, count: Number(a.count) })),
            checkPassFail: checkPassFail.map((c) => ({ result: c.result ?? c.result, count: Number(c.count) })),
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── GET /api/risk/signals ─────────────────────────────────────────────────────
router.get('/signals', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        // Recent open smartAlerts as risk signals (most severe first)
        const signals = await db
            .select({
            id: smartAlerts.id,
            alertType: smartAlerts.alertType,
            severity: smartAlerts.severity,
            title: smartAlerts.title,
            description: smartAlerts.description,
            status: smartAlerts.status,
            createdAt: smartAlerts.createdAt,
            customerId: smartAlerts.customerId,
        })
            .from(smartAlerts)
            .where(and(eq(smartAlerts.workspaceId, workspaceId), sql `${smartAlerts.status} = 'OPEN'`))
            .orderBy(sql `CASE ${smartAlerts.severity}
              WHEN 'CRITICAL' THEN 1
              WHEN 'HIGH'     THEN 2
              WHEN 'WARNING'  THEN 3
              WHEN 'INFO'     THEN 4
              ELSE 5
            END`, desc(smartAlerts.createdAt))
            .limit(20);
        return ok(res, { signals });
    }
    catch (err) {
        next(err);
    }
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
function computeRiskScore(data) {
    const { total, riskDistribution, openEscalations, alertsBySeverity } = data;
    if (total === 0)
        return 0;
    const getCount = (arr, key) => {
        const found = arr.find((r) => r.rating === key || r.severity === key);
        return found ? Number(found.count) : 0;
    };
    const critical = getCount(riskDistribution, 'CRITICAL');
    const high = getCount(riskDistribution, 'HIGH');
    const medium = getCount(riskDistribution, 'MEDIUM');
    const critAlerts = getCount(alertsBySeverity, 'CRITICAL');
    const highAlerts = getCount(alertsBySeverity, 'HIGH');
    // Weighted score 0–100
    const baseScore = ((critical * 10 + high * 5 + medium * 2) / (total * 10)) * 60 +
        Math.min(openEscalations * 5, 20) +
        Math.min((critAlerts * 4 + highAlerts * 2), 20);
    return Math.min(Math.round(baseScore), 100);
}
export default router;
//# sourceMappingURL=risk.js.map