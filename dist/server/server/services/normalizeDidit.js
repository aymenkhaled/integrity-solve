/**
 * server/services/normalizeDidit.ts — Normalize raw Didit webhook payloads.
 * Maps Didit statuses to portal-standard decision values.
 */
export function normalizeDiditDecision(payload) {
    const p = payload;
    const decision = p['decision'];
    const status = String(decision?.['status'] ?? p['status'] ?? '').toLowerCase();
    const aml = (decision?.['aml'] ?? decision?.['company_aml']);
    const amlHits = Number(aml?.['total_hits'] ?? (Array.isArray(aml?.['hits']) ? aml['hits'].length : 0));
    const sessionKind = String(p['session_kind'] ?? p['data']?.['session_kind'] ?? '');
    if (status.includes('approved')) {
        if (amlHits > 0) {
            return {
                status: 'review_required',
                decision: 'matched',
                summary: `Didit approved identity/business verification but AML returned ${amlHits} possible hit(s).`,
                riskSignals: ['aml_possible_match'],
            };
        }
        return {
            status: 'passed',
            decision: 'clear',
            summary: sessionKind === 'business'
                ? 'Didit business verification returned approved/clear.'
                : 'Didit identity verification returned approved/clear.',
            riskSignals: [],
        };
    }
    if (status.includes('review') || status.includes('resub') || status.includes('manual')) {
        return {
            status: 'review_required',
            decision: 'unresolved',
            summary: 'Didit result requires manual review or resubmission.',
            riskSignals: ['manual_review_required'],
        };
    }
    if (status.includes('declined') ||
        status.includes('rejected') ||
        status.includes('failed') ||
        status.includes('abandoned') ||
        status.includes('expired') ||
        status.includes('cancelled') ||
        status.includes('canceled') ||
        status.includes('timeout')) {
        return {
            status: 'failed',
            decision: 'not_verified',
            summary: 'Didit verification failed, was declined, or did not complete.',
            riskSignals: ['verification_failed'],
        };
    }
    return {
        status: 'processing',
        decision: 'pending',
        summary: 'Didit session is still pending or in progress.',
        riskSignals: [],
    };
}
//# sourceMappingURL=normalizeDidit.js.map