/**
 * server/routes/seed.ts
 * Seeds the current workspace with realistic demo data.
 * POST /api/seed  (requires auth + workspace)
 */
import { Router } from 'express';
import { db } from '../db.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId, getUserId } from '../lib/workspace-guard.js';
import { ok } from '../lib/validate.js';
import { customers, escalations, tasks, smartAlerts, trainingRecords, periodicReviews, auditLog, } from '../../shared/schema.js';
import { eq, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
const router = Router();
router.post('/', requireWorkspace, async (req, res, next) => {
    try {
        const wsId = getWorkspaceId(req);
        const userId = getUserId(req);
        const reqId = req.requestId ?? createId();
        /* Skip if already seeded */
        const [{ total }] = await db
            .select({ total: count() })
            .from(customers)
            .where(eq(customers.workspaceId, wsId));
        if (Number(total) >= 8) {
            return ok(res, { seeded: false, message: 'Workspace already has data.' });
        }
        /* ── Customers ──────────────────────────────────────────── */
        const custRows = [
            { type: 'COMPANY', risk: 'HIGH', status: 'ACTIVE', cdd: 'EDD', entity: 'Pacific Legal Partners Pty Ltd', email: 'compliance@pacificlegal.com.au' },
            { type: 'INDIVIDUAL', risk: 'LOW', status: 'ACTIVE', cdd: 'STANDARD', given: 'Sarah', family: 'Chen', email: 'sarah.chen@email.com' },
            { type: 'COMPANY', risk: 'MEDIUM', status: 'ACTIVE', cdd: 'STANDARD', entity: 'Brisbane Real Estate Group', email: 'admin@brisbanere.com.au' },
            { type: 'INDIVIDUAL', risk: 'LOW', status: 'ACTIVE', cdd: 'STANDARD', given: 'Michael', family: 'Okafor', email: 'm.okafor@email.com' },
            { type: 'COMPANY', risk: 'MEDIUM', status: 'PENDING_CDD', cdd: 'STANDARD', entity: 'Summit Accounting Group', email: 'aml@summitaccounting.com.au' },
            { type: 'INDIVIDUAL', risk: 'LOW', status: 'ACTIVE', cdd: 'STANDARD', given: 'Priya', family: 'Nair', email: 'p.nair@email.com' },
            { type: 'TRUST', risk: 'HIGH', status: 'CDD_IN_PROGRESS', cdd: 'EDD', entity: 'Goldfields Trust Co.', email: 'trustee@goldfields.com.au' },
            { type: 'INDIVIDUAL', risk: 'MEDIUM', status: 'ACTIVE', cdd: 'STANDARD', given: 'James', family: 'Wu', email: 'james.wu@email.com' },
            { type: 'COMPANY', risk: 'CRITICAL', status: 'SUSPENDED', cdd: 'EDD', entity: 'Nguyen Trading Pty Ltd', email: 'admin@nguyentrading.com.au' },
            { type: 'COMPANY', risk: 'LOW', status: 'ACTIVE', cdd: 'STANDARD', entity: 'Blue Sky Financial Services', email: 'compliance@bluesky.com.au' },
        ];
        const inserted = await db.insert(customers).values(custRows.map((c, i) => ({
            id: createId(),
            workspaceId: wsId,
            referenceNumber: `REF-${String(1000 + i).padStart(4, '0')}`,
            customerType: c.type,
            riskRating: c.risk,
            status: c.status,
            cddLevel: c.cdd,
            entityName: c.entity,
            givenNames: c.given,
            familyName: c.family,
            email: c.email,
            country: 'AU',
            onboardedBy: userId,
            createdAt: new Date(Date.now() - Math.floor(i * 8.5 + 1) * 86400000),
            updatedAt: new Date(),
        }))).returning({ id: customers.id, entityName: customers.entityName, givenNames: customers.givenNames, familyName: customers.familyName });
        const label = (c) => c.entityName ?? `${c.givenNames ?? ''} ${c.familyName ?? ''}`.trim();
        /* ── Escalations ──────────────────────────────────────────── */
        await db.insert(escalations).values([
            {
                id: createId(), workspaceId: wsId, customerId: inserted[0].id,
                subject: 'Unusual international transfer pattern detected',
                summary: 'Customer has made multiple large transfers to high-risk jurisdictions over the past 30 days without a clear business purpose.',
                grounds: 'Transaction monitoring flagged 12 transfers totalling $380,000 AUD to accounts in jurisdictions on the FATF grey list.',
                riskRating: 'HIGH', status: 'UNDER_REVIEW',
                assignedTo: userId, raisedBy: userId,
                createdAt: new Date(Date.now() - 5 * 86400000), updatedAt: new Date(),
            },
            {
                id: createId(), workspaceId: wsId, customerId: inserted[6].id,
                subject: 'Beneficial ownership structure unclear — EDD required',
                summary: 'Trust structure has 4 levels of beneficial ownership that cannot be fully verified through standard means.',
                grounds: 'Customer has refused to provide full beneficiary declarations and third-party holding structure appears designed to obscure ultimate ownership.',
                riskRating: 'HIGH', status: 'DRAFT',
                assignedTo: userId, raisedBy: userId,
                createdAt: new Date(Date.now() - 12 * 86400000), updatedAt: new Date(),
            },
            {
                id: createId(), workspaceId: wsId, customerId: inserted[8].id,
                subject: 'Possible structuring — SMR prepared for AUSTRAC submission',
                summary: 'Multiple cash deposits just below the AUSTRAC threshold reporting level detected over 60-day period.',
                grounds: 'Pattern of $9,800, $9,500, $9,700 cash deposits across 8 transactions is consistent with structuring behaviour under s.136 AML/CTF Act.',
                riskRating: 'CRITICAL', status: 'ESCALATED_TO_SMR',
                assignedTo: userId, raisedBy: userId,
                createdAt: new Date(Date.now() - 20 * 86400000), updatedAt: new Date(),
            },
        ]);
        /* ── Tasks ──────────────────────────────────────────── */
        await db.insert(tasks).values([
            { id: createId(), workspaceId: wsId, title: `Complete EDD for ${label(inserted[6])}`, description: 'Enhanced due diligence required — beneficial ownership not fully verified.', status: 'IN_PROGRESS', priority: 'HIGH', assignedTo: userId, createdBy: userId, dueAt: new Date(Date.now() + 7 * 86400000), createdAt: new Date(), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, title: 'Update AML/CTF Program — annual review', description: 'Annual review of AML/CTF program required under s.84 obligations.', status: 'OPEN', priority: 'MEDIUM', assignedTo: userId, createdBy: userId, dueAt: new Date(Date.now() + 21 * 86400000), createdAt: new Date(), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, title: 'Staff training renewals — 3 staff overdue', description: 'AML/CTF training refresher overdue for 3 team members.', status: 'OPEN', priority: 'HIGH', assignedTo: userId, createdBy: userId, dueAt: new Date(Date.now() + 3 * 86400000), createdAt: new Date(), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, title: 'Review PEP screening results for Q1', description: 'Quarterly review of PEP screening outcomes and documentation.', status: 'COMPLETE', priority: 'LOW', assignedTo: userId, createdBy: userId, dueAt: new Date(Date.now() - 5 * 86400000), completedAt: new Date(Date.now() - 4 * 86400000), createdAt: new Date(Date.now() - 20 * 86400000), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, title: `Verify identity documents for ${label(inserted[4])}`, description: 'CDD in progress — identity documents pending verification.', status: 'IN_PROGRESS', priority: 'MEDIUM', assignedTo: userId, createdBy: userId, dueAt: new Date(Date.now() + 2 * 86400000), createdAt: new Date(), updatedAt: new Date() },
        ]);
        /* ── Smart Alerts ──────────────────────────────────────────── */
        await db.insert(smartAlerts).values([
            { id: createId(), workspaceId: wsId, customerId: inserted[8].id, title: 'Risk threshold breached — CRITICAL action required', description: 'Composite risk score exceeded CRITICAL threshold (92/100). Immediate escalation required.', severity: 'CRITICAL', status: 'OPEN', alertType: 'RISK_THRESHOLD', createdAt: new Date(Date.now() - 1 * 86400000), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, customerId: inserted[0].id, title: 'EDD review overdue by 14 days', description: 'Enhanced due diligence review was due 14 days ago and has not been completed.', severity: 'HIGH', status: 'OPEN', alertType: 'REVIEW_OVERDUE', createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, customerId: inserted[6].id, title: 'Beneficial ownership declaration missing', description: 'Customer onboarding incomplete — beneficial owner declaration not received.', severity: 'WARNING', status: 'OPEN', alertType: 'DOCUMENT_MISSING', createdAt: new Date(Date.now() - 3 * 86400000), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, customerId: inserted[4].id, title: 'CDD in progress — pending verification', description: 'Customer due diligence has been in progress for 12 days without completion.', severity: 'INFO', status: 'ACKNOWLEDGED', alertType: 'CDD_INCOMPLETE', createdAt: new Date(Date.now() - 5 * 86400000), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, customerId: inserted[2].id, title: 'Annual review due in 5 days', description: `${label(inserted[2])} annual CDD review is due in 5 days.`, severity: 'INFO', status: 'OPEN', alertType: 'REVIEW_DUE_SOON', createdAt: new Date(Date.now() - 1 * 86400000), updatedAt: new Date() },
        ]);
        /* ── Training Records ──────────────────────────────────────────── */
        await db.insert(trainingRecords).values([
            { id: createId(), workspaceId: wsId, userId, moduleName: 'AML/CTF Annual Compliance Training 2025', moduleVersion: '2.0', status: 'COMPLETED', score: 94, completedAt: new Date(Date.now() - 10 * 86400000), expiresAt: new Date(Date.now() + 355 * 86400000), attempts: 1, createdAt: new Date(), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, userId, moduleName: 'Customer Due Diligence Deep Dive', moduleVersion: '1.1', status: 'COMPLETED', score: 88, completedAt: new Date(Date.now() - 45 * 86400000), expiresAt: new Date(Date.now() + 320 * 86400000), attempts: 1, createdAt: new Date(), updatedAt: new Date() },
            { id: createId(), workspaceId: wsId, userId, moduleName: 'Suspicious Matter Reporting Workshop', moduleVersion: '1.0', status: 'IN_PROGRESS', attempts: 0, createdAt: new Date(), updatedAt: new Date() },
        ]);
        /* ── Periodic Reviews ──────────────────────────────────────────── */
        await db.insert(periodicReviews).values([
            { id: createId(), workspaceId: wsId, customerId: inserted[0].id, status: 'OVERDUE', dueAt: new Date(Date.now() - 14 * 86400000), createdAt: new Date(Date.now() - 60 * 86400000) },
            { id: createId(), workspaceId: wsId, customerId: inserted[2].id, status: 'SCHEDULED', dueAt: new Date(Date.now() + 5 * 86400000), createdAt: new Date(Date.now() - 55 * 86400000) },
            { id: createId(), workspaceId: wsId, customerId: inserted[1].id, status: 'COMPLETE', dueAt: new Date(Date.now() - 30 * 86400000), completedAt: new Date(Date.now() - 32 * 86400000), createdAt: new Date(Date.now() - 90 * 86400000) },
            { id: createId(), workspaceId: wsId, customerId: inserted[3].id, status: 'SCHEDULED', dueAt: new Date(Date.now() + 30 * 86400000), createdAt: new Date(Date.now() - 30 * 86400000) },
        ]);
        /* ── Audit entry ──────────────────────────────────────────── */
        await db.insert(auditLog).values({
            id: createId(), workspaceId: wsId, actorUserId: userId,
            action: 'WORKSPACE_DEMO_SEEDED', entityType: 'WORKSPACE', entityId: wsId,
            newValue: { customersCreated: inserted.length, seededAt: new Date().toISOString() },
            requestId: reqId, ipAddress: req.ip ?? '127.0.0.1', userAgent: req.headers['user-agent'] ?? '',
        });
        return ok(res, {
            seeded: true,
            counts: { customers: inserted.length, escalations: 3, tasks: 5, alerts: 5, trainingRecords: 3, reviews: 4 },
            message: `Demo data seeded: ${inserted.length} customers, 3 escalations, 5 tasks, 5 alerts.`,
        });
    }
    catch (err) {
        next(err);
    }
});
export default router;
//# sourceMappingURL=seed.js.map