/**
 * shared/schema.ts — INTEGRITY SOLVE Complete Schema
 * Single source of truth for all 43 tables + enums.
 */
import {
  pgEnum, pgTable, text, integer, boolean, timestamp, jsonb,
  uniqueIndex, index, numeric, smallint,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const userRoleEnum = pgEnum('user_role', [
  'WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'PROGRAM_CONTRIBUTOR',
  'ONBOARDING_USER', 'REVIEWER', 'READ_ONLY', 'PLATFORM_ADMIN', 'SUPPORT',
]);

export const identityStatusEnum = pgEnum('identity_status', [
  'PENDING', 'IN_PROGRESS', 'VERIFIED', 'FAILED', 'EXPIRED',
]);

export const registryStatusEnum = pgEnum('registry_status', [
  'PENDING', 'VERIFIED', 'MANUAL', 'MISMATCH',
]);

export const industryPathwayEnum = pgEnum('industry_pathway', [
  'ACCOUNTING', 'LEGAL', 'REAL_ESTATE', 'FINANCIAL_SERVICES',
  'GAMBLING', 'PRECIOUS_METALS', 'TRUST_COMPANY_SERVICES', 'OTHER',
]);

export const implementationStatusEnum = pgEnum('implementation_status', [
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'REQUIRES_REVISION',
]);

export const billingStatusEnum = pgEnum('billing_status', [
  'INACTIVE', 'SETUP_PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE',
  'SUSPENDED', 'CANCELLED',
]);

export const membershipStatusEnum = pgEnum('membership_status', [
  'PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED',
]);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'GROUP', 'LIFETIME',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'IN_APP', 'EMAIL', 'SMS', 'WEBHOOK',
]);

export const customerStatusEnum = pgEnum('customer_status', [
  'DRAFT', 'PENDING_CDD', 'CDD_IN_PROGRESS', 'ACTIVE',
  'SUSPENDED', 'EXITED', 'REJECTED',
]);

export const customerTypeEnum = pgEnum('customer_type', [
  'INDIVIDUAL', 'COMPANY', 'TRUST', 'PARTNERSHIP',
  'ASSOCIATION', 'GOVERNMENT', 'OTHER',
]);

export const riskRatingEnum = pgEnum('risk_rating', [
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNRATED',
]);

export const cddLevelEnum = pgEnum('cdd_level', [
  'SDD', 'STANDARD', 'EDD',
]);

export const checkTypeEnum = pgEnum('check_type', [
  'IDENTITY', 'REGISTRY', 'SANCTIONS', 'PEP', 'AML', 'ADDRESS', 'DOCUMENT',
]);

export const checkStatusEnum = pgEnum('check_status', [
  'PENDING', 'RUNNING', 'PASS', 'FAIL', 'REFER', 'ERROR', 'TIMEOUT', 'MANUAL_REVIEW',
]);

export const checkOutcomeEnum = pgEnum('check_outcome', [
  'CLEAR', 'HIT', 'POTENTIAL_HIT', 'UNABLE_TO_VERIFY', 'ERROR',
]);

export const providerEnum = pgEnum('provider', [
  'GREENID', 'EQUIFAX', 'ILLION', 'REFINITIV', 'TRULIOO',
  'ACIC', 'ASIC_CONNECT', 'ABR', 'MOCK',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'AML_PROGRAM', 'RISK_ASSESSMENT', 'CDD_FORM', 'EDD_FORM',
  'SMR_DRAFT', 'SMR_SUBMITTED', 'EVIDENCE_BUNDLE',
  'TRAINING_CERTIFICATE', 'BOARD_MINUTES', 'POLICY',
]);

export const programSectionEnum = pgEnum('program_section', [
  'ML_TF_RISK', 'DESIGNATED_SERVICES', 'PART_A', 'PART_B',
  'CUSTOMER_DUE_DILIGENCE', 'ONGOING_MONITORING',
  'REPORTING_OBLIGATIONS', 'AML_CTFP_RECORD_KEEPING',
  'INDEPENDENT_REVIEW', 'EMPLOYEE_DUE_DILIGENCE',
  'TRAINING_PROGRAM', 'BOARD_OVERSIGHT',
]);

export const escalationStatusEnum = pgEnum('escalation_status', [
  'DRAFT', 'UNDER_REVIEW', 'ESCALATED_TO_SMR',
  'SMR_SUBMITTED', 'CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE',
]);

export const smrStatusEnum = pgEnum('smr_status', [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED', 'REJECTED',
]);

export const reviewStatusEnum = pgEnum('review_status', [
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETE', 'OVERDUE', 'CANCELLED',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'OPEN', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED', 'BLOCKED',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'LOW', 'MEDIUM', 'HIGH', 'URGENT',
]);

