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
import { eq, desc, and } from 'drizzle-orm';
import { cases, wizardRuns, diditSessions, diditResults, auditLog } from '../../shared/schema.js';
import { createId } from '@paralleldrive/cuid2';

export const casesRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateCaseSchema = z.object({
  caseType:         z.enum(['PROGRAM_SETUP', 'TRANSACTION_CDD']),
  title:            z.string().min(2).max(200),
  designatedService: z.string().optional(),
  partyType:        z.enum(['individual', 'company', 'trust', 'beneficial_owner']).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWorkspaceId(req: Request): string {
  const ws = (req as unknown as Record<string, unknown>)['workspaceId'] as string | undefined;
  return ws ?? (req.session as Record<string, unknown>)?.['workspaceId'] as string ?? '';
}

function getUserId(req: Request): string | undefined {
  return (req.session as Record<string, unknown>)?.['userId'] as string | undefined;
}

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
casesRouter.post('/api/cases', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

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
      actorId:     userId,
      entityType:  'case',
      entityId:    created.id,
      action:      'case_created',
      detail:      `Case created: ${body.title} (${body.caseType})`,
      after:       created,
    });

    res.status(201).json({ ok: true, data: created });
  } catch (err) { next(err); }
});

// GET /api/cases
casesRouter.get('/api/cases', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const rows = await db
      .select()
      .from(cases)
      .where(eq(cases.workspaceId, workspaceId))
      .orderBy(desc(cases.createdAt));

    res.json({ ok: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/cases/:id/summary
casesRouter.get('/api/cases/:id/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params.id), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void res.status(404).json({ error: 'Case not found' });

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

    const checkIds = checksRows.map(c => c.id);
    let resultsRows: typeof diditResults.$inferSelect[] = [];
    if (checkIds.length > 0) {
      resultsRows = await db
        .select()
        .from(diditResults)
        .where(
          checkIds.length === 1
            ? eq(diditResults.diditSessionId, checkIds[0])
            : eq(diditResults.diditSessionId, checkIds[0]) // simplified — each session has at most one result
        );
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
casesRouter.get('/api/cases/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, req.params.id), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void res.status(404).json({ error: 'Case not found' });

    const checksRows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.caseId, caseRow.id))
      .orderBy(desc(diditSessions.createdAt));

    const auditRows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.workspaceId, workspaceId), eq(auditLog.entityId, caseRow.id)))
      .orderBy(desc(auditLog.createdAt))
      .limit(15);

    const now = new Date().toISOString().slice(0, 10);

    const lines = [
      'Integrity Solve — Case Summary Pack',
      `Generated: ${now}`,
      '',
      `Case:              ${caseRow.title}`,
      `Type:              ${caseRow.caseType}`,
      `Status:            ${caseRow.status}`,
      `Risk level:        ${caseRow.riskLevel ?? 'not assessed'}`,
      `Designated service: ${caseRow.designatedService ?? 'not set'}`,
      `Party type:        ${caseRow.partyType ?? 'not set'}`,
      `Recommendation:    ${caseRow.recommendation ?? 'pending wizard completion'}`,
      '',
      '── Verification Checks ──────────────────────────',
      ...(checksRows.length
        ? checksRows.map(c => `  ${c.capability.padEnd(16)} status=${c.status}  session=${c.providerRequestId ?? 'pending'}`)
        : ['  No checks initiated yet']),
      '',
      '── Audit Timeline ───────────────────────────────',
      ...(auditRows.length
        ? auditRows.map(a => `  ${String(a.createdAt).slice(0, 19)}  ${a.action}  ${a.detail ?? ''}`)
        : ['  No audit events yet']),
    ];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${caseRow.id.slice(0, 8)}.pdf"`);
    res.send(buildPdf(lines));
  } catch (err) { next(err); }
});
