/**
 * server/routes/providers.ts — D4: Provider Marketplace.
 * Shows all available check provider adapters, their configuration status,
 * and per-provider statistics pulled from check_results.
 */
import { Router } from 'express';
import { db } from '../db.js';
import { checkRequests, checkResults } from '../../shared/schema.js';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { ok } from '../lib/validate.js';
import { requireWorkspace } from '../lib/auth-session.js';
import { getWorkspaceId } from '../lib/workspace-guard.js';
import { env } from '../env.js';

const router = Router();

// Provider catalog — static manifest of all supported providers
const PROVIDER_CATALOG = [
  {
    id:          'GREENID',
    name:        'GreenID',
    vendor:      'Equifax',
    category:    'IDENTITY',
    description: 'Australian identity verification using driver licence, passport, Medicare, and document OCR.',
    checkTypes:  ['IDENTITY'],
    docUrl:      'https://vixverify.com/greenid/',
    envKey:      'GREENID_API_KEY',
    sla:         '< 2s',
    region:      'AU',
    features:    ['Driver Licence', 'Passport', 'Medicare', 'Document OCR', 'Biometrics'],
  },
  {
    id:          'EQUIFAX',
    name:        'Equifax Commercial',
    vendor:      'Equifax',
    category:    'IDENTITY',
    description: 'Credit bureau identity and business verification for Australian entities.',
    checkTypes:  ['IDENTITY', 'REGISTRY'],
    docUrl:      'https://www.equifax.com.au',
    envKey:      'EQUIFAX_API_KEY',
    sla:         '< 3s',
    region:      'AU',
    features:    ['Credit Identity', 'ABN/ACN Lookup', 'Director Search', 'PPSR'],
  },
  {
    id:          'REFINITIV',
    name:        'World-Check One',
    vendor:      'LSEG (Refinitiv)',
    category:    'SANCTIONS',
    description: 'Global sanctions, PEP, and adverse media screening used by major banks and AUSTRAC reporters.',
    checkTypes:  ['SANCTIONS', 'PEP'],
    docUrl:      'https://www.refinitiv.com/en/financial-crime/world-check-kyc-screening',
    envKey:      'REFINITIV_API_KEY',
    sla:         '< 1s',
    region:      'GLOBAL',
    features:    ['UN/OFAC/DFAT Sanctions', 'PEP Screening', 'Adverse Media', 'Relative & Close Associate'],
  },
  {
    id:          'TRULIOO',
    name:        'GlobalGateway',
    vendor:      'Trulioo',
    category:    'IDENTITY',
    description: 'Global identity verification covering 195+ countries with 400+ data sources.',
    checkTypes:  ['IDENTITY'],
    docUrl:      'https://www.trulioo.com',
    envKey:      'TRULIOO_API_KEY',
    sla:         '< 4s',
    region:      'GLOBAL',
    features:    ['195+ Countries', 'Document Verification', 'Business KYB', 'eID'],
  },
  {
    id:          'ABRS',
    name:        'ABR Lookup',
    vendor:      'Australian Business Register',
    category:    'REGISTRY',
    description: 'Official ABN/ACN verification and business entity data from the Australian Business Register.',
    checkTypes:  ['REGISTRY'],
    docUrl:      'https://abr.business.gov.au',
    envKey:      null, // Public API — no key required
    sla:         '< 2s',
    region:      'AU',
    features:    ['ABN Verification', 'ACN Lookup', 'GST Status', 'Entity Type', 'Business Name'],
  },
  {
    id:          'ASIC',
    name:        'ASIC Connect',
    vendor:      'ASIC',
    category:    'REGISTRY',
    description: 'Australian company and officeholder search via ASIC Connect.',
    checkTypes:  ['REGISTRY'],
    docUrl:      'https://connectonline.asic.gov.au',
    envKey:      null, // Public API — no key required
    sla:         '< 3s',
    region:      'AU',
    features:    ['Company Search', 'Director Lookup', 'Document Orders', 'Annual Return Status'],
  },
  {
    id:          'AUSTRAC_ECDD',
    name:        'AUSTRAC eCDD',
    vendor:      'AUSTRAC',
    category:    'SANCTIONS',
    description: 'AUSTRAC electronic CDD framework — sanctions list and DFAT-administered designations.',
    checkTypes:  ['SANCTIONS'],
    docUrl:      'https://www.austrac.gov.au',
    envKey:      null, // Government data — no key required
    sla:         '< 1s',
    region:      'AU',
    features:    ['DFAT Designations', 'Charter-Based Sanctions', 'UNSCR Lists', 'Domestic Lists'],
  },
  {
    id:          'MOCK',
    name:        'Mock Provider',
    vendor:      'Integrity Solve',
    category:    'IDENTITY',
    description: 'Development and testing adapter that simulates all check types with configurable outcomes.',
    checkTypes:  ['IDENTITY', 'SANCTIONS', 'PEP', 'REGISTRY'],
    docUrl:      null,
    envKey:      null, // Always available
    sla:         '< 100ms',
    region:      'N/A',
    features:    ['All Check Types', 'Configurable Outcomes', 'Zero Latency', 'Dev/Test Only'],
  },
];