export const usageEventTypeEnum = pgEnum('usage_event_type', [
  'CHECK_RUN', 'DOCUMENT_GENERATED', 'API_CALL', 'STORAGE_MB', 'SEAT_MONTH',
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED',
]);

export const alertSeverityEnum = pgEnum('alert_severity', [
  'INFO', 'WARNING', 'HIGH', 'CRITICAL',
]);

export const alertStatusEnum = pgEnum('alert_status', [
  'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE',
]);

export const trainingStatusEnum = pgEnum('training_status', [
  'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'FAILED',
]);

// ============================================================================
// CORE AUTH / WORKSPACE TABLES
// ============================================================================

export const users = pgTable('users', {
  id:                text('id').primaryKey().$defaultFn(() => createId()),
  email:             text('email').notNull().unique(),
  emailVerifiedAt:   timestamp('email_verified_at', { withTimezone: true }),
  mobile:            text('mobile'),
  mobileVerifiedAt:  timestamp('mobile_verified_at', { withTimezone: true }),
  passwordHash:      text('password_hash'),
  identityStatus:    identityStatusEnum('identity_status').notNull().default('PENDING'),
  identityProvider:  text('identity_provider'),
  identitySessionId: text('identity_session_id'),
  isActive:          boolean('is_active').notNull().default(true),
  isPlatformAdmin:   boolean('is_platform_admin').notNull().default(false),
  fullName:          text('full_name'),
  avatarUrl:         text('avatar_url'),
  preferredLocale:   text('preferred_locale').default('en-AU'),
  preferredTimezone: text('preferred_timezone').default('Australia/Sydney'),
  lastLoginAt:       timestamp('last_login_at', { withTimezone: true }),
  createdAt:         timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaces = pgTable('workspaces', {
  id:                       text('id').primaryKey().$defaultFn(() => createId()),
  legalName:                text('legal_name').notNull(),
  tradingName:              text('trading_name'),
  abn:                      text('abn'),
  acn:                      text('acn'),
  countryCode:              text('country_code').notNull().default('AU'),
  registryStatus:           registryStatusEnum('registry_status').notNull().default('PENDING'),
  registryPayload:          jsonb('registry_payload'),
  industryPathway:          industryPathwayEnum('industry_pathway'),
  implementationStatus:     implementationStatusEnum('implementation_status').notNull().default('NOT_STARTED'),
  billingStatus:            billingStatusEnum('billing_status').notNull().default('INACTIVE'),
  subscriptionTier:         subscriptionTierEnum('subscription_tier').notNull().default('TRIAL'),
  stripeCustomerId:         text('stripe_customer_id'),
  stripeSubscriptionId:     text('stripe_subscription_id'),
  trialEndsAt:              timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodEnd:         timestamp('current_period_end', { withTimezone: true }),
  currentProgramVersionId:  text('current_program_version_id'),
  groupWorkspaceId:         text('group_workspace_id'),
  benchmarkOptIn:           boolean('benchmark_opt_in').notNull().default(false),
  customDomain:             text('custom_domain'),
  brandColorPrimary:        text('brand_color_primary'),
  brandLogoUrl:             text('brand_logo_url'),
  settings:                 jsonb('settings').default({}),
  createdAt:                timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  abnIdx:   index('workspaces_abn_idx').on(t.abn),
  groupIdx: index('workspaces_group_idx').on(t.groupWorkspaceId),
}));

export const workspaceMemberships = pgTable('workspace_memberships', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  role:         userRoleEnum('role').notNull(),
  status:       membershipStatusEnum('status').notNull().default('PENDING'),
  invitedBy:    text('invited_by').references(() => users.id),
  joinedAt:     timestamp('joined_at', { withTimezone: true }),
  expiresAt:    timestamp('expires_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq:         uniqueIndex('memberships_user_workspace_uniq').on(t.userId, t.workspaceId),
  workspaceIdx: index('memberships_workspace_idx').on(t.workspaceId),
}));

