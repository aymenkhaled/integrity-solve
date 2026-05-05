/**
 * server/services/didit.ts — Didit integration service.
 * Supports mock mode (DIDIT_MODE=mock) and sandbox/live mode.
 * Uses vendor_data = diditSession.id for webhook mapping.
 *
 * Bug 7 fix (Option A): mock mode returns null verificationUrl.
 * The "Mock Complete" button on case detail is the correct mechanism in mock mode.
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
  verificationUrl:   string | null;
  workflowId:        string;
  raw:               unknown;
};

function getBaseUrl(): string {
  return process.env['DIDIT_BASE_URL'] ?? 'https://verification.didit.me';
}

function workflowIdFor(capability: DiditCapability): string {
  if (capability === 'kyb' || capability === 'company_aml') {
    return process.env['DIDIT_WORKFLOW_ID_KYB'] ?? 'mock_kyb_workflow';
  }
  return process.env['DIDIT_WORKFLOW_ID_KYC'] ?? 'mock_kyc_workflow';
}

export async function createDiditSession(
  input: CreateDiditSessionInput,
): Promise<DiditSessionResult> {
  const mode       = process.env['DIDIT_MODE'] ?? 'mock';
  const workflowId = workflowIdFor(input.capability);

  // Mock mode: return null verificationUrl — use "Mock Complete" button in UI
  if (mode === 'mock') {
    return {
      providerRequestId: `mock_${input.sessionId}`,
      verificationUrl:   null, // Bug 7: no fake URL — use Mock Complete button
      workflowId,
      raw: {
        mode:       'mock',
        status:     'Not Started',
        session_id: `mock_${input.sessionId}`,
        note:       'Use the Mock Complete button in the case detail to simulate a webhook result.',
      },
    };
  }

  // Sandbox / live mode: require credentials
  if (!process.env['DIDIT_API_KEY']) {
    throw new Error('DIDIT_API_KEY is not set — required for sandbox/live mode');
  }
  const wfKey = input.capability === 'kyb' || input.capability === 'company_aml'
    ? 'DIDIT_WORKFLOW_ID_KYB' : 'DIDIT_WORKFLOW_ID_KYC';
  if (!process.env[wfKey]) {
    throw new Error(`${wfKey} is not set — required for capability: ${input.capability}`);
  }

  const baseUrl  = getBaseUrl();
  const response = await fetch(`${baseUrl}/v3/session/`, {
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
    verificationUrl:   body['verification_url'] as string ?? null,
    workflowId,
    raw: body,
  };
}
