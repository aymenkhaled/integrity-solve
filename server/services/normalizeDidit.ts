/**
 * server/services/normalizeDidit.ts — Normalize raw Didit webhook payloads.
 * Maps Didit statuses to portal-standard decision values.
 */

export type NormalizedDiditDecision = {
  status:      'passed' | 'failed' | 'review_required' | 'processing' | 'error';
  decision:    'clear' | 'not_verified' | 'matched' | 'unresolved' | 'pending';
  summary:     string;
  riskSignals: string[];
};

export function normalizeDiditDecision(payload: unknown): NormalizedDiditDecision {
  const p       = payload as Record<string, unknown>;
  const decision = p['decision'] as Record<string, unknown> | undefined;
  const status  = String(decision?.['status'] ?? p['status'] ?? '').toLowerCase();
  const aml     = (decision?.['aml'] ?? decision?.['company_aml']) as Record<string, unknown> | undefined;
  const amlHits = Number(aml?.['total_hits'] ?? (Array.isArray(aml?.['hits']) ? (aml!['hits'] as unknown[]).length : 0));
  const sessionKind = String(p['session_kind'] ?? (p['data'] as Record<string,unknown>)?.['session_kind'] ?? '');

  if (status.includes('approved')) {
    if (amlHits > 0) {
      return {
        status:      'review_required',
        decision:    'matched',
        summary:     `Didit approved identity/business verification but AML returned ${amlHits} possible hit(s).`,
        riskSignals: ['aml_possible_match'],
      };
    }
    return {
      status:      'passed',
      decision:    'clear',
      summary:     sessionKind === 'business'
        ? 'Didit business verification returned approved/clear.'
        : 'Didit identity verification returned approved/clear.',
      riskSignals: [],
    };
  }

  if (status.includes('review') || status.includes('resub')) {
    return {
      status:      'review_required',
      decision:    'unresolved',
      summary:     'Didit result requires manual review or resubmission.',
      riskSignals: ['manual_review_required'],
    };
  }

  if (status.includes('declined') || status.includes('rejected') || status.includes('failed')) {
    return {
      status:      'failed',
      decision:    'not_verified',
      summary:     'Didit verification failed or was declined.',
      riskSignals: ['verification_failed'],
    };
  }

  return {
    status:      'processing',
    decision:    'pending',
    summary:     'Didit session is still pending or in progress.',
    riskSignals: [],
  };
}
