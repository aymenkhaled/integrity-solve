/**
 * server/lib/logger.ts — Structured logger using pino.
 */
import pino from 'pino';
import { isDev } from '../env.js';
export const logger = pino({
    level: isDev ? 'debug' : 'info',
    ...(isDev
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }
        : {}),
});
export default logger;
//# sourceMappingURL=logger.js.map