/**
 * server/index.ts — Entry point. Starts Express + optional BullMQ workers.
 */
import { createApp } from './app.js';
import { env } from './env.js';
import { checkDatabaseConnection } from './db.js';
import logger from './lib/logger.js';

async function bootstrap() {
  // Verify DB connection before starting
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.error('Cannot connect to database — aborting startup');
    process.exit(1);
  }

  logger.info('✅ Database connection verified');

  const app = createApp();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `🚀 INTEGRITY SOLVE server listening on port ${env.PORT}`,
    );
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');
    server.close(() => {
      logger.info('Server closed gracefully');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
