# 04 — Database schema (Drizzle, translated from Prisma)

This file is the **single source of truth** for the schema. The actual code goes in `shared/schema.ts`. Use `npm run db:push` to sync (no migrations needed in dev; generate migrations only for production).

## 4.1 ID strategy

All primary keys use `text` columns populated with `cuid2` via `@paralleldrive/cuid2`:

```ts
import { createId } from '@paralleldrive/cuid2';
id: text('id').primaryKey().$defaultFn(() => createId()),
```

Why cuid2 not uuid: collision-resistant, URL-safe, sortable enough for ops, matches StrategyNavigator.

## 4.2 Enums (Postgres + TS)

Define each enum twice: once as a Drizzle `pgEnum` (for the column type) and once as a TS enum exported from `shared/enums.ts`. Keep them in lock-step.

```ts
// shared/enums.ts
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
export const programStepEnum = pgEnum('program_step', [
  'BUSINESS_PROFILE', 'DESIGNATED_SERVICES', 'GOVERNANCE',
  'ROLES_RESPONSIBILITIES', 'CO_APPOINTMENT', 'PERSONNEL_SUITABILITY',
]);
export const formStatusEnum = pgEnum('form_status', [
  'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'REQUIRES_REVISION',
]);
export const customerTypeEnum = pgEnum('customer_type', [
  'INDIVIDUAL', 'COMPANY', 'TRUST', 'PARTNERSHIP', 'ASSOCIATION', 'OTHER',
]);
export const customerStatusEnum = pgEnum('customer_status', [
  'DRAFT', 'ACTIVE', 'INACTIVE', 'CLOSED',
]);
export const fileStateEnum = pgEnum('file_state', [
  'DRAFT', 'CDD_IN_PROGRESS', 'PENDING_CHECKS', 'CHECKS_RETURNED',
  'ECDD_REQUIRED', 'UNDER_REVIEW', 'APPROVED', 'APPROVED_WITH_CONTROLS',
  'HELD', 'DECLINED', 'REVIEW_DUE', 'CLOSED',
]);
export const riskRatingEnum = pgEnum('risk_rating', [
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
]);
export const documentTypeEnum = pgEnum('document_type', [
  'RISK_ASSESSMENT', 'POLICY', 'PROCEDURES', 'GOVERNANCE_SUMMARY', 'COMPLETION_PACK',
]);
export const docFormatEnum = pgEnum('doc_format', ['DOCX', 'PDF']);
export const documentStatusEnum = pgEnum('document_status', [
  'GENERATING', 'CURRENT', 'SUPERSEDED', 'FAILED',
]);
export const subjectTypeEnum = pgEnum('subject_type', [
  'INDIVIDUAL', 'ENTITY', 'BENEFICIAL_OWNER',
]);
export const providerCapabilityEnum = pgEnum('provider_capability', [
  'IDENTITY_VERIFICATION', 'AML_SCREENING', 'KYB_VERIFICATION',
  'BILLING_AUTHORIZATION', 'ADVERSE_MEDIA', 'PEP_SCREENING',
]);
export const checkStatusEnum = pgEnum('check_status', [
  'QUEUED', 'PROCESSING', 'PASSED', 'FAILED', 'PARTIAL',
  'ESCALATED', 'ERROR', 'MANUAL_OVERRIDE',
]);
export const escalationStatusEnum = pgEnum('escalation_status', [
  'OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'WITHDRAWN',
]);
export const escalationDecisionEnum = pgEnum('escalation_decision', [
  'PROCEED', 'PROCEED_WITH_CONTROLS', 'HOLD', 'DECLINE', 'REFER_SUSPICIOUS_MATTER',
]);
export const periodicReviewOutcomeEnum = pgEnum('periodic_review_outcome', [
  'NO_CHANGE', 'RISK_UPGRADED', 'RISK_DOWNGRADED', 'ECDD_REQUIRED', 'CLOSE_RELATIONSHIP',
]);
export const sofConclusionEnum = pgEnum('sof_conclusion', [
  'SATISFACTORY', 'FURTHER_INFORMATION', 'ESCALATE',
]);
export const trainingTypeEnum = pgEnum('training_type', [
  'INDUCTION', 'REFRESHER', 'CO', 'SYSTEM', 'OTHER',
]);
export const taskStatusEnum = pgEnum('task_status', [
  'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
]);
export const taskPriorityEnum = pgEnum('task_priority', [
  'LOW', 'MEDIUM', 'HIGH', 'URGENT',
]);
export const notificationChannelEnum = pgEnum('notification_channel', [
  'IN_APP', 'EMAIL', 'SMS', 'WEBHOOK',
]);
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'GROUP', 'LIFETIME',
]);
export const providerEnvironmentEnum = pgEnum('provider_environment', [
  'SANDBOX', 'PRODUCTION',
]);
```

