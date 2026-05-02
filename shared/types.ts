/**
 * shared/types.ts — Shared TypeScript types for client + server.
 */

// ─── API response envelope ───────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Session / Auth ───────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  emailVerifiedAt: string | null;
  identityStatus: string;
}

export interface WorkspaceContext {
  id: string;
  legalName: string;
  tradingName: string | null;
  industryPathway: string | null;
  implementationStatus: string;
  billingStatus: string;
  subscriptionTier: string;
  trialEndsAt: string | null;
  role: string;
}

export interface AuthSession {
  user: SessionUser;
  workspace: WorkspaceContext | null;
  sessionId: string;
}

// ─── Check Engine ─────────────────────────────────────────────────────────────

export interface CheckRequestPayload {
  checkType: string;
  provider: string;
  subjectData: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface ProviderCheckResult {
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
  metadata?: Record<string, unknown>;
}

// ─── Program Wizard ───────────────────────────────────────────────────────────

export interface ProgramWizardStep {
  id: number;
  key: string;
  title: string;
  description: string;
  isRequired: boolean;
  isComplete: boolean;
}

export interface ProgramFormData {
  // Step 0: Business profile
  legalName?: string;
  tradingName?: string;
  abn?: string;
  acn?: string;
  pathway?: string;
  // Step 1: Designated services
  designatedServices?: string[];
  // Step 2: ML/TF risk assessment
  mlTfRiskRating?: string;
  mlTfRiskFactors?: Record<string, unknown>;
  // Step 3-12: other sections
  [key: string]: unknown;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationPayload {
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditAction {
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

// ─── Document generation ─────────────────────────────────────────────────────

export interface DocxGenerationRequest {
  templateType: 'AML_PROGRAM' | 'CDD_FORM' | 'EDD_FORM' | 'RISK_ASSESSMENT' | 'SMR_DRAFT';
  workspaceId: string;
  entityId: string;
  options?: Record<string, unknown>;
}

// ─── Risk scoring ─────────────────────────────────────────────────────────────

export interface RiskFactor {
  key: string;
  label: string;
  weight: number;
  value: number;
  rationale: string;
}

export interface RiskScoreResult {
  overallScore: number;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  modelVersion: string;
  calculatedAt: string;
}

// ─── Stripe / Billing ────────────────────────────────────────────────────────

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
}

export interface BillingPortalSession {
  portalUrl: string;
}

// ─── Error codes ─────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  UNAUTHENTICATED:         'UNAUTHENTICATED',
  FORBIDDEN:               'FORBIDDEN',
  NOT_FOUND:               'NOT_FOUND',
  VALIDATION_ERROR:        'VALIDATION_ERROR',
  CONFLICT:                'CONFLICT',
  RATE_LIMITED:            'RATE_LIMITED',
  INTERNAL_ERROR:          'INTERNAL_ERROR',
  WORKSPACE_SUSPENDED:     'WORKSPACE_SUSPENDED',
  SUBSCRIPTION_REQUIRED:   'SUBSCRIPTION_REQUIRED',
  IDENTITY_REQUIRED:       'IDENTITY_REQUIRED',
  EMAIL_NOT_VERIFIED:      'EMAIL_NOT_VERIFIED',
  REASON_TOO_SHORT:        'REASON_TOO_SHORT',
  PROVIDER_TIMEOUT:        'PROVIDER_TIMEOUT',
  CHECK_ALREADY_RUNNING:   'CHECK_ALREADY_RUNNING',
  ORPHAN_BO_DETECTED:      'ORPHAN_BO_DETECTED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
