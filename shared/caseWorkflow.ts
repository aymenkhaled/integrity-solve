export const CASE_PARTY_TYPES = ['individual', 'company', 'trust', 'beneficial_owner'] as const;
export type CasePartyType = typeof CASE_PARTY_TYPES[number];

export const CASE_STATUSES = [
  'DRAFT',
  'IN_PROGRESS',
  'AWAITING_CUSTOMER',
  'AWAITING_CHECKS',
  'AWAITING_REVIEW',
  'EVIDENCE_READY',
  'COMPLETED',
  'ARCHIVED',
] as const;
export type CaseStatus = typeof CASE_STATUSES[number];

export const CASE_RISK_LEVELS = ['not_assessed', 'low', 'medium', 'high'] as const;
export type CaseRiskLevel = typeof CASE_RISK_LEVELS[number];

export const DESIGNATED_SERVICES = [
  'Account providers',
  'Bullion dealing',
  'Digital currency exchange',
  'Gambling services',
  'International funds transfer',
  'Loan provision',
  'Mortgage broking',
  'Real estate agency',
  'Remittance dealing',
  'Solicitor / Conveyancing services',
  'Superannuation services',
] as const;

export const CHECK_CAPABILITIES = ['kyc', 'aml_screening', 'kyb', 'company_aml'] as const;
export type CheckCapability = typeof CHECK_CAPABILITIES[number];

export const CHECK_CAPABILITY_COPY: Record<CheckCapability, {
  label: string;
  shortLabel: string;
  description: string;
  tier: 'free' | 'paid';
}> = {
  kyc: {
    label: 'Identity verification',
    shortLabel: 'Identity',
    description: 'Didit hosted ID verification, liveness, and face match. This can use a KYC-only free workflow.',
    tier: 'free',
  },
  aml_screening: {
    label: 'AML / PEP / sanctions screening',
    shortLabel: 'AML screening',
    description: 'Checks sanctions, PEP, adverse media, and watchlist risk. This requires Didit credits.',
    tier: 'paid',
  },
  kyb: {
    label: 'Company verification',
    shortLabel: 'Company',
    description: 'Verifies a company or trust profile and registry-style business evidence. This requires Didit credits.',
    tier: 'paid',
  },
  company_aml: {
    label: 'Company AML screening',
    shortLabel: 'Company AML',
    description: 'Screens the entity and related business risk signals. This requires Didit credits.',
    tier: 'paid',
  },
};

export function checkCapabilityLabel(capability: string): string {
  return CHECK_CAPABILITY_COPY[capability as CheckCapability]?.label ?? capability;
}

export function checkCapabilityDescription(capability: string): string {
  return CHECK_CAPABILITY_COPY[capability as CheckCapability]?.description ?? 'Recommended verification check.';
}

export function isKnownCheckCapability(capability: string): capability is CheckCapability {
  return (CHECK_CAPABILITIES as readonly string[]).includes(capability);
}