## 4.3 Tables — full Drizzle definitions

### Identity & workspace

```ts
export const users = pgTable('users', {
  id:                text('id').primaryKey().$defaultFn(() => createId()),
  email:             text('email').notNull().unique(),
  emailVerifiedAt:   timestamp('email_verified_at', { withTimezone: true }),
  mobile:            text('mobile'),
  mobileVerifiedAt:  timestamp('mobile_verified_at', { withTimezone: true }),
  passwordHash:      text('password_hash'),
  identityStatus:    identityStatusEnum('identity_status').notNull().default('PENDING'),
  identityProvider:  text('identity_provider'),       // facia session ref
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
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
}));

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
  groupWorkspaceId:         text('group_workspace_id'),  // Diamond 4 self-FK
  benchmarkOptIn:           boolean('benchmark_opt_in').notNull().default(false),
  customDomain:             text('custom_domain'),
  brandColorPrimary:        text('brand_color_primary'),
  brandLogoUrl:             text('brand_logo_url'),
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
  expiresAt:    timestamp('expires_at', { withTimezone: true }),  // for SUPPORT role
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq:        uniqueIndex('memberships_user_workspace_uniq').on(t.userId, t.workspaceId),
  workspaceIdx: index('memberships_workspace_idx').on(t.workspaceId),
}));

export const invitations = pgTable('invitations', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email:        text('email').notNull(),
  role:         userRoleEnum('role').notNull(),
  token:        text('token').notNull().unique(),
  invitedBy:    text('invited_by').notNull().references(() => users.id),
  expiresAt:    timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt:   timestamp('accepted_at', { withTimezone: true }),
  rejectedAt:   timestamp('rejected_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tokenIdx: uniqueIndex('invitations_token_idx').on(t.token),
  emailIdx: index('invitations_email_idx').on(t.email),
}));
```

### Sessions & verification

```ts
export const sessions = pgTable('sessions', {
  id:          text('id').primaryKey(),  // session token, opaque
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id').references(() => workspaces.id),  // active workspace
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
  channel:     notificationChannelEnum('channel').notNull(),  // EMAIL or SMS
  destination: text('destination').notNull(),                  // email or mobile
  codeHash:    text('code_hash').notNull(),
  attempts:    integer('attempts').notNull().default(0),
  consumedAt:  timestamp('consumed_at', { withTimezone: true }),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Program

```ts
export const programForms = pgTable('program_forms', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  stepCode:     programStepEnum('step_code').notNull(),
  status:       formStatusEnum('status').notNull().default('NOT_STARTED'),
  dataJson:     jsonb('data_json').notNull().default({}),
  version:      integer('version').notNull().default(1),
  completedAt:  timestamp('completed_at', { withTimezone: true }),
  submittedBy:  text('submitted_by').references(() => users.id),
  lastSavedAt:  timestamp('last_saved_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('program_forms_workspace_step_uniq').on(t.workspaceId, t.stepCode),
}));

