export class AppError extends Error {
    code;
    statusCode;
    field;
    details;
    constructor(code, message, statusCode = 400, field, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.field = field;
        this.details = details;
        this.name = 'AppError';
    }
}
export class NotFoundError extends AppError {
    constructor(entity = 'Resource') {
        super('NOT_FOUND', `${entity} not found`, 404);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
    }
}
export class UnauthenticatedError extends AppError {
    constructor() {
        super('UNAUTHENTICATED', 'Authentication required', 401);
    }
}
export class ValidationError extends AppError {
    constructor(message, field, details) {
        super('VALIDATION_ERROR', message, 422, field, details);
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super('CONFLICT', message, 409);
    }
}
export class RateLimitError extends AppError {
    constructor() {
        super('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
    }
}
export class SubscriptionRequiredError extends AppError {
    constructor(message = 'Active subscription required') {
        super('SUBSCRIPTION_REQUIRED', message, 402);
    }
}
export class ReasonTooShortError extends AppError {
    constructor() {
        super('REASON_TOO_SHORT', 'Reason must be at least 10 characters', 422, 'reason');
    }
}
export function assertReason(reason) {
    if (!reason || reason.trim().length < 10) {
        throw new ReasonTooShortError();
    }
}
//# sourceMappingURL=errors.js.map