// ─── GET /api/providers ───────────────────────────────────────────────────────

router.get('/', requireWorkspace, async (req, res, next) => {
  try {
    const workspaceId = getWorkspaceId(req);

    // Per-provider check stats from DB
    const providerStats = await db
      .select({
        provider: checkRequests.provider,
        total:    count(),
        passed:   sql<number>`COUNT(*) FILTER (WHERE ${checkResults.result} = 'PASS')`,
        failed:   sql<number>`COUNT(*) FILTER (WHERE ${checkResults.result} = 'FAIL')`,
        review:   sql<number>`COUNT(*) FILTER (WHERE ${checkResults.result} = 'MANUAL_REVIEW')`,
      })
      .from(checkRequests)
      .leftJoin(checkResults, eq(checkResults.checkRequestId, checkRequests.id))
      .where(eq(checkRequests.workspaceId, workspaceId))
      .groupBy(checkRequests.provider);

    // Recent activity per provider (last 5 workspace-wide)
    const recent = await db
      .select({
        provider:  checkRequests.provider,
        checkType: checkRequests.checkType,
        status:    checkRequests.status,
        result:    checkResults.result,
        createdAt: checkRequests.createdAt,
      })
      .from(checkRequests)
      .leftJoin(checkResults, eq(checkResults.checkRequestId, checkRequests.id))
      .where(eq(checkRequests.workspaceId, workspaceId))
      .orderBy(desc(checkRequests.createdAt))
      .limit(10);

    // Build configured status from env
    const configured: Record<string, boolean> = {
      GREENID:      !!process.env.GREENID_API_KEY,
      EQUIFAX:      !!process.env.EQUIFAX_API_KEY,
      REFINITIV:    !!process.env.REFINITIV_API_KEY,
      TRULIOO:      !!process.env.TRULIOO_API_KEY,
      ABRS:         true, // public API
      ASIC:         true, // public API
      AUSTRAC_ECDD: true, // government data
      MOCK:         true, // always available
    };

    const statsMap: Record<string, { total: number; passed: number; failed: number; review: number }> = {};
    for (const stat of providerStats) {
      if (stat.provider) {
        statsMap[stat.provider] = {
          total:  Number(stat.total),
          passed: Number(stat.passed),
          failed: Number(stat.failed),
          review: Number(stat.review),
        };
      }
    }

    const providers = PROVIDER_CATALOG.map((p) => ({
      ...p,
      configured:    configured[p.id] ?? false,
      stats:         statsMap[p.id] ?? { total: 0, passed: 0, failed: 0, review: 0 },
    }));

    return ok(res, {
      providers,
      recent:   recent.map((r) => ({
        provider:  r.provider,
        checkType: r.checkType,
        status:    r.status,
        result:    r.result,
        createdAt: r.createdAt,
      })),
      summary: {
        total:       providers.length,
        configured:  Object.values(configured).filter(Boolean).length,
        totalChecks: providerStats.reduce((s, p) => s + Number(p.total), 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
