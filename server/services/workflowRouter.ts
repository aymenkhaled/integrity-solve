/**
 * server/services/workflowRouter.ts - Milestone 1 wizard routing logic.
 * Routes program-setup and transaction/CDD wizard answers to recommended
 * checks, risk levels, and escalation paths.
 */

export type ProgramAnswers = {
  industryPathway?: string;
  businessStructure?: string;
  staffCount?: number;
  locations?: string[];
  designatedServices?: string[];
  existingAmlProgram?: boolean;
  complianceOfficerNamed?: boolean;
  riskApproach?: string;
  abn?: string;
};

export type TransactionAnswers = {
  designatedService?: string;
  providedFor?: 'individual' | 'company' | 'trust' | 'beneficial_owner';
  customerIsNew?: boolean;
  beneficialOwnersKnown?: boolean;
  highRiskJurisdiction?: boolean;
  politicallyExposedPerson?: boolean;
  adverseMedia?: boolean;
  complexOwnership?: boolean;
  sourceOfFundsRequired?: boolean;
  transactionValue?: number;
  currency?: string;
};

export type ProgramRouteResult = {
  completionStatus: 'incomplete' | 'ready_for_summary';
  missing: string[];
  recommendedNextStep: string;
  riskSignals: string[];
  outputs: string[];
};

export type TransactionRouteResult = {
  riskLevel: 'low' | 'medium' | 'high';
  recommendedChecks: string[];
  approvalPath: 'standard_cdd_can_proceed' | 'reviewer_or_compliance_officer_required';
  escalations: string[];
  requiredPartyChecks: string[];
  requiredDocuments: string[];
  caseSummaryInputs: string[];
};

export function routeProgramWizard(answers: ProgramAnswers): ProgramRouteResult {
  const missing: string[] = [];

  if (!answers.industryPathway) missing.push('industry pathway');
  if (!answers.designatedServices?.length) missing.push('designated services');
  if (!answers.complianceOfficerNamed) missing.push('compliance officer appointment');

  const riskSignals = [
    (answers.designatedServices?.length ?? 0) > 1 ? 'multiple designated services' : null,
    (answers.locations?.length ?? 0) > 1 ? 'multiple office locations' : null,
    answers.existingAmlProgram === false ? 'no existing AML/CTF program' : null,
    answers.staffCount && answers.staffCount > 50 ? 'large staff count - training program required' : null,
  ].filter(Boolean) as string[];

  return {
    completionStatus: missing.length ? 'incomplete' : 'ready_for_summary',
    missing,
    recommendedNextStep: missing.length
      ? 'continue_program_setup'
      : 'generate_program_routing_summary',
    riskSignals,
    outputs: [
      'business profile summary',
      'designated service applicability summary',
      'initial AML/CTF program setup checklist',
    ],
  };
}

export function routeTransactionWizard(answers: TransactionAnswers): TransactionRouteResult {
  const checks: string[] = [];
  const escalations: string[] = [];
  const requiredPartyChecks: string[] = [];
  const requiredDocuments: string[] = [
    'designated service evidence',
    'customer identity or entity details',
    'transaction purpose and value',
  ];

  // Route checks by party type
  if (answers.providedFor === 'individual' || answers.providedFor === 'beneficial_owner') {
    checks.push('kyc', 'aml_screening');
    requiredDocuments.push('identity document evidence');
  }

  if (answers.providedFor === 'company' || answers.providedFor === 'trust') {
    checks.push('kyb', 'company_aml');
    requiredDocuments.push('company, trust, or registry evidence');
    requiredDocuments.push('beneficial owner / controller details');
    requiredPartyChecks.push(
      'collect directors, officers, trustees, and controllers',
      'run person-level identity verification for each required beneficial owner / controller',
      'run person-level AML screening for each required beneficial owner / controller',
    );
    if (answers.beneficialOwnersKnown === false || answers.complexOwnership) {
      escalations.push('beneficial ownership review required');
    }
  }

  // Additional escalation triggers
  if (answers.politicallyExposedPerson) escalations.push('PEP review required');
  if (answers.adverseMedia) escalations.push('adverse media review required');
  if (answers.highRiskJurisdiction) escalations.push('high-risk jurisdiction review required');
  if (answers.sourceOfFundsRequired) {
    escalations.push('source of funds / source of wealth evidence required');
    requiredDocuments.push('source of funds / source of wealth evidence');
  }
  if (answers.transactionValue && answers.transactionValue >= 10000) {
    escalations.push('threshold transaction report (TTR) may be required - value >= $10,000 AUD');
    requiredDocuments.push('threshold transaction report assessment');
  }

  const riskLevel: 'low' | 'medium' | 'high' =
    escalations.length >= 2 ? 'high' :
    escalations.length === 1 ? 'medium' :
    'low';

  return {
    riskLevel,
    recommendedChecks: [...new Set(checks)],
    approvalPath: escalations.length
      ? 'reviewer_or_compliance_officer_required'
      : 'standard_cdd_can_proceed',
    escalations,
    requiredPartyChecks: [...new Set(requiredPartyChecks)],
    requiredDocuments: [...new Set(requiredDocuments)],
    caseSummaryInputs: [
      'designated service',
      'party type',
      'recommended checks',
      'risk triggers',
      'required people and documents',
      'reviewer decision',
      'audit timeline',
    ],
  };
}
