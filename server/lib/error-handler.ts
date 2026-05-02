/**
 * server/lib/error-handler.ts — Global Express error handler.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.js';
import logger from './logger.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof ZodError) {
    const first = err.errors[0];
    res.status(422).json({
      ok: false,
      error: {
        code:    'VALIDATION_ERROR',
        message: first?.message ?? 'Validation failed',
        field:   first?.path?.join('.'),
        details: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, 'Application error');
    } else {
      logger.warn({ code: err.code, message: err.message, requestId }, 'Client error');
    }
    res.status(err.statusCode).json({
      ok: false,
      error: {
        code:    err.code,
        message: err.message,
        field:   err.field,
        details: err.details,
      },
    });
    return;
  }

  // Unknown error
  logger.error({ err, requestId }, 'Unhandled server error');
  res.status(500).json({
    ok: false,
    error: {
      code:    'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}
