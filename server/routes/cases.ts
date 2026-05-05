/**
 * server/routes/cases.ts — Milestone 1 case management endpoints.
 *
 * POST   /api/cases              — create a new case
 * GET    /api/cases              — list cases for workspace
 * GET    /api/cases/:id/summary  — full case summary (checks, results, audit)
 * GET    /api/cases/:id/pdf      — download case summary PDF (no external lib)
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { cases, wizardRuns, diditSessions, diditResults, auditLog, caseOutputs } from '../../shared/schema.js';
import { createId } from '@paralleldrive/cuid2';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { NotFoundError, UnauthenticatedError } from '../lib/errors.js';

export const casesRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateCaseSchema = z.object({
  caseType:          z.enum(['PROGRAM_SETUP', 'TRANSACTION_CDD']),
  title:             z.string().min(2).max(200),
  designatedService: z.string().optional(),
  partyType:         z.enum(['individual', 'company', 'trust', 'beneficial_owner']).optional(),
});

function escapePdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines: string[]): Buffer {
  const pageLines = lines.slice(0, 42);
  const pageText  = pageLines
    .map((line, i) => `BT /F1 10 Tf 50 ${740 - i * 16} Td (${escapePdf(line)}) Tj ET`)
    .join('\n');

  const objects: string[] = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj`,
    `4 0 obj << /Length ${Buffer.byteLength(pageText)} >> stream\n${pageText}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

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

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/cases
casesRouter.post('/api/cases', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const body = CreateCaseSchema.parse(req.body);

    const [created] = await db.insert(cases).values({
      id:               createId(),
      workspaceId,
      caseType:         body.caseType,
      title:            body.title,
      status:           'DRAFT',
      designatedService: body.designatedService,
      partyType:        body.partyType,
      riskLevel:        'not_assessed',
      createdBy:        userId,
    }).returning();

    await db.insert(auditLog).values({
      id:          createId(),
      workspaceId,
      actorUserId: userId,
      entityType:  'case',
      entityId:    created.id,
      action:      'case_created',
      reason:      `Case created: ${body.title} (${body.caseType})`,
      newValue:    created,
      requestId:   req.requestId,
      ipAddress:   req.ip,
    });

    res.status(201).json({ ok: true, data: created });
  } catch (err) { next(err); }
});

// GET /api/cases
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

// GET /api/cases/:id/summary
casesRouter.get('/api/cases/:id/summary', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params.id), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    const wizardRunsRows = await db
      .select()
      .from(wizardRuns)
      .where(eq(wizardRuns.caseId, caseRow.id))
      .orderBy(desc(wizardRuns.createdAt));

    const checksRows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.caseId, caseRow.id))
      .orderBy(desc(diditSessions.createdAt));

    // Bug 4 fix: use inArray to return ALL Didit results, not just first session's
    const checkIds = checksRows.map(c => c.id);
    let resultsRows: typeof diditResults.$inferSelect[] = [];
    if (checkIds.length > 0) {
      resultsRows = await db
        .select()
        .from(diditResults)
        .where(inArray(diditResults.diditSessionId, checkIds))
        .orderBy(desc(diditResults.createdAt));
    }

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.workspaceId, workspaceId), eq(auditLog.entityId, caseRow.id)))
      .orderBy(desc(auditLog.createdAt));

    res.json({
      ok: true,
      data: {
        case:       caseRow,
        wizardRuns: wizardRunsRows,
        checks:     checksRows,
        results:    resultsRows,
        audit:      auditRows,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/cases/:id/pdf
casesRouter.get('/api/cases/:id/pdf', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void next(new UnauthenticatedError());

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params.id), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void next(new NotFoundError('Case'));

    const checksRows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.caseId, caseRow.id))
      .orderBy(desc(diditSessions.createdAt));

    // Get all results for all checks
    const checkIds = checksRows.map(c => c.id);
    let resultsRows: typeof diditResults.$inferSelect[] = [];
    if (checkIds.length > 0) {
      resultsRows = await db
        .select()
        .from(diditResults)
        .where(inArray(diditResults.diditSessionId, checkIds))
        .orderBy(desc(diditResults.createdAt));
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
      '',
      '-- Verification Checks --',
      ...(checksRows.length
        ? checksRows.map(c => `  ${c.capability.padEnd(16)} status=${c.status}  session=${c.providerRequestId ?? 'pending'}`)
        : ['  No checks initiated yet']),
      '',
      '-- Didit Results --',
      ...(resultsRows.length
        ? resultsRows.map(r => `  ${r.status.padEnd(16)} decision=${r.decision}  ${r.summary ?? ''}`)
        : ['  No results yet']),
      '',
      '-- Audit Timeline --',
      // Bug 5 fix: use a.reason not a.detail
      ...(auditRows.length
        ? auditRows.map(a => `  ${String(a.createdAt).slice(0, 19)}  ${a.action}  ${a.reason ?? ''}`)
        : ['  No audit events yet']),
    ];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseRow.id.slice(0, 8)}.pdf"`);
    res.send(buildPdf(lines));
  } catch (err) { next(err); }
});
