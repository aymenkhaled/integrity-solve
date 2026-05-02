# 08 — Phase 3: Client Onboarding & Workflows (M6–M7)

**Duration:** Weeks 10–14 · **Goal:** the customer-file engine, CDD state machine, escalation/ECDD/SOF/SOW/periodic review workflows, and a complete audit-grade chain of custody for every decision.

---

## Milestone 6 — Client Onboarding Foundation (Weeks 10–12)

### M6 — Customer-file state machine

Every customer file is an explicit state machine. State transitions are logged in `file_state_history`. No transition can occur without:
1. The correct prior state (server-validated).
2. The actor having the correct role (RBAC-checked).
3. A non-empty `reason` string (Zod-validated, ≥10 chars).
4. Required linked forms being complete.

Define transitions in `shared/state-machines.ts`:

```ts
type FileTransition = {
  from: FileState | FileState[];
  to: FileState;
  allowedRoles: UserRole[];
  preconditions: (file: CustomerFile, ctx: TransitionContext) => true | string;
};
```

| State | Entry trigger | Permitted actors | Exit conditions | Next states |
|-------|---------------|------------------|-----------------|-------------|
| **DRAFT** | User clicks "New Client" | ONBOARDING_USER, CO, ADMIN | Min required fields saved | CDD_IN_PROGRESS |
| **CDD_IN_PROGRESS** | CDD form started | ONBOARDING_USER, CO | All required CDD fields complete; risk_rating calculated | PENDING_CHECKS / ECDD_REQUIRED / HELD |
| **PENDING_CHECKS** | Check request queued | System (auto) | All queued checks returned a result | CHECKS_RETURNED |
| **CHECKS_RETURNED** | Provider result received | System (auto) | User/system reviews results | UNDER_REVIEW / ECDD_REQUIRED / ESCALATED |
| **ECDD_REQUIRED** | High-risk trigger or screening hit | ONBOARDING_USER (trigger), CO/REVIEWER (complete) | ECDD form submitted with decision | APPROVED / APPROVED_WITH_CONTROLS / HELD / DECLINED |
| **UNDER_REVIEW** | Pending reviewer decision | CO, REVIEWER | Decision recorded with reason | APPROVED / APPROVED_WITH_CONTROLS / HELD / DECLINED |
| **APPROVED** | Clean CDD + clear checks | CO, REVIEWER, ADMIN | Relationship established | REVIEW_DUE / ESCALATED |
| **APPROVED_WITH_CONTROLS** | Higher risk accepted with conditions | CO, ADMIN | Controls recorded | REVIEW_DUE / ESCALATED |
| **HELD** | Information missing or unresolved | CO, REVIEWER | New info provided OR timeout | UNDER_REVIEW / DECLINED |
| **DECLINED** | Unacceptable risk or failure | CO, ADMIN | Final decision — no reversal | CLOSED |
| **REVIEW_DUE** | Scheduled date or event trigger | System (auto) | Review completed | APPROVED / ECDD_REQUIRED / ESCALATED |
| **CLOSED** | DECLINED finalised or relationship ended | ADMIN | (terminal) | — |

### M6 backend tasks

| Task | File | Detail |
|------|------|--------|
| Customer CRUD | `server/routes/customers.routes.ts`, `server/storage/customer.storage.ts` | Create (type, legal name, basic details); list with filters (status, risk_rating, next_review_due); get with files. |
| Customer file CRUD | `server/routes/customer-files.routes.ts`, `server/storage/customer-file.storage.ts` | Create file; get with all linked data; update state via explicit transition only; list with sorting and filtering. |
| State transition engine | `POST /customer-files/:id/transition` | Body `{ to_state, reason, optional_payload }`. Validates: state allowed, role allowed, preconditions, reason. Inserts `file_state_history`, updates `customer_files.state`, audits, may create tasks (e.g., assign reviewer). |
| CDD form | `PUT /customer-files/:id/forms/INITIAL_CDD` | Form data: customer_type, service pathway, source of relationship, verification method, ID details, risk factors. On submit: extracts `riskRating` via calculator. |
| Risk rating calculator | `server/services/risk-calculator.service.ts` | Pure rule-based scoring from `risk-rules.ts`: customer type, industry, jurisdiction, service type, PEP status, ownership complexity → LOW/MEDIUM/HIGH/CRITICAL with factor breakdown. Unit-tested across all rule combinations. |
| Evidence upload | `POST /customer-files/:id/evidence` | Multer middleware → R2 upload via `file-storage.service`. Store `evidence_files` row. Signed URL on demand. Max 25MB per file; whitelist mime types. |
| Beneficial ownership form | `PUT /customer-files/:id/forms/BENEFICIAL_OWNERSHIP` | Owners/controllers with name, ownership%, country, verification, screening status. Spawn screening tasks for each person. Validates Σ ownership ≤ 100%. |

