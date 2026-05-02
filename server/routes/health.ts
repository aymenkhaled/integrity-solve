/**
 * server/routes/health.ts — Health check endpoints.
 */
import { Router } from 'express';
import { checkDatabaseConnection } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const dbOk = await checkDatabaseConnection();
  const status = dbOk ? 'ok' : 'degraded';

  res.status(dbOk ? 200 : 503).json({
    status,
    version:   process.env['npm_package_version'] ?? '0.1.0',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'error',
    },
  });
});

export default router;
