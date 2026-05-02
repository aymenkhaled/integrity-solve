/**
 * shared/validators.ts — Zod schemas for all API payloads.
 */
import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(10, 'Password must be at least 10 characters')
              .regex(/[A-Z]/, 'Must contain an uppercase letter')
              .regex(/[0-9]/, 'Must contain a number')
              .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  fullName: z.string().min(2, 'Full name required').max(120),
  legalName: z.string().min(2, 'Business legal name required').max(200),
  abn:      z.string().regex(/^\d{11}$/, 'ABN must be 11 digits').optional(),
  pathway:  z.enum([
    'ACCOUNTING', 'LEGAL', 'REAL_ESTATE', 'FINANCIAL_SERVICES',
    'GAMBLING', 'PRECIOUS_METALS', 'TRUST_COMPANY_SERVICES', 'OTHER',
  ]).optional(),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const VerifyEmailSchema = z.object({
  code: z.string().length(6),
});

export const VerifyMobileSchema = z.object({
  mobile: z.string().regex(/^\+61[2-9]\d{8}$/, 'Valid Australian mobile required'),
  code:   z.string().length(6).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(10),
});

export const ResetPasswordSchema = z.object({
  token:       z.string().min(1),
  newPassword: z.string().min(10),
});

// ─── Workspace ────────────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  legalName:    z.string().min(2).max(200),
  tradingName:  z.string().max(200).optional(),
  abn:          z.string().regex(/^\d{11}$/).optional(),
  acn:          z.string().regex(/^\d{9}$/).optional(),
  pathway:      z.enum([
    'ACCOUNTING', 'LEGAL', 'REAL_ESTATE', 'FINANCIAL_SERVICES',
    'GAMBLING', 'PRECIOUS_METALS', 'TRUST_COMPANY_SERVICES', 'OTHER',
  ]).optional(),
});

export const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial();

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role:  z.enum([
    'WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'PROGRAM_CONTRIBUTOR',
    'ONBOARDING_USER', 'REVIEWER', 'READ_ONLY',
  ]),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
});

// ─── Program ──────────────────────────────────────────────────────────────────

export const SaveProgramStepSchema = z.object({
  step:   z.number().int().min(0).max(12),
  data:   z.record(z.unknown()),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const PublishProgramSchema = z.object({
  notes:  z.string().optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// ─── Customer ─────────────────────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  customerType:    z.enum(['INDIVIDUAL', 'COMPANY', 'TRUST', 'PARTNERSHIP', 'ASSOCIATION', 'GOVERNMENT', 'OTHER']),
  givenNames:      z.string().min(1).max(200).optional(),
  familyName:      z.string().min(1).max(200).optional(),
  dateOfBirth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nationality:     z.string().length(2).optional(),
  entityName:      z.string().min(1).max(300).optional(),
  abn:             z.string().regex(/^\d{11}$/).optional(),
  acn:             z.string().regex(/^\d{9}$/).optional(),
  email:           z.string().email().optional(),
  phone:           z.string().optional(),
  addressLine1:    z.string().max(300).optional(),
  suburb:          z.string().max(100).optional(),
  state:           z.string().max(50).optional(),
  postcode:        z.string().max(10).optional(),
  country:         z.string().length(2).default('AU'),
  externalRef:     z.string().max(100).optional(),
  metadata:        z.record(z.unknown()).optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const UpdateRiskRatingSchema = z.object({
  riskRating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reason:     z.string().min(10, 'Reason must be at least 10 characters'),
  riskNotes:  z.string().optional(),
});

export const CreateBeneficialOwnerSchema = z.object({
  givenNames:   z.string().min(1).max(200),
  familyName:   z.string().min(1).max(200),
  dateOfBirth:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nationality:  z.string().length(2).optional(),
  ownershipPct: z.number().min(0).max(100).optional(),
  isController: z.boolean().default(false),
  roleTitle:    z.string().max(100).optional(),
});

// ─── Check Engine ─────────────────────────────────────────────────────────────

export const RunCheckSchema = z.object({
  checkType:   z.enum(['IDENTITY', 'REGISTRY', 'SANCTIONS', 'PEP', 'AML', 'ADDRESS', 'DOCUMENT']),
  provider:    z.enum(['GREENID', 'EQUIFAX', 'ILLION', 'REFINITIV', 'TRULIOO', 'ACIC', 'ASIC_CONNECT', 'ABR', 'MOCK']),
  subjectId:   z.string().min(1),
  subjectType: z.enum(['CUSTOMER', 'PERSON', 'BENEFICIAL_OWNER']),
  reason:      z.string().min(10, 'Reason must be at least 10 characters'),
  options:     z.record(z.unknown()).optional(),
});

export const ManualOverrideSchema = z.object({
  outcome: z.enum(['CLEAR', 'HIT', 'POTENTIAL_HIT', 'UNABLE_TO_VERIFY']),
  reason:  z.string().min(10, 'Reason must be at least 10 characters'),
});

// ─── Escalation / SMR ────────────────────────────────────────────────────────

export const CreateEscalationSchema = z.object({
  customerId:  z.string().optional(),
  subject:     z.string().min(5).max(300),
  summary:     z.string().min(20).max(5000),
  grounds:     z.string().min(20).max(5000),
  riskRating:  z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  reason:      z.string().min(10, 'Reason must be at least 10 characters'),
});

export const UpdateEscalationSchema = z.object({
  subject:    z.string().min(5).max(300).optional(),
  summary:    z.string().min(20).max(5000).optional(),
  grounds:    z.string().min(20).max(5000).optional(),
  assignedTo: z.string().optional(),
  reason:     z.string().min(10, 'Reason must be at least 10 characters'),
});

export const CreateSmrDraftSchema = z.object({
  escalationId:    z.string().min(1),
  reportingEntity: z.string().min(2),
  narrativeText:   z.string().min(50).max(10000).optional(),
  suspiciousActs:  z.array(z.record(z.unknown())).default([]),
  subjectDetails:  z.record(z.unknown()).default({}),
  reason:          z.string().min(10, 'Reason must be at least 10 characters'),
});

export const SubmitSmrSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const ApproveSmrSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  title:       z.string().min(3).max(300),
  description: z.string().max(5000).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assignedTo:  z.string().optional(),
  entityType:  z.string().optional(),
  entityId:    z.string().optional(),
  dueAt:       z.string().datetime().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED', 'BLOCKED']).optional(),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type RegisterInput        = z.infer<typeof RegisterSchema>;
export type LoginInput           = z.infer<typeof LoginSchema>;
export type CreateCustomerInput  = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput  = z.infer<typeof UpdateCustomerSchema>;
export type CreateEscalationInput = z.infer<typeof CreateEscalationSchema>;
export type RunCheckInput        = z.infer<typeof RunCheckSchema>;
export type CreateTaskInput      = z.infer<typeof CreateTaskSchema>;
export type InviteMemberInput    = z.infer<typeof InviteMemberSchema>;
export type SaveProgramStepInput = z.infer<typeof SaveProgramStepSchema>;
