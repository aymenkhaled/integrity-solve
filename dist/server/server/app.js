/**
 * server/app.ts — Express application factory.
 * Registers all middleware, rate limiters, and routes.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requestIdMiddleware } from './lib/request-id.js';
import { errorHandler, notFoundHandler } from './lib/error-handler.js';
import { env, isDev } from './env.js';
import logger from './lib/logger.js';
// Routes
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import customerRoutes from './routes/customers.js';
import checkRoutes from './routes/checks.js';
import escalationRoutes from './routes/escalations.js';
import programRoutes from './routes/programs.js';
import taskRoutes from './routes/tasks.js';
import auditRoutes from './routes/audit.js';
import notificationRoutes from './routes/notifications.js';
import healthRoutes from './routes/health.js';
import billingRoutes from './routes/billing.js';
import documentRoutes from './routes/documents.js';
import adminRoutes from './routes/admin.js';
import trainingRoutes from './routes/training.js';
import alertRoutes from './routes/alerts.js';
import reviewRoutes from './routes/reviews.js';
import riskRoutes from './routes/risk.js';
import analyticsRoutes from './routes/analytics.js';
import providerRoutes from './routes/providers.js';
import gatewayRoutes from './routes/gateway.js';
import whitelabelRoutes from './routes/whitelabel.js';
import groupRoutes from './routes/groups.js';
import seedRoutes from './routes/seed.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function createApp() {
    const app = express();
    // ─── Trust proxy (Replit / production) ────────────────────────────────────
    app.set('trust proxy', 1);
    // ─── Security headers ──────────────────────────────────────────────────────
    app.use(helmet({
        contentSecurityPolicy: false, // Managed by Vite in dev; prod CSP via nginx
        crossOriginEmbedderPolicy: false,
    }));
    // ─── CORS ─────────────────────────────────────────────────────────────────
    app.use(cors({
        origin: isDev ? true : env.APP_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));
    // ─── Body parsing ─────────────────────────────────────────────────────────
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());
    // ─── Request ID ───────────────────────────────────────────────────────────
    app.use(requestIdMiddleware);
    // ─── Request logging (dev) ────────────────────────────────────────────────
    if (isDev) {
        app.use((req, _res, next) => {
            logger.debug({ method: req.method, url: req.url, requestId: req.requestId }, 'Request');
            next();
        });
    }
    // ─── Rate limiting ────────────────────────────────────────────────────────
    const globalLimiter = rateLimit({
        windowMs: 60_000,
        max: 300,
        message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        standardHeaders: true,
        legacyHeaders: false,
    });
    const authLimiter = rateLimit({
        windowMs: 15 * 60_000, // 15 minutes
        max: 20,
        message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
    });
    app.use('/api', globalLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    // ─── API Routes ────────────────────────────────────────────────────────────
    app.use('/api/health', healthRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/workspaces', workspaceRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/checks', checkRoutes);
    app.use('/api/escalations', escalationRoutes);
    app.use('/api/programs', programRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/audit', auditRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/billing', billingRoutes);
    app.use('/api/documents', documentRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/training', trainingRoutes);
    app.use('/api/alerts', alertRoutes);
    app.use('/api/reviews', reviewRoutes);
    app.use('/api/risk', riskRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/providers', providerRoutes);
    app.use('/api/gateway', gatewayRoutes);
    app.use('/api/whitelabel', whitelabelRoutes);
    app.use('/api/groups', groupRoutes);
    app.use('/api/seed', seedRoutes);
    // ─── Static files (production) ────────────────────────────────────────────
    if (!isDev) {
        const distPath = path.resolve(__dirname, '../public');
        app.use(express.static(distPath));
        // SPA fallback
        app.get('*', (_req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }
    // ─── Error handling ────────────────────────────────────────────────────────
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map