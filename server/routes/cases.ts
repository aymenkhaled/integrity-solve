/**
 * server/routes/cases.ts — Case management endpoints.
 *
 * POST   /api/cases                          — create a new case
 * GET    /api/cases                          — list cases for workspace
 * PATCH  /api/cases/:id                      — update case fields
 * GET    /api/cases/:id/summary              — full case summary (all linked modules)
 * POST   /api/cases/:id/link-customer        — link a customer to a case
 * POST   /api/cases/:id/reviewer-decision    — record reviewer decision
 * POST   /api/cases/:id/escalation           — create escalation linked to case
 * POST   /api/cases/:id/generate-evidence-pack — generate evidence pack document
 * GET    /api/cases/:id/pdf                  — download case summary PDF
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import {
  cases, wizardRuns, diditSessions, diditResults, auditLog, caseOutputs,
  customers, escalations, tasks, checkRequests, checkResults, programForms,
} from '../../shared/schema.js';
import { createId } from '@paralleldrive/cuid2';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { NotFoundError, UnauthenticatedError, ForbiddenError } from '../lib/errors.js';
import { writeAudit } from '../lib/audit.js';

export const casesRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateCaseSchema = z.object({
  caseType:          z.enum(['PROGRAM_SETUP', 'TRANSACTION_CDD']),
  title:             z.string().min(2).max(200),
  designatedService: z.string().optional(),
  partyType:         z.enum(['individual', 'company', 'trust', 'beneficial_owner']).optional(),
  customerId:        z.string().optional(),
});

const UpdateCaseSchema = z.object({
  title:             z.string().min(2).max(200).optional(),
  designatedService: z.string().optional(),
  partyType:         z.string().optional(),
  status:            z.string().optional(),
  riskLevel:         z.string().optional(),
  recommendation:    z.string().optional(),
  metadata:          z.record(z.unknown()).optional(),
});

const ReviewerDecisionSchema = z.object({
  decision: z.enum(['approve_proceed', 'request_more_info', 'escalate_officer']),
  notes:    z.string().max(5000).optional(),
  reason:   z.string().min(5),
});

const LinkCustomerSchema = z.object({
  customerId: z.string().min(1),
  reason:     z.string().min(5),
});

const CreateCaseCustomerSchema = z.object({
  customerType: z.enum(['INDIVIDUAL', 'COMPANY', 'TRUST', 'PARTNERSHIP', 'ASSOCIATION', 'GOVERNMENT', 'OTHER']).optional(),
  givenNames:   z.string().min(1).max(200).optional(),
  familyName:   z.string().min(1).max(200).optional(),
  entityName:   z.string().min(1).max(300).optional(),
  email:        z.string().email().optional(),
  country:      z.string().length(2).default('AU'),
  reason:       z.string().min(10),
}).superRefine((data, ctx) => {
  const customerType = data.customerType ?? 'INDIVIDUAL';
  if (customerType === 'INDIVIDUAL' && (!data.givenNames || !data.familyName)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['givenNames'], message: 'Given names and family name are required for an individual customer' });
  }
  if (customerType !== 'INDIVIDUAL' && !data.entityName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['entityName'], message: 'Entity name is required for a non-individual customer' });
  }
});

const CaseEscalationSchema = z.object({
  subject:    z.string().min(5).max(300),
  summary:    z.string().min(20).max(5000),
  grounds:    z.string().min(20).max(5000),
  riskRating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  reason:     z.string().min(10),
});

function requireReviewerRole(req: Request): void {
  const role = req.session?.workspace?.role;
  if (!role || !['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'REVIEWER'].includes(role)) {
    throw new ForbiddenError('Reviewer, Compliance Officer, or Workspace Admin role required');
  }
}

function customerTypeFromCase(partyType?: string | null): typeof customers.$inferInsert['customerType'] {
  if (partyType === 'company') return 'COMPANY';
  if (partyType === 'trust') return 'TRUST';
  return 'INDIVIDUAL';
}

// ─── PDF helpers ─────────────────────────────────────────────────────────────

function escapePdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines: string[]): Buffer {
  const pageSize = 42;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += pageSize) {
    pages.push(lines.slice(i, i + pageSize));
  }
  if (pages.length === 0) pages.push(['Integrity Solve - Case Summary Pack']);

  const fontObj = 3 + pages.length * 2;
  const pageRefs = pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ');
  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    `2 0 obj << /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >> endobj`,
  ];

  pages.forEach((pageLines, i) => {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    const pageText = pageLines
      .map((line, lineIndex) => `BT /F1 10 Tf 50 ${740 - lineIndex * 16} Td (${escapePdf(line)}) Tj ET`)
      .join('\n');

    objects.push(
      `${pageObj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >> endobj`,
      `${contentObj} 0 obj << /Length ${Buffer.byteLength(pageText)} >> stream\n${pageText}\nendstream endobj`,
    );
  });

  objects.push(`${fontObj} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let pdf    = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj + '\n';
  }

  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

// ─── POST /api/cases ──────────────────────────────────────────────────────────

casesRouter.post('/api/cases', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const body = CreateCaseSchema.parse(req.body);

    // If customerId provided, verify it belongs to workspace
    if (body.customerId) {
      const [cust] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.id, body.customerId), eq(customers.workspaceId, workspaceId)))
        .limit(1);
      if (!cust) throw new NotFoundError('Customer');
    }

    const [created] = await db.insert(cases).values({
      id:               createId(),
      workspaceId,
      caseType:         body.caseType,
      title:            body.title,
      status:           'DRAFT',
      designatedService: body.designatedService,
      partyType:        body.partyType,
      riskLevel:        'not_assessed',
      customerId:       body.customerId ?? null,
      createdBy:        userId,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'case.created', entityType: 'case', entityId: created.id, reason: `Case created: ${body.title} (${body.caseType})` },
    );

    res.status(201).json({ ok: true, data: created });
  } catch (err) { next(err); }
});

// ─── GET /api/cases ───────────────────────────────────────────────────────────

casesRouter.get('/api/cases', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const rows = await db
      .select()
      .from(cases)
      .where(eq(cases.workspaceId, workspaceId))
      .orderBy(desc(cases.createdAt));

    res.json({ ok: true, data: rows });
  } catch (err) { next(err); }
});

// ─── PATCH /api/cases/:id ─────────────────────────────────────────────────────

casesRouter.patch('/api/cases/:id', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [existing] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!existing) return void next(new NotFoundError('Case'));

    const body = UpdateCaseSchema.parse(req.body);

    const [updated] = await db.update(cases)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(cases.id, req.params['id'] as string))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'case.updated', entityType: 'case', entityId: existing.id, oldValue: existing, newValue: updated },
    );

    res.json({ ok: true, data: updated });
  } catch (err) { next(err); }
});

// ─── POST /api/cases/:id/link-customer ───────────────────────────────────────

casesRouter.post('/api/cases/:id/link-customer', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    const body = LinkCustomerSchema.parse(req.body);

    const [cust] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.workspaceId, workspaceId)))
      .limit(1);

    if (!cust) throw new NotFoundError('Customer');

    const [updated] = await db.update(cases)
      .set({ customerId: body.customerId, updatedAt: new Date() })
      .where(eq(cases.id, req.params['id'] as string))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'case.customer_linked', entityType: 'case', entityId: caseRow.id, reason: body.reason, newValue: { customerId: body.customerId } },
    );

    res.json({ ok: true, data: updated });
  } catch (err) { next(err); }
});

// ─── POST /api/cases/:id/reviewer-decision ────────────────────────────────────

// POST /api/cases/:id/create-customer-from-case
casesRouter.post('/api/cases/:id/create-customer-from-case', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));
    if (caseRow.customerId) throw new ForbiddenError('This case already has a linked customer');

    const body = CreateCaseCustomerSchema.parse(req.body);
    const customerType = body.customerType ?? customerTypeFromCase(caseRow.partyType);
    const referenceNumber = `CASE-${caseRow.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;

    const [customer] = await db.insert(customers).values({
      id:              createId(),
      workspaceId,
      customerType,
      status:          'PENDING_CDD',
      riskRating:      caseRow.riskLevel === 'high' ? 'HIGH' : 'UNRATED',
      cddLevel:        caseRow.riskLevel === 'high' ? 'EDD' : 'STANDARD',
      referenceNumber,
      givenNames:      customerType === 'INDIVIDUAL' ? body.givenNames : undefined,
      familyName:      customerType === 'INDIVIDUAL' ? body.familyName : undefined,
      entityName:      customerType === 'INDIVIDUAL' ? undefined : body.entityName,
      email:           body.email,
      country:         body.country,
      externalRef:     caseRow.id,
      metadata: {
        source:            'case',
        caseId:            caseRow.id,
        designatedService: caseRow.designatedService,
        partyType:         caseRow.partyType,
      },
      onboardedBy: userId,
    }).returning();

    const [updated] = await db.update(cases)
      .set({ customerId: customer.id, updatedAt: new Date() })
      .where(eq(cases.id, caseRow.id))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      {
        action:     'case.customer_created_and_linked',
        entityType: 'case',
        entityId:   caseRow.id,
        reason:     body.reason,
        newValue:   { customerId: customer.id, referenceNumber },
      },
    );

    res.status(201).json({ ok: true, data: { case: updated, customer } });
  } catch (err) { next(err); }
});

casesRouter.post('/api/cases/:id/reviewer-decision', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());
    requireReviewerRole(req);

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    const body = ReviewerDecisionSchema.parse(req.body);

    let [updated] = await db.update(cases)
      .set({
        reviewerDecision:   body.decision,
        reviewerDecisionBy: userId,
        reviewerDecisionAt: new Date(),
        reviewerNotes:      body.notes ?? null,
        updatedAt:          new Date(),
      })
      .where(eq(cases.id, req.params['id'] as string))
      .returning();

    let createdTask: typeof tasks.$inferSelect | null = null;
    let createdEscalation: typeof escalations.$inferSelect | null = null;

    if (body.decision === 'request_more_info') {
      const [task] = await db.insert(tasks).values({
        id:          createId(),
        workspaceId,
        title:       `More information required: ${caseRow.title}`,
        description: body.notes ?? 'Reviewer requested more information before this case can proceed.',
        status:      'OPEN',
        priority:    caseRow.riskLevel === 'high' ? 'HIGH' : 'MEDIUM',
        createdBy:   userId,
        entityType:  'case',
        entityId:    caseRow.id,
        metadata:    { source: 'reviewer_decision', decision: body.decision },
      }).returning();
      createdTask = task;
    }

    if (body.decision === 'escalate_officer' && !caseRow.escalationId) {
      const [escalation] = await db.insert(escalations).values({
        id:         createId(),
        workspaceId,
        customerId: caseRow.customerId ?? undefined,
        subject:    `Case escalation: ${caseRow.title}`,
        summary:    body.notes ?? `Reviewer escalated case ${caseRow.title} for compliance officer review.`,
        grounds:    `Escalated from case reviewer decision. Service: ${caseRow.designatedService ?? 'not set'}. Risk: ${caseRow.riskLevel ?? 'not assessed'}.`,
        riskRating: caseRow.riskLevel === 'critical' ? 'CRITICAL' : 'HIGH',
        status:     'DRAFT',
        raisedBy:   userId,
      }).returning();
      createdEscalation = escalation;

      [updated] = await db.update(cases)
        .set({ escalationId: escalation.id, updatedAt: new Date() })
        .where(eq(cases.id, caseRow.id))
        .returning();
    }

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      {
        action:     'case.reviewer_decision',
        entityType: 'case',
        entityId:   caseRow.id,
        reason:     body.reason,
        newValue: {
          decision:     body.decision,
          notes:        body.notes,
          taskId:       createdTask?.id ?? null,
          escalationId: createdEscalation?.id ?? caseRow.escalationId ?? null,
        },
      },
    );

    res.json({ ok: true, data: { case: updated, task: createdTask, escalation: createdEscalation } });
  } catch (err) { next(err); }
});

// ─── POST /api/cases/:id/escalation ──────────────────────────────────────────

casesRouter.post('/api/cases/:id/escalation', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const role = req.session!.workspace!.role;
    if (!['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER'].includes(role)) {
      throw new ForbiddenError('Insufficient permissions to create escalations');
    }

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));
    if (caseRow.escalationId) throw new ForbiddenError('An escalation already exists for this case');

    const body = CaseEscalationSchema.parse(req.body);

    const [escalation] = await db.insert(escalations).values({
      id:         createId(),
      workspaceId,
      customerId: caseRow.customerId ?? undefined,
      subject:    body.subject,
      summary:    body.summary,
      grounds:    body.grounds,
      riskRating: body.riskRating as typeof escalations.$inferInsert['riskRating'],
      status:     'DRAFT',
      raisedBy:   userId,
    }).returning();

    const [updated] = await db.update(cases)
      .set({ escalationId: escalation.id, updatedAt: new Date() })
      .where(eq(cases.id, req.params['id'] as string))
      .returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'case.escalation_created', entityType: 'case', entityId: caseRow.id, reason: body.reason, newValue: { escalationId: escalation.id } },
    );

    res.status(201).json({ ok: true, data: { case: updated, escalation } });
  } catch (err) { next(err); }
});

// ─── POST /api/cases/:id/generate-evidence-pack ──────────────────────────────

casesRouter.post('/api/cases/:id/generate-evidence-pack', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    // Gather all case data for the evidence pack
    const wizardRunsRows = await db.select().from(wizardRuns).where(eq(wizardRuns.caseId, caseRow.id));
    const sessionRows    = await db.select().from(diditSessions).where(eq(diditSessions.caseId, caseRow.id));
    const caseTasks      = await db.select().from(tasks).where(and(eq(tasks.entityType, 'case'), eq(tasks.entityId, caseRow.id), eq(tasks.workspaceId, workspaceId)));

    let custRow: typeof customers.$inferSelect | undefined;
    if (caseRow.customerId) {
      const [c] = await db.select().from(customers).where(eq(customers.id, caseRow.customerId)).limit(1);
      custRow = c;
    }

    let programFormRow: typeof programForms.$inferSelect | undefined;
    if (caseRow.programFormId) {
      const [p] = await db.select().from(programForms).where(eq(programForms.id, caseRow.programFormId)).limit(1);
      programFormRow = p;
    }

    let escalationRow: typeof escalations.$inferSelect | undefined;
    if (caseRow.escalationId) {
      const [e] = await db.select().from(escalations).where(eq(escalations.id, caseRow.escalationId)).limit(1);
      escalationRow = e;
    }

    let checkReqs: typeof checkRequests.$inferSelect[] = [];
    const sessionIds = sessionRows.map(s => s.id);
    const sessionCheckIds = sessionRows.map(s => s.checkRequestId).filter(Boolean) as string[];
    if (sessionCheckIds.length > 0) {
      checkReqs = await db.select().from(checkRequests).where(inArray(checkRequests.id, sessionCheckIds));
    }

    let checkRes: typeof checkResults.$inferSelect[] = [];
    if (checkReqs.length > 0) {
      checkRes = await db.select().from(checkResults).where(inArray(checkResults.checkRequestId, checkReqs.map(r => r.id)));
    }

    let diditRes: typeof diditResults.$inferSelect[] = [];
    if (sessionIds.length > 0) {
      diditRes = await db.select().from(diditResults).where(inArray(diditResults.diditSessionId, sessionIds));
    }

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.workspaceId, workspaceId), eq(auditLog.entityId, caseRow.id)))
      .orderBy(desc(auditLog.createdAt));

    const now = new Date().toISOString();

    const packContent = JSON.stringify({
      generatedAt:   now,
      generatedBy:   userId,
      case:          caseRow,
      customer:      custRow ?? null,
      programForm:   programFormRow ?? null,
      escalation:    escalationRow ?? null,
      wizardRuns:    wizardRunsRows,
      diditSessions: sessionRows,
      diditResults:  diditRes,
      checkRequests: checkReqs,
      checkResults:  checkRes,
      tasks:         caseTasks,
      audit:         auditRows,
    }, null, 2);

    // Upsert evidence pack output
    const existingPack = await db
      .select()
      .from(caseOutputs)
      .where(and(eq(caseOutputs.caseId, caseRow.id), eq(caseOutputs.outputType, 'evidence_pack')))
      .limit(1);

    let packOutput: typeof caseOutputs.$inferSelect;
    if (existingPack.length > 0) {
      const [updated] = await db.update(caseOutputs)
        .set({ content: packContent })
        .where(eq(caseOutputs.id, existingPack[0].id))
        .returning();
      packOutput = updated;
    } else {
      const [inserted] = await db.insert(caseOutputs).values({
        id:          createId(),
        workspaceId,
        caseId:      caseRow.id,
        outputType:  'evidence_pack',
        content:     packContent,
      }).returning();
      packOutput = inserted;
    }

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'case.evidence_pack_generated', entityType: 'case', entityId: caseRow.id, reason: 'Evidence pack generated' },
    );

    res.json({ ok: true, data: { outputId: packOutput.id, generatedAt: now, taskCount: caseTasks.length, sessionCount: sessionRows.length, checkCount: checkReqs.length } });
  } catch (err) { next(err); }
});

// ─── GET /api/cases/:id/summary ──────────────────────────────────────────────

casesRouter.get('/api/cases/:id/summary', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    // Wizard runs
    const wizardRunsRows = await db
      .select()
      .from(wizardRuns)
      .where(eq(wizardRuns.caseId, caseRow.id))
      .orderBy(desc(wizardRuns.createdAt));

    // Didit sessions
    const sessionRows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.caseId, caseRow.id))
      .orderBy(desc(diditSessions.createdAt));

    // Didit results for all sessions
    const sessionIds = sessionRows.map(c => c.id);
    let diditResultRows: typeof diditResults.$inferSelect[] = [];
    if (sessionIds.length > 0) {
      diditResultRows = await db
        .select()
        .from(diditResults)
        .where(inArray(diditResults.diditSessionId, sessionIds))
        .orderBy(desc(diditResults.createdAt));
    }

    // Check engine requests (via session bridge)
    const sessionCheckIds = sessionRows.map(s => s.checkRequestId).filter(Boolean) as string[];
    let checkReqs: typeof checkRequests.$inferSelect[] = [];
    let checkRes: typeof checkResults.$inferSelect[] = [];
    if (sessionCheckIds.length > 0) {
      checkReqs = await db.select().from(checkRequests).where(inArray(checkRequests.id, sessionCheckIds));
      if (checkReqs.length > 0) {
        checkRes = await db.select().from(checkResults).where(inArray(checkResults.checkRequestId, checkReqs.map(r => r.id)));
      }
    }

    // Linked customer
    let customer: typeof customers.$inferSelect | null = null;
    if (caseRow.customerId) {
      const [c] = await db.select().from(customers).where(eq(customers.id, caseRow.customerId)).limit(1);
      customer = c ?? null;
    }

    // Linked escalation
    let escalation: typeof escalations.$inferSelect | null = null;
    if (caseRow.escalationId) {
      const [e] = await db.select().from(escalations).where(eq(escalations.id, caseRow.escalationId)).limit(1);
      escalation = e ?? null;
    }

    // Linked program form
    let programForm: typeof programForms.$inferSelect | null = null;
    if (caseRow.programFormId) {
      const [p] = await db.select().from(programForms).where(eq(programForms.id, caseRow.programFormId)).limit(1);
      programForm = p ?? null;
    }

    // Tasks linked to this case
    const caseTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.entityType, 'case'), eq(tasks.entityId, caseRow.id), eq(tasks.workspaceId, workspaceId)))
      .orderBy(desc(tasks.createdAt));

    // Audit trail
    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.workspaceId, workspaceId), eq(auditLog.entityId, caseRow.id)))
      .orderBy(desc(auditLog.createdAt));

    res.json({
      ok: true,
      data: {
        case:          caseRow,
        customer,
        programForm,
        escalation,
        wizardRuns:    wizardRunsRows,
        checks:        sessionRows,
        results:       diditResultRows,
        checkRequests: checkReqs,
        checkResults:  checkRes,
        tasks:         caseTasks,
        audit:         auditRows,
      },
    });
  } catch (err) { next(err); }
});

// ─── GET /api/cases/:id/pdf ───────────────────────────────────────────────────

casesRouter.get('/api/cases/:id/pdf', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params['id'] as string), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    const sessionRows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.caseId, caseRow.id))
      .orderBy(desc(diditSessions.createdAt));

    const sessionIds = sessionRows.map(c => c.id);
    let diditResultRows: typeof diditResults.$inferSelect[] = [];
    if (sessionIds.length > 0) {
      diditResultRows = await db
        .select()
        .from(diditResults)
        .where(inArray(diditResults.diditSessionId, sessionIds))
        .orderBy(desc(diditResults.createdAt));
    }

    const sessionCheckIds = sessionRows.map(s => s.checkRequestId).filter(Boolean) as string[];
    let checkReqs: typeof checkRequests.$inferSelect[] = [];
    let checkRes: typeof checkResults.$inferSelect[] = [];
    if (sessionCheckIds.length > 0) {
      checkReqs = await db.select().from(checkRequests).where(inArray(checkRequests.id, sessionCheckIds));
      if (checkReqs.length > 0) {
        checkRes = await db.select().from(checkResults).where(inArray(checkResults.checkRequestId, checkReqs.map(r => r.id)));
      }
    }

    const caseTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.entityType, 'case'), eq(tasks.entityId, caseRow.id), eq(tasks.workspaceId, workspaceId)));

    let custRow: typeof customers.$inferSelect | undefined;
    if (caseRow.customerId) {
      const [c] = await db.select().from(customers).where(eq(customers.id, caseRow.customerId)).limit(1);
      custRow = c;
    }

    let programFormRow: typeof programForms.$inferSelect | undefined;
    if (caseRow.programFormId) {
      const [p] = await db.select().from(programForms).where(eq(programForms.id, caseRow.programFormId)).limit(1);
      programFormRow = p;
    }

    let escalationRow: typeof escalations.$inferSelect | undefined;
    if (caseRow.escalationId) {
      const [e] = await db.select().from(escalations).where(eq(escalations.id, caseRow.escalationId)).limit(1);
      escalationRow = e;
    }

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.workspaceId, workspaceId), eq(auditLog.entityId, caseRow.id)))
      .orderBy(desc(auditLog.createdAt))
      .limit(15);

    const now = new Date().toISOString().slice(0, 10);

    const lines = [
      'Integrity Solve - Case Summary Pack',
      `Generated: ${now}`,
      '',
      `Case:               ${caseRow.title}`,
      `Type:               ${caseRow.caseType}`,
      `Status:             ${caseRow.status}`,
      `Risk level:         ${caseRow.riskLevel ?? 'not assessed'}`,
      `Designated service: ${caseRow.designatedService ?? 'not set'}`,
      `Party type:         ${caseRow.partyType ?? 'not set'}`,
      `Recommendation:     ${caseRow.recommendation ?? 'pending wizard completion'}`,
      `Reviewer decision:  ${caseRow.reviewerDecision ?? 'pending'}`,
      `Reviewer notes:     ${caseRow.reviewerNotes ?? 'none'}`,
      '',
      '-- Linked Customer --',
      ...(custRow
        ? [
            `  Name: ${custRow.givenNames ?? custRow.entityName ?? 'unknown'} ${custRow.familyName ?? ''}`.trim(),
            `  Ref:  ${custRow.referenceNumber}`,
            `  Risk: ${custRow.riskRating}`,
          ]
        : ['  No customer linked']),
      '',
      '-- Linked AML Program --',
      ...(programFormRow
        ? [
            `  Title: ${programFormRow.title}`,
            `  Status: ${programFormRow.status}`,
            `  Current step: ${programFormRow.currentStep}`,
          ]
        : ['  No program form linked']),
      '',
      '-- Escalation --',
      ...(escalationRow
        ? [
            `  Subject: ${escalationRow.subject}`,
            `  Status: ${escalationRow.status}`,
            `  Risk: ${escalationRow.riskRating}`,
          ]
        : ['  No escalation linked']),
      '',
      '-- Tasks --',
      ...(caseTasks.length
        ? caseTasks.map(t => `  [${t.status}] ${t.title} (${t.priority})`)
        : ['  No tasks']),
      '',
      '-- Verification Checks --',
      ...(sessionRows.length
        ? sessionRows.map(c => `  ${c.capability.padEnd(16)} status=${c.status}  session=${c.providerRequestId ?? 'pending'}`)
        : ['  No checks initiated yet']),
      '',
      '-- Didit Results --',
      ...(diditResultRows.length
        ? diditResultRows.map(r => `  ${r.status.padEnd(16)} decision=${r.decision}  ${r.summary ?? ''}`)
        : ['  No results yet']),
      '',
      '-- Check Requests / Results --',
      ...(checkReqs.length
        ? checkReqs.map(r => {
            const linked = checkRes.filter(result => result.checkRequestId === r.id);
            const outcomes = linked.length ? linked.map(result => result.outcome).join(', ') : 'pending';
            return `  ${r.provider} ${r.checkType} status=${r.status} outcome=${outcomes}`;
          })
        : ['  No check engine rows yet']),
      '',
      '-- Audit Timeline --',
      ...(auditRows.length
        ? auditRows.map(a => `  ${String(a.createdAt).slice(0, 19)}  ${a.action}  ${a.reason ?? ''}`)
        : ['  No audit events yet']),
    ];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseRow.id.slice(0, 8)}.pdf"`);
    res.send(buildPdf(lines));
  } catch (err) { next(err); }
});
