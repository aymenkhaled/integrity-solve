# 11 — 💎 Diamond Feature Layer

These 8 features are **not** in the original spec but are high-value differentiators. Each is a standalone module that can be added after MVP without breaking core architecture. Build in the priority order below — each has a clear ROI/effort ratio.

---

## Build priority

| Order | Feature | Effort | Why this priority |
|-------|---------|--------|-------------------|
| 1 | **Diamond 2 — Smart Monitoring Engine** | High | Closes the "we onboard well but ongoing is manual" gap. Highest retention impact. |
| 2 | **Diamond 1 — AI Risk Narrative Generator** | Medium | Saves hours per file. Highly visible "magic moment" in demos. |
| 3 | **Diamond 3 — Compliance Evidence Pack** | Medium | The killer feature for regulator audits. High customer reach. |
| 4 | **Diamond 7 — Customer-Facing Portal** | High | Reduces customer's onboarding workload by 60%. Enables self-service. |
| 5 | **Diamond 4 — Group Structure Support** | Medium | Unlocks accounting/legal firms with multiple entities (high-ARPU segment). |
| 6 | **Diamond 6 — Regulatory Update Feed** | Medium | Managed-service differentiator; perfect upsell hook. |
| 7 | **Diamond 5 — In-Portal Training Module** | High | Stickiness. Replaces a third-party purchase. |
| 8 | **Diamond 8 — Risk Benchmarking Dashboard** | Low (after some scale) | Requires data. Wait until ≥30 active workspaces in same industry. |

---

## 💎 Diamond 1 — AI-Powered Risk Narrative Generator

**Market opportunity:** compliance officers spend significant time writing risk narrative explanations. AI drafts these from structured data, saving hours per file.

### What it does
Uses Anthropic Claude Sonnet to draft human-readable risk narratives, escalation summaries, and compliance explanations from structured form data. The user reviews, edits, and approves — AI is a drafting assistant, never a decision-maker.

### Features
- Generate ECDD escalation narrative from structured risk factors
- Draft Source of Funds assessment summary from SOF form data
- Explain risk rating calculation in plain English for client files
- Generate preliminary unusual-activity description from flagged factors
- CO can edit AI draft before finalising; tracked changes preserved

### API
```
POST /ai/generate-narrative
  body: { type: 'ESCALATION_SUMMARY' | 'SOF_ASSESSMENT' | 'RISK_EXPLANATION' | 'UNUSUAL_ACTIVITY',
          customerFileId, sourceFormId? }
  → assemble structured prompt from form data
  → call Anthropic via concurrency.service.ts.limitAIRequest()
  → store in ai_narrative_drafts (with promptVersion, modelName, tokens)
  → return { draftId, draftText }

PATCH /ai/narrative-drafts/:id
  body: { finalText, approve: true }
  → store finalText, set approvedAt, link to customer_form
```

### Compliance safeguards
- AI output labelled "AI-drafted — requires compliance officer review" in UI
- Draft cannot be saved to a customer form without explicit human approval step
- Audit log records that AI was used (`aiAssisted: true` flag on `customer_forms`)
- Prompt templates configured in `server/services/ai-prompts/` and version-tracked
- Rate limit: 50 narratives/workspace/day (configurable per tier)

---

## 💎 Diamond 2 — Smart Ongoing Monitoring Engine

**Market opportunity:** most compliance tools handle initial onboarding well but struggle with ongoing monitoring. Automated event-driven monitoring is a major differentiator.

### What it does
Continuous monitoring of active customer files. Detects trigger events and initiates appropriate workflows — without staff manually tracking every client.

### Features
- **Automated re-screening schedule:** LOW = annual, MEDIUM = 6-monthly, HIGH = quarterly, CRITICAL = monthly
- **Watchlist change detection:** if previously-clear screening would now match, alert immediately
- **Ownership change alerts:** if KYB shows changed directors/owners since last check
- **Dormant file detection:** alert on files with no activity for configurable period (default 180d)
- **Jurisdiction risk change:** alert if customer's country risk changes (FATF / regulatory updates)
- **Volume / pattern anomaly:** rule-based flagging of unusual transaction patterns

