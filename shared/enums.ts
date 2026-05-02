/**
 * shared/enums.ts — TypeScript enum mirrors of Postgres pgEnum values.
 * Keep in lock-step with schema.ts enums.
 */

export enum UserRole {
  WORKSPACE_ADMIN     = 'WORKSPACE_ADMIN',
  COMPLIANCE_OFFICER  = 'COMPLIANCE_OFFICER',
  PROGRAM_CONTRIBUTOR = 'PROGRAM_CONTRIBUTOR',
  ONBOARDING_USER     = 'ONBOARDING_USER',
  REVIEWER            = 'REVIEWER',
  READ_ONLY           = 'READ_ONLY',
  PLATFORM_ADMIN      = 'PLATFORM_ADMIN',
  SUPPORT             = 'SUPPORT',
}

export enum IdentityStatus {
  PENDING     = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFIED    = 'VERIFIED',
  FAILED      = 'FAILED',
  EXPIRED     = 'EXPIRED',
}

export enum RegistryStatus {
  PENDING  = 'PENDING',
  VERIFIED = 'VERIFIED',
  MANUAL   = 'MANUAL',
  MISMATCH = 'MISMATCH',
}

export enum IndustryPathway {
  ACCOUNTING             = 'ACCOUNTING',
  LEGAL                  = 'LEGAL',
  REAL_ESTATE            = 'REAL_ESTATE',
  FINANCIAL_SERVICES     = 'FINANCIAL_SERVICES',
  GAMBLING               = 'GAMBLING',
  PRECIOUS_METALS        = 'PRECIOUS_METALS',
  TRUST_COMPANY_SERVICES = 'TRUST_COMPANY_SERVICES',
  OTHER                  = 'OTHER',
}

export enum ImplementationStatus {
  NOT_STARTED       = 'NOT_STARTED',
  IN_PROGRESS       = 'IN_PROGRESS',
  COMPLETE          = 'COMPLETE',
  REQUIRES_REVISION = 'REQUIRES_REVISION',
}

export enum BillingStatus {
  INACTIVE       = 'INACTIVE',
  SETUP_PENDING  = 'SETUP_PENDING',
  TRIALING       = 'TRIALING',
  ACTIVE         = 'ACTIVE',
  PAST_DUE       = 'PAST_DUE',
  SUSPENDED      = 'SUSPENDED',
  CANCELLED      = 'CANCELLED',
}

export enum MembershipStatus {
  PENDING   = 'PENDING',
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED   = 'REVOKED',
}

export enum SubscriptionTier {
  TRIAL        = 'TRIAL',
  STARTER      = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE   = 'ENTERPRISE',
  GROUP        = 'GROUP',
  LIFETIME     = 'LIFETIME',
}

export enum NotificationChannel {
  IN_APP  = 'IN_APP',
  EMAIL   = 'EMAIL',
  SMS     = 'SMS',
  WEBHOOK = 'WEBHOOK',
}

export enum CustomerStatus {
  DRAFT          = 'DRAFT',
  PENDING_CDD    = 'PENDING_CDD',
  CDD_IN_PROGRESS = 'CDD_IN_PROGRESS',
  ACTIVE         = 'ACTIVE',
  SUSPENDED      = 'SUSPENDED',
  EXITED         = 'EXITED',
  REJECTED       = 'REJECTED',
}

export enum CustomerType {
  INDIVIDUAL   = 'INDIVIDUAL',
  COMPANY      = 'COMPANY',
  TRUST        = 'TRUST',
  PARTNERSHIP  = 'PARTNERSHIP',
  ASSOCIATION  = 'ASSOCIATION',
  GOVERNMENT   = 'GOVERNMENT',
  OTHER        = 'OTHER',
}

export enum RiskRating {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
  UNRATED  = 'UNRATED',
}

export enum CddLevel {
  SDD      = 'SDD',
  STANDARD = 'STANDARD',
  EDD      = 'EDD',
}

export enum CheckType {
  IDENTITY = 'IDENTITY',
  REGISTRY = 'REGISTRY',
  SANCTIONS = 'SANCTIONS',
  PEP      = 'PEP',
  AML      = 'AML',
  ADDRESS  = 'ADDRESS',
  DOCUMENT = 'DOCUMENT',
}

