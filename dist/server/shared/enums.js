/**
 * shared/enums.ts — TypeScript enum mirrors of Postgres pgEnum values.
 * Keep in lock-step with schema.ts enums.
 */
export var UserRole;
(function (UserRole) {
    UserRole["WORKSPACE_ADMIN"] = "WORKSPACE_ADMIN";
    UserRole["COMPLIANCE_OFFICER"] = "COMPLIANCE_OFFICER";
    UserRole["PROGRAM_CONTRIBUTOR"] = "PROGRAM_CONTRIBUTOR";
    UserRole["ONBOARDING_USER"] = "ONBOARDING_USER";
    UserRole["REVIEWER"] = "REVIEWER";
    UserRole["READ_ONLY"] = "READ_ONLY";
    UserRole["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
    UserRole["SUPPORT"] = "SUPPORT";
})(UserRole || (UserRole = {}));
export var IdentityStatus;
(function (IdentityStatus) {
    IdentityStatus["PENDING"] = "PENDING";
    IdentityStatus["IN_PROGRESS"] = "IN_PROGRESS";
    IdentityStatus["VERIFIED"] = "VERIFIED";
    IdentityStatus["FAILED"] = "FAILED";
    IdentityStatus["EXPIRED"] = "EXPIRED";
})(IdentityStatus || (IdentityStatus = {}));
export var RegistryStatus;
(function (RegistryStatus) {
    RegistryStatus["PENDING"] = "PENDING";
    RegistryStatus["VERIFIED"] = "VERIFIED";
    RegistryStatus["MANUAL"] = "MANUAL";
    RegistryStatus["MISMATCH"] = "MISMATCH";
})(RegistryStatus || (RegistryStatus = {}));
export var IndustryPathway;
(function (IndustryPathway) {
    IndustryPathway["ACCOUNTING"] = "ACCOUNTING";
    IndustryPathway["LEGAL"] = "LEGAL";
    IndustryPathway["REAL_ESTATE"] = "REAL_ESTATE";
    IndustryPathway["FINANCIAL_SERVICES"] = "FINANCIAL_SERVICES";
    IndustryPathway["GAMBLING"] = "GAMBLING";
    IndustryPathway["PRECIOUS_METALS"] = "PRECIOUS_METALS";
    IndustryPathway["TRUST_COMPANY_SERVICES"] = "TRUST_COMPANY_SERVICES";
    IndustryPathway["OTHER"] = "OTHER";
})(IndustryPathway || (IndustryPathway = {}));
export var ImplementationStatus;
(function (ImplementationStatus) {
    ImplementationStatus["NOT_STARTED"] = "NOT_STARTED";
    ImplementationStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ImplementationStatus["COMPLETE"] = "COMPLETE";
    ImplementationStatus["REQUIRES_REVISION"] = "REQUIRES_REVISION";
})(ImplementationStatus || (ImplementationStatus = {}));
export var BillingStatus;
(function (BillingStatus) {
    BillingStatus["INACTIVE"] = "INACTIVE";
    BillingStatus["SETUP_PENDING"] = "SETUP_PENDING";
    BillingStatus["TRIALING"] = "TRIALING";
    BillingStatus["ACTIVE"] = "ACTIVE";
    BillingStatus["PAST_DUE"] = "PAST_DUE";
    BillingStatus["SUSPENDED"] = "SUSPENDED";
    BillingStatus["CANCELLED"] = "CANCELLED";
})(BillingStatus || (BillingStatus = {}));
export var MembershipStatus;
(function (MembershipStatus) {
    MembershipStatus["PENDING"] = "PENDING";
    MembershipStatus["ACTIVE"] = "ACTIVE";
    MembershipStatus["SUSPENDED"] = "SUSPENDED";
    MembershipStatus["REVOKED"] = "REVOKED";
})(MembershipStatus || (MembershipStatus = {}));
export var SubscriptionTier;
(function (SubscriptionTier) {
    SubscriptionTier["TRIAL"] = "TRIAL";
    SubscriptionTier["STARTER"] = "STARTER";
    SubscriptionTier["PROFESSIONAL"] = "PROFESSIONAL";
    SubscriptionTier["ENTERPRISE"] = "ENTERPRISE";
    SubscriptionTier["GROUP"] = "GROUP";
    SubscriptionTier["LIFETIME"] = "LIFETIME";
})(SubscriptionTier || (SubscriptionTier = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["WEBHOOK"] = "WEBHOOK";
})(NotificationChannel || (NotificationChannel = {}));
export var CustomerStatus;
(function (CustomerStatus) {
    CustomerStatus["DRAFT"] = "DRAFT";
    CustomerStatus["PENDING_CDD"] = "PENDING_CDD";
    CustomerStatus["CDD_IN_PROGRESS"] = "CDD_IN_PROGRESS";
    CustomerStatus["ACTIVE"] = "ACTIVE";
    CustomerStatus["SUSPENDED"] = "SUSPENDED";
    CustomerStatus["EXITED"] = "EXITED";
    CustomerStatus["REJECTED"] = "REJECTED";
})(CustomerStatus || (CustomerStatus = {}));
export var CustomerType;
(function (CustomerType) {
    CustomerType["INDIVIDUAL"] = "INDIVIDUAL";
    CustomerType["COMPANY"] = "COMPANY";
    CustomerType["TRUST"] = "TRUST";
    CustomerType["PARTNERSHIP"] = "PARTNERSHIP";
    CustomerType["ASSOCIATION"] = "ASSOCIATION";
    CustomerType["GOVERNMENT"] = "GOVERNMENT";
    CustomerType["OTHER"] = "OTHER";
})(CustomerType || (CustomerType = {}));
export var RiskRating;
(function (RiskRating) {
    RiskRating["LOW"] = "LOW";
    RiskRating["MEDIUM"] = "MEDIUM";
    RiskRating["HIGH"] = "HIGH";
    RiskRating["CRITICAL"] = "CRITICAL";
    RiskRating["UNRATED"] = "UNRATED";
})(RiskRating || (RiskRating = {}));
export var CddLevel;
(function (CddLevel) {
    CddLevel["SDD"] = "SDD";
    CddLevel["STANDARD"] = "STANDARD";
    CddLevel["EDD"] = "EDD";
})(CddLevel || (CddLevel = {}));
export var CheckType;
(function (CheckType) {
    CheckType["IDENTITY"] = "IDENTITY";
    CheckType["REGISTRY"] = "REGISTRY";
    CheckType["SANCTIONS"] = "SANCTIONS";
    CheckType["PEP"] = "PEP";
    CheckType["AML"] = "AML";
    CheckType["ADDRESS"] = "ADDRESS";
    CheckType["DOCUMENT"] = "DOCUMENT";
})(CheckType || (CheckType = {}));
export var CheckStatus;
(function (CheckStatus) {
    CheckStatus["PENDING"] = "PENDING";
    CheckStatus["RUNNING"] = "RUNNING";
    CheckStatus["PASS"] = "PASS";
    CheckStatus["FAIL"] = "FAIL";
    CheckStatus["REFER"] = "REFER";
    CheckStatus["ERROR"] = "ERROR";
    CheckStatus["TIMEOUT"] = "TIMEOUT";
    CheckStatus["MANUAL_REVIEW"] = "MANUAL_REVIEW";
})(CheckStatus || (CheckStatus = {}));
export var CheckOutcome;
(function (CheckOutcome) {
    CheckOutcome["CLEAR"] = "CLEAR";
    CheckOutcome["HIT"] = "HIT";
    CheckOutcome["POTENTIAL_HIT"] = "POTENTIAL_HIT";
    CheckOutcome["UNABLE_TO_VERIFY"] = "UNABLE_TO_VERIFY";
    CheckOutcome["ERROR"] = "ERROR";
})(CheckOutcome || (CheckOutcome = {}));
export var Provider;
(function (Provider) {
    Provider["GREENID"] = "GREENID";
    Provider["EQUIFAX"] = "EQUIFAX";
    Provider["ILLION"] = "ILLION";
    Provider["REFINITIV"] = "REFINITIV";
    Provider["TRULIOO"] = "TRULIOO";
    Provider["ACIC"] = "ACIC";
    Provider["ASIC_CONNECT"] = "ASIC_CONNECT";
    Provider["ABR"] = "ABR";
    Provider["DIDIT"] = "DIDIT";
    Provider["MOCK"] = "MOCK";
})(Provider || (Provider = {}));
export var DocumentType;
(function (DocumentType) {
    DocumentType["AML_PROGRAM"] = "AML_PROGRAM";
    DocumentType["RISK_ASSESSMENT"] = "RISK_ASSESSMENT";
    DocumentType["CDD_FORM"] = "CDD_FORM";
    DocumentType["EDD_FORM"] = "EDD_FORM";
    DocumentType["SMR_DRAFT"] = "SMR_DRAFT";
    DocumentType["SMR_SUBMITTED"] = "SMR_SUBMITTED";
    DocumentType["EVIDENCE_BUNDLE"] = "EVIDENCE_BUNDLE";
    DocumentType["TRAINING_CERTIFICATE"] = "TRAINING_CERTIFICATE";
    DocumentType["BOARD_MINUTES"] = "BOARD_MINUTES";
    DocumentType["POLICY"] = "POLICY";
})(DocumentType || (DocumentType = {}));
export var EscalationStatus;
(function (EscalationStatus) {
    EscalationStatus["DRAFT"] = "DRAFT";
    EscalationStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    EscalationStatus["ESCALATED_TO_SMR"] = "ESCALATED_TO_SMR";
    EscalationStatus["SMR_SUBMITTED"] = "SMR_SUBMITTED";
    EscalationStatus["CLOSED_NO_ACTION"] = "CLOSED_NO_ACTION";
    EscalationStatus["CLOSED_FALSE_POSITIVE"] = "CLOSED_FALSE_POSITIVE";
})(EscalationStatus || (EscalationStatus = {}));
export var SmrStatus;
(function (SmrStatus) {
    SmrStatus["DRAFT"] = "DRAFT";
    SmrStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    SmrStatus["APPROVED"] = "APPROVED";
    SmrStatus["SUBMITTED"] = "SUBMITTED";
    SmrStatus["REJECTED"] = "REJECTED";
})(SmrStatus || (SmrStatus = {}));
export var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["SCHEDULED"] = "SCHEDULED";
    ReviewStatus["IN_PROGRESS"] = "IN_PROGRESS";
    ReviewStatus["COMPLETE"] = "COMPLETE";
    ReviewStatus["OVERDUE"] = "OVERDUE";
    ReviewStatus["CANCELLED"] = "CANCELLED";
})(ReviewStatus || (ReviewStatus = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["OPEN"] = "OPEN";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["COMPLETE"] = "COMPLETE";
    TaskStatus["CANCELLED"] = "CANCELLED";
    TaskStatus["BLOCKED"] = "BLOCKED";
})(TaskStatus || (TaskStatus = {}));
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "LOW";
    TaskPriority["MEDIUM"] = "MEDIUM";
    TaskPriority["HIGH"] = "HIGH";
    TaskPriority["URGENT"] = "URGENT";
})(TaskPriority || (TaskPriority = {}));
export var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["INFO"] = "INFO";
    AlertSeverity["WARNING"] = "WARNING";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (AlertSeverity = {}));
