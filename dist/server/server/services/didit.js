/**
 * server/services/didit.ts — Didit integration service.
 * Supports mock mode (DIDIT_MODE=mock) and sandbox/live mode.
 * Uses vendor_data = diditSession.id for webhook mapping.
 *
 * Free tier (500/mo via Workflows): kyc — ID Verification, Liveness, Face Match, IP Analysis.
 * Paid (requires credits): aml_screening, company_aml, kyb, NFC, Database Validation.
 */
/** Capabilities that require purchased Didit credits (not covered by free 500/mo plan) */
export const PAID_CAPABILITIES = ['aml_screening', 'company_aml', 'kyb'];
/** Capabilities covered by Didit's free 500 checks/month plan (KYC workflow only) */
export const FREE_CAPABILITIES = ['kyc'];
export function isCapabilityPaid(cap) {
    return PAID_CAPABILITIES.includes(cap);
}
function getBaseUrl() {
    return process.env['DIDIT_BASE_URL'] ?? 'https://verification.didit.me';
}
/**
 * Returns the correct workflow ID for each capability.
 *
 * IMPORTANT: For free-tier sandbox testing (no credits required), create a KYC-ONLY
 * workflow in business.didit.me that uses ONLY: ID Verification + Liveness + Face Match.
 * Do NOT include AML Screening in that workflow — AML requires purchased credits.
 */
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
/** Build a user-friendly error for "not enough credits" responses from Didit */
function buildCreditsError(capability) {
    if (PAID_CAPABILITIES.includes(capability)) {
        return (`"${capability}" is a premium Didit feature that requires purchased credits. ` +
            `Free tier only covers core KYC (ID Verification, Liveness, Face Match). ` +
            `Top up at https://business.didit.me or set DIDIT_MODE=mock to test locally.`);
    }
    return (`Your KYC workflow includes paid steps (e.g. AML Screening). ` +
        `Create a KYC-only workflow in business.didit.me → Workflows → New Workflow, ` +
        `adding only: ID Verification + Passive Liveness + Face Match (no AML). ` +
        `Or set DIDIT_MODE=mock to test the full flow locally without credits.`);
}
export async function createDiditSession(input) {
    const mode = process.env['DIDIT_MODE'] ?? 'mock';
    const workflowId = workflowIdFor(input.capability);
    // Mock mode: return null verificationUrl — use "Mock Complete" button in UI
    if (mode === 'mock') {
        return {
            providerRequestId: `mock_${input.sessionId}`,
            verificationUrl: null,
            sessionToken: null,
            workflowId,
            raw: {
                mode: 'mock',
                status: 'Not Started',
                session_id: `mock_${input.sessionId}`,
                capability: input.capability,
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
        const detail = String(body['detail'] ?? JSON.stringify(body));
        // Detect insufficient credits and return a helpful, actionable message
        if (detail.toLowerCase().includes('credit') || detail.toLowerCase().includes('top up')) {
            throw new Error(`DIDIT_NO_CREDITS: ${buildCreditsError(input.capability)}`);
        }
        throw new Error(`Didit session creation failed: ${response.status} — ${detail}`);
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