export const sessions = pgTable('sessions', {
  id:          text('id').primaryKey(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt:  timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => ({
  userIdx: index('sessions_user_idx').on(t.userId),
}));

export const verificationCodes = pgTable('verification_codes', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel:     notificationChannelEnum('channel').notNull(),
  destination: text('destination').notNull(),
  codeHash:    text('code_hash').notNull(),
  attempts:    integer('attempts').notNull().default(0),
  consumedAt:  timestamp('consumed_at', { withTimezone: true }),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invitations = pgTable('invitations', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email:       text('email').notNull(),
  role:        userRoleEnum('role').notNull(),
  token:       text('token').notNull().unique(),
  status:      invitationStatusEnum('status').notNull().default('PENDING'),
  invitedBy:   text('invited_by').notNull().references(() => users.id),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt:  timestamp('accepted_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('invitations_workspace_idx').on(t.workspaceId),
}));

// ============================================================================
// AUDIT + JOB INFRA
// ============================================================================

export const auditLog = pgTable('audit_log', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id),
  actorUserId: text('actor_user_id').notNull(),
  action:      text('action').notNull(),
  entityType:  text('entity_type').notNull(),
  entityId:    text('entity_id').notNull(),
  oldValue:    jsonb('old_value'),
  newValue:    jsonb('new_value'),
  reason:      text('reason'),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  requestId:   text('request_id').notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('audit_workspace_idx').on(t.workspaceId, t.createdAt),
  entityIdx:    index('audit_entity_idx').on(t.entityType, t.entityId),
}));

export const jobLocks = pgTable('job_locks', {
  id:         text('id').primaryKey(),
  jobName:    text('job_name').notNull(),
  acquiredBy: text('acquired_by'),
  acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt:  timestamp('expires_at', { withTimezone: true }),
});

// ============================================================================
// AML PROGRAM
// ============================================================================

export const programForms = pgTable('program_forms', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  pathway:     industryPathwayEnum('pathway'),
  status:      implementationStatusEnum('status').notNull().default('NOT_STARTED'),
  currentStep: integer('current_step').notNull().default(0),
  formData:    jsonb('form_data').default({}),
  lockedAt:    timestamp('locked_at', { withTimezone: true }),
  lockedBy:    text('locked_by').references(() => users.id),
  createdBy:   text('created_by').notNull().references(() => users.id),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('program_forms_workspace_idx').on(t.workspaceId),
}));

export const programVersions = pgTable('program_versions', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  programFormId: text('program_form_id').notNull().references(() => programForms.id, { onDelete: 'cascade' }),
  workspaceId:   text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull().default(1),
  snapshotData:  jsonb('snapshot_data').notNull(),
  publishedBy:   text('published_by').notNull().references(() => users.id),
  publishedAt:   timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  reviewDueAt:   timestamp('review_due_at', { withTimezone: true }),
  notes:         text('notes'),
}, (t) => ({
  programIdx: index('program_versions_program_idx').on(t.programFormId),
  workspaceIdx: index('program_versions_workspace_idx').on(t.workspaceId),
}));

export const programDocuments = pgTable('program_documents', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:   text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  versionId:     text('version_id').references(() => programVersions.id),
  documentType:  documentTypeEnum('document_type').notNull(),
  fileName:      text('file_name').notNull(),
  storagePath:   text('storage_path').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType:      text('mime_type').notNull().default('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  generatedBy:   text('generated_by').notNull().references(() => users.id),
  generatedAt:   timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt:     timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  workspaceIdx: index('program_documents_workspace_idx').on(t.workspaceId),
}));

export const programReviews = pgTable('program_reviews', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:   text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  versionId:     text('version_id').references(() => programVersions.id),
  reviewType:    text('review_type').notNull().default('ANNUAL'),
  status:        reviewStatusEnum('status').notNull().default('SCHEDULED'),
  scheduledFor:  timestamp('scheduled_for', { withTimezone: true }).notNull(),
  completedAt:   timestamp('completed_at', { withTimezone: true }),
  completedBy:   text('completed_by').references(() => users.id),
  findings:      jsonb('findings').default([]),
  notes:         text('notes'),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('program_reviews_workspace_idx').on(t.workspaceId),
}));

// ============================================================================
// CUSTOMER LIFECYCLE
// ============================================================================

export const customers = pgTable('customers', {
  id:                  text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:         text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerType:        customerTypeEnum('customer_type').notNull().default('INDIVIDUAL'),
  status:              customerStatusEnum('status').notNull().default('DRAFT'),
  riskRating:          riskRatingEnum('risk_rating').notNull().default('UNRATED'),
  cddLevel:            cddLevelEnum('cdd_level').notNull().default('STANDARD'),
  referenceNumber:     text('reference_number').notNull(),
  // Individual fields
  givenNames:          text('given_names'),
  familyName:          text('family_name'),
  dateOfBirth:         text('date_of_birth'),
  nationality:         text('nationality'),
  // Entity fields
  entityName:          text('entity_name'),
  abn:                 text('abn'),
  acn:                 text('acn'),
  // Common
  email:               text('email'),
  phone:               text('phone'),
  addressLine1:        text('address_line1'),
  addressLine2:        text('address_line2'),
  suburb:              text('suburb'),
  state:               text('state'),
  postcode:            text('postcode'),
  country:             text('country').default('AU'),
  riskFactors:         jsonb('risk_factors').default([]),
  riskNotes:           text('risk_notes'),
  nextReviewDue:       timestamp('next_review_due', { withTimezone: true }),
  lastReviewedAt:      timestamp('last_reviewed_at', { withTimezone: true }),
  lastReviewedBy:      text('last_reviewed_by').references(() => users.id),
  externalRef:         text('external_ref'),
  metadata:            jsonb('metadata').default({}),
  onboardedBy:         text('onboarded_by').references(() => users.id),
  exitedAt:            timestamp('exited_at', { withTimezone: true }),
  exitReason:          text('exit_reason'),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx:  index('customers_workspace_idx').on(t.workspaceId),
  statusIdx:     index('customers_status_idx').on(t.workspaceId, t.status),
  riskIdx:       index('customers_risk_idx').on(t.workspaceId, t.riskRating),
  refIdx:        uniqueIndex('customers_ref_uniq').on(t.workspaceId, t.referenceNumber),
}));

