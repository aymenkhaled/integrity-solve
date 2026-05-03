/**
 * server/lib/validate.ts — Zod validation helper for Express routes.
 */
import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace the source with parsed+coerced data
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return validate(schema, 'body');
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return validate(schema, 'query');
}

export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>): void {
  res.status(status).json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function paginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
): void {
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