### Implementation

| Component | Detail |
|-----------|--------|
| Rule engine | `monitoring_rules` table (JSON-configurable per customer type and risk rating). Workspace Admin can configure rule parameters within platform-set bounds. |
| Recurring screening | `server/jobs/recurring-screening.job.ts` cron daily 04:00. Query active files due for re-screen. Enqueue check requests. Update `nextReviewDue`. |
| Watchlist delta | `server/jobs/watchlist-delta.job.ts` cron daily 05:00. Compare current screening results against updated provider watchlists. Requires provider that supports delta detection. |
| Monitoring alerts | `monitoring_alerts` table. Triggered by jobs. Surface in `<MonitoringDashboard>` widget. |
| Dashboard widget | `pages/app/intelligence/MonitoringDashboard.tsx` — files due for review (30/7d), active alerts by severity, screening currency by risk tier. Drill-down to individual file. |

---

## 💎 Diamond 3 — Compliance Evidence Pack Generator

**Market opportunity:** businesses must demonstrate AML/CTF compliance to regulators. Manual compilation is time-consuming and error-prone.

### What it does
Generates a comprehensive, timestamped compliance evidence pack for a period or a specific customer file. Single downloadable ZIP with all decisions, documents, training records, and audit trail.

### Package contents
1. Program Risk Assessment (versioned DOCX/PDF)
2. AML/CTF Policy (versioned DOCX/PDF)
3. AML/CTF Procedures (versioned DOCX/PDF)
4. Training records summary with participant list
5. Customer file decision log (anonymisable option)
6. Escalation outcomes summary
7. Program Review/Update record(s) for the period
8. Audit trail export for the period
9. Provider check evidence references (signed URLs valid 30 days)
10. `index.pdf` showing package contents and generation metadata

### Implementation
```
POST /compliance/evidence-pack
  body: { periodStart, periodEnd, includeCustomerFiles, anonymiseCustomers, password? }
  → INSERT evidence_packs (status=GENERATING)
  → Enqueue evidence-pack-generate job
  → Job:
      Collect documents, generate summary reports as PDF
      Build ZIP (optionally password-protected via 7zip subprocess)
      Upload to R2: workspaces/<wsId>/evidence-packs/<packId>.zip
      Update evidence_packs (status=COMPLETED, filePath, fileSize)
      Notify generator
  → Audit log records every evidence-pack generation (regulatory demonstration)
```

UI: `/app/compliance/evidence-packs` — generate, list, download.

---

## 💎 Diamond 4 — Multi-Workspace / Group Structure

**Market opportunity:** accounting and legal firms operate multiple entities or franchise/group structures. Native support removes a blocker for larger clients.

### What it does
A parent workspace manages a group of related child workspaces — shared compliance oversight, consolidated reporting, delegated access, group-level policy consistency.

### Features
- **Group workspace type** with child workspace management
- **Group-level CO** can view all child dashboards
- **Shared policy templates:** group sets base policy; children can extend
- **Consolidated escalation queue** across all group workspaces
- **Group-level training record aggregation**
- **Group billing:** single billing account with per-workspace usage breakdown