### M6 frontend tasks

| Task | Route/Component | Detail |
|------|-----------------|--------|
| Customer list | `pages/app/clients/ClientList.tsx` | TanStack Table with sort/filter by status, risk_rating, next_review_due. Quick-action buttons per row. Bulk actions for review queue. CSV export. |
| New client wizard | `pages/app/clients/NewClient.tsx` | CustomerTypeSelector → dynamic CDD form (per type) → run checks → risk result → decision. Multi-step with progress bar. |
| Customer file detail | `pages/app/clients/ClientDetail.tsx` | Tabs: Overview / CDD / Checks / Evidence / Beneficial Owners / Escalations / Audit. |
| `<FileStateBadge>` | `components/workflow/FileStateBadge.tsx` | Color-coded per state. Tooltip with state description and permitted next actions. Pulsing dot for PENDING_CHECKS. |
| `<EvidenceUploader>` | `components/forms/EvidenceUploader.tsx` | Drag-drop multi-file upload. Type validation. Progress indicator. Link to form type. Image thumbnails. |
| `<RiskRatingCard>` | `components/workflow/RiskRatingCard.tsx` | Visual card with risk_rating, factor breakdown ("what drove this"), suggested next action. |
| `<BeneficialOwnerForm>` | `components/forms/BeneficialOwnerForm.tsx` | Add/remove rows. Ownership% sum validation. Country selector. Per-person screening status pill. |
| `<FileTimeline>` | `components/workflow/FileTimeline.tsx` | Vertical timeline of `file_state_history` entries with actor, timestamp, reason. |

### M6 acceptance criteria

- ✅ Customer files can be created for Individual, Company, Trust, Partnership, Association.
- ✅ CDD form calculates risk rating from form data using defined rules; result deterministic.
- ✅ State transitions enforce correct sequence and role requirements (backend, not frontend).
- ✅ Evidence uploads store in R2 and download via signed URL.
- ✅ Beneficial ownership form captures and validates ownership structure (sum ≤ 100%).

---

## Milestone 7 — Escalation & Review Workflows (Weeks 12–14)

### M7 — Forms & workflows

| Form | Trigger | Required fields | Decision options | Audit requirements |
|------|---------|-----------------|------------------|-------------------|
| **Enhanced CDD (ECDD)** | High risk; complexity; jurisdiction; trigger event | Trigger reason; additional verification obtained; senior approval; revised risk; controls; decision | PROCEED / PROCEED_WITH_CONTROLS / HOLD / DECLINE | Before/after risk comparison; approver identity; timestamp; controls recorded |
| **Source of Funds (SOF)** | Entity / complex individual; high value; jurisdiction risk | Funds source description; evidence obtained; plausibility; gaps and mitigants; conclusion | SATISFACTORY / FURTHER_INFORMATION / ESCALATE | Conclusion reason; evidence ref; assessor identity |
| **Source of Wealth (SOW)** | ECDD trigger; PEP; high net worth | Wealth origin; evidence; consistency; conclusion | SATISFACTORY / FURTHER_INFORMATION / ESCALATE | Assessor identity; evidence linked; conclusion reason |
| **Escalation** | Any file trigger; suspicious activity; unresolved concern | Category; urgency; summary; supporting evidence refs; assigned reviewer | PROCEED / PROCEED_WITH_CONTROLS / HOLD / DECLINE / REFER_SUSPICIOUS_MATTER | Created timestamp; assigned reviewer; decision timestamp; full chain of custody |
| **Unusual Activity Review** | Staff observation; monitoring alert; system flag | Activity description; timeline; suspicion basis; internal review outcome; reportability | NO_FURTHER_ACTION / ENHANCED_MONITORING / ESCALATE / CONSIDER_SMR | All review versions; assessor; outcome reasoning |
| **Periodic Review** | Scheduled date; trigger event | Review scope; verification currency; screening refresh; risk re-assessment; controls adequacy; updated decision | NO_CHANGE / RISK_UPGRADED / RISK_DOWNGRADED / ECDD_REQUIRED / CLOSE_RELATIONSHIP | Prior vs new state; trigger reason; completion date |

