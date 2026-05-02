/**
 * server/services/check-engine.ts — Provider adapter pattern + check runner.
 *
 * G5 fix: Provider timeout is always treated as MANUAL_REVIEW (never CLEAR).
 * G10 fix: Mock adapters simulate realistic latency but are explicitly flagged.
 */
import { db } from '../db.js';
import { checkRequests, checkResults } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger.js';
import { env } from '../env.js';

// ─── Provider capability interface ───────────────────────────────────────────

export interface ProviderAdapter {
  readonly name: string;
  readonly capabilities: string[];
  runCheck(payload: CheckPayload): Promise<CheckResult>;
}

export interface CheckPayload {
  checkType: string;
  subjectData: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface CheckResult {
  outcome: 'CLEAR' | 'HIT' | 'POTENTIAL_HIT' | 'UNABLE_TO_VERIFY' | 'ERROR';
  rawResponse: unknown;
  parsedData: Record<string, unknown>;
  hitDetails: HitDetail[];
  score?: number;
  providerRef?: string;
}

export interface HitDetail {
  hitType: string;
  matchName?: string;
  matchScore?: number;
  source?: string;
  description?: string;
}

// ─── Mock adapter (dev / test) ────────────────────────────────────────────────

function simulatedDelay(): Promise<void> {
  const ms = 500 + Math.random() * 1500; // 0.5–2s realistic latency
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockAdapter: ProviderAdapter = {
  name: 'MOCK',
  capabilities: ['IDENTITY', 'REGISTRY', 'SANCTIONS', 'PEP', 'AML', 'ADDRESS'],
  async runCheck(payload) {
    await simulatedDelay();

    // Deterministic result based on check type for testing
    if (payload.checkType === 'SANCTIONS' || payload.checkType === 'PEP') {
      return {
        outcome:     'CLEAR',
        rawResponse: { mock: true, checkType: payload.checkType },
        parsedData:  { sanctionsHit: false, pepHit: false },
        hitDetails:  [],
        score:       0,
        providerRef: `MOCK-${Date.now()}`,
      };
    }

    return {
      outcome:     'CLEAR',
      rawResponse: { mock: true, checkType: payload.checkType, subject: payload.subjectData },
      parsedData:  { verified: true, matchConfidence: 0.97 },
      hitDetails:  [],
      score:       97,
      providerRef: `MOCK-${Date.now()}`,
    };
  },
};

// ─── Provider registry ────────────────────────────────────────────────────────

const ADAPTERS: Record<string, ProviderAdapter> = {
  MOCK: mockAdapter,
};

function getAdapter(provider: string): ProviderAdapter {
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    // Fall back to mock if not configured and mock providers enabled
    if (env.ENABLE_MOCK_PROVIDERS) {
      logger.warn({ provider }, 'Provider not configured, falling back to MOCK');
      return mockAdapter;
    }
    throw new Error(`Provider not configured: ${provider}`);
  }
  return adapter;
}

// ─── Main check runner ────────────────────────────────────────────────────────

export async function runProviderCheck(
  checkRequestId: string,
  workspaceId: string,
): Promise<void> {
  logger.info({ checkRequestId }, 'Starting provider check');

  // Mark as RUNNING
  await db
    .update(checkRequests)
    .set({ status: 'RUNNING', startedAt: new Date() })
    .where(eq(checkRequests.id, checkRequestId));

  const [checkReq] = await db
    .select()
    .from(checkRequests)
    .where(eq(checkRequests.id, checkRequestId))
    .limit(1);

  if (!checkReq) {
    logger.error({ checkRequestId }, 'Check request not found');
    return;
  }

  try {
    const adapter = getAdapter(checkReq.provider);

    // G5: Timeout guard — if timeoutAt has passed, treat as MANUAL_REVIEW (NEVER as CLEAR)
    const now = new Date();
    if (checkReq.timeoutAt && checkReq.timeoutAt < now) {
      await db
        .update(checkRequests)
        .set({ status: 'TIMEOUT', completedAt: now })
        .where(eq(checkRequests.id, checkRequestId));

      await db.insert(checkResults).values({
        checkRequestId,
        workspaceId,
        outcome:     'UNABLE_TO_VERIFY',
        rawResponse: { error: 'TIMEOUT', message: 'Provider check timed out — requires manual review' },
        parsedData:  { timedOut: true, requiresManualReview: true },
        hitDetails:  [],
      });

      logger.warn({ checkRequestId, provider: checkReq.provider }, 'Provider check timed out → MANUAL_REVIEW');
      return;
    }

    const result = await adapter.runCheck({
      checkType:   checkReq.checkType,
      subjectData: (checkReq.requestPayload as Record<string, unknown>) ?? {},
    });

    // Map outcome to check status
    const checkStatus: string =
      result.outcome === 'CLEAR'  ? 'PASS' :
      result.outcome === 'HIT'    ? 'FAIL' :
      result.outcome === 'ERROR'  ? 'ERROR' :
      'REFER';

    await db
      .update(checkRequests)
      .set({
        status:      checkStatus as typeof checkRequests.$inferInsert['status'],
        completedAt: new Date(),
        providerRef: result.providerRef,
      })
      .where(eq(checkRequests.id, checkRequestId));

    await db.insert(checkResults).values({
      checkRequestId,
      workspaceId,
      outcome:     result.outcome,
      rawResponse: result.rawResponse as Record<string, unknown>,
      parsedData:  result.parsedData,
      hitDetails:  result.hitDetails,
      score:       result.score?.toString(),
    });

    logger.info({ checkRequestId, outcome: result.outcome }, 'Provider check completed');
  } catch (err) {
    logger.error({ err, checkRequestId }, 'Provider check failed with error');

    await db
      .update(checkRequests)
      .set({ status: 'ERROR', completedAt: new Date() })
      .where(eq(checkRequests.id, checkRequestId));

    await db.insert(checkResults).values({
      checkRequestId,
      workspaceId,
      outcome:     'ERROR',
      rawResponse: { error: String(err) },
      parsedData:  { errorMessage: String(err) },
      hitDetails:  [],
    });
  }
}
