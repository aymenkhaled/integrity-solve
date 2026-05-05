/**
 * server/services/diditWebhook.ts — Didit webhook signature verification.
 * Supports X-Signature-V2 (canonical JSON HMAC) and X-Signature-Simple fallback.
 * Rejects stale timestamps older than 5 minutes unless in mock mode.
 */
import crypto from 'node:crypto';
function timingSafeEqualHex(a, b) {
    const aa = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (aa.length !== bb.length)
        return false;
    return crypto.timingSafeEqual(aa, bb);
}
function sortKeys(value) {
    if (Array.isArray(value))
        return value.map(sortKeys);
    if (value && typeof value === 'object') {
        const obj = value;
        return Object.keys(obj).sort().reduce((acc, key) => {
            acc[key] = sortKeys(obj[key]);
            return acc;
        }, {});
    }
    return value;
}
function shortenFloats(value) {
    if (Array.isArray(value))
        return value.map(shortenFloats);
    if (value && typeof value === 'object') {
        const obj = value;
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, shortenFloats(v)]));
    }
    if (typeof value === 'number' && !Number.isInteger(value) && value % 1 === 0) {
        return Math.trunc(value);
    }
    return value;
}
function isTimestampFresh(timestamp) {
    if (!timestamp)
        return false;
    const now = Math.floor(Date.now() / 1000);
    const incoming = Number.parseInt(timestamp, 10);
    return Number.isFinite(incoming) && Math.abs(now - incoming) <= 300;
}
export function verifyDiditWebhookV2(jsonBody, signature, timestamp) {
    const secret = process.env['DIDIT_WEBHOOK_SECRET'];
    if (!signature || !secret)
        return false;
    if (!isTimestampFresh(timestamp))
        return false;
    const canonical = JSON.stringify(sortKeys(shortenFloats(jsonBody)));
    const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    return timingSafeEqualHex(expected, signature);
}
export function verifyDiditWebhookSimple(jsonBody, signature, timestamp) {
    const secret = process.env['DIDIT_WEBHOOK_SECRET'];
    if (!signature || !secret)
        return false;
    if (!isTimestampFresh(timestamp))
        return false;
    const body = jsonBody;
    const canonical = [
        body['timestamp'] ?? '',
        body['session_id'] ?? '',
        body['status'] ?? '',
        body['webhook_type'] ?? '',
    ].join(':');
    const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
    return timingSafeEqualHex(expected, signature);
}
function header(headers, name) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
}
export function verifyDiditWebhook(jsonBody, headers) {
    const timestamp = header(headers, 'x-timestamp');
    if (verifyDiditWebhookV2(jsonBody, header(headers, 'x-signature-v2'), timestamp)) {
        return { valid: true, method: 'v2' };
    }
    if (verifyDiditWebhookSimple(jsonBody, header(headers, 'x-signature-simple'), timestamp)) {
        return { valid: true, method: 'simple' };
    }
    return { valid: false, method: 'none' };
}
//# sourceMappingURL=diditWebhook.js.map