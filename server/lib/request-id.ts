/**
 * server/lib/request-id.ts — Attach a unique request ID to every request.
 */
import type { Request, Response, NextFunction } from 'express';
import { createId } from '@paralleldrive/cuid2';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.requestId = (req.headers['x-request-id'] as string) || createId();
  next();
}
