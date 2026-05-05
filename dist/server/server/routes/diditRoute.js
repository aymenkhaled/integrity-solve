/**
 * server/routes/diditRoute.ts — Milestone 1 Didit integration endpoints.
 *
 * POST /api/providers/didit/session      — create Didit verification session (mock-safe)
 * POST /api/providers/didit/webhook      — receive & process Didit webhook events
 * GET  /api/providers/didit/sessions     — list Didit sessions for workspace
 * GET  /api/providers/didit/sessions/:id — get single session + results
 * POST /api/providers/didit/mock-complete/:id — simulate webhook (dev/mock only)
 *
 * Integration bridge:
 * - When a session is created for a case with a linked customer, a checkRequests row
 *   is created and its ID stored on the didit_session (checkRequestId).
 * - When a webhook result arrives for a session with a checkRequestId, a checkResults
 *   row is created, bridging Didit results into the standard check engine.
 */
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { eq, and, desc } from 'drizzle-orm';
import { cases, diditSessions, diditResults, diditWebhookEvents, auditLog, checkRequests, checkResults, } from '../../shared/schema.js';
import { createId } from '@paralleldrive/cuid2';
import { createDiditSession, PAID_CAPABILITIES, FREE_CAPABILITIES } from '../services/didit.js';
import { verifyDiditWebhook } from '../services/diditWebhook.js';
import { normalizeDiditDecision } from '../services/normalizeDidit.js';
import { env } from '../env.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { NotFoundError, UnauthenticatedError, ForbiddenError, } from '../lib/errors.js';
import { addMinutes } from 'date-fns';
export const diditRouter = Router();
// ─── Schemas ────────────────────────────────────────────────────────────────
const CreateSessionSchema = z.object({
    caseId: z.string().min(1),
    capability: z.enum(['kyc', 'kyb', 'aml_screening', 'company_aml']),
    subjectId: z.string().optional(),
    contactDetails: z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
    }).optional(),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
});
// ─── Helpers ────────────────────────────────────────────────────────────────
function idempotencyKey(workspaceId, caseId, capability, subjectId) {
    return crypto
        .createHash('sha256')
        .update([workspaceId, caseId, capability, subjectId ?? 'primary'].join(':'))
        .digest('hex');
}
/** Map Didit capability to checkTypeEnum value */
function capabilityToCheckType(capability) {
    if (capability === 'kyc')
        return 'IDENTITY';
    if (capability === 'kyb')
        return 'REGISTRY';
    return 'AML';
}
/** Map normalised Didit decision to checkOutcomeEnum value */
function decisionToOutcome(decision) {
    if (decision === 'clear')
        return 'CLEAR';
    if (decision === 'matched' || decision === 'unresolved')
        return 'POTENTIAL_HIT';
    if (decision === 'not_verified')
        return 'UNABLE_TO_VERIFY';
    return 'ERROR';
}
/** Map normalised Didit status to checkStatusEnum value */
function diditStatusToCheckStatus(status) {
    if (status === 'passed')
        return 'PASS';
    if (status === 'failed')
        return 'FAIL';
    if (status === 'review_required')
        return 'REFER';
    return 'ERROR';
}
async function processWebhookPayload(payload) {
    const p = payload;
    const metadata = (p['metadata'] ?? {});
    const externalEventId = String(p['webhook_id'] ?? p['event_id'] ??
        `${p['session_id'] ?? 'unknown'}:${p['webhook_type'] ?? 'event'}:${p['status'] ?? 'unknown'}`);
    const providerRequestId = String(p['session_id'] ?? p['business_session_id'] ?? p['id'] ??
        p['decision']?.['session_id'] ?? '');
    // Duplicate check
    const existing = await db
        .select()
        .from(diditWebhookEvents)
        .where(eq(diditWebhookEvents.externalEventId, externalEventId))
        .limit(1);
    if (existing.length > 0)
        return { stored: false, duplicate: true };
    // Store raw event
    const [event] = await db.insert(diditWebhookEvents).values({
        id: createId(),
        externalEventId,
        eventType: String(p['webhook_type'] ?? p['event_type'] ?? 'unknown'),
        providerRequestId: providerRequestId || null,
        signatureValid: false,
        payload,
    }).returning();
    // Map to a didit session
    const vendorData = String(p['vendor_data'] ?? metadata['vendor_data'] ?? metadata['session_id'] ?? '');
    let session;
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
        await db.update(diditWebhookEvents)
            .set({ processedAt: new Date(), signatureValid: false })
            .where(eq(diditWebhookEvents.id, event.id));
        return { stored: true, duplicate: false };
    }
    const normalized = normalizeDiditDecision(payload);
    // Insert Didit result
    await db.insert(diditResults).values({
        id: createId(),
        diditSessionId: session.id,
        providerRequestId: providerRequestId || null,
        status: normalized.status,
        decision: normalized.decision,
        summary: normalized.summary,
        riskSignals: normalized.riskSignals,
        normalizedPayload: normalized,
        rawPayload: payload,
        completedAt: ['passed', 'failed', 'review_required'].includes(normalized.status)
            ? new Date() : null,
    });
    // Update Didit session status
    await db.update(diditSessions)
        .set({ status: normalized.status, updatedAt: new Date() })
        .where(eq(diditSessions.id, session.id));
    // ── Bridge: create checkResults row if session has a linked checkRequest ──
    if (session.checkRequestId && ['passed', 'failed', 'review_required'].includes(normalized.status)) {
        const outcome = decisionToOutcome(normalized.decision);
        const checkStatus = diditStatusToCheckStatus(normalized.status);
        await db.insert(checkResults).values({
            id: createId(),
            checkRequestId: session.checkRequestId,
            workspaceId: session.workspaceId,
            outcome,
            rawResponse: { source: 'didit', payload },
            parsedData: normalized,
            hitDetails: normalized.riskSignals ?? [],
            manualOverride: false,
        });
        await db.update(checkRequests)
            .set({ status: checkStatus, completedAt: new Date(), updatedAt: new Date() })
            .where(eq(checkRequests.id, session.checkRequestId));
    }
    // Mark webhook event as processed
    await db.update(diditWebhookEvents)
        .set({ processedAt: new Date(), signatureValid: true })
        .where(eq(diditWebhookEvents.id, event.id));
    // Audit log linked to case
    await db.insert(auditLog).values({
        id: createId(),
        workspaceId: session.workspaceId,
        actorUserId: 'system',
        entityType: 'didit_session',
        entityId: session.caseId,
        action: 'didit_webhook_processed',
        reason: normalized.summary,
        newValue: normalized,
        requestId: createId(),
        ipAddress: null,
    });
    return { stored: true, duplicate: false, normalized };
}
// ─── Routes ─────────────────────────────────────────────────────────────────
// GET /api/providers/didit/config-status
diditRouter.get('/api/providers/didit/config-status', requireWorkspace, async (_req, res) => {
    res.json({
        ok: true,
        data: {
            mode: env.DIDIT_MODE,
            hasApiKey: Boolean(process.env['DIDIT_API_KEY']),
            hasWebhookSecret: Boolean(process.env['DIDIT_WEBHOOK_SECRET']),
            hasKycWorkflowId: Boolean(process.env['DIDIT_WORKFLOW_ID_KYC']),
            hasKybWorkflowId: Boolean(process.env['DIDIT_WORKFLOW_ID_KYB']),
            baseUrl: process.env['DIDIT_BASE_URL'] ?? 'https://verification.didit.me',
            freeCapabilities: FREE_CAPABILITIES,
            paidCapabilities: PAID_CAPABILITIES,
            consoleUrl: 'https://business.didit.me',
        },
    });
});
// POST /api/providers/didit/session
diditRouter.post('/api/providers/didit/session', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        const userId = getUserId(req);
        if (!workspaceId)
            return void next(new UnauthenticatedError());
        const body = CreateSessionSchema.parse(req.body);
        // Verify case ownership
        const [caseRow] = await db
            .select()
            .from(cases)
            .where(and(eq(cases.id, body.caseId), eq(cases.workspaceId, workspaceId)));
        if (!caseRow)
            return void next(new NotFoundError('Case'));
        if (!caseRow.customerId) {
            throw new ForbiddenError('Link or create customer before starting Didit checks');
        }
        const iKey = idempotencyKey(workspaceId, body.caseId, body.capability, body.subjectId);
        // Check for existing session (idempotency)
        const existing = await db
            .select()
            .from(diditSessions)
            .where(and(eq(diditSessions.workspaceId, workspaceId), eq(diditSessions.idempotencyKey, iKey)))
            .limit(1);
        // Already succeeded — return cached result
        if (existing.length > 0 && existing[0].providerRequestId) {
            return void res.json({
                ok: true,
                data: {
                    session: existing[0],
                    verificationUrl: existing[0].sessionUrl ?? null,
                    mode: env.DIDIT_MODE,
                    reused: true,
                },
            });
        }
        // Determine whether to reuse a previously-failed session or create new rows
        const existingSession = existing.length > 0 ? existing[0] : null;
        let checkRequestId = existingSession?.checkRequestId ?? null;
        let sessionId;
        let sessionRow;
        if (existingSession) {
            // Retry path: reuse existing session + check_request, reset their status
            sessionId = existingSession.id;
            sessionRow = existingSession;
            await db.update(diditSessions)
                .set({ status: 'queued', updatedAt: new Date() })
                .where(eq(diditSessions.id, sessionId));
            if (checkRequestId) {
                await db.update(checkRequests)
                    .set({ status: 'RUNNING', startedAt: new Date(), updatedAt: new Date() })
                    .where(eq(checkRequests.id, checkRequestId));
            }
        }
        else {
            // Fresh path: create check_request then session rows
            const [checkReq] = await db.insert(checkRequests).values({
                id: createId(),
                workspaceId,
                customerId: caseRow.customerId,
                checkType: capabilityToCheckType(body.capability),
                provider: 'DIDIT',
                status: 'RUNNING',
                timeoutAt: addMinutes(new Date(), 10),
                requestedBy: userId,
                requestPayload: {
                    source: 'didit',
                    mode: env.DIDIT_MODE,
                    capability: body.capability,
                    caseId: body.caseId,
                    reason: body.reason,
                },
                startedAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            checkRequestId = checkReq.id;
            sessionId = createId();
            const [newSession] = await db.insert(diditSessions).values({
                id: sessionId,
                workspaceId,
                caseId: body.caseId,
                capability: body.capability,
                status: 'queued',
                idempotencyKey: iKey,
                subjectId: body.subjectId,
                vendorData: sessionId,
                checkRequestId: checkRequestId ?? undefined,
                metadata: {
                    reason: body.reason,
                    workspace_id: workspaceId,
                    case_id: body.caseId,
                    capability: body.capability,
                    check_request_id: checkRequestId,
                },
                createdBy: userId,
            }).returning();
            sessionRow = newSession;
        }
        // Call Didit API (mock or live) — clean up records on failure instead of 500
        let diditResult;
        try {
            diditResult = await createDiditSession({
                capability: body.capability,
                sessionId: sessionRow.id,
                workspaceId,
                caseId: body.caseId,
                checkRequestId,
                callbackUrl: `${env.APP_URL}/verification-complete?case_id=${encodeURIComponent(body.caseId)}`,
                contactDetails: body.contactDetails,
            });
        }
        catch (apiErr) {
            // Mark session + check_request as failed so UI shows correct state
            await db.update(diditSessions)
                .set({ status: 'failed', updatedAt: new Date() })
                .where(eq(diditSessions.id, sessionId));
            if (checkRequestId) {
                await db.update(checkRequests)
                    .set({ status: 'ERROR', completedAt: new Date(), updatedAt: new Date() })
                    .where(eq(checkRequests.id, checkRequestId));
            }
            const raw = apiErr.message ?? '';
            const userMsg = raw.includes('credits')
                ? 'Didit account has no verification credits. Top up at https://business.didit.me, or set DIDIT_MODE=mock for local testing.'
                : raw.includes('DIDIT_API_KEY')
                    ? 'DIDIT_API_KEY is not configured. Add it to Replit Secrets or set DIDIT_MODE=mock.'
                    : raw.includes('DIDIT_WORKFLOW_ID')
                        ? 'Didit workflow ID is missing for this capability. Check DIDIT_WORKFLOW_ID_KYC / DIDIT_WORKFLOW_ID_KYB in secrets.'
                        : `Didit API error: ${raw.slice(0, 300)}`;
            return void res.status(422).json({
                ok: false,
                error: { code: 'DIDIT_API_ERROR', message: userMsg },
            });
        }
        // Update session with provider data
        const [updated] = await db.update(diditSessions)
            .set({
            status: 'processing',
            providerRequestId: diditResult.providerRequestId,
            sessionUrl: diditResult.verificationUrl ?? null,
            sessionToken: diditResult.sessionToken ?? null,
            workflowId: diditResult.workflowId,
            metadata: {
                reason: body.reason,
                workspace_id: workspaceId,
                case_id: body.caseId,
                capability: body.capability,
                check_request_id: checkRequestId,
                diditRaw: diditResult.raw,
            },
            updatedAt: new Date(),
        })
            .where(eq(diditSessions.id, sessionId))
            .returning();
        // Update checkRequest with providerRef
        if (checkRequestId && diditResult.providerRequestId) {
            await db.update(checkRequests)
                .set({ providerRef: diditResult.providerRequestId, updatedAt: new Date() })
                .where(eq(checkRequests.id, checkRequestId));
        }
        // Audit linked to case
        await db.insert(auditLog).values({
            id: createId(),
            workspaceId,
            actorUserId: userId,
            entityType: 'didit_session',
            entityId: body.caseId,
            action: 'didit_session_created',
            reason: `Didit ${body.capability} session created for case ${body.caseId}. Reason: ${body.reason}`,
            newValue: updated,
            requestId: req.requestId,
            ipAddress: req.ip,
        });
        res.status(201).json({
            ok: true,
            data: {
                session: updated,
                verificationUrl: diditResult.verificationUrl ?? null,
                mode: env.DIDIT_MODE,
                reused: false,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/providers/didit/webhook (no auth — Didit calls this directly)
diditRouter.post('/api/providers/didit/webhook', async (req, res, next) => {
    try {
        const payload = req.body;
        const mode = env.DIDIT_MODE;
        const verification = verifyDiditWebhook(payload, req.headers);
        if (!verification.valid && mode !== 'mock') {
            return void res.status(401).json({
                ok: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid Didit webhook signature' },
            });
        }
        const result = await processWebhookPayload(payload);
        if (result.duplicate) {
            return void res.json({ ok: true, duplicate: true });
        }
        res.json({
            ok: true,
            stored: result.stored,
            normalized: result.normalized ?? null,
            mode,
            signatureMethod: verification.method,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/providers/didit/sessions
diditRouter.get('/api/providers/didit/sessions', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        if (!workspaceId)
            return void next(new UnauthenticatedError());
        const caseId = req.query['caseId'];
        const conditions = [eq(diditSessions.workspaceId, workspaceId)];
        if (caseId)
            conditions.push(eq(diditSessions.caseId, caseId));
        const rows = await db
            .select()
            .from(diditSessions)
            .where(and(...conditions))
            .orderBy(desc(diditSessions.createdAt));
        res.json({ ok: true, data: rows });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/providers/didit/sessions/:id
diditRouter.get('/api/providers/didit/sessions/:id', requireWorkspace, async (req, res, next) => {
    try {
        const workspaceId = getWorkspaceId(req);
        if (!workspaceId)
            return void next(new UnauthenticatedError());
        const [session] = await db
            .select()
            .from(diditSessions)
            .where(and(eq(diditSessions.id, req.params['id']), eq(diditSessions.workspaceId, workspaceId)));
        if (!session)
            return void next(new NotFoundError('Session'));
        const results = await db
            .select()
            .from(diditResults)
            .where(eq(diditResults.diditSessionId, session.id))
            .orderBy(desc(diditResults.createdAt));
        // Also fetch linked check request + results if bridged
        let checkReq = null;
        let checkRes = [];
        if (session.checkRequestId) {
            const [cr] = await db.select().from(checkRequests).where(eq(checkRequests.id, session.checkRequestId)).limit(1);
            checkReq = cr ?? null;
            if (checkReq) {
                checkRes = await db.select().from(checkResults).where(eq(checkResults.checkRequestId, checkReq.id));
            }
        }
        res.json({ ok: true, data: { session, results, checkRequest: checkReq, checkResults: checkRes } });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/providers/didit/mock-complete/:id
diditRouter.post('/api/providers/didit/mock-complete/:id', requireWorkspace, async (req, res, next) => {
    try {
        const mode = env.DIDIT_MODE;
        if (mode !== 'mock') {
            return void next(new ForbiddenError('Mock completion is only available in mock mode'));
        }
        const workspaceId = getWorkspaceId(req);
        if (!workspaceId)
            return void next(new UnauthenticatedError());
        const [session] = await db
            .select()
            .from(diditSessions)
            .where(and(eq(diditSessions.id, req.params['id']), eq(diditSessions.workspaceId, workspaceId)));
        if (!session)
            return void next(new NotFoundError('Session'));
        const outcome = req.body['outcome'] ?? 'Approved';
        const mockPayload = {
            webhook_id: createId(),
            session_id: session.providerRequestId ?? `mock_${session.id}`,
            vendor_data: session.id,
            status: outcome,
            webhook_type: 'status.updated',
            timestamp: Math.floor(Date.now() / 1000),
            decision: {
                status: outcome,
                aml: { total_hits: 0 },
            },
        };
        const result = await processWebhookPayload(mockPayload);
        res.json({ ok: true, simulated: true, payload: mockPayload, result });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=diditRoute.js.map