# 14 — Environment & Secrets

> Use Replit's **Secrets** for all values below. Never commit them. Use the `environment-secrets` skill to add/request them. Validate at startup with Zod (file 02 §2.5 / `server/env.ts`).

---

## 14.1 Required secrets — by phase

### Phase 0 — Bootstrap

| Secret | Where to obtain | Notes |
|--------|-----------------|-------|
| `DATABASE_URL` | Replit Postgres (built-in tool) | Auto-set by Replit DB tool. Format: `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Generate yourself | 64+ random chars: `openssl rand -base64 64` |
| `NODE_ENV` | Set to `development` in workflow command, `production` on deploy | |
| `PORT` | Replit-injected | Default 5000 in dev. Bind to `0.0.0.0`. |

### Phase 1 — Auth + email

| Secret | Where | Notes |
|--------|-------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | Or any SMTP provider. |
| `SMTP_PORT` | `587` | TLS via STARTTLS |
| `SMTP_USER` | Gmail address | Must match `EMAIL_FROM_ADDRESS` |
| `SMTP_PASS` | Gmail **app password** | Not your normal password. Enable 2FA, then generate an app password. |
| `EMAIL_FROM_ADDRESS` | `noreply@yourdomain.com` | Configure SPF/DKIM/DMARC for production |
| `EMAIL_FROM_NAME` | `Integrity Solve` | Display name |
| `APP_URL` | `https://yourapp.replit.app` (prod) or `http://localhost:5000` (dev) | Used in email links |

### Phase 2 — File storage (R2)

| Secret | Where |
|--------|-------|
| `R2_ACCOUNT_ID` | Cloudflare R2 → Account ID |
| `R2_ACCESS_KEY_ID` | R2 → Manage R2 API Tokens → Create Token |
| `R2_SECRET_ACCESS_KEY` | Same place |
| `R2_BUCKET_NAME` | The bucket you create |
| `R2_PUBLIC_URL_BASE` | Optional CDN prefix; default `https://<account>.r2.cloudflarestorage.com/<bucket>` |
| `R2_REGION` | `auto` for R2 |

> **Check Replit Integrations first.** S3/R2 connectors may exist that simplify this.

### Phase 3 — SMS (defer until you reach mobile OTP)

| Secret | Where |
|--------|-------|
| `TWILIO_ACCOUNT_SID` | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Twilio Console |
| `TWILIO_FROM_NUMBER` | A Twilio-purchased number, or use Twilio Verify service |
| `TWILIO_VERIFY_SERVICE_SID` | Optional, if using Twilio Verify (recommended for OTP) |

### Phase 4 — Billing + providers

| Secret | Where |
|--------|-------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key |
| `STRIPE_PUBLIC_KEY` | Same screen → Publishable key (used by client) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint signing secret |
| `STRIPE_PRICE_STARTER` | The price ID for the Starter tier |
| `STRIPE_PRICE_PROFESSIONAL` | Price ID Professional tier |
| `STRIPE_PRICE_ENTERPRISE` | Price ID Enterprise tier |
| `STRIPE_PRICE_GROUP` | Price ID Group tier |
| `STRIPE_PRICE_LIFETIME` | Price ID Lifetime (one-time) |
| `STRIPE_PRICE_USAGE_CHECK` | Price ID for metered check usage |
| `FACIA_API_KEY` | Facia portal → API keys |
| `FACIA_WEBHOOK_SECRET` | Facia portal → Webhook signing secret |
| `FACIA_BASE_URL` | `https://api.facia.com/v2` (or sandbox URL) |
| `AML_WATCHER_API_KEY` | AML Watcher dashboard |
| `AML_WATCHER_WEBHOOK_SECRET` | Same |
| `AML_WATCHER_BASE_URL` | `https://api.amlwatcher.com` |
| `ABR_GUID` | Free at https://abr.business.gov.au/Tools/WebServicesGuide — paste into ABN lookup adapter config (no secret) |

> **Check Replit Integrations.** Stripe definitely has one — use it instead of manual secrets if available.

### Phase 5 — Monitoring

| Secret | Where |
|--------|-------|
| `SENTRY_DSN` | Sentry project → Settings → Client Keys (DSN) |
| `SENTRY_AUTH_TOKEN` | Sentry → Account → Auth Tokens (for source map upload) |
| `SENTRY_ORG` | Your Sentry org slug |
| `SENTRY_PROJECT` | Your Sentry project slug |

### Diamond features

| Secret | Where | When |
|--------|-------|------|
| `ANTHROPIC_API_KEY` | Anthropic console | Diamond 1 (AI narratives) |
| `ANTHROPIC_MODEL` | e.g. `claude-sonnet-4-5` | Diamond 1 |
| `REDIS_URL` | Upstash console (Replit Integration may exist) | Diamond 2 (BullMQ for monitoring) |
| `CRISP_WEBSITE_ID` | Crisp dashboard | Optional landing live chat |
| `POSTHOG_KEY` | PostHog (optional) | Optional analytics |
| `POSTHOG_HOST` | `https://app.posthog.com` | Optional |

### Diamond 7 — Customer portal

| Secret | Notes |
|--------|-------|
| `CUSTOMER_PORTAL_URL` | The subdomain you use (e.g. `https://portal.yourapp.replit.app`) — used in invite emails |
| `CUSTOMER_PORTAL_FROM_EMAIL` | Optional separate sender for portal invites |

---

## 14.2 `server/env.ts` template

```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(5000),
  APP_URL: z.string().url(),

  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),

  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM_ADDRESS: z.string().email(),
  EMAIL_FROM_NAME: z.string(),

  // Optional / phased — make them optional initially, switch to required as phases progress
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL_BASE: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PROFESSIONAL: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_GROUP: z.string().optional(),
  STRIPE_PRICE_LIFETIME: z.string().optional(),
  STRIPE_PRICE_USAGE_CHECK: z.string().optional(),

  FACIA_API_KEY: z.string().optional(),
  FACIA_WEBHOOK_SECRET: z.string().optional(),
  FACIA_BASE_URL: z.string().url().optional(),

  AML_WATCHER_API_KEY: z.string().optional(),
  AML_WATCHER_WEBHOOK_SECRET: z.string().optional(),
  AML_WATCHER_BASE_URL: z.string().url().optional(),

  SENTRY_DSN: z.string().url().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),

  REDIS_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

---

## 14.3 `.env.example`

See `templates/.env.example`. Commit it; never commit a real `.env`.
