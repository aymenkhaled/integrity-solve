/**
 * server/routes/diditRoute.ts — Milestone 1 Didit integration endpoints.
 *
 * POST /api/providers/didit/session   — create Didit verification session (mock-safe)
 * POST /api/providers/didit/webhook   — receive & process Didit webhook events
 * GET  /api/providers/didit/sessions  — list Didit sessions for workspace
 * GET  /api/providers/didit/sessions/:id — get single session + results
 * POST /api/providers/didit/mock-complete/:id — simulate webhook (dev/mock only)
 */
import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { eq, and, desc } from 'drizzle-orm';
import {
  cases,
  diditSessions,
  diditResults,
  diditWebhookEvents,
  auditLog,
} from '../../shared/schema.js';
import { createId } from '@paralleldrive/cuid2';
import { createDiditSession }    from '../services/didit.js';
import { verifyDiditWebhook }    from '../services/diditWebhook.js';
import { normalizeDiditDecision } from '../services/normalizeDidit.js';
import { env } from '../env.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { requireWorkspace } from '../lib/auth-session.js';

export const diditRouter = Router();

// ─── Schemas ────────────────────────────────────────────────────────────────

const CreateSessionSchema = z.object({
  caseId:     z.string().min(1),
  capability: z.enum(['kyc', 'kyb', 'aml_screening', 'company_aml']),
  subjectId:  z.string().optional(),
  contactDetails: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function idempotencyKey(workspaceId: string, caseId: string, capability: string, subjectId?: string): string {
  return crypto
    .createHash('sha256')
    .update([workspaceId, caseId, capability, subjectId ?? 'primary'].join(':'))
    .digest('hex');
}

async function processWebhookPayload(payload: unknown): Promise<{
  stored: boolean;
  duplicate: boolean;
  normalized?: ReturnType<typeof normalizeDiditDecision>;
}> {
  const p = payload as Record<string, unknown>;
  const externalEventId = String(
    p['webhook_id'] ?? p['event_id'] ??
    `${p['session_id'] ?? 'unknown'}:${p['webhook_type'] ?? 'event'}:${p['status'] ?? 'unknown'}`
  );
  const providerRequestId = String(
    p['session_id'] ?? p['business_session_id'] ??
    (p['decision'] as Record<string, unknown>)?.['session_id'] ?? ''
  );

  // Check duplicate
  const existing = await db
    .select()
    .from(diditWebhookEvents)
    .where(eq(diditWebhookEvents.externalEventId, externalEventId))
    .limit(1);

  if (existing.length > 0) return { stored: false, duplicate: true };

  // Store raw event
  const [event] = await db.insert(diditWebhookEvents).values({
    id:               createId(),
    externalEventId,
    eventType:        String(p['webhook_type'] ?? p['event_type'] ?? 'unknown'),
    providerRequestId: providerRequestId || null,
    signatureValid:   false,
    payload,
  }).returning();

  // Map to a didit session
  const vendorData = String(p['vendor_data'] ?? '');
  let session: typeof diditSessions.$inferSelect | undefined;

  if (providerRequestId) {
    const rows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.providerRequestId, providerRequestId))
      .limit(1);
    session = rows[0];
  }

  if (!session && vendorData) {
    const rows = await db
      .select()
      .from(diditSessions)
      .where(eq(diditSessions.id, vendorData))
      .limit(1);
    session = rows[0];
  }

  if (!session) {
    // Mark processed (unresolvable) and return
    await db.update(diditWebhookEvents)
      .set({ processedAt: new Date(), signatureValid: false })
      .where(eq(diditWebhookEvents.id, event.id));
    return { stored: true, duplicate: false };
  }

  const normalized = normalizeDiditDecision(payload);

  // Insert result
  await db.insert(diditResults).values({
    id:               createId(),
    diditSessionId:   session.id,
    providerRequestId: providerRequestId || null,
    status:           normalized.status,
    decision:         normalized.decision,
    summary:          normalized.summary,
    riskSignals:      normalized.riskSignals,
    normalizedPayload: normalized,
    rawPayload:       payload,
    completedAt:      ['passed', 'failed', 'review_required'].includes(normalized.status)
      ? new Date() : null,
  });

  // Update session status
  await db.update(diditSessions)
    .set({ status: normalized.status, updatedAt: new Date() })
    .where(eq(diditSessions.id, session.id));

  // Mark event processed
  await db.update(diditWebhookEvents)
    .set({ processedAt: new Date(), signatureValid: true })
    .where(eq(diditWebhookEvents.id, event.id));

  // Write audit
  await db.insert(auditLog).values({
    id:          createId(),
    workspaceId: session.workspaceId,
    actorUserId: 'system',
    entityType:  'didit_session',
    entityId:    session.id,
    action:      'didit_webhook_processed',
    reason:      normalized.summary,
    newValue:    normalized,
    requestId:   createId(), // webhook has no req.requestId
    ipAddress:   null,
  });

  return { stored: true, duplicate: false, normalized };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/providers/didit/session
diditRouter.post('/api/providers/didit/session', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId      = getUserId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const body = CreateSessionSchema.parse(req.body);

    // Verify case ownership
    const [caseRow] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, body.caseId), eq(cases.workspaceId, workspaceId)));

    if (!caseRow) return void res.status(404).json({ error: 'Case not found' });

    const iKey = idempotencyKey(workspaceId, body.caseId, body.capability, body.subjectId);

    // Check for existing session (idempotency)
    const existing = await db
      .select()
      .from(diditSessions)
      .where(and(
        eq(diditSessions.workspaceId, workspaceId),
        eq(diditSessions.idempotencyKey, iKey),
      ))
      .limit(1);

    if (existing.length > 0 && existing[0].providerRequestId && existing[0].sessionUrl) {
      return void res.json({
        ok:              true,
        data:            existing[0],
        reused:          true,
        verificationUrl: existing[0].sessionUrl,
        mode:            process.env['DIDIT_MODE'] ?? 'mock',
      });
    }

    // Create the session record first (get the ID for vendor_data)
    const sessionId = createId();

    const [session] = await db.insert(diditSessions).values({
      id:              sessionId,
      workspaceId,
      caseId:          body.caseId,
      capability:      body.capability,
      status:          'queued',
      idempotencyKey:  iKey,
      subjectId:       body.subjectId,
      vendorData:      sessionId,
      metadata:        { reason: body.reason },
      createdBy:       userId,
    }).returning();

    // Call Didit (mock or live)
    const diditResult = await createDiditSession({
      capability:     body.capability,
      sessionId:      session.id,
      workspaceId,
      caseId:         body.caseId,
      callbackUrl:    `${env.APP_URL}/verification-complete`,
      contactDetails: body.contactDetails,
    });

    // Update session with provider data
    const [updated] = await db.update(diditSessions)
      .set({
        status:            'processing',
        providerRequestId: diditResult.providerRequestId,
        sessionUrl:        diditResult.verificationUrl,
        workflowId:        diditResult.workflowId,
        metadata:          {
          reason:   body.reason,
          diditRaw: diditResult.raw,
        },
        updatedAt: new Date(),
      })
      .where(eq(diditSessions.id, session.id))
      .returning();

    await db.insert(auditLog).values({
      id:          createId(),
      workspaceId,
      actorUserId: userId,
      entityType:  'didit_session',
      entityId:    session.id,
      action:      'didit_session_created',
      reason:      `Didit ${body.capability} session created for case ${body.caseId}. Reason: ${body.reason}`,
      newValue:    updated,
      requestId:   req.requestId,
      ipAddress:   req.ip,
    });

    res.status(201).json({
      ok:              true,
      data:            updated,
      verificationUrl: diditResult.verificationUrl,
      mode:            process.env['DIDIT_MODE'] ?? 'mock',
    });
  } catch (err) { next(err); }
});

