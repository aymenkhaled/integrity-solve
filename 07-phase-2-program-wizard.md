# 07 — Phase 2: Program Wizard & Outputs (M3–M5)

**Duration:** Weeks 4–9 · **Goal:** the 6-step implementation wizard, automatic document generation, and ongoing program maintenance.

---

## Milestone 3 — Implementation Wizard (Weeks 4–6)

### M3 — The six implementation steps

| # | Form | Key fields | Conditional logic |
|---|------|-----------|-------------------|
| 1 | **Business Profile Intake** | Industry pathway, business structure, staff count, office locations, jurisdictions, client volume, existing AML systems, reporting obligations. | Industry pathway routes Step 2 options; jurisdictions flag international risk exposure. |
| 2 | **Designated Services Applicability** | Which designated services apply, volumes, customer types, geographical exposure, transaction nature, current controls. | Only services relevant to the chosen pathway are shown. High volume thresholds trigger enhanced risk flags. |
| 3 | **Governance & AML Program Setup** | Governing body, board oversight, compliance reporting cycle, external AML support, training schedule, internal audit. | External support flag affects CO appointment in Step 5. Reporting cycle sets review task schedule. |
| 4 | **AML Roles & Responsibilities** | Role allocation matrix, escalation path, deputy designation, external responsible person. | Escalation path must be complete before Step 5 unlocks. |
| 5 | **Compliance Officer Appointment** | Appointed CO name, authority scope, qualifications, tenure, support arrangement, contingency plan. | CO name prefills from Step 4 allocation. **Must match an existing workspace member or trigger a pending invite.** Orphan CO (no linked user) blocks completion. |
| 6 | **Personnel Suitability / Statutory Declaration** | Suitability assessment outcome, conflict of interest flags, fitness and propriety declaration, authorised signatory, declaration date. | Conflict flag → auto-creates compliance task. Declaration submission → enqueues document generation. |

JSON schemas for each step live in `shared/form-schemas/step{1..6}-*.json` and drive `<DynamicFormRenderer>`.

### M3 backend tasks

| Task | File | Detail |
|------|------|--------|
| Program forms CRUD | `server/routes/program-forms.routes.ts` | `GET /program/forms` returns all 6 with status; `PUT /program/forms/:step` autosave (partial); `POST /program/forms/:step/submit` final validation + lock. |
| Storage | `server/storage/program-form.storage.ts` | `getByWorkspace`, `upsertStep`, `submitStep`, `setStatus`. |
| Autosave service | `server/services/program-form.service.ts` | Debounced last-write-wins. `dataJson` is the truth; `lastSavedAt` updated on every save. |
| Step unlock guard | `server/middleware/programStepGate.ts` | Backend validates step N-1 is `COMPLETED` before allowing submit of step N. Frontend mirrors but is not authority. |
| Conditional schemas | `shared/zod-schemas.ts` | Discriminated unions for industry-dependent fields. Same Zod schema validates client + server. |
| Conflict-of-interest hook | `server/services/program-form.service.ts` | When step 6 `conflict_flag = true`, auto-create a `tasks` row assigned to Workspace Admin or CO with due date +7 days. |
| Setup progress | `server/routes/workspaces.routes.ts` | `GET /workspaces/:id/setup-progress` (already in M2; extended now to include per-step `completionPct`, `lastSavedAt`). |

### M3 frontend tasks

| Task | Component | Detail |
|------|-----------|--------|
| `<WizardLayout>` | `components/wizard/WizardLayout.tsx` | Persistent step navigation sidebar; progress bar; step indicator; "Save & Exit" always visible. **Never unmounts between steps** (sub-route via Wouter nested matcher). |
| `<DynamicFormRenderer>` | `components/forms/DynamicFormRenderer.tsx` | Renders fields from JSON schema config: text, number, select, multi-select, radio, checkbox, date, rich-text, file-upload, conditional sections. Drives by `react-hook-form` + zodResolver from `shared/zod-schemas.ts`. |
| `<AutosaveIndicator>` | `components/wizard/AutosaveIndicator.tsx` | Saving / Saved / Unsaved / Failed states. Triggers `PUT` 2s after last change. Last saved timestamp in tooltip. |
| `<StepValidation>` | `components/wizard/StepValidation.tsx` | Field-level errors + summary banner on submit attempt. Prevents progression. |
| `<ContextHelpPanel>` | `components/wizard/ContextHelpPanel.tsx` | Collapsible right panel; per-step help text + regulatory references (content from MDX in `shared/help/step-{n}.mdx`). |
| `<ConditionalSection>` | `components/forms/ConditionalSection.tsx` | Animated expand/collapse based on watched field values. Hidden fields excluded from validation. |
| Step pages | `pages/app/setup/Step{1..6}*.tsx` | Each is a thin page that loads its JSON schema and renders via `<DynamicFormRenderer>` inside `<WizardLayout>`. |

### M3 acceptance criteria

- ✅ All 6 steps render correctly with appropriate conditional sections.
- ✅ Autosave: user closes browser mid-edit and returns to exact state.
- ✅ Step 4 cannot submit before steps 1–3 are `COMPLETED` (backend AND frontend).
- ✅ Step 6 conflict-of-interest flag auto-creates a compliance task.
- ✅ Step 5 CO appointment without a linked user blocks completion until a pending invite is created.
- ✅ Completing Step 6 changes `workspaces.implementationStatus = COMPLETE`.

---

## Milestone 4 — Generated Program Outputs (Weeks 6–8)

### M4 — Document generation pipeline