export const beneficialOwners = pgTable('beneficial_owners', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  customerId:   text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  givenNames:   text('given_names').notNull(),
  familyName:   text('family_name').notNull(),
  dateOfBirth:  text('date_of_birth'),
  nationality:  text('nationality'),
  ownershipPct: numeric('ownership_pct', { precision: 5, scale: 2 }),
  isController: boolean('is_controller').notNull().default(false),
  roleTitle:    text('role_title'),
  identityStatus: identityStatusEnum('identity_status').notNull().default('PENDING'),
  metadata:     jsonb('metadata').default({}),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  customerIdx:  index('bo_customer_idx').on(t.customerId),
  workspaceIdx: index('bo_workspace_idx').on(t.workspaceId),
}));

export const customerForms = pgTable('customer_forms', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  customerId:   text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  formType:     cddLevelEnum('form_type').notNull(),
  formData:     jsonb('form_data').default({}),
  completedAt:  timestamp('completed_at', { withTimezone: true }),
  completedBy:  text('completed_by').references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  customerIdx: index('customer_forms_customer_idx').on(t.customerId),
}));

export const personRecords = pgTable('person_records', {
  id:                    text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:           text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  linkedCustomerId:      text('linked_customer_id').references(() => customers.id),
  linkedBeneficialOwner: text('linked_beneficial_owner').references(() => beneficialOwners.id),
  givenNames:            text('given_names').notNull(),
  familyName:            text('family_name').notNull(),
  dateOfBirth:           text('date_of_birth'),
  nationality:           text('nationality'),
  identityStatus:        identityStatusEnum('identity_status').notNull().default('PENDING'),
  identityProvider:      providerEnum('identity_provider'),
  identitySessionId:     text('identity_session_id'),
  idDocumentType:        text('id_document_type'),
  idDocumentNumber:      text('id_document_number'),
  idDocumentCountry:     text('id_document_country'),
  idDocumentExpiry:      text('id_document_expiry'),
  createdAt:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('person_records_workspace_idx').on(t.workspaceId),
}));

export const evidenceFiles = pgTable('evidence_files', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:   text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:    text('customer_id').references(() => customers.id),
  personId:      text('person_id').references(() => personRecords.id),
  documentType:  text('document_type').notNull(),
  fileName:      text('file_name').notNull(),
  storagePath:   text('storage_path').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType:      text('mime_type').notNull(),
  uploadedBy:    text('uploaded_by').notNull().references(() => users.id),
  verifiedAt:    timestamp('verified_at', { withTimezone: true }),
  verifiedBy:    text('verified_by').references(() => users.id),
  expiresAt:     timestamp('expires_at', { withTimezone: true }),
  metadata:      jsonb('metadata').default({}),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('evidence_files_workspace_idx').on(t.workspaceId),
  customerIdx:  index('evidence_files_customer_idx').on(t.customerId),
}));