export enum CheckStatus {
  PENDING       = 'PENDING',
  RUNNING       = 'RUNNING',
  PASS          = 'PASS',
  FAIL          = 'FAIL',
  REFER         = 'REFER',
  ERROR         = 'ERROR',
  TIMEOUT       = 'TIMEOUT',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export enum CheckOutcome {
  CLEAR               = 'CLEAR',
  HIT                 = 'HIT',
  POTENTIAL_HIT       = 'POTENTIAL_HIT',
  UNABLE_TO_VERIFY    = 'UNABLE_TO_VERIFY',
  ERROR               = 'ERROR',
}

export enum Provider {
  GREENID      = 'GREENID',
  EQUIFAX      = 'EQUIFAX',
  ILLION       = 'ILLION',
  REFINITIV    = 'REFINITIV',
  TRULIOO      = 'TRULIOO',
  ACIC         = 'ACIC',
  ASIC_CONNECT = 'ASIC_CONNECT',
  ABR          = 'ABR',
  MOCK         = 'MOCK',
}

export enum DocumentType {
  AML_PROGRAM          = 'AML_PROGRAM',
  RISK_ASSESSMENT      = 'RISK_ASSESSMENT',
  CDD_FORM             = 'CDD_FORM',
  EDD_FORM             = 'EDD_FORM',
  SMR_DRAFT            = 'SMR_DRAFT',
  SMR_SUBMITTED        = 'SMR_SUBMITTED',
  EVIDENCE_BUNDLE      = 'EVIDENCE_BUNDLE',
  TRAINING_CERTIFICATE = 'TRAINING_CERTIFICATE',
  BOARD_MINUTES        = 'BOARD_MINUTES',
  POLICY               = 'POLICY',
}

export enum EscalationStatus {
  DRAFT              = 'DRAFT',
  UNDER_REVIEW       = 'UNDER_REVIEW',
  ESCALATED_TO_SMR   = 'ESCALATED_TO_SMR',
  SMR_SUBMITTED      = 'SMR_SUBMITTED',
  CLOSED_NO_ACTION   = 'CLOSED_NO_ACTION',
  CLOSED_FALSE_POSITIVE = 'CLOSED_FALSE_POSITIVE',
}

export enum SmrStatus {
  DRAFT           = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED        = 'APPROVED',
  SUBMITTED       = 'SUBMITTED',
  REJECTED        = 'REJECTED',
}

export enum ReviewStatus {
  SCHEDULED   = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE    = 'COMPLETE',
  OVERDUE     = 'OVERDUE',
  CANCELLED   = 'CANCELLED',
}

export enum TaskStatus {
  OPEN        = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE    = 'COMPLETE',
  CANCELLED   = 'CANCELLED',
  BLOCKED     = 'BLOCKED',
}

export enum TaskPriority {
  LOW    = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH   = 'HIGH',
  URGENT = 'URGENT',
}

export enum AlertSeverity {
  INFO     = 'INFO',
  WARNING  = 'WARNING',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  OPEN           = 'OPEN',
  ACKNOWLEDGED   = 'ACKNOWLEDGED',
  RESOLVED       = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

export enum TrainingStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  EXPIRED     = 'EXPIRED',
  FAILED      = 'FAILED',
}

// RBAC — which roles can perform which operations
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.PLATFORM_ADMIN]: ['*'],
  [UserRole.SUPPORT]: ['workspace:read', 'user:read', 'audit:read'],
  [UserRole.WORKSPACE_ADMIN]: [
    'workspace:read', 'workspace:update',
    'member:read', 'member:invite', 'member:remove',
    'program:read', 'program:write', 'program:publish',
    'customer:read', 'customer:write', 'customer:delete',
    'check:read', 'check:run',
    'escalation:read', 'escalation:write',
    'smr:read', 'smr:write', 'smr:submit',
    'task:read', 'task:write',
    'billing:read', 'billing:manage',
    'audit:read',
    'training:read', 'training:write',
    'report:read',
  ],
  [UserRole.COMPLIANCE_OFFICER]: [
    'workspace:read',
    'member:read',
    'program:read', 'program:write',
    'customer:read', 'customer:write',
    'check:read', 'check:run',
    'escalation:read', 'escalation:write',
    'smr:read', 'smr:write', 'smr:submit',
    'task:read', 'task:write',
    'audit:read',
    'training:read',
    'report:read',
  ],
  [UserRole.PROGRAM_CONTRIBUTOR]: [
    'workspace:read',
    'program:read', 'program:write',
    'customer:read',
    'task:read', 'task:write',
    'training:read',
  ],
  [UserRole.ONBOARDING_USER]: [
    'workspace:read',
    'customer:read', 'customer:write',
    'check:read', 'check:run',
    'task:read', 'task:write',
  ],
  [UserRole.REVIEWER]: [
    'workspace:read',
    'customer:read',
    'check:read',
    'escalation:read',
    'smr:read',
    'audit:read',
    'report:read',
  ],
  [UserRole.READ_ONLY]: [
    'workspace:read',
    'customer:read',
    'program:read',
    'audit:read',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export const INDUSTRY_PATHWAY_LABELS: Record<IndustryPathway, string> = {
  [IndustryPathway.ACCOUNTING]:             'Accounting / Bookkeeping',
  [IndustryPathway.LEGAL]:                  'Legal Services',
  [IndustryPathway.REAL_ESTATE]:            'Real Estate Agents',
  [IndustryPathway.FINANCIAL_SERVICES]:     'Financial Services',
  [IndustryPathway.GAMBLING]:               'Gambling / Wagering',
  [IndustryPathway.PRECIOUS_METALS]:        'Precious Metals / Stones',
  [IndustryPathway.TRUST_COMPANY_SERVICES]: 'Trust & Company Services',
  [IndustryPathway.OTHER]:                  'Other Reporting Entity',
};

export const RISK_RATING_COLORS: Record<RiskRating, string> = {
  [RiskRating.LOW]:      'text-risk-low bg-risk-low/10',
  [RiskRating.MEDIUM]:   'text-risk-medium bg-risk-medium/10',
  [RiskRating.HIGH]:     'text-risk-high bg-risk-high/10',
  [RiskRating.CRITICAL]: 'text-risk-critical bg-risk-critical/10',
  [RiskRating.UNRATED]:  'text-muted-foreground bg-muted',
};
