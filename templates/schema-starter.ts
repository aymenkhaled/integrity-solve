/**
 * shared/schema.ts — STARTER
 *
 * This file is the seed for Phase 0. It contains:
 *   - All enums
 *   - users, workspaces, workspace_memberships, sessions, verification_codes
 *   - audit_log, job_locks
 *
 * After Phase 0 db:push works, expand from file 04 (database schema doc):
 * add program_forms, program_versions, program_documents, customers,
 * customer_files, customer_forms, beneficial_owners, person_records,
 * evidence_files, file_state_history, check_requests, check_results,
 * webhook_events, escalations, periodic_reviews, source_of_funds_assessments,
 * source_of_wealth_assessments, tasks, notifications, notification_preferences,
 * usage_events, stripe_webhook_events, provider_connections,
 * training_records, program_reviews, invitations,
 * + all Diamond feature tables.
 *
 * KEEP THIS FILE AS THE SINGLE SOURCE OF TRUTH. Do not duplicate.
 */
import {
  pgEnum, pgTable, text, integer, boolean, timestamp, jsonb,
  uniqueIndex, index, numeric,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS — keep in lock-step with shared/enums.ts (TS enums)
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

// ============================================================================
// TABLES — minimal Phase 0 set
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
  id:          text('id').primaryKey(),
  jobName:     text('job_name').notNull(),
  acquiredBy:  text('acquired_by'),
  acquiredAt:  timestamp('acquired_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt:   timestamp('expires_at', { withTimezone: true }),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMemberships),
  sessions:    many(sessions),
}));

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  memberships: many(workspaceMemberships),
  group:       one(workspaces, { fields: [workspaces.groupWorkspaceId], references: [workspaces.id] }),
}));

export const workspaceMembershipsRelations = relations(workspaceMemberships, ({ one }) => ({
  user:      one(users,       { fields: [workspaceMemberships.userId],      references: [users.id] }),
  workspace: one(workspaces,  { fields: [workspaceMemberships.workspaceId], references: [workspaces.id] }),
}));

// ============================================================================
// INFERRED TYPES — use throughout the app
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
