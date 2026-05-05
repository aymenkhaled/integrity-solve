/**
 * server/services/didit.ts — Didit integration service.
 * Supports mock mode (DIDIT_MODE=mock) and sandbox/live mode.
 * Uses vendor_data = diditSession.id for webhook mapping.
 */

export type DiditCapability = 'kyc' | 'kyb' | 'aml_screening' | 'company_aml';

export type CreateDiditSessionInput = {
  capability:     DiditCapability;
  sessionId:      string;       // diditSessions.id — used as vendor_data
  workspaceId:    string;
  caseId:         string;
  callbackUrl:    string;
  contactDetails?: { email?: string; phone?: string };
};

export type DiditSessionResult = {
  providerRequestId: string;
  verificationUrl:   string;
  workflowId:        string;
  raw:               unknown;
};

const DIDIT_BASE_URL = 'https://verification.didit.me';

function workflowIdFor(capability: DiditCapability): string {
  if (capability === 'kyb' || capability === 'company_aml') {
    return process.env['DIDIT_WORKFLOW_ID_KYB'] ?? `mock_kyb_workflow`;
  }
  return process.env['DIDIT_WORKFLOW_ID_KYC'] ?? `mock_kyc_workflow`;
}

export async function createDiditSession(
  input: CreateDiditSessionInput,
): Promise<DiditSessionResult> {
  const mode       = process.env['DIDIT_MODE'] ?? 'mock';
  const workflowId = workflowIdFor(input.capability);
  const appUrl     = process.env['APP_URL'] ?? 'http://localhost:3000';

  // ── Mock mode ──────────────────────────────────────────────────────────────
  if (mode === 'mock') {
    return {
      providerRequestId: `mock_${input.sessionId}`,
      verificationUrl:   `${appUrl}/mock-didit/${input.sessionId}`,
      workflowId:        workflowId,
      raw: {
        mode:              'mock',
        status:            'Not Started',
        session_id:        `mock_${input.sessionId}`,
        verification_url:  `${appUrl}/mock-didit/${input.sessionId}`,
      },
    };
  }

  // ── Live / sandbox mode ───────────────────────────────────────────────────
  if (!process.env['DIDIT_API_KEY']) throw new Error('DIDIT_API_KEY is not set');
  if (!process.env[`DIDIT_WORKFLOW_ID_${input.capability === 'kyb' || input.capability === 'company_aml' ? 'KYB' : 'KYC'}`]) {
    throw new Error(`Missing Didit workflow ID for capability: ${input.capability}`);
  }

  const response = await fetch(`${DIDIT_BASE_URL}/v3/session/`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    process.env['DIDIT_API_KEY'],
    },
    body: JSON.stringify({
      workflow_id:     workflowId,
      callback:        input.callbackUrl,
      vendor_data:     input.sessionId,
      metadata: {
        workspace_id: input.workspaceId,
        case_id:      input.caseId,
        capability:   input.capability,
      },
      contact_details: input.contactDetails,
    }),
  });

  const body = await response.json().catch(async () => {
    const text = await response.text();
    return { error: text };
  }) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(`Didit session creation failed: ${response.status} — ${JSON.stringify(body)}`);
  }

  return {
    providerRequestId: body['session_id'] as string,
    verificationUrl:   body['verification_url'] as string,
    workflowId,
    raw: body,
  };
}