export const programVersions = pgTable('program_versions', {
  id:                  text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:         text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  versionNumber:       text('version_number').notNull(),     // '1.0', '1.1'
  riskSnapshotJson:    jsonb('risk_snapshot_json').notNull(),
  effectiveDate:       timestamp('effective_date', { withTimezone: true }).notNull(),
  generatedBy:         text('generated_by').notNull().references(() => users.id),
  createdFromReviewId: text('created_from_review_id'),
  isCurrent:           boolean('is_current').notNull().default(false),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('program_versions_workspace_idx').on(t.workspaceId),
  currentIdx:   index('program_versions_current_idx').on(t.workspaceId, t.isCurrent),
}));

export const programDocuments = pgTable('program_documents', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  programVersionId: text('program_version_id').notNull().references(() => programVersions.id, { onDelete: 'cascade' }),
  docType:          documentTypeEnum('doc_type').notNull(),
  format:           docFormatEnum('format').notNull().default('DOCX'),
  status:           documentStatusEnum('status').notNull().default('GENERATING'),
  filePath:         text('file_path'),                      // R2 key
  fileSize:         integer('file_size'),
  checksum:         text('checksum'),                       // SHA-256
  templateVersion:  text('template_version').notNull(),
  dataSnapshotJson: jsonb('data_snapshot_json').notNull(),
  generatedAt:      timestamp('generated_at', { withTimezone: true }),
  errorMessage:     text('error_message'),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  versionIdx: index('program_docs_version_idx').on(t.programVersionId),
}));

export const trainingRecords = pgTable('training_records', {
  id:                 text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:        text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  sessionTitle:       text('session_title').notNull(),
  trainingType:       trainingTypeEnum('training_type').notNull(),
  trainingDate:       timestamp('training_date', { withTimezone: true }).notNull(),
  durationMinutes:    integer('duration_minutes'),
  participants:       jsonb('participants').notNull(),  // [{userId?, name, role}]
  deliveryMethod:     text('delivery_method'),
  competencyOutcome:  text('competency_outcome'),
  followUpAction:     text('follow_up_action'),
  evidenceFileId:     text('evidence_file_id'),
  createdBy:          text('created_by').notNull().references(() => users.id),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('training_workspace_idx').on(t.workspaceId, t.trainingDate),
}));