```
Step 6 submission
  → POST /program/forms/PERSONNEL_SUITABILITY/submit
  → Service creates ProgramVersion (immutable snapshot)
  → Enqueue 4 document.generate jobs (RA, Policy, Procedures, Governance Summary)
  → Job: load template → inject variables → render DOCX → convert to PDF
  → Upload to R2: workspaces/<wsId>/program-documents/<versionId>/<docType>.{docx,pdf}
  → Compute SHA-256 → store on ProgramDocument
  → Set ProgramDocument.status = CURRENT
  → Mark previous versions' documents as SUPERSEDED
  → WebSocket broadcast 'document.generated' to all workspace members
  → Send email 'document-ready' to CO + Workspace Admin
```

### M4 backend tasks

| Task | File | Detail |
|------|------|--------|
| Program version creation | `server/services/program-version.service.ts` | On step 6 submit: assemble `riskSnapshotJson` from all 6 form `dataJson`. Create row with `versionNumber = '1.0'`, increment `'1.1'`, `'1.2'`, etc. on subsequent reviews. Immutable — no UPDATE allowed; supersession only. |
| Document generation service | `server/services/document-generation.service.ts` | Per docType: load DOCX template via `docx`, apply Handlebars-style replacements via `template-maps/<docType>.map.ts`, render `Buffer`, convert to PDF via `pdf-lib` (or LibreOffice subprocess for richer formatting). |
| Template maps | `server/templates/maps/*.map.ts` | One file per doc type. Maps `riskSnapshotJson` paths to template variables. Easy to update without touching generation logic. |
| File storage | `server/services/file-storage.service.ts` | `uploadObject({ key, body, contentType, contentDisposition? })` → R2. `getSignedUrl(key, ttlSeconds)` returns time-limited download. |
| Document generation job | `server/jobs/document-generate.job.ts` | BullMQ job with retry (3 attempts, exponential backoff). On terminal failure: status = FAILED, send notification with retry button. |
| Version supersession | `server/storage/program-version.storage.ts` | When new version becomes CURRENT, prior versions' `programDocuments` move to SUPERSEDED. UI keeps them downloadable. |
| Download endpoint | `server/routes/documents.routes.ts` | `GET /documents/:id/download` validates workspace access, generates fresh 1-hour signed URL, audits download. |

### M4 frontend tasks

| Task | Route/Component | Detail |
|------|-----------------|--------|
| Generation progress UI | `pages/app/DashboardOnboarding.tsx` (final step + completion screen) | "Generating your AML program..." with per-document progress steps. WebSocket subscribes to `document.generated` events; reveals each document as it completes. |
| `<DocumentViewer>` | `components/documents/DocumentViewer.tsx` | PDF preview via PDF.js. Buttons: Download DOCX, Download PDF, Copy link (signed URL). Version badge + generated date + program version reference. |
| Document versions panel | `pages/app/program/Documents.tsx` | List by version with date, who generated, version number, status. CURRENT highlighted. SUPERSEDED clearly labelled. Filter by docType. |
| Risk assessment summary card | `pages/app/program/RiskAssessment.tsx` | Live dashboard view (not the document) showing: industry pathway, designated services, risk rating, key controls, review schedule. Sourced from `ProgramVersion.riskSnapshotJson`. |

### M4 acceptance criteria

- ✅ Step 6 submission triggers generation; all 4 documents complete within 60s.
- ✅ DOCX opens cleanly in Word; PDF renders cleanly in browser PDF.js viewer.
- ✅ Same-version re-download returns identical bytes (checksum match).
- ✅ Previous versions remain downloadable after regeneration.
- ✅ WebSocket pushes generation status; no page refresh needed.

---

## Milestone 5 — Manage My Program (Weeks 8–9)

### M5 — Program maintenance workflows

| Workflow | Detail |
|----------|--------|
| **Program update flow** | User edits any of the 6 forms. Saves are accepted but **do not** regenerate. A "Changes pending regeneration" banner appears. CO or Admin must explicitly submit a *Program Review/Update Record* to create a new `ProgramVersion` and trigger regeneration. |
| **Training records CRUD** | `POST/GET/PATCH /training-records`. Fields: session_title, training_type (INDUCTION/REFRESHER/CO/SYSTEM/OTHER), date, participants, delivery_method, competency_outcome, follow_up_action, evidence file. List view with filters; export to CSV. |
| **Program Review/Update Record** | Form: trigger (SCHEDULED/EVENT/REGULATORY), scope, summary, approver (CO/Admin only), effective date. Submit → creates new `ProgramVersion`, queues regeneration. |
| **Training dashboard widget** | Last training date per role; overdue alerts; upcoming scheduled training. Links to records list. |
| **Program health score** | 0–100 score from: implementation completeness (40%), training recency (20%), review currency (15%), open task count inverse (15%), screening currency (10%). Shown as score card on main dashboard. |
| **Audit trail view** | Paginated read-only audit feed for program-related events. Filterable by date, actor, action. Export to PDF for regulator demos. |

### M5 acceptance criteria

- ✅ User updates a form → "Changes pending regeneration" banner appears; documents not regenerated until explicit Program Review submission.
- ✅ Training records can be created, listed, filtered, and exported as CSV.
- ✅ Submitting a Program Review/Update Record creates new `ProgramVersion` with incremented number and triggers regeneration.
- ✅ Audit trail shows every program-related change with actor, timestamp, before, after.
- ✅ Program health score reflects each input change (verified by unit test).

---

## Phase 2 deliverable

A workspace can complete the implementation wizard, generate Risk Assessment / Policy / Procedures / Governance Summary documents in DOCX + PDF, regenerate them after program reviews, log training, and see a program health score. End-to-end demoable.
