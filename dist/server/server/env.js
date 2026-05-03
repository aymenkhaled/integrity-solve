/**
 * server/env.ts — Environment variable validation (fail-fast).
 * All secrets declared here; never imported in client code.
 */
import 'dotenv/config';
function required(key) {
    const val = process.env[key];
    if (!val)
        throw new Error(`Missing required environment variable: ${key}`);
    return val;
}
function optional(key, fallback = '') {
    return process.env[key] ?? fallback;
}
export const env = {
    NODE_ENV: optional('NODE_ENV', 'development'),
    PORT: parseInt(optional('PORT', '3000'), 10),
    DATABASE_URL: required('DATABASE_URL'),
    SESSION_SECRET: required('SESSION_SECRET'),
    APP_URL: optional('APP_URL', 'http://localhost:3000'),
    // Email
    SMTP_HOST: optional('SMTP_HOST'),
    SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
    SMTP_USER: optional('SMTP_USER'),
    SMTP_PASS: optional('SMTP_PASS'),
    FROM_EMAIL: optional('FROM_EMAIL', 'noreply@integritysolve.com.au'),
    // SMS (Twilio)
    TWILIO_ACCOUNT_SID: optional('TWILIO_ACCOUNT_SID'),
    TWILIO_AUTH_TOKEN: optional('TWILIO_AUTH_TOKEN'),
    TWILIO_FROM_NUMBER: optional('TWILIO_FROM_NUMBER'),
    // Stripe
    STRIPE_SECRET_KEY: optional('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: optional('STRIPE_WEBHOOK_SECRET'),
    STRIPE_STARTER_PRICE_ID: optional('STRIPE_STARTER_PRICE_ID'),
    STRIPE_PRO_PRICE_ID: optional('STRIPE_PRO_PRICE_ID'),
    STRIPE_ENTERPRISE_PRICE_ID: optional('STRIPE_ENTERPRISE_PRICE_ID'),
    // Storage (Cloudflare R2)
    R2_ACCOUNT_ID: optional('R2_ACCOUNT_ID'),
    R2_ACCESS_KEY_ID: optional('R2_ACCESS_KEY_ID'),
    R2_SECRET_KEY: optional('R2_SECRET_KEY'),
    R2_BUCKET_NAME: optional('R2_BUCKET_NAME', 'integrity-solve'),
    R2_PUBLIC_URL: optional('R2_PUBLIC_URL'),
    // Redis (BullMQ)
    REDIS_URL: optional('REDIS_URL', 'redis://localhost:6379'),
    // Providers
    GREENID_API_KEY: optional('GREENID_API_KEY'),
    EQUIFAX_API_KEY: optional('EQUIFAX_API_KEY'),
    REFINITIV_API_KEY: optional('REFINITIV_API_KEY'),
    TRULIOO_API_KEY: optional('TRULIOO_API_KEY'),
    // Anthropic (AI features)
    ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY'),
    // Sentry
    SENTRY_DSN: optional('SENTRY_DSN'),
    // Feature flags
    ENABLE_MOCK_PROVIDERS: optional('ENABLE_MOCK_PROVIDERS', 'true') === 'true',
    ENABLE_STRIPE: optional('ENABLE_STRIPE', 'false') === 'true',
    ENABLE_SMS: optional('ENABLE_SMS', 'false') === 'true',
    ENABLE_EMAIL: optional('ENABLE_EMAIL', 'false') === 'true',
};
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
//# sourceMappingURL=env.js.map