export const programReviews = pgTable('program_reviews', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  trigger:          text('trigger').notNull(),  // SCHEDULED | EVENT | REGULATORY
  scope:            text('scope').notNull(),
  summary:          text('summary').notNull(),
  approverUserId:   text('approver_user_id').notNull().references(() => users.id),
  effectiveDate:    timestamp('effective_date', { withTimezone: true }).notNull(),
  newProgramVersionId: text('new_program_version_id').references(() => programVersions.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Customers & files

```ts
export const customers = pgTable('customers', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerType: customerTypeEnum('customer_type').notNull(),
  legalName:    text('legal_name').notNull(),
  tradingName:  text('trading_name'),
  status:       customerStatusEnum('status').notNull().default('DRAFT'),
  riskRating:   riskRatingEnum('risk_rating'),
  abn:          text('abn'),
  acn:          text('acn'),
  countryCode:  text('country_code').default('AU'),
  externalRef:  text('external_ref'),  // client's CRM id
  createdBy:    text('created_by').notNull().references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('customers_workspace_idx').on(t.workspaceId, t.status),
  riskIdx:      index('customers_risk_idx').on(t.workspaceId, t.riskRating),
}));

export const customerFiles = pgTable('customer_files', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerId:       text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  fileReference:    text('file_reference').notNull().unique(),  // 'CF-20260502-0001'
  state:            fileStateEnum('state').notNull().default('DRAFT'),
  riskRating:       riskRatingEnum('risk_rating'),
  riskFactorsJson:  jsonb('risk_factors_json'),
  servicePathway:   text('service_pathway'),
  relationshipStartedAt: timestamp('relationship_started_at', { withTimezone: true }),
  nextReviewDue:    timestamp('next_review_due', { withTimezone: true }),
  assignedTo:       text('assigned_to').references(() => users.id),
  closedAt:         timestamp('closed_at', { withTimezone: true }),
  closedReason:     text('closed_reason'),
  createdBy:        text('created_by').notNull().references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceStateIdx: index('cf_workspace_state_idx').on(t.workspaceId, t.state),
  reviewDueIdx:      index('cf_review_due_idx').on(t.nextReviewDue),
  assignedIdx:       index('cf_assigned_idx').on(t.assignedTo),
}));

export const customerForms = pgTable('customer_forms', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:    text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId: text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  formType:       text('form_type').notNull(),  // INITIAL_CDD | ECDD | SOF | SOW | UNUSUAL_ACTIVITY | PERIODIC_REVIEW | BENEFICIAL_OWNERSHIP
  dataJson:       jsonb('data_json').notNull().default({}),
  status:         formStatusEnum('status').notNull().default('NOT_STARTED'),
  submittedBy:    text('submitted_by').references(() => users.id),
  submittedAt:    timestamp('submitted_at', { withTimezone: true }),
  decisionJson:   jsonb('decision_json'),
  aiAssisted:     boolean('ai_assisted').notNull().default(false),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fileTypeIdx: index('cforms_file_type_idx').on(t.customerFileId, t.formType),
}));

export const beneficialOwners = pgTable('beneficial_owners', {
  id:                  text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:         text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:      text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  personRecordId:      text('person_record_id'),  // optional shared person ref (gap fix)
  fullName:            text('full_name').notNull(),
  dateOfBirth:         text('date_of_birth'),
  countryOfResidence:  text('country_of_residence'),
  ownershipPercent:    numeric('ownership_percent', { precision: 5, scale: 2 }),
  controllingInterest: boolean('controlling_interest').notNull().default(false),
  isPep:               boolean('is_pep').notNull().default(false),
  verificationStatus:  text('verification_status'),
  screeningStatus:     text('screening_status'),
  notes:               text('notes'),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fileIdx: index('bo_file_idx').on(t.customerFileId),
}));

export const personRecords = pgTable('person_records', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  fullName:     text('full_name').notNull(),
  dateOfBirth:  text('date_of_birth'),
  countryOfResidence: text('country_of_residence'),
  externalIds:  jsonb('external_ids'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('person_records_uniq').on(t.workspaceId, t.fullName, t.dateOfBirth),
}));

export const evidenceFiles = pgTable('evidence_files', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:  text('customer_file_id').references(() => customerFiles.id, { onDelete: 'cascade' }),
  customerFormId:  text('customer_form_id').references(() => customerForms.id, { onDelete: 'set null' }),
  fileType:        text('file_type').notNull(),
  label:           text('label').notNull(),
  filePath:        text('file_path').notNull(),  // R2 key
  fileSize:        integer('file_size').notNull(),
  mimeType:        text('mime_type').notNull(),
  checksum:        text('checksum').notNull(),
  uploadedBy:      text('uploaded_by').notNull().references(() => users.id),
  uploadedAt:      timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fileIdx: index('evidence_file_idx').on(t.customerFileId),
}));

export const fileStateHistory = pgTable('file_state_history', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:     text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:  text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  fromState:       fileStateEnum('from_state'),
  toState:         fileStateEnum('to_state').notNull(),
  reason:          text('reason').notNull(),
  actorUserId:     text('actor_user_id').notNull().references(() => users.id),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fileIdx: index('fsh_file_idx').on(t.customerFileId, t.createdAt),
}));
```

### Checks, escalations, reviews

```ts
export const checkRequests = pgTable('check_requests', {
  id:                 text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:        text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:     text('customer_file_id').references(() => customerFiles.id),
  subjectType:        subjectTypeEnum('subject_type').notNull(),
  subjectId:          text('subject_id').notNull(),
  providerCapability: providerCapabilityEnum('provider_capability').notNull(),
  providerName:       text('provider_name').notNull(),
  providerEnvironment: providerEnvironmentEnum('provider_environment').notNull(),
  providerRequestId:  text('provider_request_id'),
  status:             checkStatusEnum('status').notNull().default('QUEUED'),
  payloadJson:        jsonb('payload_json').notNull(),
  idempotencyKey:     text('idempotency_key').notNull().unique(),
  retries:            integer('retries').notNull().default(0),
  startedAt:          timestamp('started_at', { withTimezone: true }),
  completedAt:        timestamp('completed_at', { withTimezone: true }),
  errorMessage:       text('error_message'),
  createdBy:          text('created_by').notNull().references(() => users.id),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  fileIdx:   index('cr_file_idx').on(t.customerFileId),
  statusIdx: index('cr_status_idx').on(t.status, t.createdAt),
  providerReqIdx: index('cr_provider_req_idx').on(t.providerName, t.providerRequestId),
}));

export const checkResults = pgTable('check_results', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  checkRequestId:   text('check_request_id').notNull().unique().references(() => checkRequests.id, { onDelete: 'cascade' }),
  outcome:          checkStatusEnum('outcome').notNull(),
  matchCount:       integer('match_count').notNull().default(0),
  normalizedJson:   jsonb('normalized_json').notNull(),
  rawPayloadRef:    text('raw_payload_ref'),  // R2 key
  reviewedBy:       text('reviewed_by').references(() => users.id),
  reviewedAt:       timestamp('reviewed_at', { withTimezone: true }),
  reviewOutcome:    text('review_outcome'),  // CLEARED | ACCEPTED_WITH_CONTROLS | ESCALATED
  receivedAt:       timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEvents = pgTable('webhook_events', {
  id:                text('id').primaryKey().$defaultFn(() => createId()),
  providerName:      text('provider_name').notNull(),
  providerEventId:   text('provider_event_id').notNull(),
  eventType:         text('event_type'),
  rawPayload:        jsonb('raw_payload').notNull(),
  signatureValid:    boolean('signature_valid').notNull(),
  processedAt:       timestamp('processed_at', { withTimezone: true }),
  receivedAt:        timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('webhook_events_uniq').on(t.providerName, t.providerEventId),
}));

export const escalations = pgTable('escalations', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:   text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  category:         text('category').notNull(),
  urgency:          text('urgency').notNull(),
  summary:          text('summary').notNull(),
  status:           escalationStatusEnum('status').notNull().default('OPEN'),
  assignedTo:       text('assigned_to').references(() => users.id),
  assignedAt:       timestamp('assigned_at', { withTimezone: true }),
  decision:         escalationDecisionEnum('decision'),
  decisionReason:   text('decision_reason'),
  decidedBy:        text('decided_by').references(() => users.id),
  decidedAt:        timestamp('decided_at', { withTimezone: true }),
  smrConsidered:    boolean('smr_considered').notNull().default(false),
  smrReferenceId:   text('smr_reference_id'),
  createdBy:        text('created_by').notNull().references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceIdx: index('esc_workspace_status_idx').on(t.workspaceId, t.status),
  assignedIdx:  index('esc_assigned_idx').on(t.assignedTo, t.status),
}));

export const periodicReviews = pgTable('periodic_reviews', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:   text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  scope:            text('scope').notNull(),
  triggerReason:    text('trigger_reason').notNull(),
  outcome:          periodicReviewOutcomeEnum('outcome'),
  outcomeReason:    text('outcome_reason'),
  newRiskRating:    riskRatingEnum('new_risk_rating'),
  newReviewDue:     timestamp('new_review_due', { withTimezone: true }),
  completedBy:      text('completed_by').references(() => users.id),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sourceOfFundsAssessments = pgTable('source_of_funds_assessments', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:   text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  description:      text('description').notNull(),
  evidenceFileIds:  jsonb('evidence_file_ids'),
  plausibility:     text('plausibility'),
  gaps:             text('gaps'),
  conclusion:       sofConclusionEnum('conclusion'),
  conclusionReason: text('conclusion_reason'),
  assessorUserId:   text('assessor_user_id').references(() => users.id),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sourceOfWealthAssessments = pgTable('source_of_wealth_assessments', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:   text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  origin:           text('origin').notNull(),
  evidenceFileIds:  jsonb('evidence_file_ids'),
  consistencyCheck: text('consistency_check'),
  conclusion:       sofConclusionEnum('conclusion'),
  conclusionReason: text('conclusion_reason'),
  assessorUserId:   text('assessor_user_id').references(() => users.id),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Tasks, notifications, audit, billing, providers

```ts
export const tasks = pgTable('tasks', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:    text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId: text('customer_file_id').references(() => customerFiles.id, { onDelete: 'cascade' }),
  title:          text('title').notNull(),
  description:    text('description'),
  status:         taskStatusEnum('status').notNull().default('OPEN'),
  priority:       taskPriorityEnum('priority').notNull().default('MEDIUM'),
  assignedTo:     text('assigned_to').references(() => users.id),
  dueAt:          timestamp('due_at', { withTimezone: true }),
  completedAt:    timestamp('completed_at', { withTimezone: true }),
  createdBy:      text('created_by').references(() => users.id),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  assignedIdx: index('tasks_assigned_idx').on(t.assignedTo, t.status),
  workspaceIdx: index('tasks_workspace_idx').on(t.workspaceId, t.status),
}));