export const fileStateHistory = pgTable('file_state_history', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  fileId:      text('file_id').notNull().references(() => evidenceFiles.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  fromState:   text('from_state'),
  toState:     text('to_state').notNull(),
  changedBy:   text('changed_by').notNull().references(() => users.id),
  reason:      text('reason'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// CHECK ENGINE
// ============================================================================

export const checkRequests = pgTable('check_requests', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:  text('customer_id').references(() => customers.id),
  personId:    text('person_id').references(() => personRecords.id),
  checkType:   checkTypeEnum('check_type').notNull(),
  provider:    providerEnum('provider').notNull(),
  status:      checkStatusEnum('status').notNull().default('PENDING'),
  priority:    smallint('priority').notNull().default(5),
  requestPayload:  jsonb('request_payload').default({}),
  providerRef:     text('provider_ref'),
  startedAt:       timestamp('started_at', { withTimezone: true }),
  completedAt:     timestamp('completed_at', { withTimezone: true }),
  timeoutAt:       timestamp('timeout_at', { withTimezone: true }),
  retryCount:      integer('retry_count').notNull().default(0),
  requestedBy:     text('requested_by').references(() => users.id),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('check_requests_workspace_idx').on(t.workspaceId),
  statusIdx:    index('check_requests_status_idx').on(t.status),
}));

export const checkResults = pgTable('check_results', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  checkRequestId:   text('check_request_id').notNull().references(() => checkRequests.id, { onDelete: 'cascade' }),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  outcome:          checkOutcomeEnum('outcome').notNull(),
  rawResponse:      jsonb('raw_response'),
  parsedData:       jsonb('parsed_data'),
  hitDetails:       jsonb('hit_details').default([]),
  score:            numeric('score', { precision: 5, scale: 2 }),
  manualOverride:   boolean('manual_override').notNull().default(false),
  overrideBy:       text('override_by').references(() => users.id),
  overrideReason:   text('override_reason'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  checkIdx:     index('check_results_check_idx').on(t.checkRequestId),
  workspaceIdx: index('check_results_workspace_idx').on(t.workspaceId),
}));

export const webhookEvents = pgTable('webhook_events', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').references(() => workspaces.id),
  source:      text('source').notNull(),
  eventType:   text('event_type').notNull(),
  payload:     jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  errorMsg:    text('error_msg'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sourceIdx: index('webhook_events_source_idx').on(t.source, t.eventType),
}));

export const providerConnections = pgTable('provider_connections', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider:     providerEnum('provider').notNull(),
  isActive:     boolean('is_active').notNull().default(true),
  config:       jsonb('config').default({}),
  capabilities: jsonb('capabilities').default([]),
  lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
  testResult:   text('test_result'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceProviderUniq: uniqueIndex('provider_connections_uniq').on(t.workspaceId, t.provider),
}));

// ============================================================================
// ESCALATIONS / SMR
// ============================================================================

export const escalations = pgTable('escalations', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:       text('customer_id').references(() => customers.id),
  status:           escalationStatusEnum('status').notNull().default('DRAFT'),
  subject:          text('subject').notNull(),
  summary:          text('summary').notNull(),
  grounds:          text('grounds').notNull(),
  riskRating:       riskRatingEnum('risk_rating').notNull().default('HIGH'),
  assignedTo:       text('assigned_to').references(() => users.id),
  raisedBy:         text('raised_by').notNull().references(() => users.id),
  reviewedBy:       text('reviewed_by').references(() => users.id),
  reviewedAt:       timestamp('reviewed_at', { withTimezone: true }),
  closedBy:         text('closed_by').references(() => users.id),
  closedAt:         timestamp('closed_at', { withTimezone: true }),
  closeReason:      text('close_reason'),
  smrId:            text('smr_id'),
  internalNotes:    jsonb('internal_notes').default([]),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('escalations_workspace_idx').on(t.workspaceId),
  statusIdx:    index('escalations_status_idx').on(t.workspaceId, t.status),
}));

export const smrDrafts = pgTable('smr_drafts', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  escalationId:    text('escalation_id').notNull().references(() => escalations.id),
  status:          smrStatusEnum('status').notNull().default('DRAFT'),
  reportingEntity: text('reporting_entity').notNull(),
  suspiciousActs:  jsonb('suspicious_acts').default([]),
  transactionData: jsonb('transaction_data').default([]),
  subjectDetails:  jsonb('subject_details').default({}),
  narrativeText:   text('narrative_text'),
  ausTracRef:      text('aus_trac_ref'),
  submittedAt:     timestamp('submitted_at', { withTimezone: true }),
  submittedBy:     text('submitted_by').references(() => users.id),
  approvedBy:      text('approved_by').references(() => users.id),
  approvedAt:      timestamp('approved_at', { withTimezone: true }),
  approvalReason:  text('approval_reason'),
  rejectedAt:      timestamp('rejected_at', { withTimezone: true }),
  rejectedBy:      text('rejected_by').references(() => users.id),
  rejectionReason: text('rejection_reason'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('smr_workspace_idx').on(t.workspaceId),
  escalationIdx: index('smr_escalation_idx').on(t.escalationId),
}));

// ============================================================================
// PERIODIC REVIEWS / TASKS
// ============================================================================

export const periodicReviews = pgTable('periodic_reviews', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:    text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:     text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  status:         reviewStatusEnum('status').notNull().default('SCHEDULED'),
  dueAt:          timestamp('due_at', { withTimezone: true }).notNull(),
  startedAt:      timestamp('started_at', { withTimezone: true }),
  completedAt:    timestamp('completed_at', { withTimezone: true }),
  completedBy:    text('completed_by').references(() => users.id),
  previousRating: riskRatingEnum('previous_rating'),
  newRating:      riskRatingEnum('new_rating'),
  findings:       jsonb('findings').default([]),
  notes:          text('notes'),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('periodic_reviews_workspace_idx').on(t.workspaceId),
  dueAtIdx:     index('periodic_reviews_due_idx').on(t.dueAt, t.status),
}));

