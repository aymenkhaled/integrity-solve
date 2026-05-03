/**
 * server/routes/documents.ts — Document generation & retrieval.
 * Generates AML program documents as structured JSON (docx via docxtemplater
 * can be wired when the package is installed). For now, returns a JSON
 * "document" that the client can render or download as plain text.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { programDocuments, programForms, programVersions, workspaces } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { writeAudit } from '../lib/audit.js';
import { NotFoundError } from '../lib/errors.js';
import { createId } from '@paralleldrive/cuid2';
import path from 'node:path';
import fs from 'node:fs/promises';

const router = Router();

// GET /api/documents — list all documents for workspace
router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const docs = await db
      .select()
      .from(programDocuments)
      .where(eq(programDocuments.workspaceId, workspaceId))
      .orderBy(desc(programDocuments.generatedAt))
      .limit(100);

    ok(res, docs);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/generate — generate a document from a program version
router.post('/generate', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { programId, documentType = 'AML_PROGRAM', notes } = req.body as {
      programId: string;
      documentType?: string;
      notes?: string;
    };

    // Load program
    const [program] = await db
      .select()
      .from(programForms)
      .where(and(eq(programForms.id, programId), eq(programForms.workspaceId, workspaceId)))
      .limit(1);

    if (!program) throw new NotFoundError('Program');

    // Load workspace for letterhead
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    // Generate document content
    const docContent = generateAmlProgramDocument(program, workspace!, notes);
    const fileName = `AML_CTF_Program_${new Date().toISOString().slice(0, 10)}.txt`;

    // Store as text file in /tmp/documents (local storage)
    const storageDir = '/tmp/is_documents';
    await fs.mkdir(storageDir, { recursive: true });
    const docId = createId();
    const storagePath = path.join(storageDir, `${docId}.txt`);
    await fs.writeFile(storagePath, docContent, 'utf-8');

    const stats = await fs.stat(storagePath);

    const [doc] = await db.insert(programDocuments).values({
      workspaceId,
      versionId:     null,
      documentType:  documentType as typeof programDocuments.$inferInsert['documentType'],
      fileName,
      storagePath,
      fileSizeBytes: stats.size,
      mimeType:      'text/plain',
      generatedBy:   userId,
    }).returning();

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'document.generated', entityType: 'program_document', entityId: doc!.id, newValue: { documentType, programId } },
    );

    ok(res, doc, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/download — download document
router.get('/:id/download', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params as { id: string };

    const [doc] = await db
      .select()
      .from(programDocuments)
      .where(and(eq(programDocuments.id, id), eq(programDocuments.workspaceId, workspaceId)))
      .limit(1);

    if (!doc) throw new NotFoundError('Document');

    try {
      const content = await fs.readFile(doc.storagePath, 'utf-8');
      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
      res.send(content);
    } catch {
      throw new NotFoundError('Document file');
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id
router.delete('/:id', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    const { id } = req.params as { id: string };

    const [doc] = await db
      .select()
      .from(programDocuments)
      .where(and(eq(programDocuments.id, id), eq(programDocuments.workspaceId, workspaceId)))
      .limit(1);

    if (!doc) throw new NotFoundError('Document');

    await db.delete(programDocuments).where(eq(programDocuments.id, id));

    // Remove file
    try { await fs.unlink(doc.storagePath); } catch { /* already gone */ }

    await writeAudit(
      { workspaceId, actorUserId: userId, requestId: req.requestId, ipAddress: req.ip },
      { action: 'document.deleted', entityType: 'program_document', entityId: id },
    );

    ok(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

function generateAmlProgramDocument(
  program: typeof programForms.$inferSelect,
  workspace: typeof workspaces.$inferSelect,
  notes?: string,
): string {
  const now = new Date().toLocaleDateString('en-AU', { dateStyle: 'long' });
  const formData = (program.formData ?? {}) as Record<string, unknown>;

  return `AML/CTF PROGRAM
================================================================================

Reporting Entity:     ${workspace.legalName}
ABN:                  ${workspace.abn ?? 'Not provided'}
Industry Pathway:     ${workspace.industryPathway ?? program.pathway ?? 'Not specified'}
Document Generated:   ${now}
Program Title:        ${program.title}
Program Status:       ${program.status}
Current Revision:     Step ${program.currentStep} of 12

DISCLAIMER
This document was generated by Integrity Solve — an AML/CTF compliance platform
for Australian reporting entities. It must be reviewed by a qualified compliance
professional before being adopted as an official program.

================================================================================
SECTION 1: ML/TF RISK ASSESSMENT
================================================================================

${formData['ml_tf_risk'] ? JSON.stringify(formData['ml_tf_risk'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 2: DESIGNATED SERVICES
================================================================================

${formData['designated_services'] ? JSON.stringify(formData['designated_services'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 3: PART A — RISK MANAGEMENT
================================================================================

${formData['part_a'] ? JSON.stringify(formData['part_a'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 4: PART B — KNOW YOUR CUSTOMER (KYC)
================================================================================

${formData['part_b'] ? JSON.stringify(formData['part_b'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 5: CUSTOMER DUE DILIGENCE
================================================================================

${formData['customer_due_diligence'] ? JSON.stringify(formData['customer_due_diligence'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 6: ONGOING MONITORING
================================================================================

${formData['ongoing_monitoring'] ? JSON.stringify(formData['ongoing_monitoring'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 7: REPORTING OBLIGATIONS
================================================================================

${formData['reporting_obligations'] ? JSON.stringify(formData['reporting_obligations'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 8: AML/CTF RECORD-KEEPING
================================================================================

${formData['record_keeping'] ? JSON.stringify(formData['record_keeping'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 9: INDEPENDENT REVIEW
================================================================================

${formData['independent_review'] ? JSON.stringify(formData['independent_review'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 10: EMPLOYEE DUE DILIGENCE
================================================================================

${formData['employee_due_diligence'] ? JSON.stringify(formData['employee_due_diligence'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 11: TRAINING PROGRAM
================================================================================

${formData['training_program'] ? JSON.stringify(formData['training_program'], null, 2) : 'Not yet completed.'}

================================================================================
SECTION 12: BOARD OVERSIGHT
================================================================================

${formData['board_oversight'] ? JSON.stringify(formData['board_oversight'], null, 2) : 'Not yet completed.'}

================================================================================
NOTES
================================================================================

${notes ?? 'No additional notes.'}

================================================================================
Generated by Integrity Solve — https://integritysolve.com.au
This document is confidential and intended for internal compliance use only.
================================================================================
`;
}

export default router;
