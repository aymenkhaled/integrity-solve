/**
 * server/services/didit.ts — Didit integration service.
 * Supports mock mode (DIDIT_MODE=mock) and sandbox/live mode.
 * Uses vendor_data = diditSession.id for webhook mapping.
 *
 * Bug 7 fix (Option A): mock mode returns null verificationUrl.
 * The "Mock Complete" button on case detail is the correct mechanism in mock mode.
 */
function getBaseUrl() {
    return process.env['DIDIT_BASE_URL'] ?? 'https://verification.didit.me';
}
function workflowIdFor(capability) {
    if (capability === 'kyb' || capability === 'company_aml') {
        return process.env['DIDIT_WORKFLOW_ID_KYB'] ?? 'mock_kyb_workflow';
    }
    return process.env['DIDIT_WORKFLOW_ID_KYC'] ?? 'mock_kyc_workflow';
}
function firstString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim())
            return value;
    }
    return null;
}
export async function createDiditSession(input) {
    const mode = process.env['DIDIT_MODE'] ?? 'mock';
    const workflowId = workflowIdFor(input.capability);
    // Mock mode: return null verificationUrl — use "Mock Complete" button in UI
    if (mode === 'mock') {
        return {
            providerRequestId: `mock_${input.sessionId}`,
            verificationUrl: null, // Bug 7: no fake URL — use Mock Complete button
            sessionToken: null,
            workflowId,
            raw: {
                mode: 'mock',
                status: 'Not Started',
                session_id: `mock_${input.sessionId}`,
                note: 'Use the Mock Complete button in the case detail to simulate a webhook result.',
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
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/v3/session/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env['DIDIT_API_KEY'],
        },
        body: JSON.stringify({
            workflow_id: workflowId,
            callback: input.callbackUrl,
            vendor_data: input.sessionId,
            metadata: {
                workspace_id: input.workspaceId,
                case_id: input.caseId,
                capability: input.capability,
                check_request_id: input.checkRequestId ?? null,
            },
            contact_details: input.contactDetails,
        }),
    });
    const body = await response.json().catch(async () => {
        const text = await response.text();
        return { error: text };
    });
    if (!response.ok) {
        throw new Error(`Didit session creation failed: ${response.status} — ${JSON.stringify(body)}`);
    }
    const data = (body['data'] ?? {});
    return {
        providerRequestId: firstString(body['session_id'], body['id'], body['sessionId'], data['session_id'], data['id'], data['sessionId']) ?? input.sessionId,
        verificationUrl: firstString(body['verification_url'], body['verificationUrl'], body['url'], body['redirect_url'], body['hosted_url'], data['verification_url'], data['verificationUrl'], data['url'], data['redirect_url'], data['hosted_url']),
        sessionToken: firstString(body['session_token'], body['sessionToken'], body['token'], data['session_token'], data['sessionToken'], data['token']),
        workflowId,
        raw: body,
    };
}
//# sourceMappingURL=didit.js.map