export const tasks = pgTable('tasks', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  description: text('description'),
  status:      taskStatusEnum('status').notNull().default('OPEN'),
  priority:    taskPriorityEnum('priority').notNull().default('MEDIUM'),
  assignedTo:  text('assigned_to').references(() => users.id),
  createdBy:   text('created_by').notNull().references(() => users.id),
  entityType:  text('entity_type'),
  entityId:    text('entity_id'),
  dueAt:       timestamp('due_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  metadata:    jsonb('metadata').default({}),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('tasks_workspace_idx').on(t.workspaceId),
  assigneeIdx:  index('tasks_assignee_idx').on(t.assignedTo, t.status),
}));

export const notifications = pgTable('notifications', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel:     notificationChannelEnum('channel').notNull().default('IN_APP'),
  title:       text('title').notNull(),
  body:        text('body').notNull(),
  entityType:  text('entity_type'),
  entityId:    text('entity_id'),
  readAt:      timestamp('read_at', { withTimezone: true }),
  sentAt:      timestamp('sent_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx:      index('notifications_user_idx').on(t.userId, t.readAt),
  workspaceIdx: index('notifications_workspace_idx').on(t.workspaceId),
}));

export const notificationPreferences = pgTable('notification_preferences', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  eventType:    text('event_type').notNull(),
  channels:     jsonb('channels').default(['IN_APP']),
  isEnabled:    boolean('is_enabled').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userWorkspaceEventUniq: uniqueIndex('notif_pref_uniq').on(t.userId, t.workspaceId, t.eventType),
}));

// ============================================================================
// BILLING
// ============================================================================

export const usageEvents = pgTable('usage_events', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  eventType:   usageEventTypeEnum('event_type').notNull(),
  quantity:    numeric('quantity', { precision: 12, scale: 4 }).notNull().default('1'),
  metadata:    jsonb('metadata').default({}),
  billedAt:    timestamp('billed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('usage_events_workspace_idx').on(t.workspaceId, t.createdAt),
}));

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id:          text('id').primaryKey(),
  eventType:   text('event_type').notNull(),
  payload:     jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  errorMsg:    text('error_msg'),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// TRAINING
// ============================================================================

export const trainingRecords = pgTable('training_records', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moduleName:      text('module_name').notNull(),
  moduleVersion:   text('module_version').notNull().default('1.0'),
  status:          trainingStatusEnum('status').notNull().default('NOT_STARTED'),
  score:           integer('score'),
  passingScore:    integer('passing_score').notNull().default(80),
  completedAt:     timestamp('completed_at', { withTimezone: true }),
  expiresAt:       timestamp('expires_at', { withTimezone: true }),
  certificateUrl:  text('certificate_url'),
  attempts:        integer('attempts').notNull().default(0),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('training_records_workspace_idx').on(t.workspaceId),
  userIdx:      index('training_records_user_idx').on(t.userId),
}));

// ============================================================================
// SMART ALERTS (Diamond D3)
// ============================================================================

export const smartAlerts = pgTable('smart_alerts', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:   text('customer_id').references(() => customers.id),
  severity:     alertSeverityEnum('severity').notNull(),
  status:       alertStatusEnum('status').notNull().default('OPEN'),
  alertType:    text('alert_type').notNull(),
  title:        text('title').notNull(),
  description:  text('description').notNull(),
  ruleId:       text('rule_id'),
  matchData:    jsonb('match_data').default({}),
  assignedTo:   text('assigned_to').references(() => users.id),
  acknowledgedBy: text('acknowledged_by').references(() => users.id),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  resolvedBy:   text('resolved_by').references(() => users.id),
  resolvedAt:   timestamp('resolved_at', { withTimezone: true }),
  resolutionNote: text('resolution_note'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('smart_alerts_workspace_idx').on(t.workspaceId, t.status),
}));

// ============================================================================
// SOURCE OF FUNDS / WEALTH ASSESSMENTS
// ============================================================================