export const notifications = pgTable('notifications', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel:      notificationChannelEnum('channel').notNull(),
  type:         text('type').notNull(),  // dotted: 'escalation.assigned', 'check.completed'
  title:        text('title').notNull(),
  body:         text('body'),
  data:         jsonb('data'),
  link:         text('link'),
  readAt:       timestamp('read_at', { withTimezone: true }),
  sentAt:       timestamp('sent_at', { withTimezone: true }),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('notif_user_idx').on(t.userId, t.readAt),
}));

export const notificationPreferences = pgTable('notification_preferences', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  userId:       text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  smsEnabled:   boolean('sms_enabled').notNull().default(false),
  digestDaily:  boolean('digest_daily').notNull().default(true),
  mutedTypes:   jsonb('muted_types').notNull().default([]),
});

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

export const usageEvents = pgTable('usage_events', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  checkRequestId:   text('check_request_id').references(() => checkRequests.id),
  eventType:        text('event_type').notNull(),
  costCategory:     text('cost_category').notNull(),
  quantity:         integer('quantity').notNull().default(1),
  occurredAt:       timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  reportedToStripeAt: timestamp('reported_to_stripe_at', { withTimezone: true }),
  stripeEventId:    text('stripe_event_id'),
  idempotencyKey:   text('idempotency_key').notNull().unique(),
}, (t) => ({
  workspaceIdx: index('usage_workspace_idx').on(t.workspaceId, t.occurredAt),
  unreportedIdx: index('usage_unreported_idx').on(t.reportedToStripeAt),
}));

