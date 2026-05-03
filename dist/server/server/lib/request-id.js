import { createId } from '@paralleldrive/cuid2';
export function requestIdMiddleware(req, _res, next) {
    req.requestId = req.headers['x-request-id'] || createId();
    next();
}
//# sourceMappingURL=request-id.js.map