### Implementation
- `workspaces.groupWorkspaceId` (self-FK, nullable)
- New role `GROUP_COMPLIANCE_OFFICER` with read-only access to all child workspaces (write only on group's own data)
- Group dashboard at `/app/group` — aggregate stats across child workspaces
- **Critical:** group access is read-only by default; child workspace admins explicitly opt in to group oversight

---

## 💎 Diamond 5 — In-Portal Training & Competency Module

**Market opportunity:** AML/CTF training is a regulatory requirement. Providing training in the portal makes the product stickier and reduces clients' need for third-party training.

### What it does
Embeds structured AML/CTF training modules directly in the portal. Staff complete training, pass competency checks, automatically update training records — no manual entry.

### Features
- Course library: induction, refresher, role-specific (CO, onboarding, reviewer)
- Lesson player: video or markdown with progress tracking
- Competency assessment: quiz with min pass score (default 80)
- Auto training record entry on completion
- Training expiry alerts: notify staff and CO at 30/14/7 days
- Training compliance dashboard

### Revenue model
- Course content provided by client (white-label container) OR Integrity Solve licenses content
- Optional: sell training-only plan to businesses not needing full portal

### Implementation
Tables: `training_courses`, `training_lessons`, `training_quizzes`, `training_enrollments` (file 04). Pages: `/app/training/CourseLibrary`, `/app/training/LessonPlayer`, `/app/training/CompetencyDashboard`.

---

## 💎 Diamond 6 — Regulatory Update Feed & Impact Alerts

**Market opportunity:** AML/CTF regulations change frequently. Notifying clients of relevant changes is a high-value managed-service differentiator.

### What it does
Curated feed of AML/CTF regulatory updates relevant to each client's industry pathway. Alerts when a change may require a program update or policy review.

### Features
- News feed filtered by industry pathway
- Change-impact assessment: "This update may affect your Designated Services — review recommended"
- One-click program review trigger from regulatory alert
- Alert-history log for evidence of regulatory awareness
- AUSTRAC integration where API/feed available

### Implementation
- `regulatory-feed.job.ts` cron daily 06:00 fetches from configured sources (AUSTRAC, FATF, regulatory blogs)
- NLP tagging via Anthropic for industry/impact tagging (cached results)
- Push notification + email to CO on relevant updates
- Acknowledge / dismiss / actioned tracking via `regulatory_alert_acks`

---

## 💎 Diamond 7 — Customer-Facing CDD Portal

**Market opportunity:** today the portal is used by the reporting entity to collect info about their customers. A client portal flips this — the customer enters their own info, reducing staff workload and improving data quality.

### What it does
Separate, branded customer-facing sub-app where the reporting entity's clients submit their own identity documents, beneficial-ownership info, and source-of-funds documentation. Submissions flow into the main CDD workflow.

### Features
- Branded invitation link sent to customer via email
- Customer uploads own ID documents and completes details form
- Beneficial ownership: entity customers add their own owners
- Source of funds: customer describes own funds origin and uploads evidence
- Progress saved — return-later support
- Submission notification to onboarding officer
- Data maps directly into CustomerFile CDD forms — no manual re-entry

### Security
- Separate subdomain (`portal.<custom-domain>`) — no main-portal access
- Invitation tokens single-use, 14-day expiry
- Customer can submit only to their own file — no browsing
- All uploads encrypted; virus-scanned (ClamAV) before storage
- No outbound links from portal — sandboxed

### Implementation
- `customer_portal_invites` table (file 04)
- Routes under `/customer-portal/*` (no auth, token-based)
- Same R2 storage with separate `evidence/customer-portal/<inviteId>/` prefix
- Storage service writes "submitted by customer-portal invite <id>" into audit

---

## 💎 Diamond 8 — Risk Benchmarking & Industry Insights

**Market opportunity:** anonymised aggregate data from all workspaces is a unique asset. Industry benchmarks are genuinely valuable to compliance officers.

### What it does
Opt-in anonymised benchmarking dashboard showing how a workspace's risk profile and compliance activity compares to peers in the same industry pathway. All data aggregated and de-identified.

### Features
- Average time to complete CDD by customer type (vs industry avg)
- Escalation rate by industry pathway
- Most common CDD red flags by industry
- Training completion rates benchmarked
- Opt-in only with explicit consent; never workspace-attributable

### Implementation
- `workspaces.benchmarkOptIn boolean` flag
- `benchmarking_snapshots` table (file 04) populated weekly via batch job
- Min sample size 30 workspaces per industry to publish a percentile
- Display p50/p75/p90 only; never raw points
- Page: `/app/intelligence/Benchmarks` (Enterprise tier and above only)