export const stripeWebhookEvents = pgTable('stripe_webhook_events', {
  id:           text('id').primaryKey(),  // Stripe event id
  type:         text('type').notNull(),
  payload:      jsonb('payload').notNull(),
  processedAt:  timestamp('processed_at', { withTimezone: true }),
  receivedAt:   timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

export const providerConnections = pgTable('provider_connections', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  capability:   providerCapabilityEnum('capability').notNull(),
  providerName: text('provider_name').notNull(),
  environment:  providerEnvironmentEnum('environment').notNull().default('SANDBOX'),
  configJson:   jsonb('config_json').notNull(),  // non-secret config
  secretRef:    text('secret_ref').notNull(),    // pointer to secret manager
  status:       text('status').notNull().default('active'),
  lastErrorAt:  timestamp('last_error_at', { withTimezone: true }),
  lastErrorMessage: text('last_error_message'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('pc_workspace_capability_uniq').on(t.workspaceId, t.capability),
}));

export const jobLocks = pgTable('job_locks', {
  id:          text('id').primaryKey(),
  jobName:     text('job_name').notNull(),
  acquiredBy:  text('acquired_by'),
  acquiredAt:  timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt:   timestamp('expires_at', { withTimezone: true }),
});
```

### Diamond feature tables

```ts
// Diamond 1 — AI narratives
export const aiNarrativeDrafts = pgTable('ai_narrative_drafts', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:   text('customer_file_id').references(() => customerFiles.id, { onDelete: 'cascade' }),
  narrativeType:    text('narrative_type').notNull(),  // ESCALATION_SUMMARY | SOF_ASSESSMENT | RISK_EXPLANATION | UNUSUAL_ACTIVITY
  inputContextJson: jsonb('input_context_json').notNull(),
  promptVersion:    text('prompt_version').notNull(),
  draftText:        text('draft_text').notNull(),
  modelName:        text('model_name').notNull(),
  tokensIn:         integer('tokens_in'),
  tokensOut:        integer('tokens_out'),
  reviewedBy:       text('reviewed_by').references(() => users.id),
  finalText:        text('final_text'),
  approvedAt:       timestamp('approved_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Diamond 2 — monitoring
export const monitoringRules = pgTable('monitoring_rules', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  ruleType:     text('rule_type').notNull(),  // RECURRING_SCREEN | WATCHLIST_DELTA | OWNERSHIP_CHANGE | DORMANT | JURISDICTION_RISK | VOLUME_ANOMALY
  scopeJson:    jsonb('scope_json').notNull(),
  parametersJson: jsonb('parameters_json').notNull(),
  active:       boolean('active').notNull().default(true),
  createdBy:    text('created_by').references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const monitoringAlerts = pgTable('monitoring_alerts', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  ruleId:           text('rule_id').references(() => monitoringRules.id),
  customerFileId:   text('customer_file_id').references(() => customerFiles.id, { onDelete: 'cascade' }),
  severity:         text('severity').notNull(),  // info | warning | critical
  summary:          text('summary').notNull(),
  detailJson:       jsonb('detail_json'),
  status:           text('status').notNull().default('OPEN'),  // OPEN | ACKNOWLEDGED | DISMISSED | ACTIONED
  acknowledgedBy:   text('acknowledged_by').references(() => users.id),
  acknowledgedAt:   timestamp('acknowledged_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  workspaceStatusIdx: index('ma_ws_status_idx').on(t.workspaceId, t.status),
}));

// Diamond 3 — evidence packs
export const evidencePacks = pgTable('evidence_packs', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  periodStart:      timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd:        timestamp('period_end', { withTimezone: true }).notNull(),
  scopeJson:        jsonb('scope_json').notNull(),
  filePath:         text('file_path'),  // R2 key
  fileSize:         integer('file_size'),
  passwordProtected: boolean('password_protected').notNull().default(false),
  status:           text('status').notNull().default('GENERATING'),
  generatedBy:      text('generated_by').notNull().references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
});

// Diamond 5 — training modules
export const trainingCourses = pgTable('training_courses', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),  // null = platform-wide
  title:            text('title').notNull(),
  description:      text('description'),
  trainingType:     trainingTypeEnum('training_type').notNull(),
  durationMinutes:  integer('duration_minutes'),
  passScore:        integer('pass_score').notNull().default(80),
  active:           boolean('active').notNull().default(true),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const trainingLessons = pgTable('training_lessons', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  courseId:         text('course_id').notNull().references(() => trainingCourses.id, { onDelete: 'cascade' }),
  ordering:         integer('ordering').notNull(),
  title:            text('title').notNull(),
  contentMarkdown:  text('content_markdown'),
  videoUrl:         text('video_url'),
});

export const trainingQuizzes = pgTable('training_quizzes', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  courseId:     text('course_id').notNull().references(() => trainingCourses.id, { onDelete: 'cascade' }),
  questionsJson: jsonb('questions_json').notNull(),
});