// POST /api/providers/didit/webhook (raw body already json via express.json)
diditRouter.post('/api/providers/didit/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload      = req.body as unknown;
    const mode         = process.env['DIDIT_MODE'] ?? 'mock';
    const verification = verifyDiditWebhook(payload, req.headers as Record<string, string | undefined>);

    // In non-mock mode, reject invalid signatures
    if (!verification.valid && mode !== 'mock') {
      return void res.status(401).json({
        ok:    false,
        error: 'Invalid Didit webhook signature',
      });
    }

    const result = await processWebhookPayload(payload);

    if (result.duplicate) {
      return void res.json({ ok: true, duplicate: true });
    }

    res.json({
      ok:         true,
      stored:     result.stored,
      normalized: result.normalized ?? null,
      mode,
      signatureMethod: verification.method,
    });
  } catch (err) { next(err); }
});

// GET /api/providers/didit/sessions
diditRouter.get('/api/providers/didit/sessions', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const caseId = req.query['caseId'] as string | undefined;

    const conditions = [eq(diditSessions.workspaceId, workspaceId)];
    if (caseId) conditions.push(eq(diditSessions.caseId, caseId));

    const rows = await db
      .select()
      .from(diditSessions)
      .where(and(...conditions))
      .orderBy(desc(diditSessions.createdAt));

    res.json({ ok: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/providers/didit/sessions/:id
diditRouter.get('/api/providers/didit/sessions/:id', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const [session] = await db
      .select()
      .from(diditSessions)
      .where(and(eq(diditSessions.id, req.params.id), eq(diditSessions.workspaceId, workspaceId)));

    if (!session) return void res.status(404).json({ error: 'Session not found' });

    const results = await db
      .select()
      .from(diditResults)
      .where(eq(diditResults.diditSessionId, session.id))
      .orderBy(desc(diditResults.createdAt));

    res.json({ ok: true, data: { session, results } });
  } catch (err) { next(err); }
});

// POST /api/providers/didit/mock-complete/:id — simulate webhook (mock/dev only)
diditRouter.post('/api/providers/didit/mock-complete/:id', requireWorkspace, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = process.env['DIDIT_MODE'] ?? 'mock';
    if (mode !== 'mock') {
      return void res.status(403).json({ error: 'Mock completion only available in mock mode' });
    }

    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return void res.status(401).json({ error: 'Not authenticated' });

    const [session] = await db
      .select()
      .from(diditSessions)
      .where(and(eq(diditSessions.id, req.params.id), eq(diditSessions.workspaceId, workspaceId)));

    if (!session) return void res.status(404).json({ error: 'Session not found' });

    const outcome = (req.body as Record<string, unknown>)['outcome'] as string ?? 'Approved';

    const mockPayload = {
      webhook_id:   createId(),
      session_id:   session.providerRequestId ?? `mock_${session.id}`,
      vendor_data:  session.id,
      status:       outcome,
      webhook_type: 'status.updated',
      timestamp:    Math.floor(Date.now() / 1000),
      decision: {
        status: outcome,
        aml:    { total_hits: 0 },
      },
    };

    const result = await processWebhookPayload(mockPayload);

    res.json({ ok: true, simulated: true, payload: mockPayload, result });
  } catch (err) { next(err); }
});
