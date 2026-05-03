/**
 * server/routes/analytics.ts — D6+D7: SMR Analytics + Training Analytics endpoint.
 */
import { Router } from 'express';
import { db } from '../db.js';
import {
  escalations, smrDrafts, trainingRecords, periodicReviews, tasks,
} from '../../shared/schema.js';
import { eq, sql, and, gte, desc, count, avg } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId } from '../lib/workspace-guard.js';

const router = Router();

// ─── GET /api/analytics/smr ───────────────────────────────────────────────────

router.get('/smr', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    // Escalation status breakdown
    const byStatus = await db
      .select({ status: escalations.status, count: count() })
      .from(escalations)
      .where(eq(escalations.workspaceId, workspaceId))
      .groupBy(escalations.status);

    // Escalation risk rating breakdown
    const byRisk = await db
      .select({ riskRating: escalations.riskRating, count: count() })
      .from(escalations)
      .where(eq(escalations.workspaceId, workspaceId))
      .groupBy(escalations.riskRating);

    // SMR draft status breakdown
    const smrByStatus = await db
      .select({ status: smrDrafts.status, count: count() })
      .from(smrDrafts)
      .where(eq(smrDrafts.workspaceId, workspaceId))
      .groupBy(smrDrafts.status);

    // Total counts
    const [{ totalEscalations }] = await db
      .select({ totalEscalations: count() })
      .from(escalations)
      .where(eq(escalations.workspaceId, workspaceId));

    const [{ totalSmr }] = await db
      .select({ totalSmr: count() })
      .from(smrDrafts)
      .where(eq(smrDrafts.workspaceId, workspaceId));

    const [{ submittedSmr }] = await db
      .select({ submittedSmr: count() })
      .from(smrDrafts)
      .where(
        and(
          eq(smrDrafts.workspaceId, workspaceId),
          sql`${smrDrafts.status} = 'SUBMITTED'`,
        ),
      );

    // Recent escalations (last 5)
    const recentEscalations = await db
      .select({
        id:         escalations.id,
        subject:    escalations.subject,
        status:     escalations.status,
        riskRating: escalations.riskRating,
        createdAt:  escalations.createdAt,
      })
      .from(escalations)
      .where(eq(escalations.workspaceId, workspaceId))
      .orderBy(desc(escalations.createdAt))
      .limit(6);

    // Monthly escalation trend (last 6 months)
    const since6m = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const monthlyTrend = await db
      .select({
        month: sql<string>`TO_CHAR(${escalations.createdAt}, 'Mon YYYY')`,
        count: count(),
      })
      .from(escalations)
      .where(
        and(
          eq(escalations.workspaceId, workspaceId),
          gte(escalations.createdAt, since6m),
        ),
      )
      .groupBy(sql`TO_CHAR(${escalations.createdAt}, 'Mon YYYY'), DATE_TRUNC('month', ${escalations.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${escalations.createdAt})`);

    return ok(res, {
      totals: {
        escalations:  Number(totalEscalations),
        smrDrafts:    Number(totalSmr),
        smrSubmitted: Number(submittedSmr),
        submissionRate: Number(totalSmr) > 0
          ? Math.round((Number(submittedSmr) / Number(totalSmr)) * 100)
          : 0,
      },
      byStatus:         byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byRisk:           byRisk.map((r) => ({ riskRating: r.riskRating, count: Number(r.count) })),
      smrByStatus:      smrByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      recentEscalations,
      monthlyTrend:     monthlyTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/training ─────────────────────────────────────────────

router.get('/training', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    // Overall completion breakdown
    const byStatus = await db
      .select({ status: trainingRecords.status, count: count() })
      .from(trainingRecords)
      .where(eq(trainingRecords.workspaceId, workspaceId))
      .groupBy(trainingRecords.status);

    // By module
    const byModule = await db
      .select({
        moduleName: trainingRecords.moduleName,
        count:      count(),
        avgScore:   avg(trainingRecords.score),
      })
      .from(trainingRecords)
      .where(eq(trainingRecords.workspaceId, workspaceId))
      .groupBy(trainingRecords.moduleName)
      .orderBy(desc(count()))
      .limit(8);

    // Totals
    const [{ total }] = await db
      .select({ total: count() })
      .from(trainingRecords)
      .where(eq(trainingRecords.workspaceId, workspaceId));

    const [{ completed }] = await db
      .select({ completed: count() })
      .from(trainingRecords)
      .where(
        and(
          eq(trainingRecords.workspaceId, workspaceId),
          eq(trainingRecords.status, 'COMPLETED'),
        ),
      );

    const [{ passed }] = await db
      .select({ passed: count() })
      .from(trainingRecords)
      .where(
        and(
          eq(trainingRecords.workspaceId, workspaceId),
          eq(trainingRecords.status, 'FAILED'),
        ),
      );

    // Avg score overall
    const [{ overallAvg }] = await db
      .select({ overallAvg: avg(trainingRecords.score) })
      .from(trainingRecords)
      .where(
        and(
          eq(trainingRecords.workspaceId, workspaceId),
          sql`${trainingRecords.score} IS NOT NULL`,
        ),
      );

    // Expiring soon (within 30 days)
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [{ expiringSoon }] = await db
      .select({ expiringSoon: count() })
      .from(trainingRecords)
      .where(
        and(
          eq(trainingRecords.workspaceId, workspaceId),
          sql`${trainingRecords.expiresAt} IS NOT NULL`,
          sql`${trainingRecords.expiresAt} <= ${soon.toISOString()}`,
          sql`${trainingRecords.expiresAt} > NOW()`,
        ),
      );

    return ok(res, {
      totals: {
        total:        Number(total),
        completed:    Number(completed),
        passed:       Number(passed),
        expiringSoon: Number(expiringSoon),
        completionRate: Number(total) > 0
          ? Math.round(((Number(completed) + Number(passed)) / Number(total)) * 100)
          : 0,
        avgScore: overallAvg ? Math.round(Number(overallAvg)) : null,
      },
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      byModule: byModule.map((r) => ({
        moduleName: r.moduleName,
        count:      Number(r.count),
        avgScore:   r.avgScore ? Math.round(Number(r.avgScore)) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/analytics/reviews ──────────────────────────────────────────────

router.get('/reviews', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const byStatus = await db
      .select({ status: periodicReviews.status, count: count() })
      .from(periodicReviews)
      .where(eq(periodicReviews.workspaceId, workspaceId))
      .groupBy(periodicReviews.status);

    const [{ total }] = await db
      .select({ total: count() })
      .from(periodicReviews)
      .where(eq(periodicReviews.workspaceId, workspaceId));

    const overdue = await db
      .select({ count: count() })
      .from(periodicReviews)
      .where(
        and(
          eq(periodicReviews.workspaceId, workspaceId),
          sql`${periodicReviews.status} = 'SCHEDULED'`,
          sql`${periodicReviews.dueAt} < NOW()`,
        ),
      );

    const tasksByStatus = await db
      .select({ status: tasks.status, count: count() })
      .from(tasks)
      .where(eq(tasks.workspaceId, workspaceId))
      .groupBy(tasks.status);

    return ok(res, {
      reviews: {
        total:   Number(total),
        overdue: Number(overdue[0]?.count ?? 0),
        byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      },
      tasks: {
        byStatus: tasksByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