export const sourceOfFundsAssessments = pgTable('source_of_funds_assessments', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:      text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  status:          implementationStatusEnum('status').notNull().default('NOT_STARTED'),
  fundsSource:     jsonb('funds_source').default([]),
  estimatedAmount: numeric('estimated_amount', { precision: 18, scale: 2 }),
  currency:        text('currency').default('AUD'),
  narrative:       text('narrative'),
  assessedBy:      text('assessed_by').references(() => users.id),
  assessedAt:      timestamp('assessed_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sourceOfWealthAssessments = pgTable('source_of_wealth_assessments', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:    text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:     text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  status:         implementationStatusEnum('status').notNull().default('NOT_STARTED'),
  wealthSources:  jsonb('wealth_sources').default([]),
  totalEstimate:  numeric('total_estimate', { precision: 18, scale: 2 }),
  currency:       text('currency').default('AUD'),
  narrative:      text('narrative'),
  assessedBy:     text('assessed_by').references(() => users.id),
  assessedAt:     timestamp('assessed_at', { withTimezone: true }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// RISK INTELLIGENCE (Diamond D1)
// ============================================================================

export const riskProfiles = pgTable('risk_profiles', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:      text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  overallScore:    numeric('overall_score', { precision: 5, scale: 2 }).notNull().default('0'),
  factorScores:    jsonb('factor_scores').default({}),
  riskRating:      riskRatingEnum('risk_rating').notNull().default('UNRATED'),
  calculatedAt:    timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
  calculatedBy:    text('calculated_by'),
  modelVersion:    text('model_version').notNull().default('1.0'),
  notes:           text('notes'),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('risk_profiles_workspace_idx').on(t.workspaceId),
  customerUniq: uniqueIndex('risk_profiles_customer_uniq').on(t.customerId),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMemberships),
  sessions:    many(sessions),
}));

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  memberships:  many(workspaceMemberships),
  customers:    many(customers),
  programForms: many(programForms),
  escalations:  many(escalations),
  tasks:        many(tasks),
  group:        one(workspaces, { fields: [workspaces.groupWorkspaceId], references: [workspaces.id] }),
}));

export const workspaceMembershipsRelations = relations(workspaceMemberships, ({ one }) => ({
  user:      one(users,       { fields: [workspaceMemberships.userId],      references: [users.id] }),
  workspace: one(workspaces,  { fields: [workspaceMemberships.workspaceId], references: [workspaces.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  workspace:          one(workspaces, { fields: [customers.workspaceId], references: [workspaces.id] }),
  beneficialOwners:   many(beneficialOwners),
  customerForms:      many(customerForms),
  checkRequests:      many(checkRequests),
  evidenceFiles:      many(evidenceFiles),
  periodicReviews:    many(periodicReviews),
  escalations:        many(escalations),
}));

export const checkRequestsRelations = relations(checkRequests, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [checkRequests.workspaceId], references: [workspaces.id] }),
  customer:  one(customers,  { fields: [checkRequests.customerId],  references: [customers.id] }),
  results:   many(checkResults),
}));

export const checkResultsRelations = relations(checkResults, ({ one }) => ({
  request:   one(checkRequests, { fields: [checkResults.checkRequestId], references: [checkRequests.id] }),
  workspace: one(workspaces,    { fields: [checkResults.workspaceId],    references: [workspaces.id] }),
}));

export const escalationsRelations = relations(escalations, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [escalations.workspaceId], references: [workspaces.id] }),
  customer:  one(customers,  { fields: [escalations.customerId],  references: [customers.id] }),
  smrDrafts: many(smrDrafts),
}));

export const smrDraftsRelations = relations(smrDrafts, ({ one }) => ({
  workspace:  one(workspaces,  { fields: [smrDrafts.workspaceId],  references: [workspaces.id] }),
  escalation: one(escalations, { fields: [smrDrafts.escalationId], references: [escalations.id] }),
}));

// ============================================================================
// MILESTONE 1 — WIZARD-LED FLOWS + DIDIT INTEGRATION
// ============================================================================

export const cases = pgTable('cases', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  caseType:         text('case_type').notNull(),                  // 'PROGRAM_SETUP' | 'TRANSACTION_CDD'
  status:           text('status').notNull().default('DRAFT'),    // DRAFT | IN_PROGRESS | COMPLETED | ARCHIVED
  title:            text('title').notNull(),
  designatedService: text('designated_service'),
  partyType:        text('party_type'),                           // individual | company | trust | beneficial_owner
  riskLevel:        text('risk_level').default('not_assessed'),   // low | medium | high | not_assessed
  recommendation:   text('recommendation'),
  createdBy:        text('created_by').references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('cases_workspace_idx').on(t.workspaceId),
  statusIdx:    index('cases_status_idx').on(t.workspaceId, t.status),
}));

export const wizardRuns = pgTable('wizard_runs', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  caseId:      text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  wizardType:  text('wizard_type').notNull(),            // PROGRAM_SETUP | TRANSACTION_CDD
  status:      text('status').notNull().default('IN_PROGRESS'), // IN_PROGRESS | COMPLETED | ABANDONED
  currentStep: text('current_step').notNull().default('start'),
  answers:     jsonb('answers').default({}),
  routeResult: jsonb('route_result').default({}),
  createdBy:   text('created_by').references(() => users.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  caseIdx:     index('wizard_runs_case_idx').on(t.caseId),
  workspaceIdx: index('wizard_runs_workspace_idx').on(t.workspaceId),
}));

