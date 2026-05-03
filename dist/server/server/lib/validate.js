export function validate(schema, source = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            next(result.error);
            return;
        }
        // Replace the source with parsed+coerced data
        req[source] = result.data;
        next();
    };
}
export function validateBody(schema) {
    return validate(schema, 'body');
}
export function validateQuery(schema) {
    return validate(schema, 'query');
}
export function ok(res, data, status = 200, meta) {
    res.status(status).json({ ok: true, data, ...(meta ? { meta } : {}) });
}
export function paginated(res, items, total, page, limit) {
    res.json({
        ok: true,
        data: {
            items,
            total,
            page,
            limit,
            hasMore: page * limit < total,
        },
    });
}
//# sourceMappingURL=validate.js.map