export const trainingEnrollments = pgTable('training_enrollments', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId:           text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId:         text('course_id').notNull().references(() => trainingCourses.id, { onDelete: 'cascade' }),
  startedAt:        timestamp('started_at', { withTimezone: true }),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  score:            integer('score'),
  passed:           boolean('passed'),
  expiresAt:        timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  uniq: uniqueIndex('te_user_course_uniq').on(t.userId, t.courseId),
}));

// Diamond 6 — regulatory feed
export const regulatoryUpdates = pgTable('regulatory_updates', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  source:           text('source').notNull(),
  externalId:       text('external_id').notNull(),
  title:            text('title').notNull(),
  body:             text('body'),
  url:              text('url'),
  publishedAt:      timestamp('published_at', { withTimezone: true }),
  industryTags:     jsonb('industry_tags'),
  impactArea:       text('impact_area'),
  severity:         text('severity'),
  fetchedAt:        timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('reg_source_external_uniq').on(t.source, t.externalId),
}));

export const regulatoryAlertAcks = pgTable('regulatory_alert_acks', {
  id:           text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:  text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  updateId:     text('update_id').notNull().references(() => regulatoryUpdates.id, { onDelete: 'cascade' }),
  status:       text('status').notNull(),  // ACKNOWLEDGED | DISMISSED | ACTIONED
  ackedBy:      text('acked_by').notNull().references(() => users.id),
  ackedAt:      timestamp('acked_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: uniqueIndex('raa_workspace_update_uniq').on(t.workspaceId, t.updateId),
}));