export const wizardSteps = pgTable('wizard_steps', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  wizardRunId:  text('wizard_run_id').notNull().references(() => wizardRuns.id, { onDelete: 'cascade' }),
  stepKey:      text('step_key').notNull(),
  status:       text('status').notNull().default('COMPLETED'),
  answers:      jsonb('answers').default({}),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  runStepUniq: uniqueIndex('wizard_steps_run_step_uniq').on(t.wizardRunId, t.stepKey),
}));

export const diditSessions = pgTable('didit_sessions', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  caseId:           text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  capability:       text('capability').notNull(),              // kyc | kyb | aml_screening | company_aml
  status:           text('status').notNull().default('queued'), // queued | processing | passed | failed | review_required | error
  idempotencyKey:   text('idempotency_key').notNull(),
  providerRequestId: text('provider_request_id'),
  sessionUrl:       text('session_url'),
  workflowId:       text('workflow_id'),
  vendorData:       text('vendor_data'),
  subjectId:        text('subject_id'),
  metadata:         jsonb('metadata').default({}),
  createdBy:        text('created_by').references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idempotencyUniq:  uniqueIndex('didit_sessions_idempotency_uniq').on(t.workspaceId, t.idempotencyKey),
  caseIdx:          index('didit_sessions_case_idx').on(t.caseId),
}));

export const diditResults = pgTable('didit_results', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  diditSessionId:   text('didit_session_id').notNull().references(() => diditSessions.id, { onDelete: 'cascade' }),
  providerRequestId: text('provider_request_id'),
  status:           text('status').notNull(),       // passed | failed | review_required | processing | error
  decision:         text('decision').notNull(),      // clear | not_verified | matched | unresolved | pending
  summary:          text('summary'),
  riskSignals:      jsonb('risk_signals').default([]),
  normalizedPayload: jsonb('normalized_payload').default({}),
  rawPayload:       jsonb('raw_payload').default({}),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const diditWebhookEvents = pgTable('didit_webhook_events', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  externalEventId:  text('external_event_id').notNull(),
  eventType:        text('event_type').notNull(),
  providerRequestId: text('provider_request_id'),
  signatureValid:   boolean('signature_valid').notNull().default(false),
  payload:          jsonb('payload').default({}),
  processedAt:      timestamp('processed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  externalEventUniq: uniqueIndex('didit_webhook_events_ext_uniq').on(t.externalEventId),
}));

export const caseOutputs = pgTable('case_outputs', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  caseId:      text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  outputType:  text('output_type').notNull(),    // summary | pdf
  content:     text('content').notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type User                     = typeof users.$inferSelect;
export type NewUser                  = typeof users.$inferInsert;
export type Workspace                = typeof workspaces.$inferSelect;
export type NewWorkspace             = typeof workspaces.$inferInsert;
export type WorkspaceMembership      = typeof workspaceMemberships.$inferSelect;
export type Session                  = typeof sessions.$inferSelect;
export type AuditLogEntry            = typeof auditLog.$inferSelect;
export type Customer                 = typeof customers.$inferSelect;
export type NewCustomer              = typeof customers.$inferInsert;
export type BeneficialOwner          = typeof beneficialOwners.$inferSelect;
export type CustomerForm             = typeof customerForms.$inferSelect;
export type CheckRequest             = typeof checkRequests.$inferSelect;
export type CheckResult              = typeof checkResults.$inferSelect;
export type Escalation               = typeof escalations.$inferSelect;
export type SmrDraft                 = typeof smrDrafts.$inferSelect;
export type PeriodicReview           = typeof periodicReviews.$inferSelect;
export type Task                     = typeof tasks.$inferSelect;
export type Notification             = typeof notifications.$inferSelect;
export type ProgramForm              = typeof programForms.$inferSelect;
export type ProgramVersion           = typeof programVersions.$inferSelect;
export type TrainingRecord           = typeof trainingRecords.$inferSelect;
export type SmartAlert               = typeof smartAlerts.$inferSelect;
export type RiskProfile              = typeof riskProfiles.$inferSelect;
export type UsageEvent               = typeof usageEvents.$inferSelect;
export type Invitation               = typeof invitations.$inferSelect;
export type EvidenceFile             = typeof evidenceFiles.$inferSelect;
export type PersonRecord             = typeof personRecords.$inferSelect;
export type ProviderConnection       = typeof providerConnections.$inferSelect;
