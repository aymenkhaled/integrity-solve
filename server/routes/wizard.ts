/**
 * server/routes/wizard.ts — Milestone 1 wizard-run endpoints.
 *
 * POST  /api/wizard/start       — start a wizard run for a case
 * PATCH /api/wizard/:id/step    — save a wizard step + get route result
 * GET   /api/wizard/:id         — get full wizard run state
 * GET   /api/wizard/case/:caseId — get all wizard runs for a case
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { eq, and, desc } from 'drizzle-orm';
import { cases, wizardRuns, wizardSteps, auditLog } from '../../shared/schema.js';
import { createId } from '@paralleldrive/cuid2';
import {
  routeProgramWizard,
  routeTransactionWizard,
} from '../services/workflowRouter.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { requireWorkspace } from '../lib/auth-session.js';

export const wizardRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const StartWizardSchema = z.object({
  caseId:     z.string().min(1),
  wizardType: z.enum(['PROGRAM_SETUP', 'TRANSACTION_CDD']),
});

const SaveStepSchema = z.object({
  stepKey:  z.string().min(1),
  answers:  z.record(z.unknown()),
  complete: z.boolean().default(false),
});

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/wizard/start
wizardRouter.post('/api/wizard/start', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const body = StartWizardSchema.parse(req.body);

    // Verify case belongs to this workspace
    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, body.caseId), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void res.status(404).json({ error: 'Case not found' });

    const [run] = await db.insert(wizardRuns).values({
      id:          createId(),
      workspaceId,
      caseId:      body.caseId,
      wizardType:  body.wizardType,
      status:      'IN_PROGRESS',
      currentStep: 'start',
      answers:     {},
      routeResult: {},
      createdBy:   userId,
    }).returning();

    // Update case status to IN_PROGRESS
    await db.update(cases)
      .set({ status: 'IN_PROGRESS', updatedAt: new Date() })
      .where(eq(cases.id, body.caseId));

    await db.insert(auditLog).values({
      id:          createId(),
      workspaceId,
      actorUserId: userId,
      entityType:  'wizard_run',
      entityId:    run.id,
      action:      'wizard_started',
      reason:      `${body.wizardType} wizard started for case ${body.caseId}`,
      newValue:    run,
      requestId:   req.requestId,
      ipAddress:   req.ip,
    });

    res.status(201).json({ ok: true, data: run });
  } catch (err) { next(err); }
});

// PATCH /api/wizard/:id/step
wizardRouter.patch('/api/wizard/:id/step', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const [run] = await db
      .select()
      .from(wizardRuns)
      .where(and(eq(wizardRuns.id, req.params.id), eq(wizardRuns.workspaceId, workspaceId)));

    if (!run) return void res.status(404).json({ error: 'Wizard run not found' });

    const body = SaveStepSchema.parse(req.body);

    // Merge answers
    const existingAnswers = (run.answers as Record<string, unknown>) ?? {};
    const mergedAnswers   = { ...existingAnswers, [body.stepKey]: body.answers };
    const flatAnswers     = Object.assign({}, ...Object.values(mergedAnswers).filter(Boolean));

    // Compute route result
    const routeResult = run.wizardType === 'PROGRAM_SETUP'
      ? routeProgramWizard(flatAnswers as Parameters<typeof routeProgramWizard>[0])
      : routeTransactionWizard(flatAnswers as Parameters<typeof routeTransactionWizard>[0]);

    // Upsert wizard step
    const existingSteps = await db
      .select()
      .from(wizardSteps)
      .where(and(eq(wizardSteps.wizardRunId, run.id), eq(wizardSteps.stepKey, body.stepKey)));

    if (existingSteps.length > 0) {
      await db.update(wizardSteps)
        .set({ answers: body.answers, status: 'COMPLETED', updatedAt: new Date() })
        .where(and(eq(wizardSteps.wizardRunId, run.id), eq(wizardSteps.stepKey, body.stepKey)));
    } else {
      await db.insert(wizardSteps).values({
        id:          createId(),
        wizardRunId: run.id,
        stepKey:     body.stepKey,
        status:      'COMPLETED',
        answers:     body.answers,
      });
    }

    // Update wizard run
    const updateData: Partial<typeof wizardRuns.$inferInsert> = {
      answers:     mergedAnswers,
      routeResult: routeResult as unknown as Record<string, unknown>,
      currentStep: body.stepKey,
      updatedAt:   new Date(),
    };

    if (body.complete) {
      updateData.status      = 'COMPLETED';
      updateData.completedAt = new Date();
    }

    const [updated] = await db.update(wizardRuns)
      .set(updateData)
      .where(eq(wizardRuns.id, run.id))
      .returning();

    // If completing a transaction wizard, update case risk level
    if (body.complete && run.wizardType === 'TRANSACTION_CDD') {
      const txResult = routeResult as ReturnType<typeof routeTransactionWizard>;
      await db.update(cases)
        .set({
          riskLevel:      txResult.riskLevel,
          recommendation: txResult.approvalPath,
          status:         'COMPLETED',
          updatedAt:      new Date(),
        })
        .where(eq(cases.id, run.caseId));
    }

    if (body.complete && run.wizardType === 'PROGRAM_SETUP') {
      await db.update(cases)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(cases.id, run.caseId));
    }

    await db.insert(auditLog).values({
      id:          createId(),
      workspaceId,
      actorUserId: userId,
      entityType:  'wizard_run',
      entityId:    run.id,
      action:      body.complete ? 'wizard_completed' : 'wizard_step_saved',
      reason:      `Wizard step "${body.stepKey}" saved${body.complete ? ' — wizard completed' : ''}`,
      newValue:    { stepKey: body.stepKey, routeResult },
      requestId:   req.requestId,
      ipAddress:   req.ip,
    });

    res.json({ ok: true, data: { run: updated, routeResult } });
  } catch (err) { next(err); }
});

// GET /api/wizard/:id
wizardRouter.get('/api/wizard/:id', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const [run] = await db
      .select()
      .from(wizardRuns)
      .where(and(eq(wizardRuns.id, req.params.id), eq(wizardRuns.workspaceId, workspaceId)));

    if (!run) return void res.status(404).json({ error: 'Wizard run not found' });

    const steps = await db
      .select()
      .from(wizardSteps)
      .where(eq(wizardSteps.wizardRunId, run.id))
      .orderBy(wizardSteps.createdAt);

    res.json({ ok: true, data: { run, steps } });
  } catch (err) { next(err); }
});

// GET /api/wizard/case/:caseId
wizardRouter.get('/api/wizard/case/:caseId', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    // Verify case belongs to workspace
    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params.caseId), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void res.status(404).json({ error: 'Case not found' });

    const runs = await db
      .select()
      .from(wizardRuns)
      .where(eq(wizardRuns.caseId, req.params.caseId))
      .orderBy(desc(wizardRuns.createdAt));

    res.json({ ok: true, data: runs });
  } catch (err) { next(err); }
});