### M7 backend tasks

| Task | Detail |
|------|--------|
| **ECDD module** | `customer_forms` row with `formType = 'ECDD'`. CRUD + decision endpoint. Mandatory `reason` (≥10 chars). Role guard: CO or REVIEWER only. Triggers state transition on decision. |
| **SOF / SOW modules** | Separate tables `source_of_funds_assessments`, `source_of_wealth_assessments` linked to file. Evidence linking. Conclusion states. Assessor recorded. |
| **Escalation module** | Create escalation; auto-assign CO if no reviewer specified; transition `OPEN → UNDER_REVIEW → ACTION_REQUIRED → RESOLVED`. Email notification on assignment. List endpoint with filters. |
| **Unusual activity module** | Create from any file; progression states; SMR consideration flag with extra-confirm step; outcome recording; multiple reviews can attach to same file. |
| **Periodic review scheduler** | Cron `review-scheduler.job.ts` daily 03:00. Find files with `nextReviewDue ≤ today + 30d` AND state ≠ CLOSED. Create `tasks` row with priority HIGH; transition file to `REVIEW_DUE`; email notification. |
| **Review completion** | Submit periodic review form → updates `riskRating` if changed, sets new `nextReviewDue` based on new rating, transitions back to `APPROVED` / `ECDD_REQUIRED`. |
| **Escalation email notifications** | On new escalation: email assigned reviewer (template `escalation-assigned`). On 48h without action: escalate notification to CO (template `escalation-stale`). On resolution: notify originator. |
| **Queue APIs** | `GET /escalations?status=OPEN&assignedTo=me` paginated. `GET /reviews?dueWithin=30` periodic review queue. |

### M7 frontend tasks

| Task | Detail |
|------|--------|
| Escalation queue page | `/app/escalations` — table: file ref, customer, severity badge, assigned reviewer, days open, last action. Bulk assignment. Quick filters: my escalations, unassigned, by severity. |
| Escalation detail panel | Sheet (Radix) with timeline, linked forms, evidence, decision form with mandatory reason, approve/decline/hold buttons (role-gated). |
| Review queue page | `/app/reviews` — table: customer, review type, due date, days overdue badge (red/amber). One-click open review form. Filter by type and due window. |
| ECDD form | Multi-section: trigger → verification → risk re-assessment → controls → decision. Decision buttons only visible to CO/REVIEWER. |
| SOF/SOW form | Assessment with evidence linker, conclusion dropdown, notes. Shows linked evidence from file. Read-only after submission. |
| Unusual activity form | Suspicion category selector, timeline, reviewer notes, SMR consideration flag with extra-confirm step. |
| `<ReviewDecisionModal>` | Reusable for approval/hold/decline. Mandatory reason. Role check before showing. **Double-confirm for DECLINE**. |

### M7 acceptance criteria

- ✅ ECDD form can only be completed/approved by CO or REVIEWER.
- ✅ Escalation auto-assigns CO if no reviewer specified.
- ✅ Periodic review scheduler creates tasks 30 days before due date.
- ✅ Every decision (approve/hold/decline/override) requires `reason` ≥10 chars; backend enforces.
- ✅ Unusual activity SMR flag triggers extra confirmation step before final submission.
- ✅ Audit trail shows complete chain of custody for every escalation.

---

## Phase 3 deliverable

A workspace can onboard low-risk individuals end-to-end without provider calls (mock adapters), handle high-risk paths with ECDD + SOF + escalation, and process periodic reviews on schedule. Every decision is audited; every state transition is gated; every reason is captured.
