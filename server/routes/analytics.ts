/**
 * server/routes/analytics.ts — D6+D7+D9: SMR Analytics + Training Analytics + Dashboard endpoint.
 */
import { Router } from 'express';
import { db } from '../db.js';
import {
  escalations, smrDrafts, trainingRecords, periodicReviews, tasks,
  programForms, customers, smartAlerts, auditLog,
} from '../../shared/schema.js';
import { eq, sql, and, gte, desc, count, avg, lt } from 'drizzle-orm';
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

// ─── GET /api/analytics/dashboard ────────────────────────────────────────────
// Aggregates 7 Compliance Health dimensions into a single response.
// Dimensions: program completeness, CDD rate, SMR filed, training pass rate,
//             overdue reviews, open critical alerts, audit trail density.

router.get('/dashboard', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. Program Completeness ──────────────────────────────────────────────
    const [{ totalPrograms }] = await db
      .select({ totalPrograms: count() })
      .from(programForms)
      .where(eq(programForms.workspaceId, workspaceId));

    const [{ completePrograms }] = await db
      .select({ completePrograms: count() })
      .from(programForms)
      .where(and(eq(programForms.workspaceId, workspaceId), eq(programForms.status, 'COMPLETE')));

    const [latestProgram] = await db
      .select({ currentStep: programForms.currentStep, status: programForms.status })
      .from(programForms)
      .where(eq(programForms.workspaceId, workspaceId))
      .orderBy(desc(programForms.createdAt))
      .limit(1);

    let programScore = 0;
    if (Number(completePrograms) > 0) {
      programScore = 100;
    } else if (latestProgram && latestProgram.currentStep > 0) {
      programScore = Math.min(10 + Math.round((latestProgram.currentStep / 12) * 80), 90);
    } else if (Number(totalPrograms) > 0) {
      programScore = 10;
    }

    // ── 2. CDD Rate ──────────────────────────────────────────────────────────
    const [{ totalCustomers }] = await db
      .select({ totalCustomers: count() })
      .from(customers)
      .where(
        and(
          eq(customers.workspaceId, workspaceId),
          sql`${customers.status} != 'DRAFT'`,
        ),
      );

    const [{ activeCustomers }] = await db
      .select({ activeCustomers: count() })
      .from(customers)
      .where(and(eq(customers.workspaceId, workspaceId), eq(customers.status, 'ACTIVE')));

    const [{ totalAllCustomers }] = await db
      .select({ totalAllCustomers: count() })
      .from(customers)
      .where(eq(customers.workspaceId, workspaceId));

    const cddRate = Number(totalCustomers) > 0
      ? Math.round((Number(activeCustomers) / Number(totalCustomers)) * 100)
      : 100;
    const cddScore = cddRate;

    // ── 3. SMR Filed Rate ────────────────────────────────────────────────────
    const [{ totalSmr }] = await db
      .select({ totalSmr: count() })
      .from(smrDrafts)
      .where(eq(smrDrafts.workspaceId, workspaceId));

    const [{ submittedSmr }] = await db
      .select({ submittedSmr: count() })
      .from(smrDrafts)
      .where(and(eq(smrDrafts.workspaceId, workspaceId), eq(smrDrafts.status, 'SUBMITTED')));

    const [{ pendingSmr }] = await db
      .select({ pendingSmr: count() })
      .from(smrDrafts)
      .where(
        and(
          eq(smrDrafts.workspaceId, workspaceId),
          sql`${smrDrafts.status} IN ('DRAFT', 'PENDING_APPROVAL')`,
        ),
      );

    const smrRate = Number(totalSmr) > 0
      ? Math.round((Number(submittedSmr) / Number(totalSmr)) * 100)
      : 100;
    const smrScore = Math.max(0, smrRate - Number(pendingSmr) * 10);

    // ── 4. Training Pass Rate ────────────────────────────────────────────────
    const [{ totalTraining }] = await db
      .select({ totalTraining: count() })
      .from(trainingRecords)
      .where(eq(trainingRecords.workspaceId, workspaceId));

    const [{ completedTraining }] = await db
      .select({ completedTraining: count() })
      .from(trainingRecords)
      .where(and(eq(trainingRecords.workspaceId, workspaceId), eq(trainingRecords.status, 'COMPLETED')));

    const [{ expiredTraining }] = await db
      .select({ expiredTraining: count() })
      .from(trainingRecords)
      .where(and(eq(trainingRecords.workspaceId, workspaceId), eq(trainingRecords.status, 'EXPIRED')));

    const [{ avgTrainingScore }] = await db
      .select({ avgTrainingScore: avg(trainingRecords.score) })
      .from(trainingRecords)
      .where(
        and(
          eq(trainingRecords.workspaceId, workspaceId),
          sql`${trainingRecords.score} IS NOT NULL`,
        ),
      );

    const trainingRate = Number(totalTraining) > 0
      ? Math.round((Number(completedTraining) / Number(totalTraining)) * 100)
      : 100;
    const expiredPenalty = Math.min(Number(expiredTraining) * 10, 30);
    const trainingScore = Math.max(0, trainingRate - expiredPenalty);

    // ── 5. Overdue Reviews ───────────────────────────────────────────────────
    const [{ overdueReviews }] = await db
      .select({ overdueReviews: count() })
      .from(periodicReviews)
      .where(
        and(
          eq(periodicReviews.workspaceId, workspaceId),
          eq(periodicReviews.status, 'SCHEDULED'),
          lt(periodicReviews.dueAt, now),
        ),
      );

    const [{ totalReviews }] = await db
      .select({ totalReviews: count() })
      .from(periodicReviews)
      .where(eq(periodicReviews.workspaceId, workspaceId));

    const overdueCount = Number(overdueReviews);
    const reviewScore = Math.max(0, 100 - overdueCount * 15);

    // ── 6. Open Critical / High Alerts ──────────────────────────────────────
    const [{ openCritical }] = await db
      .select({ openCritical: count() })
      .from(smartAlerts)
      .where(
        and(
          eq(smartAlerts.workspaceId, workspaceId),
          eq(smartAlerts.status, 'OPEN'),
          sql`${smartAlerts.severity} IN ('CRITICAL', 'HIGH')`,
        ),
      );

    const [{ openAlerts }] = await db
      .select({ openAlerts: count() })
      .from(smartAlerts)
      .where(and(eq(smartAlerts.workspaceId, workspaceId), eq(smartAlerts.status, 'OPEN')));

    const criticalCount = Number(openCritical);
    const alertScore = Math.max(0, 100 - criticalCount * 20 - Math.max(0, Number(openAlerts) - criticalCount) * 5);

    // ── 7. Audit Trail Density ───────────────────────────────────────────────
    const [{ auditCount }] = await db
      .select({ auditCount: count() })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.workspaceId, workspaceId),
          gte(auditLog.createdAt, thirtyDaysAgo),
        ),
      );

    const customerCount = Math.max(1, Number(totalAllCustomers));
    const density = Number(auditCount) / customerCount;
    const auditScore = Math.min(100, Math.round(density * 10));

    // ── Overall Score ────────────────────────────────────────────────────────
    const overall = Math.round(
      (programScore + cddScore + smrScore + trainingScore + reviewScore + alertScore + auditScore) / 7,
    );

    const getStatus = (s: number) =>
      s >= 80 ? 'excellent' : s >= 60 ? 'good' : s >= 40 ? 'needs_attention' : 'critical';

    return ok(res, {
      overall,
      overallStatus: getStatus(overall),
      dimensions: {
        programCompleteness: {
          score:    programScore,
          status:   getStatus(programScore),
          detail: {
            totalPrograms:    Number(totalPrograms),
            completePrograms: Number(completePrograms),
            currentStep:      latestProgram?.currentStep ?? 0,
          },
        },
        cddRate: {
          score:    cddScore,
          status:   getStatus(cddScore),
          detail: {
            total:         Number(totalCustomers),
            active:        Number(activeCustomers),
            rate:          cddRate,
          },
        },
        smrFiled: {
          score:    smrScore,
          status:   getStatus(smrScore),
          detail: {
            total:     Number(totalSmr),
            submitted: Number(submittedSmr),
            pending:   Number(pendingSmr),
            rate:      smrRate,
          },
        },
        trainingPassRate: {
          score:    trainingScore,
          status:   getStatus(trainingScore),
          detail: {
            total:         Number(totalTraining),
            completed:     Number(completedTraining),
            expired:       Number(expiredTraining),
            rate:          trainingRate,
            avgScore:      avgTrainingScore ? Math.round(Number(avgTrainingScore)) : null,
          },
        },
        overdueReviews: {
          score:    reviewScore,
          status:   getStatus(reviewScore),
          detail: {
            overdue: overdueCount,
            total:   Number(totalReviews),
          },
        },
        openCriticalAlerts: {
          score:    alertScore,
          status:   getStatus(alertScore),
          detail: {
            critical: criticalCount,
            open:     Number(openAlerts),
          },
        },
        auditTrailDensity: {
          score:    auditScore,
          status:   getStatus(auditScore),
          detail: {
            entriesLast30Days: Number(auditCount),
            customers:         customerCount,
            density:           Math.round(density * 10) / 10,
          },
        },
      },
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