// Diamond 7 — customer-facing portal
export const customerPortalInvites = pgTable('customer_portal_invites', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId:      text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  customerFileId:   text('customer_file_id').notNull().references(() => customerFiles.id, { onDelete: 'cascade' }),
  recipientEmail:   text('recipient_email').notNull(),
  recipientName:    text('recipient_name'),
  token:            text('token').notNull().unique(),
  expiresAt:        timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt:       timestamp('consumed_at', { withTimezone: true }),
  submissionsJson:  jsonb('submissions_json'),
  createdBy:        text('created_by').notNull().references(() => users.id),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Diamond 8 — benchmarking
export const benchmarkingSnapshots = pgTable('benchmarking_snapshots', {
  id:               text('id').primaryKey().$defaultFn(() => createId()),
  industryPathway:  industryPathwayEnum('industry_pathway').notNull(),
  metric:           text('metric').notNull(),
  periodStart:      timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd:        timestamp('period_end', { withTimezone: true }).notNull(),
  sampleSize:       integer('sample_size').notNull(),
  p50:              numeric('p50'),
  p75:              numeric('p75'),
  p90:              numeric('p90'),
  computedAt:       timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});
```

## 4.4 Relations file

Define `relations()` for all FK relationships in the same `shared/schema.ts` file so Drizzle's `query.<table>.findMany({ with: { ... } })` works ergonomically.

## 4.5 Seed data

`server/seed.ts` populates:
- 1 platform admin user (`platform@integritysolve.local`, password from env)
- 1 demo workspace ('Acme Accounting Pty Ltd') with mock ABN
- 6 program forms in mixed states (4 complete, 1 in progress, 1 not started)
- 3 demo customers (1 individual approved, 1 entity in ECDD, 1 trust draft)
- 5 mock check requests (mix of statuses)
- 3 escalations (1 open, 1 under review, 1 resolved)
- 6 training records spread over the last 12 months
- 1 of each platform-wide training course
- Mock provider connections for all capabilities pointing to `mock` adapters

Run with `npm run db:seed`.