export var AlertStatus;
(function (AlertStatus) {
    AlertStatus["OPEN"] = "OPEN";
    AlertStatus["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    AlertStatus["RESOLVED"] = "RESOLVED";
    AlertStatus["FALSE_POSITIVE"] = "FALSE_POSITIVE";
})(AlertStatus || (AlertStatus = {}));
export var TrainingStatus;
(function (TrainingStatus) {
    TrainingStatus["NOT_STARTED"] = "NOT_STARTED";
    TrainingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TrainingStatus["COMPLETED"] = "COMPLETED";
    TrainingStatus["EXPIRED"] = "EXPIRED";
    TrainingStatus["FAILED"] = "FAILED";
})(TrainingStatus || (TrainingStatus = {}));
// RBAC — which roles can perform which operations
export const ROLE_PERMISSIONS = {
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
export function hasPermission(role, permission) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes('*') || perms.includes(permission);
}
export const INDUSTRY_PATHWAY_LABELS = {
    [IndustryPathway.ACCOUNTING]: 'Accounting / Bookkeeping',
    [IndustryPathway.LEGAL]: 'Legal Services',
    [IndustryPathway.REAL_ESTATE]: 'Real Estate Agents',
    [IndustryPathway.FINANCIAL_SERVICES]: 'Financial Services',
    [IndustryPathway.GAMBLING]: 'Gambling / Wagering',
    [IndustryPathway.PRECIOUS_METALS]: 'Precious Metals / Stones',
    [IndustryPathway.TRUST_COMPANY_SERVICES]: 'Trust & Company Services',
    [IndustryPathway.OTHER]: 'Other Reporting Entity',
};
export const RISK_RATING_COLORS = {
    [RiskRating.LOW]: 'text-risk-low bg-risk-low/10',
    [RiskRating.MEDIUM]: 'text-risk-medium bg-risk-medium/10',
    [RiskRating.HIGH]: 'text-risk-high bg-risk-high/10',
    [RiskRating.CRITICAL]: 'text-risk-critical bg-risk-critical/10',
    [RiskRating.UNRATED]: 'text-muted-foreground bg-muted',
};
//# sourceMappingURL=enums.js.map