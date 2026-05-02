# INTEGRITY SOLVE — COMPREHENSIVE MASTER BUILD PLAN
### Complete AML/CTF Compliance SaaS Platform
**Analysis depth:** All 17 source files + complete 2021-line docx-generator document  
**Gaps identified:** 12 critical (G1–G12)  
**Diamond features:** 8 (D1–D8)  
**Total tables:** 43 (33 core + 10 diamond)  
**Total secrets:** 36 across 5 phases  

---

## TABLE OF CONTENTS

1. [Project Charter & Non-Negotiables](#1-project-charter--non-negotiables)
2. [Technology Stack — Locked](#2-technology-stack--locked)
3. [Folder Structure (97+ files)](#3-folder-structure-97-files)
4. [Complete Database Schema (43 tables, 28 enums)](#4-complete-database-schema-43-tables-28-enums)
5. [Architecture Deep-Dive](#5-architecture-deep-dive)
6. [RBAC Matrix (8 roles × 26 actions)](#6-rbac-matrix-8-roles--26-actions)
7. [State Machines](#7-state-machines)
8. [Phase 0 — Bootstrap](#8-phase-0--bootstrap)
9. [Phase 1 — Foundation (M1 + M2)](#9-phase-1--foundation-m1--m2)
10. [Phase 2 — Program Wizard (M3 + M4 + M5)](#10-phase-2--program-wizard-m3--m4--m5)
11. [Phase 3 — Customer Lifecycle (M6 + M7)](#11-phase-3--customer-lifecycle-m6--m7)
12. [Phase 4 — Integrations (M8 + M9)](#12-phase-4--integrations-m8--m9)
13. [Phase 5 — Production Hardening (M10)](#13-phase-5--production-hardening-m10)
14. [Diamond Feature Layer (D1–D8)](#14-diamond-feature-layer-d1d8)
15. [3D Landing Page — Full Spec](#15-3d-landing-page--full-spec)
16. [Gap Analysis — 12 Critical Fixes (G1–G12)](#16-gap-analysis--12-critical-fixes-g1g12)
17. [Provider Adapter Layer](#17-provider-adapter-layer)
18. [Document Generation Engine](#18-document-generation-engine)
19. [Testing Strategy — Full Coverage](#19-testing-strategy--full-coverage)
20. [Environment & Secrets Reference (36 secrets)](#20-environment--secrets-reference-36-secrets)
21. [Deployment on Replit](#21-deployment-on-replit)
22. [Better Solutions & Research Findings](#22-better-solutions--research-findings)
23. [Timeline & Confidence](#23-timeline--confidence)

---

## 1. PROJECT CHARTER & NON-NEGOTIABLES

### What INTEGRITY SOLVE Is
A **production-grade AML/CTF (Anti-Money Laundering / Counter-Terrorism Financing) compliance SaaS platform** for Australian reporting entities. It replaces Word docs, CDD spreadsheets, and manual screening reminders with a single audit-grade operating system.

### The 10 Non-Negotiable Constraints

These are hard constraints. Violating any one of them makes the platform non-compliant or architecturally unsound:

| # | Constraint | Consequence if violated |
|---|-----------|------------------------|
| 1 | **Stack is fixed.** React 18 + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind v3. Express + TypeScript + Drizzle ORM + PostgreSQL. Never Next.js, NestJS, Prisma, or Clerk. | Architecture incompatibility; full rewrite required |
| 2 | **Workspace isolation is triple-layer.** Express middleware + storage convention + PostgreSQL RLS. All three, always. | Cross-tenant data leak — regulatory catastrophe |
| 3 | **Audit log is append-only.** No UPDATE, no DELETE, ever. DB trigger as backstop. | Chain of custody broken; evidence inadmissible |
| 4 | **Every decision requires `reason` ≥ 10 chars.** Enforced at backend. Frontend minimum-length indicator. | Regulatory non-compliance; meaningless audit trail |
| 5 | **Never treat provider timeout as a clear result.** PROCESSING, not CLEAR. Human override required. | Flagged person onboarded without proper checks |
| 6 | **Provider adapter is capability-based.** Never reference provider name in UI code. | Hard-coded provider creates migration nightmare |
| 7 | **httpOnly cookie sessions only.** No localStorage JWTs. | XSS vulnerability |
| 8 | **Single workflow:** `NODE_ENV=development npm run dev` — frontend + backend + worker in one process. | Replit incompatibility |
| 9 | **All IDs use cuid2.** All timestamps use `withTimezone`. | ID collision risk; timezone bugs in audit records |
| 10 | **Reserved VM deployment** (not Autoscale). BullMQ + WebSockets require stable process lifetime. | In-flight jobs lost; WebSocket connections reset |

### Execution Order (MANDATORY)
```
Phase 0 (Bootstrap) → Phase 1 (M1: Foundation) → Phase 1 (M2: Registration)
→ Phase 2 (M3: Wizard Forms) → Phase 2 (M4: Document Generation)
→ Phase 2 (M5: Program Updates) → Phase 3 (M6: Customer Files)
→ Phase 3 (M7: ECDD + Escalations) → Phase 4 (M8: Provider Integration)
→ Phase 4 (M9: Billing) → Phase 5 (M10: Production Hardening)
→ Diamond Layer (D2→D1→D3→D7→D4→D6→D5→D8)
Landing page runs PARALLEL to Phase 1 (no backend dependencies until S8 pricing).
```

---

## 2. TECHNOLOGY STACK — LOCKED

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| Vite | 6.0.3 | Build tool + dev server |
| Wouter | 3.3.5 | Client-side routing (NOT React Router) |
| TanStack Query | 5.62.7 | Server state management |
| TanStack Table | 8.20.5 | Data tables |
| shadcn/ui | latest | Component primitives |
| Tailwind CSS | 3.4.16 (PINNED — NOT v4) | Styling |
| tailwindcss-animate | 1.0.7 | Animation utilities |
| Radix UI | various | Accessible primitives |
| Framer Motion | 11.13.1 | Non-3D micro-interactions |
| Zustand | 5.0.2 | Client state (wizard, notifications) |
| React Hook Form | 7.54.0 | Form management |
| Zod | 3.23.8 | Runtime validation (shared with server) |
| Three.js | 0.171.0 | 3D rendering (landing page only) |
| @react-three/fiber | 8.17.10 | React wrapper for Three.js |
| @react-three/drei | 9.116.0 | Three.js helpers + MeshTransmissionMaterial |
| @react-three/postprocessing | 2.16.3 | Bloom, ChromaticAberration, Vignette |
| GSAP | 3.12.5 | ScrollTrigger animations |
| @studio-freight/lenis | 1.0.42 | Smooth scroll |
| lucide-react | 0.468.0 | Icons |
| next-themes | 0.4.4 | Dark/light mode |
| date-fns | 4.1.0 | Date utilities |
| @sentry/react | 8.42.0 | Frontend error tracking |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | ≥20.0.0 | Runtime |
| Express | 4.21.2 | HTTP server |
| TypeScript | 5.7.2 | Type safety |
| Drizzle ORM | 0.36.4 | Database ORM |
| drizzle-kit | 0.30.1 | Migrations |
| drizzle-zod | 0.5.1 | Schema → Zod validation |
| PostgreSQL (pg) | 8.13.1 | Database driver |
| @neondatabase/serverless | 0.10.4 | Neon serverless driver (prod) |
| BullMQ | 5.34.0 | Job queue (Redis-backed) |
| node-cron | 3.0.3 | Cron scheduling |
| bcrypt | 5.1.1 | Password hashing |
| cookie-parser | 1.4.7 | Session cookies |
| helmet | 8.0.0 | Security headers |
| express-rate-limit | 7.4.1 | Rate limiting |
| cors | 2.8.5 | CORS |
| pino + pino-http | 9.5.0 | Structured logging |
| @sentry/node | 8.42.0 | Backend error tracking |
| multer | 1.4.5-lts.1 | File upload handling |
| @aws-sdk/client-s3 | 3.700.0 | Cloudflare R2 (S3-compatible) |
| @aws-sdk/s3-request-presigner | 3.700.0 | Pre-signed URLs |
| stripe | 17.4.0 | Billing |
| nodemailer | 6.9.16 | Email (SMTP) |
| twilio | 5.4.0 | SMS / mobile OTP |
| ws | 8.18.0 | WebSocket server |
| @anthropic-ai/sdk | 0.30.0 | AI narratives (Diamond 1) |
| docx | 9.0.3 | DOCX generation |
| pdf-lib | 1.17.1 | PDF generation |
| archiver | 7.0.1 | ZIP evidence packs |
| @react-email/render | 1.0.4 | Email templates |
| @paralleldrive/cuid2 | 2.2.2 | ID generation |
| jsonwebtoken | 9.0.2 | Token signing (invites, portal) |
| react-joyride | 2.9.2 | Onboarding tours |
| uuid | 11.0.3 | Supplementary IDs |

### Database
- **Development:** Replit PostgreSQL (auto-provisioned)
- **Production:** Neon serverless PostgreSQL
- **Redis:** Upstash (BullMQ queue backend)
- Schema: single source of truth at `shared/schema.ts`

### Build Tooling
| Tool | Purpose |
|------|---------|
| tsx | TypeScript execution for server |
| vitest | Unit + integration tests |
| playwright | E2E browser tests |
| supertest | HTTP integration tests |
| msw | Service worker mocks for provider tests |
| eslint | Linting |
| prettier | Code formatting |
| postcss + autoprefixer | CSS processing |

---

## 3. FOLDER STRUCTURE (97+ FILES)

```
integrity-solve/
├── client/                              # React 18 + Vite frontend
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── og-image.png                # 1200×630 Open Graph image
│   └── src/
│       ├── main.tsx                     # App entry: QueryClient, ThemeProvider, Router
│       ├── App.tsx                      # Route table, lazy-loaded pages
│       ├── index.css                    # Tailwind base + CSS custom properties
│       ├── components/
│       │   ├── ui/                      # shadcn primitives (~50 files)
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── dialog.tsx
│       │   │   ├── input.tsx
│       │   │   ├── select.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── toast.tsx            # Use sonner (not radix toast)
│       │   │   └── ... (44 more)
│       │   ├── layout/
│       │   │   ├── AppShell.tsx         # Main authenticated shell
│       │   │   ├── Sidebar.tsx          # Collapsible nav
│       │   │   ├── TopBar.tsx           # Breadcrumbs + notification bell
│       │   │   ├── MobileBottomNav.tsx  # Mobile nav bar
│       │   │   └── WorkspaceSwitcher.tsx
│       │   ├── auth/
│       │   │   ├── ProtectedRoute.tsx   # Redirect to /login if not authenticated
│       │   │   ├── PermissionGate.tsx   # Hide UI by RBAC action
│       │   │   └── RoleBadge.tsx        # Coloured role chip
│       │   ├── wizard/
│       │   │   ├── WizardLayout.tsx     # Step sidebar + content area
│       │   │   ├── StepNavigator.tsx    # Step list with completion state
│       │   │   ├── AutosaveIndicator.tsx
│       │   │   ├── StepValidation.tsx   # Per-step validation status
│       │   │   └── ContextHelpPanel.tsx # Sliding guidance panel
│       │   ├── forms/
│       │   │   ├── DynamicFormRenderer.tsx  # JSON schema → React form
│       │   │   ├── ConditionalSection.tsx   # Show/hide based on answer
│       │   │   ├── EvidenceUploader.tsx     # Drag-drop + file list
│       │   │   ├── BeneficialOwnerForm.tsx  # Repeating BO entry form
│       │   │   └── fields/              # Reusable field components
│       │   │       ├── TextField.tsx
│       │   │       ├── SelectField.tsx
│       │   │       ├── DateField.tsx
│       │   │       ├── CheckboxField.tsx
│       │   │       ├── RadioGroupField.tsx
│       │   │       └── PercentageField.tsx
│       │   ├── workflow/
│       │   │   ├── FileStateBadge.tsx   # 12-state colour-coded badge
│       │   │   ├── FileTimeline.tsx     # file_state_history display
│       │   │   ├── RiskRatingCard.tsx   # LOW/MEDIUM/HIGH/CRITICAL card
│       │   │   ├── ReviewDecisionModal.tsx  # Approve/decline with reason
│       │   │   └── EscalationCard.tsx   # Escalation summary card
│       │   ├── documents/
│       │   │   ├── DocumentViewer.tsx   # PDF iframe + DOCX download
│       │   │   ├── DocumentVersionList.tsx
│       │   │   └── DownloadButton.tsx   # Triggers signed URL
│       │   ├── billing/
│       │   │   ├── PlanPicker.tsx       # 5 tier cards
│       │   │   ├── PaymentMethodForm.tsx # Stripe Elements
│       │   │   ├── UsageBreakdown.tsx   # Per-check usage chart
│       │   │   └── BillingStatusBanner.tsx  # PAST_DUE / SUSPENDED banner
│       │   ├── tables/
│       │   │   ├── DataTable.tsx        # TanStack Table wrapper with filters
│       │   │   └── ExportButton.tsx     # CSV / XLSX export
│       │   ├── notifications/
│       │   │   ├── NotificationBell.tsx # Unread count badge
│       │   │   └── NotificationList.tsx # Dropdown notification panel
│       │   ├── landing/
│       │   │   ├── Hero3D.tsx           # Full hero block, wraps Canvas
│       │   │   ├── HeroScene.tsx        # R3F scene contents
│       │   │   ├── CrystallineShield.tsx    # Icosahedron + MeshTransmissionMaterial
│       │   │   ├── OrbitingArtefacts.tsx    # 4 floating evidence cards
│       │   │   ├── ParticleField.tsx        # 400-point particle system
│       │   │   ├── ProblemStats.tsx         # S2 stats counters
│       │   │   ├── HowItWorks.tsx           # S3 GSAP-pinned 3-step
│       │   │   ├── FeatureGrid.tsx          # S4 4×3 feature cards
│       │   │   ├── StateDiagramInteractive.tsx  # S5 clickable state machine
│       │   │   ├── TrustBadges.tsx          # S6 security pills
│       │   │   ├── TestimonialCarousel.tsx  # S7 testimonials
│       │   │   ├── PricingPreview.tsx       # S8 3 tier cards
│       │   │   ├── FaqAccordion.tsx         # S9 8 FAQ items
│       │   │   ├── FinalCta.tsx             # S10
│       │   │   ├── LandingFooter.tsx        # S11 4-column footer
│       │   │   ├── StickyTopCta.tsx         # Appears after 600px scroll
│       │   │   ├── ExitIntentModal.tsx      # Desktop exit-intent
│       │   │   ├── SocialProofToast.tsx     # Bottom-left social proof
│       │   │   └── ScrollProgress.tsx       # Lenis progress bar
│       │   └── shared/
│       │       ├── LoadingSpinner.tsx
│       │       ├── EmptyState.tsx
│       │       ├── ErrorBoundary.tsx
│       │       ├── ConfirmDialog.tsx
│       │       └── PageHeader.tsx
│       ├── pages/
│       │   ├── public/
│       │   │   ├── Landing.tsx              # Composes S1–S11
│       │   │   ├── Pricing.tsx              # Full pricing page
│       │   │   ├── Features.tsx
│       │   │   ├── Compliance.tsx           # Trust/security deep-dive
│       │   │   ├── About.tsx
│       │   │   └── Contact.tsx
│       │   ├── auth/
│       │   │   ├── Login.tsx
│       │   │   ├── Register.tsx
│       │   │   ├── VerifyEmail.tsx
│       │   │   ├── VerifyMobile.tsx
│       │   │   ├── VerifyIdentity.tsx       # Facia integration (prod gate)
│       │   │   ├── ForgotPassword.tsx
│       │   │   ├── ResetPassword.tsx
│       │   │   ├── AcceptInvite.tsx
│       │   │   └── RegisterBusiness.tsx
│       │   ├── app/
│       │   │   ├── DashboardOnboarding.tsx  # First-time setup checklist
│       │   │   ├── Dashboard.tsx            # Main dashboard
│       │   │   ├── setup/                   # 6-step program wizard
│       │   │   │   ├── Step1BusinessProfile.tsx
│       │   │   │   ├── Step2DesignatedServices.tsx
│       │   │   │   ├── Step3Governance.tsx
│       │   │   │   ├── Step4RolesResponsibilities.tsx
│       │   │   │   ├── Step5CoAppointment.tsx
│       │   │   │   └── Step6PersonnelSuitability.tsx
│       │   │   ├── program/
│       │   │   │   ├── Overview.tsx
│       │   │   │   ├── Documents.tsx
│       │   │   │   ├── RiskAssessment.tsx
│       │   │   │   ├── TrainingRecords.tsx
│       │   │   │   ├── ProgramReviews.tsx
│       │   │   │   └── AuditTrail.tsx
│       │   │   ├── clients/
│       │   │   │   ├── ClientList.tsx
│       │   │   │   ├── NewClient.tsx
│       │   │   │   ├── ClientDetail.tsx
│       │   │   │   └── tabs/
│       │   │   │       ├── OverviewTab.tsx
│       │   │   │       ├── CddTab.tsx
│       │   │   │       ├── ChecksTab.tsx
│       │   │   │       ├── EvidenceTab.tsx
│       │   │   │       ├── BeneficialOwnersTab.tsx
│       │   │   │       ├── EscalationsTab.tsx
│       │   │   │       └── AuditTab.tsx
│       │   │   ├── escalations/
│       │   │   │   ├── EscalationQueue.tsx
│       │   │   │   └── EscalationDetail.tsx
│       │   │   ├── reviews/
│       │   │   │   ├── ReviewQueue.tsx
│       │   │   │   └── PeriodicReview.tsx
│       │   │   ├── billing/
│       │   │   │   ├── BillingOverview.tsx
│       │   │   │   ├── BillingSetup.tsx
│       │   │   │   ├── Usage.tsx
│       │   │   │   └── Invoices.tsx
│       │   │   ├── settings/
│       │   │   │   ├── Workspace.tsx
│       │   │   │   ├── Members.tsx
│       │   │   │   ├── Roles.tsx
│       │   │   │   ├── Integrations.tsx
│       │   │   │   ├── Notifications.tsx
│       │   │   │   └── Profile.tsx
│       │   │   ├── intelligence/            # Diamond 2 + 6
│       │   │   │   ├── MonitoringDashboard.tsx
│       │   │   │   └── RegulatoryFeed.tsx
│       │   │   ├── training/                # Diamond 5
│       │   │   │   ├── CourseLibrary.tsx
│       │   │   │   ├── LessonPlayer.tsx
│       │   │   │   └── CompetencyDashboard.tsx
│       │   │   └── group/                   # Diamond 4
│       │   │       └── GroupDashboard.tsx
│       │   ├── customer-portal/             # Diamond 7 (token-based, no auth)
│       │   │   ├── PortalLanding.tsx
│       │   │   ├── PortalIdentity.tsx
│       │   │   ├── PortalBeneficialOwners.tsx
│       │   │   └── PortalSourceOfFunds.tsx
│       │   └── platform/                    # PLATFORM_ADMIN + SUPPORT only
│       │       ├── PlatformDashboard.tsx
│       │       ├── WorkspaceList.tsx
│       │       ├── ProviderHealth.tsx
│       │       └── SupportRequests.tsx
│       ├── hooks/
│       │   ├── useAuth.ts                   # Session user + logout
│       │   ├── useWorkspace.ts              # Active workspace context
│       │   ├── usePermission.ts             # can(action) hook
│       │   ├── useWebSocket.ts              # WS connection + message handler
│       │   ├── useAutosave.ts               # Debounced PATCH on form change
│       │   ├── useDocumentGenerationProgress.ts
│       │   └── useToast.ts                  # Sonner wrapper
│       ├── lib/
│       │   ├── api.ts                       # Typed fetch + auto cookie + 401 refresh
│       │   ├── queryClient.ts               # TanStack Query config
│       │   ├── stripe.ts                    # Stripe.js loader
│       │   ├── ws-client.ts                 # WebSocket client singleton
│       │   ├── format.ts                    # Date / currency / number formatters
│       │   ├── routes.ts                    # Centralised route paths (no magic strings)
│       │   └── utils.ts                     # cn(), truncate(), etc.
│       ├── stores/
│       │   ├── wizardStore.ts               # Zustand: wizard state across steps
│       │   ├── notificationStore.ts         # Unread count + list
│       │   └── themeStore.ts                # Dark/light preference
│       └── styles/
│           └── globals.css                  # CSS custom properties + font imports
│
├── server/
│   ├── index.ts                             # Entry: env validate, listen, signal handlers
│   ├── app.ts                               # Express app factory (testable without listen)
│   ├── db.ts                                # Drizzle client + pool + RLS transaction helper
│   ├── env.ts                               # Zod-validated process.env (fail fast)
│   ├── logger.ts                            # Pino instance + request ID middleware
│   ├── ws.ts                                # WebSocketService (broadcastToUser/Workspace)
│   ├── vite.ts                              # Vite dev middleware (StrategyNavigator pattern)
│   ├── middleware/
│   │   ├── requireAuth.ts                   # 401 if no valid session
│   │   ├── withWorkspace.ts                 # Resolve + validate workspace membership
│   │   ├── requireAction.ts                 # RBAC: can(role, action) or 403
│   │   ├── withAudit.ts                     # Before/after snapshot + audit insert
│   │   ├── rateLimit.ts                     # Tiered rate limits per endpoint type
│   │   ├── requestId.ts                     # UUID request ID on every request
│   │   ├── errorHandler.ts                  # Global error → Sentry + JSON response
│   │   └── billingActive.ts                 # 402 if billingStatus ≠ ACTIVE
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── workspaces.routes.ts
│   │   ├── memberships.routes.ts
│   │   ├── invitations.routes.ts
│   │   ├── program-forms.routes.ts
│   │   ├── program-versions.routes.ts
│   │   ├── documents.routes.ts
│   │   ├── customers.routes.ts
│   │   ├── customer-files.routes.ts
│   │   ├── checks.routes.ts
│   │   ├── escalations.routes.ts
│   │   ├── reviews.routes.ts
│   │   ├── training.routes.ts
│   │   ├── billing.routes.ts
│   │   ├── webhooks.routes.ts               # /webhooks/stripe, /webhooks/facia, /webhooks/aml-watcher
│   │   ├── audit.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── platform.routes.ts
│   │   ├── customer-portal.routes.ts        # Diamond 7
│   │   ├── ai.routes.ts                     # Diamond 1
│   │   ├── monitoring.routes.ts             # Diamond 2
│   │   ├── evidence-pack.routes.ts          # Diamond 3
│   │   ├── group.routes.ts                  # Diamond 4
│   │   ├── training-modules.routes.ts       # Diamond 5
│   │   ├── regulatory-feed.routes.ts        # Diamond 6
│   │   └── benchmarking.routes.ts           # Diamond 8
│   ├── storage/                             # One file per entity, workspaceId always first arg
│   │   ├── user.storage.ts
│   │   ├── workspace.storage.ts
│   │   ├── membership.storage.ts
│   │   ├── invitation.storage.ts
│   │   ├── program-form.storage.ts
│   │   ├── program-version.storage.ts
│   │   ├── document.storage.ts
│   │   ├── customer.storage.ts
│   │   ├── customer-file.storage.ts
│   │   ├── check-request.storage.ts
│   │   ├── check-result.storage.ts
│   │   ├── escalation.storage.ts
│   │   ├── review.storage.ts
│   │   ├── training.storage.ts
│   │   ├── billing.storage.ts
│   │   ├── audit.storage.ts
│   │   ├── notification.storage.ts
│   │   └── job-lock.storage.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── workspace.service.ts
│   │   ├── workspace-state.service.ts       # Workspace 4-state machine
│   │   ├── registry.service.ts              # ABN/ACN lookup
│   │   ├── program-form.service.ts
│   │   ├── document-generation.service.ts
│   │   ├── pdf.service.ts
│   │   ├── docx.service.ts
│   │   ├── file-storage.service.ts          # R2 wrapper + signed URLs + ClamAV
│   │   ├── customer-file.service.ts
│   │   ├── customer-file-state.service.ts   # 12-state machine
│   │   ├── risk-calculator.service.ts       # Deterministic risk scoring
│   │   ├── check-orchestrator.service.ts    # Route to correct provider adapter
│   │   ├── escalation.service.ts
│   │   ├── periodic-review.service.ts
│   │   ├── billing.service.ts
│   │   ├── stripe-webhook.service.ts
│   │   ├── usage-event.service.ts
│   │   ├── notification.service.ts          # Channel routing + MANDATORY_TYPES bypass
│   │   ├── email.service.ts
│   │   ├── sms.service.ts
│   │   ├── audit.service.ts
│   │   ├── concurrency.service.ts           # AI request rate limiter
│   │   ├── ai-narrative.service.ts          # Diamond 1
│   │   ├── monitoring.service.ts            # Diamond 2
│   │   ├── evidence-pack.service.ts         # Diamond 3
│   │   ├── group.service.ts                 # Diamond 4
│   │   ├── training-module.service.ts       # Diamond 5
│   │   ├── regulatory-feed.service.ts       # Diamond 6
│   │   ├── customer-portal.service.ts       # Diamond 7
│   │   └── benchmarking.service.ts          # Diamond 8
│   ├── providers/
│   │   ├── types.ts                         # ProviderAdapter interface (capability-based)
│   │   ├── registry.ts                      # ProviderRegistry: capability → adapter
│   │   ├── mock/
│   │   │   ├── mock-identity.adapter.ts     # Simulates Facia with realistic latency
│   │   │   ├── mock-aml.adapter.ts          # always_pass/fail/random modes
│   │   │   ├── mock-kyb.adapter.ts
│   │   │   └── mock-config.ts
│   │   ├── facia/
│   │   │   └── facia-identity.adapter.ts    # Phase 4
│   │   ├── aml-watcher/
│   │   │   ├── aml-watcher-individual.adapter.ts
│   │   │   └── aml-watcher-entity.adapter.ts
│   │   └── abr/
│   │       └── abr-kyb.adapter.ts           # ABN Business Register lookup
│   ├── jobs/
│   │   ├── index.ts                         # Cron registration (staggered 30s offsets)
│   │   ├── scheduler.ts                     # withDistributedLock helper
│   │   ├── document-generate.job.ts
│   │   ├── check-submit.job.ts
│   │   ├── check-poll.job.ts                # Every 60s: poll PROCESSING checks
│   │   ├── check-reconcile.job.ts           # Daily 02:00: find stale PROCESSING checks
│   │   ├── webhook-process.job.ts
│   │   ├── review-scheduler.job.ts          # Daily 03:00: files due ≤ 30 days
│   │   ├── recurring-screening.job.ts       # Daily 04:00: re-screen by risk tier
│   │   ├── watchlist-delta.job.ts           # Daily 05:00: watchlist change detection
│   │   ├── regulatory-feed.job.ts           # Daily 06:00: fetch + NLP-tag updates
│   │   ├── billing-usage-report.job.ts      # Hourly: push usage_events to Stripe
│   │   ├── evidence-pack-generate.job.ts    # On-demand: assemble ZIP
│   │   ├── retention-cleanup.job.ts         # Daily midnight: enforce retention (Gap G7)
│   │   └── notification-digest.job.ts       # Daily 09:00: email digest
│   ├── templates/
│   │   ├── risk-assessment.template.docx
│   │   ├── policy.template.docx
│   │   ├── procedures.template.docx
│   │   ├── governance-summary.template.docx
│   │   ├── completion-pack.template.docx
│   │   └── maps/
│   │       ├── risk-assessment.map.ts
│   │       ├── policy.map.ts
│   │       ├── procedures.map.ts
│   │       └── governance-summary.map.ts
│   └── emails/                              # React Email templates
│       ├── _base.tsx
│       ├── verify-email.tsx
│       ├── verify-mobile-fallback.tsx
│       ├── invite.tsx
│       ├── escalation-assigned.tsx
│       ├── escalation-stale.tsx
│       ├── review-due.tsx
│       ├── billing-past-due.tsx
│       ├── billing-suspended.tsx
│       ├── customer-portal-invite.tsx
│       ├── document-ready.tsx
│       └── digest.tsx
│
├── shared/
│   ├── schema.ts                            # Drizzle schema — single source of truth
│   ├── enums.ts                             # All TypeScript + Zod enums
│   ├── zod-schemas.ts                       # Shared validation schemas
│   ├── rbac.ts                              # PERMISSIONS matrix + can()
│   ├── state-machines.ts                    # Transition tables for both machines
│   ├── form-schemas/                        # JSON schemas for DynamicFormRenderer
│   │   ├── step1-business-profile.json
│   │   ├── step2-designated-services.json
│   │   ├── step3-governance.json
│   │   ├── step4-roles-responsibilities.json
│   │   ├── step5-co-appointment.json
│   │   ├── step6-personnel-suitability.json
│   │   ├── cdd-individual.json
│   │   ├── cdd-company.json
│   │   ├── cdd-trust.json
│   │   ├── cdd-partnership.json
│   │   ├── beneficial-ownership.json
│   │   ├── ecdd.json
│   │   ├── source-of-funds.json
│   │   ├── source-of-wealth.json
│   │   ├── escalation.json
│   │   ├── unusual-activity.json
│   │   └── periodic-review.json
│   └── risk-rules.ts                        # Deterministic risk scoring ruleset
│
├── tests/
│   ├── unit/
│   │   ├── risk-calculator.test.ts
│   │   ├── customer-file-state.test.ts
│   │   ├── workspace-state.test.ts
│   │   ├── rbac.test.ts
│   │   ├── provider-normalizers.test.ts
│   │   └── document-checksum.test.ts        # Gap G11 fix
│   ├── integration/
│   │   ├── auth.routes.test.ts
│   │   ├── workspace-isolation.test.ts      # MOST IMPORTANT TEST
│   │   ├── program-wizard.routes.test.ts
│   │   ├── customer-file.routes.test.ts
│   │   ├── checks.routes.test.ts
│   │   ├── billing-webhook.test.ts
│   │   └── audit-immutability.test.ts
│   └── e2e/
│       ├── register-and-onboard.spec.ts     # UAT 1
│       ├── wizard-and-generate.spec.ts      # UAT 2 (partial)
│       ├── high-risk-escalation.spec.ts     # UAT 2 (full)
│       ├── billing-paywall.spec.ts          # UAT 3
│       ├── customer-portal.spec.ts          # UAT 4 (Diamond 7)
│       └── evidence-pack.spec.ts            # UAT 5 (Diamond 3)
│
├── drizzle/
│   └── 0000_init.sql
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── tsconfig.server.json
├── package.json
├── .env.example
├── .gitignore
└── replit.md
```

**Path aliases:**
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@server/*` → `server/*` (server-only, never imported from client)

---

## 4. COMPLETE DATABASE SCHEMA (43 TABLES, 28 ENUMS)

### 4.1 The 28 Enums

```typescript
// shared/enums.ts

// Workspace
workspaceStatusEnum: 'PENDING_SETUP' | 'SETUP_IN_PROGRESS' | 'ACTIVE' | 'SUSPENDED'
billingStatusEnum: 'INACTIVE' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED'
billingTierEnum: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'GROUP' | 'LIFETIME'

// Users & Roles
userRoleEnum: 'WORKSPACE_ADMIN' | 'COMPLIANCE_OFFICER' | 'PROGRAM_CONTRIBUTOR' | 
              'ONBOARDING_USER' | 'REVIEWER' | 'READ_ONLY' | 'PLATFORM_ADMIN' | 'SUPPORT'
membershipStatusEnum: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
identityStatusEnum: 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED'

// Customer Files
customerTypeEnum: 'INDIVIDUAL' | 'COMPANY' | 'TRUST' | 'PARTNERSHIP' | 'ASSOCIATION' | 'OTHER'
customerStatusEnum: 'ACTIVE' | 'INACTIVE' | 'DECEASED' | 'DISSOLVED'
fileStateEnum: 'DRAFT' | 'CDD_IN_PROGRESS' | 'PENDING_CHECKS' | 'CHECKS_RETURNED' | 
               'ECDD_REQUIRED' | 'UNDER_REVIEW' | 'APPROVED' | 'APPROVED_WITH_CONTROLS' | 
               'HELD' | 'DECLINED' | 'REVIEW_DUE' | 'CLOSED'
riskRatingEnum: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Forms & Checks
formStatusEnum: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
checkStatusEnum: 'QUEUED' | 'PROCESSING' | 'PASSED' | 'POTENTIAL_MATCH' | 
                 'FAILED' | 'ERROR' | 'MANUAL_OVERRIDE'
providerCapabilityEnum: 'IDENTITY_VERIFICATION' | 'AML_SCREENING' | 
                        'AML_SCREENING_ENTITY' | 'KYB_LOOKUP'
providerEnvironmentEnum: 'SANDBOX' | 'PRODUCTION'
subjectTypeEnum: 'INDIVIDUAL' | 'ENTITY' | 'BENEFICIAL_OWNER'

// Escalations
escalationStatusEnum: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
escalationDecisionEnum: 'CLEARED' | 'ACCEPTED_WITH_CONTROLS' | 'DECLINED' | 
                        'REFERRED_TO_AUSTRAC' | 'SMR_FILED'
periodicReviewOutcomeEnum: 'NO_CHANGE' | 'RISK_INCREASED' | 'RISK_DECREASED' | 
                           'FILE_CLOSED' | 'ECDD_REQUIRED'
sofConclusionEnum: 'PLAUSIBLE' | 'PARTIALLY_PLAUSIBLE' | 'IMPLAUSIBLE' | 'INCONCLUSIVE'

// Tasks
taskStatusEnum: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
taskPriorityEnum: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// Notifications
notificationChannelEnum: 'IN_APP' | 'EMAIL' | 'SMS'

// Documents
documentTypeEnum: 'RISK_ASSESSMENT' | 'POLICY' | 'PROCEDURES' | 
                  'GOVERNANCE_SUMMARY' | 'COMPLETION_PACK'
documentStatusEnum: 'GENERATING' | 'READY' | 'SUPERSEDED' | 'FAILED'

// Training
trainingOutcomeEnum: 'ATTENDED' | 'PASSED' | 'FAILED' | 'EXEMPT'

// Program
programVersionStatusEnum: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED'
programStepStatusEnum: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED'
```

### 4.2 Core Tables (33 tables)

#### Identity & Access
```
users                    — Core user records with identityStatus
workspaces               — Multi-tenant workspace root
workspace_memberships    — User × Workspace × Role
invitations              — Email-based workspace invitations
```

#### Program Wizard (6 steps)
```
program_forms            — Per-step JSON form data (autosaved)
program_versions         — Published snapshots of complete programs
```

#### Document Generation
```
program_documents        — Generated DOCX + PDF files with checksums
```

#### Program Lifecycle
```
training_records         — Manually-recorded (or auto-completed in Diamond 5) training
program_reviews          — Scheduled or event-triggered program review records
```

#### Customer Lifecycle
```
customers                — Customer master record (type, legal name, ABN, status)
customer_files           — CDD file per customer (12-state machine)
customer_forms           — Per-form-type JSON data within a file
beneficial_owners        — BO records linked to file (+ optional person_record_id)
person_records           — Shared person identity (deduplication — Gap G3 fix)
evidence_files           — Uploaded documents (R2 keys + checksums)
file_state_history       — Immutable chain of custody for every state transition
```

#### Checks
```
check_requests           — Provider check submissions (idempotency key)
check_results            — Normalised provider results
webhook_events           — Idempotent provider webhook log
```

#### Review & Escalation
```
escalations              — ECDD escalation records with SMR tracking
periodic_reviews         — Scheduled re-review records
source_of_funds_assessments
source_of_wealth_assessments
```

#### Operations
```
tasks                    — Compliance officer task list
notifications            — Multi-channel notification log
notification_preferences — Per-user channel + type preferences
audit_log                — APPEND-ONLY immutable event log
```

#### Billing
```
usage_events             — Per-check usage for Stripe metered billing
stripe_webhook_events    — Idempotent Stripe event log
```

#### Providers
```
provider_connections     — Per-workspace provider config (no secrets in DB)
job_locks                — Distributed lock for cron jobs
```

### 4.3 Diamond Feature Tables (10 additional tables)

```
ai_narrative_drafts      — Diamond 1: AI draft + human approval
monitoring_rules         — Diamond 2: configurable monitoring rules
monitoring_alerts        — Diamond 2: triggered alert instances
evidence_packs           — Diamond 3: generated evidence pack metadata
customer_portal_invites  — Diamond 7: single-use invitation tokens
group_memberships        — Diamond 4: parent/child workspace relationships
training_courses         — Diamond 5: course library
training_lessons         — Diamond 5: lesson content + video
training_enrollments     — Diamond 5: user course progress
regulatory_alert_acks    — Diamond 6: acknowledge/dismiss regulatory updates
benchmarking_snapshots   — Diamond 8: weekly anonymised aggregate snapshots
```

### 4.4 Key Schema Patterns

**Every tenant table has:**
```typescript
workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' })
```

**Every ID uses:**
```typescript
id: text('id').primaryKey().$defaultFn(() => createId())
```

**Every timestamp uses:**
```typescript
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
```

**Audit log hardening SQL (run after `db:push`):**
```sql
REVOKE UPDATE, DELETE ON audit_log FROM CURRENT_USER;
GRANT INSERT, SELECT ON audit_log TO CURRENT_USER;

CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'audit_log is append-only'; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
```

**RLS policy pattern (per table):**
```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON customers
  USING (workspace_id = current_setting('app.current_workspace', TRUE)::text);
```

**Drizzle RLS transaction wrapper (Gap G8 fix):**
```typescript
// server/db.ts
export async function withWorkspaceContext<T>(
  workspaceId: string,
  fn: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.current_workspace = ${workspaceId}`);
    return fn(tx);
  });
}
```

---

## 5. ARCHITECTURE DEEP-DIVE

### 5.1 Multi-Tenant Isolation (Triple Layer — Non-Negotiable)

```
Layer 1: Express withWorkspace middleware
  - Resolves workspaceId from session
  - Verifies workspace_membership row exists with status=ACTIVE
  - Attaches req.workspace and req.membership
  - Rejects with 403 if any check fails

Layer 2: Storage convention
  - Every storage function signature: fn(workspaceId: string, ...)
  - Every Drizzle query includes: .where(eq(table.workspaceId, workspaceId))
  - Code review rule: PR rejected if tenant table query lacks workspaceId filter

Layer 3: PostgreSQL RLS (backstop)
  - RLS enabled on ALL tenant tables
  - SET LOCAL app.current_workspace within every transaction
  - Even if layers 1+2 fail, RLS blocks cross-tenant data access
```

**Cross-tenant test (must pass):**
```typescript
// tests/integration/workspace-isolation.test.ts
test('User A JWT + Workspace B ID → 403', async () => {
  const response = await request(app)
    .get(`/api/customers`)
    .set('Cookie', userASession)
    .set('X-Workspace-Id', workspaceBId);
  expect(response.status).toBe(403);
});
```

### 5.2 Request Lifecycle

```
HTTP Request
  → requestId middleware (UUID assigned)
  → pino-http logger
  → helmet (security headers)
  → cors
  → rate limiter (tier-specific)
  → cookie-parser
  → requireAuth (401 if no session)
  → withWorkspace (403 if not member)
  → requireAction (403 if RBAC fails)
  → billingActive (402 if suspended — on check-triggering routes only)
  → withAudit (snapshot before state)
  → route handler
  → withAudit (snapshot after state, insert audit row)
  → errorHandler (AppError → structured JSON)
```

### 5.3 Background Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `document.generate` | on-demand | DOCX + PDF generation via BullMQ |
| `check.submit` | on-demand | Provider check submission |
| `check.poll` | every 60s | Poll PROCESSING checks |
| `check.reconcile` | daily 02:00 | Find stale PROCESSING checks |
| `webhook.process` | on-demand | Idempotent webhook processing |
| `review.scheduler` | daily 03:00 | Files due ≤ 30 days → tasks |
| `screening.recurring` | daily 04:00 | Re-screen by risk tier |
| `watchlist.delta` | daily 05:00 | Watchlist change detection |
| `regulatory.feed` | daily 06:00 | Fetch + NLP-tag regulatory updates |
| `billing.usage.report` | hourly | Push usage_events to Stripe |
| `evidence.pack.generate` | on-demand | Build compliance ZIP |
| `retention.cleanup` | daily midnight | Enforce 7-year retention |
| `notification.email.digest` | daily 09:00 | Daily email digest |

**Distributed lock pattern (in-process fallback for no-Redis environments):**
```typescript
async function withDistributedLock(jobName: string, fn: () => Promise<void>) {
  const lockId = `${jobName}-${new Date().toISOString().slice(0,10)}`;
  const acquired = await db.insert(jobLocks).values({ id: lockId, jobName })
    .onConflictDoNothing().returning();
  if (acquired.length === 0) return; // another instance holds it
  try { await fn(); }
  finally { await db.delete(jobLocks).where(eq(jobLocks.id, lockId)); }
}
```

### 5.4 WebSocket Server

```typescript
// server/ws.ts
const wsMap = new Map<string, Set<WebSocket>>(); // userId → connections

export function broadcastToUser(userId: string, msg: WsMessage): void
export function broadcastToWorkspace(workspaceId: string, msg: WsMessage): void
```

**Use cases (no page refresh needed):**
- Check status: `QUEUED → PROCESSING → PASSED`
- Escalation assigned to me
- Document generation completed
- Notification bell counter increment

### 5.5 Error Handling

```typescript
// server/middleware/errorHandler.ts
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public userMessage: string,
    public internalMessage?: string
  ) { super(internalMessage ?? userMessage); }
}

// Global handler: log to Sentry + Pino, return structured JSON:
// { error: { code: string, message: string } }
```

**Client-side:**
- React Error Boundary at root + per-route
- TanStack Query `onError` → sonner toast
- 401 → session refresh attempt → login redirect
- 403 → `<NotAuthorized>` panel (not error page)
- 5xx → generic error page with retry button

### 5.6 Rate Limiting Tiers

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth endpoints | 10 req | per minute per IP |
| Standard mutations | 100 req | per minute per user |
| Check trigger | 30 req | per minute per workspace |
| File upload | 20 req | per minute per user |
| Webhook endpoints | 1000 req | per minute per provider IP |

### 5.7 Content Security Policy

```typescript
helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc:  ["'self'", "https://js.stripe.com", "https://m.stripe.network"],
    styleSrc:   ["'self'", "'unsafe-inline'"],
    imgSrc:     ["'self'", "data:", "blob:", "https://*.r2.cloudflarestorage.com"],
    connectSrc: ["'self'", "https://api.stripe.com", `wss://${HOST}`],
    frameSrc:   ["https://js.stripe.com", "https://hooks.stripe.com"],
    fontSrc:    ["'self'", "https://fonts.gstatic.com"],
    objectSrc:  ["'none'"],
    upgradeInsecureRequests: [],
  }
});
```

Target: `securityheaders.com A+` score.

---

## 6. RBAC MATRIX (8 ROLES × 26 ACTIONS)

### The 8 Roles

| Role | Description |
|------|-------------|
| `WORKSPACE_ADMIN` | Full workspace control. Can invite, configure, manage billing. |
| `COMPLIANCE_OFFICER` | Full compliance operations. Can approve/decline, escalate, file SMR. |
| `PROGRAM_CONTRIBUTOR` | Can edit program forms. Cannot approve customer files. |
| `ONBOARDING_USER` | Can create and work customer files up to escalation point. |
| `REVIEWER` | Can review escalated files. Can approve/decline. |
| `READ_ONLY` | Audit and reporting only. No mutations. |
| `PLATFORM_ADMIN` | Super-admin. Can access all workspaces. |
| `SUPPORT` | Support access with audit trail. Cannot approve files. |

### The 26 Actions

```typescript
// shared/rbac.ts
export type Action =
  | 'workspace.update' | 'workspace.delete'
  | 'members.invite' | 'members.changeRole'
  | 'program.read' | 'program.editForm' | 'program.submit' | 'program.regenerate'
  | 'customer.create' | 'customer.read' | 'customer.editCdd'
  | 'customer.uploadEvidence' | 'customer.runCheck'
  | 'customer.transitionState' | 'customer.approve' | 'customer.decline'
  | 'ecdd.complete' | 'ecdd.approve'
  | 'sof.complete' | 'escalation.assign' | 'escalation.decide'
  | 'periodicReview.complete'
  | 'audit.read' | 'audit.export'
  | 'billing.read' | 'billing.update' | 'integrations.configure'
  | 'training.recordOwn' | 'training.recordOthers'
  | 'support.access' | 'platform.admin';

export function can(role: UserRole, action: Action): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}
```

### Key Permission Rules

```
WORKSPACE_ADMIN     → All workspace.* + members.* + billing.* + integrations.configure
COMPLIANCE_OFFICER  → All customer.* + escalation.* + ecdd.* + sof.* + audit.read
PROGRAM_CONTRIBUTOR → program.read + program.editForm + program.submit
ONBOARDING_USER     → customer.create + customer.editCdd + customer.uploadEvidence + customer.runCheck
REVIEWER            → customer.read + customer.approve + customer.decline + escalation.decide
READ_ONLY           → program.read + customer.read + audit.read only
PLATFORM_ADMIN      → EVERYTHING + platform.admin + support.access
SUPPORT             → customer.read + audit.read + support.access (NO approve/decline)
```

**Backend enforcement pattern:**
```typescript
router.post('/customer-files/:id/approve',
  requireAuth, withWorkspace, requireAction('customer.approve'),
  async (req, res) => { /* ... */ });
```

**Frontend gate (decorative, not security):**
```tsx
<PermissionGate action="customer.approve">
  <Button onClick={approve}>Approve</Button>
</PermissionGate>
```

---

## 7. STATE MACHINES

### 7.1 Workspace State Machine (4 states)

```
PENDING_SETUP → SETUP_IN_PROGRESS → ACTIVE → SUSPENDED
              ↑_________________↓            ↓
              (wizard incomplete)          (billing issue)
```

| Transition | Trigger | Actor |
|-----------|---------|-------|
| PENDING_SETUP → SETUP_IN_PROGRESS | Step 1 submitted | WORKSPACE_ADMIN |
| SETUP_IN_PROGRESS → ACTIVE | Step 6 submitted + billing connected | System |
| ACTIVE → SUSPENDED | Billing PAST_DUE > 30 days | Stripe webhook |
| SUSPENDED → ACTIVE | Payment successful | Stripe webhook |

### 7.2 Customer File State Machine (12 states)

```
DRAFT → CDD_IN_PROGRESS → PENDING_CHECKS → CHECKS_RETURNED
                                                    ↓
                              ECDD_REQUIRED ←→ UNDER_REVIEW
                                    ↓               ↓
                               APPROVED    APPROVED_WITH_CONTROLS
                                    ↓               ↓
                                   HELD → REVIEW_DUE → (back to UNDER_REVIEW)
                                    ↓
                               DECLINED
                                    ↓
                                 CLOSED
```

**Complete transition table:**

| From | To | Trigger | Actor | Reason Required |
|------|----|---------|-------|----------------|
| DRAFT | CDD_IN_PROGRESS | CDD form started | ONBOARDING_USER | No |
| CDD_IN_PROGRESS | PENDING_CHECKS | CDD submitted + checks queued | ONBOARDING_USER | No |
| PENDING_CHECKS | CHECKS_RETURNED | All checks resolved | System (job) | No |
| CHECKS_RETURNED | ECDD_REQUIRED | Risk HIGH/CRITICAL or POTENTIAL_MATCH | CO | Yes (≥10 chars) |
| CHECKS_RETURNED | UNDER_REVIEW | Risk LOW/MEDIUM, all PASSED | ONBOARDING_USER | No |
| ECDD_REQUIRED | UNDER_REVIEW | ECDD form submitted | CO | Yes |
| UNDER_REVIEW | APPROVED | Review decision | CO / REVIEWER | Yes (≥10 chars) |
| UNDER_REVIEW | APPROVED_WITH_CONTROLS | Enhanced controls required | CO / REVIEWER | Yes (≥10 chars) |
| UNDER_REVIEW | DECLINED | Compliance decision | CO | Yes (≥10 chars) |
| APPROVED | REVIEW_DUE | nextReviewDue ≤ today | System (cron) | No |
| APPROVED_WITH_CONTROLS | REVIEW_DUE | nextReviewDue ≤ today | System (cron) | No |
| REVIEW_DUE | UNDER_REVIEW | Periodic review started | CO | Yes |
| Any | HELD | Suspicious activity flag | CO | Yes (≥10 chars) |
| HELD | UNDER_REVIEW | Hold resolved | CO | Yes (≥10 chars) |
| DECLINED | CLOSED | CO decision | CO | Yes |
| APPROVED | CLOSED | Relationship ended | CO | Yes |

**Key invariants:**
- Every state transition inserts a `file_state_history` row (chain of custody)
- `reason` field (≥10 chars) enforced at service layer for all approval/decline/hold transitions
- `PENDING_CHECKS` badge shows a pulsing dot — represents active async work
- Files cannot skip states (validated by state machine transition table)

---

## 8. PHASE 0 — BOOTSTRAP

**Goal:** Working skeleton with health check, database, environment validation, and Vite integration.

### Deliverables

1. **Copy template files** from `templates/` to project root:
   - `package.json`, `tsconfig.json`, `tsconfig.server.json`
   - `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`
   - `drizzle.config.ts`

2. **Install all dependencies** via `npm install`

3. **Configure Replit Workflow:**
   ```
   Name: "Start application"
   Command: NODE_ENV=development npm run dev
   ```

4. **Create `server/env.ts`** — Zod-validated environment:
   ```typescript
   import { z } from 'zod';
   const envSchema = z.object({
     NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
     PORT: z.coerce.number().default(5000),
     DATABASE_URL: z.string().min(1),
     SESSION_SECRET: z.string().min(64),
     APP_URL: z.string().url(),
   });
   export const env = envSchema.parse(process.env);
   ```

5. **Create `server/db.ts`** — Drizzle client with RLS helper

6. **Create `server/index.ts`** — minimal Express with `/healthz` endpoint:
   ```typescript
   app.get('/healthz', async (_req, res) => {
     try {
       await db.execute(sql`SELECT 1`);
       res.json({ status: 'ok', timestamp: new Date().toISOString() });
     } catch {
       res.status(503).json({ status: 'error' });
     }
   });
   ```

7. **Push initial schema** via `npm run db:push`

8. **Run initial seed** via `npm run db:seed` (platform admin user)

### Done when:
- `GET /healthz` returns 200
- Vite serves React at `http://0.0.0.0:5000`
- Database connected
- `npm run typecheck` passes with 0 errors
- `npm run lint` passes

---

## 9. PHASE 1 — FOUNDATION (M1 + M2)

### M1 — Auth, Workspace Isolation, RBAC

**Backend deliverables:**
- `server/middleware/requireAuth.ts` — session validation, attach `req.user`
- `server/middleware/withWorkspace.ts` — workspace resolution + membership check
- `server/middleware/requireAction.ts` — RBAC gate with `can()` check
- `server/middleware/withAudit.ts` — before/after snapshot + audit insert
- `server/routes/auth.routes.ts` — login, logout, `/me`, session refresh
- `server/services/auth.service.ts` — bcrypt password verify, session create/destroy
- `server/storage/user.storage.ts`, `workspace.storage.ts`, `membership.storage.ts`
- `shared/rbac.ts` — complete PERMISSIONS matrix
- `shared/state-machines.ts` — both state machines
- Audit log immutability trigger (SQL migration)

**Frontend deliverables:**
- `client/src/pages/auth/Login.tsx`, `Register.tsx`
- `client/src/components/auth/ProtectedRoute.tsx`, `PermissionGate.tsx`
- `client/src/hooks/useAuth.ts`, `useWorkspace.ts`, `usePermission.ts`
- `client/src/lib/api.ts` — typed fetch with cookie handling

**Must-pass tests (M1):**
```
workspace-isolation.test.ts: User A JWT + Workspace B ID → 403
auth.routes.test.ts: Audit row written on login event
auth.routes.test.ts: READ_ONLY role → POST /customers → 403
rbac.test.ts: Every role × every action — 100% coverage
```

### M2 — Registration, Onboarding, Workspace Setup

**Backend deliverables:**
- `server/routes/workspaces.routes.ts` — create workspace with ABN lookup prefill
- `server/services/registry.service.ts` — ABR API for ABN/ACN prefill
- `server/routes/invitations.routes.ts` — send/accept/revoke invitations
- `server/services/email.service.ts` — Nodemailer + React Email
- Email templates: `verify-email.tsx`, `invite.tsx`
- Stripe customer creation at workspace registration
- `server/middleware/billingActive.ts` — 402 on billing-required endpoints
- `DashboardOnboarding.tsx` — first-time setup checklist

**Must-pass tests (M2):**
```
workspaces.routes.test.ts: ABN lookup prefills legalName correctly
workspaces.routes.test.ts: Workspace state cannot skip PENDING_SETUP
billing-webhook.test.ts: Stripe customer created at registration
```

---

## 10. PHASE 2 — PROGRAM WIZARD (M3 + M4 + M5)

### M3 — 6-Step Program Wizard

**The 6 wizard steps:**

| Step | File | Content |
|------|------|---------|
| 1 | `Step1BusinessProfile.tsx` | Business name, ABN, industry pathway, contact details |
| 2 | `Step2DesignatedServices.tsx` | Which designated services the business provides |
| 3 | `Step3Governance.tsx` | Board composition, governing document, approval authority |
| 4 | `Step4RolesResponsibilities.tsx` | Staff AML/CTF roles + responsibilities |
| 5 | `Step5CoAppointment.tsx` | Compliance Officer appointment form |
| 6 | `Step6PersonnelSuitability.tsx` | Suitability declarations, conflict of interest |

**Key design patterns:**
- `DynamicFormRenderer.tsx` reads from `shared/form-schemas/*.json` — no hardcoded fields
- `AutosaveIndicator.tsx` — debounced PATCH every 2s when form changes
- `ContextHelpPanel.tsx` — sliding guidance panel per field
- `WizardLayout.tsx` — step sidebar shows completion state + validation status
- Steps are sequential: cannot submit step N until step N-1 is COMPLETED
- Step 5 Gap G2 fix: if CO is not a portal user, auto-create pending invitation

**Must-pass tests (M3):**
```
program-wizard.routes.test.ts: Submit step 4 before step 3 complete → 409
program-wizard.routes.test.ts: Step 5 orphan CO → pending invite auto-created
program-wizard.routes.test.ts: Step 6 conflict flag → compliance task auto-created
```

### M4 — Document Generation

**Four documents generated from step 6 completion:**
1. Risk Assessment (DOCX + PDF)
2. AML/CTF Policy (DOCX + PDF)
3. AML/CTF Procedures (DOCX + PDF)
4. Governance Summary (DOCX + PDF)

**Generation pipeline:**
```
POST /documents/generate
  → billingActive check (402 if not ACTIVE/TRIAL)
  → Validate all 6 steps COMPLETED
  → Enqueue document-generate job (BullMQ)
  → Insert program_documents row (status=GENERATING)
  → WebSocket broadcast to user: 'document.generating'
  → Job: assemble DOCX from template + variable map
  → Job: convert DOCX → PDF (pdf-lib or LibreOffice subprocess)
  → Job: calculate SHA-256 checksum of both files
  → Job: upload both to R2: workspaces/<wsId>/program-documents/<versionId>/
  → Job: update program_documents (status=READY, filePath, checksum)
  → Job: WebSocket broadcast: 'document.ready'
  → Job: email notification to WORKSPACE_ADMIN
```

**Document variable maps:**
```typescript
// server/templates/maps/risk-assessment.map.ts
export function mapToRiskAssessment(form: AllStepsData): RiskAssessmentVariables {
  return {
    businessName: form.step1.legalName,
    industryPathway: form.step2.designatedServices.join(', '),
    riskRatingJustification: form.step3.riskRatingReasoning,
    // ... 40+ more variables
  };
}
```

**Must-pass tests (M4):**
```
program-wizard.routes.test.ts (E2E): Step 6 submit → 4 documents READY within 60s
document-checksum.test.ts: Same input → identical SHA-256 checksums (Gap G11)
document-checksum.test.ts: Modified input → different checksums
```

### M5 — Program Updates & Versioning

- Form edit after submission → `PENDING_EDIT` banner
- Compliance Officer reviews edit → approves (new version) or rejects
- Regenerate documents → new `program_versions` row
- Old version transitions to SUPERSEDED
- `ProgramReviews.tsx` — list all review events with rationale
- Version history `DocumentVersionList.tsx` — compare versions

---

## 11. PHASE 3 — CUSTOMER LIFECYCLE (M6 + M7)

### M6 — Customer Files & CDD

**Customer creation flow:**
```
POST /customers → creates customer master record
POST /customer-files → creates file (state=DRAFT)
GET /customer-files/:id → loads ClientDetail.tsx with 7 tabs
```

**CDD form workflow:**
- `CddTab.tsx` — renders `DynamicFormRenderer` with correct JSON schema per customer type
- 4 CDD schemas: `cdd-individual.json`, `cdd-company.json`, `cdd-trust.json`, `cdd-partnership.json`
- `BeneficialOwnerForm.tsx` — repeating entry form for company/trust/partnership types
  - Ownership percentages must sum to ≤ 100% (validated at API: 422 if exceeded)
  - Each BO linked to `person_records` table for deduplication (Gap G3 fix)
- `RiskRatingCard.tsx` — deterministic risk score calculated from `shared/risk-rules.ts`
- Evidence upload → multer → ClamAV scan (Gap G9 fix) → R2 upload → evidence_files row
- File state transitions logged to `file_state_history` on every change

**Risk calculator (deterministic, 100% test coverage required):**
```typescript
// shared/risk-rules.ts
export function calculateRiskRating(factors: RiskFactors): RiskRating {
  let score = 0;
  if (factors.isPep) score += 40;
  if (factors.highRiskJurisdiction) score += 30;
  if (factors.adverseMediaFound) score += 25;
  if (factors.complexStructure) score += 20;
  if (factors.cashIntensive) score += 15;
  // ... all factors documented
  if (score >= 70) return 'CRITICAL';
  if (score >= 45) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}
```

**Must-pass tests (M6):**
```
customer-file.routes.test.ts: Risk calculator is deterministic (same input → same output)
customer-file.routes.test.ts: State transition without reason (≥10 chars) → 400
customer-file.routes.test.ts: BO ownership sum > 100% → 422
customer-file.routes.test.ts: Evidence signed URL request → audit_log row inserted
customer-file.state-transition.test.ts: All state transitions validated against machine table
```

### M7 — ECDD, Escalations, SMR, Unusual Activity

**ECDD flow:**
- Triggered when: risk HIGH/CRITICAL, or AML screening returns POTENTIAL_MATCH
- `ONBOARDING_USER` cannot complete ECDD (403) — COMPLIANCE_OFFICER only
- ECDD form → `ecdd.json` schema — Source of Funds + Source of Wealth assessments
- Escalation auto-assigns to Compliance Officer on ECDD trigger

**Escalation flow:**
```
POST /escalations
  → assignedTo: CO user (auto-assign or manual)
  → category: 'HIGH_RISK' | 'POTENTIAL_MATCH' | 'PEP' | 'UNUSUAL_ACTIVITY' | 'SMR_CONSIDERATION'
  → urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  
PATCH /escalations/:id/decision
  → decision: 'CLEARED' | 'ACCEPTED_WITH_CONTROLS' | 'DECLINED' | 'REFERRED_TO_AUSTRAC' | 'SMR_FILED'
  → reason: string (≥10 chars, mandatory)
  → if SMR_FILED: double-confirm step in UI (Gap G1 fix)
```

**SMR Workflow (Gap G1 fix — CRITICAL):**
```
SMR_CONSIDERATION sub-state on escalations
  → CO marks smrConsidered = true
  → If filing: escalation.decision = 'SMR_FILED'
  → smrReferenceId recorded (AUSTRAC reference)
  → Audit log records SMR decision with timestamp
  → Evidence pack (Diamond 3) includes SMR decisions
  → Access restricted to CO + PLATFORM_ADMIN
```

**Must-pass tests (M7):**
```
customer-file.routes.test.ts: ONBOARDING_USER cannot complete ECDD → 403
customer-file.routes.test.ts: Escalation auto-assigns to CO
customer-file.routes.test.ts: SMR flag → double-confirm step enforced in UI + API
```

---

## 12. PHASE 4 — INTEGRATIONS (M8 + M9)

### M8 — Provider Adapter Layer

**ProviderAdapter interface:**
```typescript
// server/providers/types.ts
export interface ProviderAdapter {
  capability: ProviderCapability;
  providerName: string;
  submit(req: CheckSubmitRequest): Promise<CheckSubmitResult>;
  parseWebhook(payload: unknown, signature: string): ParsedWebhookResult;
  extractEventId(payload: unknown): string;  // Gap G4 fix
  normaliseResult(raw: unknown): NormalisedCheckResult;
  pollStatus?(providerRequestId: string): Promise<CheckPollResult>;
}
```

**Mock adapter pattern (realistic latency simulation — Better Solutions fix):**
```typescript
// server/providers/mock/mock-identity.adapter.ts
export class MockIdentityAdapter implements ProviderAdapter {
  async submit(req: CheckSubmitRequest): Promise<CheckSubmitResult> {
    await delay(Math.random() * 1500 + 500); // 0.5–2s realistic latency
    const outcome = this.config.mode === 'always_pass' ? 'PASSED'
                  : this.config.mode === 'always_fail' ? 'FAILED'
                  : Math.random() > 0.8 ? 'POTENTIAL_MATCH' : 'PASSED';
    return { providerRequestId: createId(), status: 'PROCESSING' };
  }
}
```

**Provider timeout handling (Gap G5 fix):**
```typescript
// Timeout is NOT an error — it means PROCESSING
if (error.code === 'TIMEOUT') {
  await updateCheckRequest(id, { status: 'PROCESSING', errorMessage: null });
  // check.poll job will retry
  // After N polls: status = 'ERROR' + create pending task for human
  // Only human override can set MANUAL_OVERRIDE
}
```

**Webhook idempotency:**
```typescript
// Always check webhook_events table first
const existing = await db.select().from(webhookEvents)
  .where(and(
    eq(webhookEvents.providerName, provider),
    eq(webhookEvents.providerEventId, eventId)
  ));
if (existing.length > 0) return res.json({ status: 'already_processed' });
```

**Must-pass tests (M8):**
```
webhooks.routes.test.ts: Invalid webhook signature → 401 + zero DB changes
webhooks.routes.test.ts: Duplicate webhook event → 200 no-op (idempotent)
checks.routes.test.ts: Provider timeout → PROCESSING status + pending task (never FAILED)
checks.routes.test.ts: POTENTIAL_MATCH → ReviewMatchModal shown in UI
```

### M9 — Stripe Billing

**Billing tiers:**

| Tier | Monthly | Annual | Included checks | Overage |
|------|---------|--------|-----------------|---------|
| STARTER | $49 | $490 | 50 checks | $2/check |
| PROFESSIONAL | $199 | $1990 | 250 checks | $1.50/check |
| ENTERPRISE | $599 | $5990 | Unlimited | N/A |
| GROUP | $999 | $9990 | 5 workspaces | $149/extra |
| LIFETIME | $2,499 one-time | — | 1000 checks | $1/check |

**Stripe webhook events to handle:**
```
customer.subscription.created  → billingStatus = TRIAL → ACTIVE
customer.subscription.updated  → update tier/period
customer.subscription.deleted  → billingStatus = CANCELLED
invoice.payment_succeeded       → billingStatus = ACTIVE (clear PAST_DUE)
invoice.payment_failed          → billingStatus = PAST_DUE
invoice.payment_action_required → notify user
customer.subscription.trial_will_end → 3-day warning email
```

**Billing paywall enforcement:**
- `billingActive.ts` middleware on all check-triggering routes
- `BillingStatusBanner.tsx` visible to ALL workspace users (not just admin) on PAST_DUE (Gap G6 fix)
- Email to WORKSPACE_ADMIN + COMPLIANCE_OFFICER on PAST_DUE (not just admin) (Gap G6 fix)

**Usage events (metered billing):**
```typescript
// Every finalised check → exactly 1 usage_event row (idempotency key: checkRequestId)
// Hourly job pushes unreported usage_events to Stripe
// Idempotency: stripeEventId prevents double-reporting
```

**Must-pass tests (M9):**
```
stripe-webhook.test.ts: Add valid Stripe test card → billingStatus=ACTIVE within 60s
billing-guard.test.ts: billingStatus≠ACTIVE → check attempt → 402
stripe-webhook.test.ts: Each finalised check → exactly 1 usage_event (idempotency)
stripe-webhook.test.ts: All Stripe webhook event types handled correctly
```

---

## 13. PHASE 5 — PRODUCTION HARDENING (M10)

**Pre-launch checklist:**

### Security
- [ ] `securityheaders.com A+` score validated
- [ ] Audit log immutability tested: `await db.update(auditLog)` throws
- [ ] RLS bypass test: non-transactional query against tenant table → RLS blocks it
- [ ] OWASP ZAP scan on all endpoints
- [ ] SQL injection attempts on all form fields
- [ ] XSS in form fields (stored + reflected)
- [ ] CSP enforced, no unsafe-eval in production

### Observability  
- [ ] Sentry DSN configured for frontend + backend
- [ ] Pino JSON logs in production mode (no pretty-print)
- [ ] `/healthz` endpoint returns < 200ms
- [ ] All background jobs have heartbeat logging
- [ ] Sentry receives a test exception successfully

### Compliance
- [ ] 7-year data retention cron job active (`retention-cleanup.job.ts`)
- [ ] Pre-deletion notification emails fire at 60 days before deletion
- [ ] Audit log never deleted (excluded from retention cleanup)
- [ ] All secrets confirmed in Replit Secrets (not code/env files)
- [ ] `NODE_ENV=production` set on deployment

### Performance
- [ ] API p95 < 300ms under 50 concurrent users
- [ ] Dashboard page load < 2s p95
- [ ] Document generation queue depth tracked
- [ ] Connection pool saturation monitored (pg pool: min 2, max 10)

### Data
- [ ] R2 bucket: BucketEncryption=AES256
- [ ] R2 lifecycle policies:
  - `evidence/*` → 7 years
  - `program-documents/*` → 7 years  
  - `temporary/*` → 30 days
- [ ] Database backup strategy confirmed (Neon auto-backups)

### Deploy
- [ ] `npm run build` succeeds with 0 TypeScript errors
- [ ] `npm run db:migrate` (NOT `db:push`) applied to production
- [ ] Stripe production keys + webhook endpoint registered
- [ ] Provider webhooks registered in Facia + AML Watcher dashboards
- [ ] DKIM/SPF/DMARC configured for email domain
- [ ] Smoke test: login as platform admin → create demo workspace → step 1 → audit log verified

---

## 14. DIAMOND FEATURE LAYER (D1–D8)

Build in this priority order after M10 complete:

### 💎 D1 (Priority 2) — AI Risk Narrative Generator

**Why this priority:** "Magic moment" in demos. Saves hours per compliance file. Highly visible value.

**API surface:**
```
POST /ai/generate-narrative
  body: { type: 'ESCALATION_SUMMARY' | 'SOF_ASSESSMENT' | 'RISK_EXPLANATION' | 'UNUSUAL_ACTIVITY',
          customerFileId, sourceFormId? }
  → Assemble structured prompt from form data (never raw PII in prompt)
  → limitAIRequest() via concurrency.service.ts
  → Call Anthropic Claude Sonnet 3.5
  → Store in ai_narrative_drafts (promptVersion, modelName, tokens)
  → Return { draftId, draftText }

PATCH /ai/narrative-drafts/:id
  body: { finalText, approve: true }
  → Set finalText, approvedAt
  → Set aiAssisted=true on linked customer_form
```

**Compliance safeguards:**
- UI label: "AI-drafted — requires compliance officer review"
- Cannot save to customer form without explicit approval step
- Rate limit: 50 narratives/workspace/day
- Prompt templates versioned in `server/services/ai-prompts/`

### 💎 D2 (Priority 1) — Smart Monitoring Engine

**Why priority 1:** Highest retention impact. Closes the "good onboarding but manual ongoing" gap.

**Monitoring rules (configurable per workspace):**

| Rule Type | Trigger | Default Schedule |
|-----------|---------|-----------------|
| RECURRING_SCREEN | Risk-tier cadence | LOW=annual, MEDIUM=6mo, HIGH=qrtly, CRITICAL=monthly |
| WATCHLIST_DELTA | Provider watchlist updated | Daily (05:00 job) |
| OWNERSHIP_CHANGE | KYB shows changed directors | On check completion |
| DORMANT | No activity for N days | 180-day default |
| JURISDICTION_RISK | Country risk tier changes | On regulatory feed update |
| VOLUME_ANOMALY | Unusual transaction patterns | Rule-configured threshold |

**Dashboard:** `pages/app/intelligence/MonitoringDashboard.tsx`
- Files due for review (30d / 7d buckets)
- Active alerts by severity (critical / warning / info)
- Screening currency by risk tier
- Drill-down to individual file

### 💎 D3 (Priority 3) — Compliance Evidence Pack Generator

**Package contents (10 components):**
1. Program Risk Assessment (versioned PDF)
2. AML/CTF Policy (versioned PDF)
3. AML/CTF Procedures (versioned PDF)
4. Training records summary + participant list
5. Customer file decision log (anonymisable option)
6. Escalation outcomes summary (including SMR decisions)
7. Program Review/Update records for the period
8. Audit trail export for the period
9. Provider check evidence references (signed URLs, 30-day validity)
10. `index.pdf` with package contents + generation metadata

**API:**
```
POST /compliance/evidence-pack
  body: { periodStart, periodEnd, includeCustomerFiles, anonymiseCustomers, password? }
  → INSERT evidence_packs (status=GENERATING)
  → Enqueue evidence-pack-generate job
  → Job assembles ZIP (password-protected optional via archiver)
  → Upload to R2: workspaces/<wsId>/evidence-packs/<packId>.zip
  → Update evidence_packs (status=COMPLETED, filePath, fileSize)
  → Notify generator via WebSocket + email
```

### 💎 D7 (Priority 4) — Customer-Facing CDD Portal

**Path-based routing (not subdomain — simpler MVP):** `/customer-portal/<token>`

**Security:**
- Single-use invitation tokens (JWT, 14-day expiry)
- Customer can submit only to their own file
- All uploads: multer → ClamAV scan → R2 (separate prefix: `evidence/customer-portal/<inviteId>/`)
- Audit log records: "submitted by customer-portal-invite <id>"
- No outbound links from portal pages (sandboxed)

**Flow:**
```
CO sends invite → customer_portal_invites row inserted → email with token link
Customer opens /customer-portal/<token> → validates token → PortalLanding.tsx
Customer submits: identity docs + BO records + SOF description + evidence files
Main portal shows: new evidence_files + beneficial_owners + task assigned to CO
```

### 💎 D4 (Priority 5) — Group Structure

- `workspaces.groupWorkspaceId` (self-FK, nullable)
- `GROUP_COMPLIANCE_OFFICER` role: read-only all children, write only group's own data
- Group dashboard at `/app/group` — aggregate stats
- Child workspace admins **opt in** to group oversight (never auto)
- Group billing: single Stripe account + per-workspace usage breakdown

### 💎 D6 (Priority 6) — Regulatory Update Feed

- `regulatory-feed.job.ts` cron daily 06:00
- Sources: AUSTRAC, FATF, configurable regulatory RSS feeds
- Anthropic NLP tagging for industry/impact assessment (cached)
- One-click program review trigger from regulatory alert
- `regulatory_alert_acks` table for acknowledge/dismiss tracking

### 💎 D5 (Priority 7) — In-Portal Training Module

- Course library with video or markdown lessons
- Competency assessment: quiz with min 80% pass score
- Auto-records `training_records` row on completion (no manual entry)
- Training expiry alerts: 30/14/7 days before expiry
- `/app/training/CompetencyDashboard.tsx` — workspace training compliance view

### 💎 D8 (Priority 8) — Risk Benchmarking Dashboard

**Requires ≥ 30 active workspaces in same industry before publishing percentiles.**

- Opt-in only: `workspaces.benchmarkOptIn` boolean
- `benchmarking_snapshots` table: weekly batch job
- Display p50/p75/p90 only (never raw data points)
- Enterprise tier only
- Metrics: CDD completion time, escalation rate, training completion, common red flags

---

## 15. 3D LANDING PAGE — FULL SPEC

### 15.1 Brand Tokens

```css
--color-navy:    #0B1A33;    /* Primary background */
--color-surface: #0F2447;    /* Card surfaces */
--color-emerald: #10B981;    /* Trust / approved / CTA */
--color-amber:   #F59E0B;    /* Risk / caution */
--color-red:     #EF4444;    /* Critical / declined */
--color-slate:   #64748B;    /* Body text */
--color-offwhite: #F8FAFC;   /* Light surface */
--color-gold:    #F4C430;    /* Premium trust marks */

/* Hero gradient */
background: linear-gradient(135deg, #0B1A33 0%, #1E40AF 35%, #10B981 100%);
```

**Typography scale:**
```css
/* H1 hero */    font-size: clamp(48px, 7vw, 96px); letter-spacing: -0.04em; font-weight: 600;
/* H2 section */ font-size: clamp(36px, 5vw, 64px); letter-spacing: -0.03em;
/* H3 card */    font-size: 24px; letter-spacing: -0.01em; font-weight: 500;
/* Body */       font-size: 17px; line-height: 1.65;
/* Eyebrow */    font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em;
```

### 15.2 Three.js Hero Scene

**Files:**
- `client/src/components/landing/Hero3D.tsx` — hero block + Canvas wrapper
- `client/src/components/landing/HeroScene.tsx` — R3F scene contents
- `client/src/components/landing/CrystallineShield.tsx` — central icosahedron
- `client/src/components/landing/OrbitingArtefacts.tsx` — 4 floating cards
- `client/src/components/landing/ParticleField.tsx` — 400-point particle system

**Canvas setup:**
```tsx
<Canvas
  dpr={[1, 2]}
  gl={{ antialias: true, alpha: true }}
  camera={{ position: [0, 0, 8], fov: 35 }}
>
  <color attach="background" args={['#0B1A33']} />
  <fog attach="fog" args={['#0B1A33', 8, 20]} />
  <ambientLight intensity={0.3} />
  <directionalLight position={[5, 5, 5]} intensity={1.2} color="#10B981" />
  <pointLight position={[-5, -3, 2]} intensity={0.8} color="#1E40AF" />
  <Suspense fallback={null}>
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <CrystallineShield />
    </Float>
    <OrbitingArtefacts />
    <ParticleField count={400} />
    <Environment preset="night" />
  </Suspense>
  <EffectComposer>
    <Bloom intensity={0.7} luminanceThreshold={0.85} />
    <ChromaticAberration offset={[0.0008, 0.0006]} />
    <Vignette eskil={false} offset={0.2} darkness={0.6} />
  </EffectComposer>
</Canvas>
```

**CrystallineShield geometry:**
- Base: `<icosahedronGeometry args={[1.4, 1]}>` + `<MeshTransmissionMaterial>` (thickness 0.6, roughness 0.05, transmission 1, ior 1.5, anisotropy 0.3)
- Wireframe overlay: same geometry, `<meshBasicMaterial wireframe color="#10B981" opacity={0.25} transparent>`
- Inner core: smaller `<sphereGeometry>` with emissive teal

**GSAP ScrollTrigger animations:**
- Scroll 0–25%: shield rotates 90° on Y-axis, layers fan out into vertical stack
- Scroll 25–50%: shield re-condenses into solid emerald checkmark

**OrbitingArtefacts (4 cards, radius 3.5, 0.06 rad/s):**
1. Redacted passport scan with animated "Verified" stamp
2. Risk rating gauge sweeping grey → green
3. Scrolling audit-log row
4. Pulsing escalation badge

**Performance budget:**
- Initial bundle (gzip): < 220KB JS, < 40KB CSS
- 3D scene: lazy-loaded after first paint
- 60fps via `useFrame` time delta
- `pixelRatio` capped at `[1, 2]`
- `prefers-reduced-motion` → static hero image fallback

**GSAP + Lenis setup:**
```typescript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
lenis.on('scroll', ScrollTrigger.update);
// Sync Lenis to GSAP ticker
gsap.ticker.add((time) => lenis.raf(time * 1000));
```

### 15.3 The 11 Sections

| Section | Content | Key Interaction |
|---------|---------|----------------|
| **S1 Hero** (100vh) | CrystallineShield 3D + H1 "Compliance that runs itself." + 2 CTAs + trust bar | Canvas scroll-dissolve |
| **S2 Problem Stats** | 3 animated counters (73% / 1 in 5 / 22 days → 11 min) + motion graphics | Counter animation on scroll-into-view |
| **S3 How It Works** | 3-step GSAP-pinned diagram: Build Program → Onboard Customers → Stay Audit-Ready | Each step pins for 100vh |
| **S4 Feature Constellation** | 4×3 grid: 6 core + 6 diamond features (💎 marked) | Accordion expand on "Learn more" |
| **S5 State Diagram** | Interactive SVG customer file state machine | Click transitions, sample audit logs |
| **S6 Trust & Security** | Security pills, multi-tenant explanation, audit immutability | Static, animated badge entry |
| **S7 Testimonials** | 3 cards with quotes | Carousel on mobile, row on desktop |
| **S8 Pricing Preview** | 3 tiers (Starter/Pro/Enterprise) + monthly/annual toggle | Card lift + emerald glow on hover |
| **S9 FAQ** | 8 Radix accordion items | Smooth expand/collapse |
| **S10 Final CTA** | Big H2 + CTAs + subtle 3D background continuation | Repeat hero CTA |
| **S11 Footer** | 4 columns + newsletter + socials | — |

### 15.4 Conversion Mechanics

- **Sticky top CTA:** appears after 600px scroll — "Start free trial" only
- **Exit-intent modal (desktop):** "Wait — see a 90-second walkthrough first?"
- **Mobile sticky bar (Gap G12 fix):** replaces exit-intent on mobile — "Start free trial →" after hero scroll
- **Social proof toast:** bottom-left every ~30s — "Acme Accounting just started a trial"
- **Free trial form:** email only on step 1 → password + workspace name on step 2 (no credit card)

### 15.5 SEO & Open Graph

```html
<title>Integrity Solve — AML/CTF Compliance Operating System</title>
<meta name="description" content="Replace your CDD spreadsheets and screening reminders with a single audit-grade compliance operating system. AUSTRAC-aware. SOC 2 ready.">
<meta property="og:image" content="/og-image.png">  <!-- 1200×630px -->
```

```json
{
  "@type": "SoftwareApplication",
  "name": "Integrity Solve",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "AggregateOffer", "priceCurrency": "AUD" }
}
```

### 15.6 Accessibility

- All 3D scenes: `aria-hidden="true"` + static fallback for `prefers-reduced-motion`
- WCAG AA color contrast in both dark and light
- Tab order matches visual order; focus rings visible
- Single H1 only — strict heading hierarchy
- `<section aria-labelledby="...">` landmarks for screen readers

### 15.7 Landing Page Done Criteria

- Lighthouse mobile: Performance ≥ 80, Accessibility 100, Best Practices ≥ 95, SEO 100
- 3D scene: 60fps on mid-range laptop, 30fps target on mobile
- `prefers-reduced-motion` fallback verified
- `og-image.png` saved at `client/public/og-image.png`

---

## 16. GAP ANALYSIS — 12 CRITICAL FIXES (G1–G12)

Full analysis identified 12 gaps across all 17 source files. Ordered by risk impact:

### 🔴 CRITICAL

**G1 — SMR Workflow Missing** *(File 08 — M7)*
- **Problem:** "Consider reportability" mentioned but no actual SMR workflow, form, tracking, or access control defined.
- **Fix:** Add `SMR_CONSIDERATION` escalation sub-state. Add SMR record form (date range, suspicion nature, entities, reporter details). Restrict to CO + PLATFORM_ADMIN only. Track `smrReferenceId` on escalations. Export in Diamond 3 evidence packs.
- **Risk if unfixed:** AUSTRAC expects evidence of SMR decision-making. Regulatory non-compliance.

### 🔴 HIGH

**G2 — Orphan CO Validation** *(File 07 — M3 Step 5)*
- **Problem:** CO appointment can name a person with no portal account. That person can never take regulatory action.
- **Fix:** Backend validation: if `coUserId` is null, check for pending invite or auto-create one. Block step 5 completion until CO email matches a workspace member or pending invite exists.

**G5 — Provider Timeout Not Properly Handled** *(Files 09 + 10)*
- **Problem:** Timeout treated as ERROR (retryable). Distinction between ERROR and FAILED not clear.
- **Fix:** Define `timeout_threshold` per provider in `configJson`. On timeout → `PROCESSING` (not ERROR). `check.poll` retries. After N polls → ERROR + pending task. Only human override → `MANUAL_OVERRIDE`.

**G7 — Data Retention Not Implemented** *(File 02 + 10)*
- **Problem:** 7-year retention mentioned but no cron job, no pre-deletion notification, no structured DB data deletion plan.
- **Fix:** Add `data_retention_policies` table. Add `retention-cleanup.job.ts` (daily midnight). Pre-deletion notification 60 days out. Hard delete evidence_files + program_documents + customer_forms after period. Audit log NEVER deleted.

**G8 — RLS Only Works Inside Transactions** *(File 02)*
- **Problem:** `SET LOCAL` only works inside transactions. Queries outside transactions bypass RLS.
- **Fix:** Wrap ALL database queries in request-scoped transaction. `withWorkspaceContext()` helper in `server/db.ts`. All storage functions receive `tx`, not raw `db`.

**G10 — Identity Verification Stub in Production** *(File 06 — M1)*
- **Problem:** Stub "click to mark as verified" could reach production. Any user creates workspace without identity verification.
- **Fix:** Clear TODO comment + UI indicator: "DEVELOPMENT ONLY — Facia integration required before production." Production gate: Facia API keys in Replit Secrets + `identityStatus` must be `VERIFIED` before workspace creation allowed.

### 🟡 MEDIUM

**G3 — Person Record Deduplication** *(File 08 — M6)*
- **Problem:** Same person appearing in multiple customer files gets duplicate screening checks → higher costs + inconsistency.
- **Fix:** `personRecords` table already in schema. `beneficialOwners.personRecordId` FK links to shared person. Screening results shared. Re-screen on demand rather than duplicating checks.

**G4 — Mandatory Notification Types** *(File 04)*
- **Problem:** `notification_preferences` allows muting all notification types, including `billing.suspended` and SMR consideration.
- **Fix:** In `notification.service.ts`, define `MANDATORY_TYPES` list. Before checking preferences, if type is mandatory, bypass preference check and always send.

**G6 — PAST_DUE Only Notifies Admin** *(File 09 + 10)*
- **Problem:** `billingStatus=PAST_DUE` email goes only to `WORKSPACE_ADMIN`. CO processing high-risk files doesn't know checks are blocked.
- **Fix:** Email to `WORKSPACE_ADMIN` + `COMPLIANCE_OFFICER` role users. Show in-portal `BillingStatusBanner.tsx` to ALL authenticated users in the workspace.

**G9 — No Virus Scanning on File Uploads** *(File 05)*
- **Problem:** Evidence files and ID documents uploaded to R2 without malware scanning.
- **Fix:** ClamAV via `clamscan` npm package before files move from multer temp to R2. Reject if INFECTED. Log all scan results. Block upload if scanner unavailable (fail-safe, not fail-open).

**G11 — No Document Checksum Test** *(File 13)*
- **Problem:** No test verifying that re-downloading the same ProgramDocument version returns identical bytes.
- **Fix:** `tests/unit/document-checksum.test.ts` — generate same document twice from same input → assert SHA-256 checksums match. Also test that modified input changes checksum.

### 🟢 LOW

**G12 — Mobile Exit-Intent** *(File 12)*
- **Problem:** Exit-intent modal is desktop-only. Mobile users (40% of traffic) get no exit-intent engagement.
- **Fix:** Mobile sticky bottom CTA bar: "Start free trial →" appears after scrolling past hero on mobile. Converts better than modal on mobile.

---

## 17. PROVIDER ADAPTER LAYER

### Interface Contract

```typescript
// server/providers/types.ts
export interface ProviderAdapter {
  readonly capability: ProviderCapability;
  readonly providerName: string;
  submit(req: CheckSubmitRequest): Promise<CheckSubmitResult>;
  parseWebhook(payload: unknown, signature: string): ParsedWebhookResult;
  extractEventId(payload: unknown): string;      // G4 fix: required method
  normaliseResult(raw: unknown): NormalisedCheckResult;
  pollStatus?(providerRequestId: string): Promise<CheckPollResult>;
}

export interface NormalisedCheckResult {
  outcome: CheckStatus;
  matchCount: number;
  matches: NormalisedMatch[];
  rawPayloadRef?: string; // R2 key for raw payload archival
}
```

### Provider Registry

```typescript
// server/providers/registry.ts
export class ProviderRegistry {
  private adapters = new Map<ProviderCapability, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.capability, adapter);
  }

  get(capability: ProviderCapability): ProviderAdapter {
    const adapter = this.adapters.get(capability);
    if (!adapter) throw new AppError(500, 'NO_PROVIDER', `No provider for ${capability}`);
    return adapter;
  }
}
```

### Three Providers

| Provider | Capability | Phase |
|---------|-----------|-------|
| Mock adapters | All capabilities | M1–M7 |
| Facia | `IDENTITY_VERIFICATION` | M8 |
| AML Watcher | `AML_SCREENING` + `AML_SCREENING_ENTITY` | M8 |
| ABR | `KYB_LOOKUP` | M8 |

**Facia integration pattern:**
```
VerifyIdentity page:
  POST /checks (capability=IDENTITY_VERIFICATION)
  → Receive Facia session URL
  → Open in iframe or redirect
  → Poll or wait for webhook
  → Update identityStatus
```

**Mock adapter modes:** `always_pass` / `always_fail` / `random` (configurable per environment via `mock-config.ts`)

---

## 18. DOCUMENT GENERATION ENGINE

### Variable Map Architecture

Each of the 4 document types has a corresponding map file that transforms wizard form data into typed variable objects:

```typescript
// server/templates/maps/risk-assessment.map.ts
export function mapToRiskAssessment(allSteps: AllStepsData): RiskAssessmentVars {
  return {
    // Step 1 data
    businessName:       allSteps.step1.legalName,
    abn:                allSteps.step1.abn,
    industryPathway:    allSteps.step2.designatedServices.join(', '),
    
    // Step 3 governance
    boardComposition:   allSteps.step3.boardComposition,
    
    // Step 6 risk factors
    highRiskFactors:    allSteps.step6.identifiedRisks,
    controlMeasures:    allSteps.step6.mitigationControls,
    overallRiskRating:  allSteps.step6.riskRating,
    
    // System metadata
    generatedDate:      format(new Date(), 'dd MMMM yyyy'),
    versionNumber:      generateVersionNumber(),
    // ... 35+ more variables
  };
}
```

### Document checksum (Gap G11 fix)

```typescript
// server/services/document-generation.service.ts
import { createHash } from 'crypto';

async function generateWithChecksum(buffer: Buffer): Promise<{ buffer: Buffer, checksum: string }> {
  const checksum = createHash('sha256').update(buffer).digest('hex');
  return { buffer, checksum };
}
```

### PDF Generation Note

`pdf-lib` is in package.json. However, for complex DOCX → PDF conversion (fonts, tables, page breaks), consider LibreOffice subprocess. Test this in M4 on the Replit Reserved VM — if LibreOffice is available, use it for higher fidelity. If not, `pdf-lib` is the fallback.

---

## 19. TESTING STRATEGY — FULL COVERAGE

### Test Coverage Targets

| Test Type | Tool | Target | Key Focus |
|-----------|------|--------|-----------|
| Unit | Vitest | ≥ 80% on critical modules | risk-calculator (100%), state machines (100%), RBAC (100%), template maps (100%) |
| Integration | Vitest + supertest | All route files have test sibling | workspace-isolation.test.ts is the most critical |
| RBAC matrix | Vitest + supertest | 100% — every role × every action | Blocked → 403 (never 404 or 500). Permitted → 200. |
| Provider adapters | Vitest + MSW | All adapters + all webhook types | Signature validation, replay protection, idempotency, timeouts |
| Billing | Vitest + Stripe CLI | All Stripe webhook event types | Subscription lifecycle, payment failure, usage idempotency |
| Security | Vitest + OWASP ZAP | Cross-tenant + auth + injection | User A JWT + Workspace B ID → 403. SQL injection. XSS. |
| E2E | Playwright (Chromium) | 5 critical journeys | UAT 1–5 |
| Load | k6 | 50 VUs, 300s | Dashboard < 2s p95. API < 300ms p95. |

### Critical Tests by Milestone

| Milestone | Must-Pass Tests |
|-----------|----------------|
| M1 | Cross-tenant: User A JWT + Workspace B ID → 403. Audit row on login. READ_ONLY → any mutation → 403. |
| M2 | ABN lookup prefill. Workspace state cannot skip steps. Stripe customer created at registration. |
| M3 | Step 4 submit before step 3 complete → 409. Orphan CO → pending invite created. Conflict flag → task created. |
| M4 | Step 6 submit → 4 documents READY within 60s. Same input → identical checksums. DOCX opens in Word. |
| M5 | Form edit → pending banner. Program Review → new version + regeneration. |
| M6 | Risk calculator deterministic. State transition without reason → 400. BO sum > 100% → 422. Evidence signed URL → audit row. |
| M7 | ECDD: ONBOARDING_USER cannot complete → 403. Escalation auto-assigns CO. SMR flag → double-confirm. |
| M8 | Invalid webhook → 401 + 0 DB changes. Duplicate webhook → 200 no-op. Provider timeout → PROCESSING + task. |
| M9 | Valid card → ACTIVE within 60s. Inactive billing + check attempt → 402. Each finalised check → exactly 1 usage_event. |
| M10 | UPDATE audit_log → DB trigger exception. All cron jobs run per schedule. Sentry receives test exception. securityheaders.com A+. |

### Five UAT Scripts (Playwright E2E)

**UAT 1 — Low-Risk Individual (Happy Path)**
```
Register → email verify → mobile verify → ABN lookup → wizard (all 6 steps)
→ documents generated (4 docs) → create individual customer → CDD (low risk)
→ mock identity check (PASS) → mock AML (CLEAR) → APPROVE
→ nextReviewDue set 12 months out → audit log correct
```

**UAT 2 — High-Risk Entity Escalation**
```
Create entity customer → CDD (high risk) → 3 beneficial owners (1 PEP=true)
→ AML screen (POTENTIAL_MATCH) → ReviewMatchModal → ESCALATED
→ ECDD form → SOF + SOW → escalation decision → APPROVED_WITH_CONTROLS
→ enhanced monitoring schedule set
```

**UAT 3 — Billing Paywall**
```
Complete wizard (no payment) → attempt provider check → 402 with message
→ navigate to billing → add Stripe test card 4242... → ACTIVE within 60s
→ retry check → usage_event recorded → billing dashboard shows usage
```

**UAT 4 — Customer Portal (Diamond 7)**
```
CO sends portal invite → customer opens invite link → submits ID docs + BO + SOF
→ main portal shows new evidence + BO records + task assigned to CO
→ audit log shows "via customer-portal-invite <id>"
```

**UAT 5 — Evidence Pack (Diamond 3)**
```
CO → /app/compliance/evidence-packs → generate last 30 days
→ status GENERATING → COMPLETED within 5 min
→ download ZIP → verify 10 components present
→ index.pdf lists all contents → audit log records generation
```

---

## 20. ENVIRONMENT & SECRETS REFERENCE (36 SECRETS)

All secrets stored in Replit Secrets. Never committed to code. Never in `.env` files.

### Phase 0 — Core (5 secrets)

| Secret | Source | Notes |
|--------|--------|-------|
| `DATABASE_URL` | Replit Postgres tool (auto-set) | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | `openssl rand -base64 64` | Min 64 chars. Never reuse across environments. |
| `NODE_ENV` | Set in workflow command | `development` in workflow; `production` on deploy. |
| `PORT` | Replit-injected | Default 5000. Bind to 0.0.0.0. |
| `APP_URL` | Your Replit URL | `https://yourapp.replit.app` in prod; `http://localhost:5000` in dev. |

### Phase 1 — Email (6 secrets)

| Secret | Source | Notes |
|--------|--------|-------|
| `SMTP_HOST` | Email provider | `smtp.gmail.com` or custom |
| `SMTP_PORT` | Email provider | 587 (STARTTLS) |
| `SMTP_USER` | Email account | Must match `EMAIL_FROM_ADDRESS` |
| `SMTP_PASS` | Gmail app password | Not your normal password. Enable 2FA first. |
| `EMAIL_FROM_ADDRESS` | Your domain email | Configure SPF/DKIM/DMARC for production. |
| `EMAIL_FROM_NAME` | `Integrity Solve` | Display name in emails. |

### Phase 2 — File Storage (7 secrets)

| Secret | Source | Notes |
|--------|--------|-------|
| `R2_ACCOUNT_ID` | Cloudflare R2 → Account ID | |
| `R2_ACCESS_KEY_ID` | R2 → Manage API Tokens → Create Token | Read + Write on bucket. |
| `R2_SECRET_ACCESS_KEY` | Same | Store immediately in Replit Secrets. |
| `R2_BUCKET_NAME` | R2 bucket you create | Enable versioning. Set lifecycle policies. |
| `R2_PUBLIC_URL_BASE` | Optional CDN prefix | Default: `https://<account>.r2.cloudflarestorage.com/<bucket>` |
| `R2_REGION` | `auto` | R2 is multi-region automatically. |

### Phase 3 — Mobile OTP (4 secrets)

| Secret | Source | Notes |
|--------|--------|-------|
| `TWILIO_ACCOUNT_SID` | Twilio Console | Defer until mobile OTP implementation. |
| `TWILIO_AUTH_TOKEN` | Twilio Console | Full API access — keep secret. |
| `TWILIO_FROM_NUMBER` | Twilio-purchased number | Or use Verify Service SID instead. |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Console → Verify | Recommended over raw SMS for OTP. |

### Phase 4 — Billing & Providers (14 secrets)

| Secret | Source | Notes |
|--------|--------|-------|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys | Test key in dev; live key in prod only. |
| `STRIPE_PUBLIC_KEY` | Same → Publishable key | Used by Stripe.js in client. |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks | Register URL: `https://yourdomain/webhooks/stripe` |
| `STRIPE_PRICE_STARTER` | Stripe Dashboard → Products | Price ID per tier. Create products first. |
| `STRIPE_PRICE_PROFESSIONAL` | Same | |
| `STRIPE_PRICE_ENTERPRISE` | Same | |
| `STRIPE_PRICE_GROUP` | Same | |
| `STRIPE_PRICE_LIFETIME` | Same — one-time price type | |
| `STRIPE_PRICE_USAGE_CHECK` | Stripe metered price | Per-check overage billing. |
| `FACIA_API_KEY` | Facia portal → API keys | Sandbox for staging; live for production. |
| `FACIA_WEBHOOK_SECRET` | Facia portal → Webhook signing | Register: `https://yourdomain/webhooks/facia` |
| `FACIA_BASE_URL` | Facia documentation | `https://api.facia.com/v2` or sandbox equivalent. |
| `AML_WATCHER_API_KEY` | AML Watcher dashboard | Sandbox for M8; live for production. |
| `AML_WATCHER_WEBHOOK_SECRET` | AML Watcher dashboard | Register: `https://yourdomain/webhooks/aml-watcher` |

### Phase 5 — Observability (1 secret)

| Secret | Source | Notes |
|--------|--------|-------|
| `SENTRY_DSN` | Sentry → Settings → Client Keys | Separate DSN for frontend and backend preferred. |

### Diamond Features (2 secrets)

| Secret | Source | Phase |
|--------|--------|-------|
| `ANTHROPIC_API_KEY` | Anthropic Console | Diamond 1 — AI narratives |
| `REDIS_URL` | Upstash console | Diamond 2 — BullMQ (recommended from day 1) |

---

## 21. DEPLOYMENT ON REPLIT

### Why Reserved VM (Not Autoscale)

| Requirement | Reserved VM | Autoscale |
|------------|-------------|-----------|
| BullMQ workers | ✅ Stable process lifetime | ❌ In-flight jobs lost on instance kill |
| WebSocket connections | ✅ Persistent connections | ❌ Connections reset on instance swap |
| Cron jobs (node-cron) | ✅ Single instance, predictable | ✅ job_locks table handles multi-instance |
| Cost (MVP scale) | Fixed, predictable | Variable |
| **Recommended VM** | **1 vCPU + 2 GB RAM** | N/A |
| Upgrade trigger | p95 API > 300ms; doc gen queue > 5; CPU > 70% | N/A |

### Workflow Configuration

```
Name: "Start application"
Command: NODE_ENV=development npm run dev
```

In production deployment, `NODE_ENV=production npm run start`

### Customer Portal Domain Strategy

For MVP: **path-based routing** (`/customer-portal/<token>`) on the same domain.
- Simpler — one TLS cert, one Express app, no subdomain DNS config
- Diamond 7 works perfectly with path-based routing
- Future: subdomain migration when traffic warrants

### Pre-Deploy Checklist (Production)

- [ ] All 36 secrets set in Replit Secrets
- [ ] `NODE_ENV=production` set on deployment
- [ ] `npm run build` succeeds without errors or TypeScript errors
- [ ] `npm run db:migrate` applied (NOT `db:push` in production)
- [ ] R2 bucket created: AES256 encryption, 7-year lifecycle for evidence + program-documents, 30-day for temporary
- [ ] Stripe production keys + webhook endpoint registered for all event types
- [ ] Facia + AML Watcher webhook URLs registered in provider dashboards
- [ ] Sentry production project; source maps uploaded during deploy
- [ ] DNS pointed to Replit Reserved VM; TLS certificate active
- [ ] Email DKIM/SPF/DMARC configured for `EMAIL_FROM_ADDRESS` domain
- [ ] Smoke test: platform admin login → demo workspace → step 1 → audit log → logout

---

## 22. BETTER SOLUTIONS & RESEARCH FINDINGS

### Architecture Better Solutions

| Original Approach | Better Alternative | Decision |
|------------------|-------------------|---------|
| node-cron + job_locks as Redis fallback | **BullMQ from day 1 (Upstash free tier).** More robust retry, better visibility, real queue semantics. | Use BullMQ from M1, job_locks as safety net only. |
| pdf-lib for PDF generation | **LibreOffice subprocess.** Better fidelity for complex DOCX → PDF (fonts, tables, page breaks). | Test LibreOffice availability in M4 on Replit VM. Fall back to pdf-lib if unavailable. |
| Mock adapter: instant response | **Add realistic latency (0.5–2s random delay).** Catches async UX issues early. Avoids surprises when real providers take 1–3s. | Implement in mock-config.ts — zero extra code complexity, high value. |
| Tailwind v3 (pinned in template) | **Tailwind v4 with CSS-first config + OKLCH.** Better DX long-term. Supported by shadcn@canary. | Keep v3 for Phase 0–5. Plan v4 migration for Phase 5 if build is stable. |

### Research Findings (May 2026)

| Topic | Finding | Impact |
|-------|---------|--------|
| Tailwind v4 + Vite | Stable with shadcn@canary. CSS-first config removes `tailwind.config.ts`. OKLCH colors are new standard. Migration: `npx @tailwindcss/upgrade@next` | Keep v3, plan v4 for Phase 5. |
| shadcn/ui (2025 updates) | React 19 support, `forwardRef` removed, `data-slot` attributes added. Toast deprecated in favor of `sonner`. | **Use sonner for toasts** (already planned in this spec). |
| OKLCH colors | Brand navy `#0B1A33` = `oklch(0.15 0.08 240)`. Emerald `#10B981` = `oklch(0.69 0.17 160)`. Perceptually uniform. | If adopting Tailwind v4, define all brand tokens in OKLCH. |
| @react-three/fiber v9 | Stable with React 18. MeshTransmissionMaterial in drei. @react-three/postprocessing v2.16 for Bloom/CA/Vignette. | All versions in template package.json — no changes needed. |
| GSAP + Vite | `gsap.registerPlugin(ScrollTrigger)` required. Use `lenis.on('scroll', ScrollTrigger.update)` to sync. | Add registerPlugin in landing page init. |
| Drizzle ORM v0.36 + RLS | `SET LOCAL` works within Drizzle transactions. Use `db.transaction(async tx => { await tx.execute(sql\`SET LOCAL...\`) })`. | Implemented in `withWorkspaceContext()` helper. |
| BullMQ v5 + Redis | Requires Redis 7+. Upstash compatible. Use `maxAttempts=3` + exponential backoff. | Configure on all check jobs. Use `job.log()` for progress tracking in document generation. |
| Facia integration | Session-based SDK. `createSession()` → embed in page → webhook on completion. Session expires 30min. | POST /checks → Facia session URL → iframe/redirect → poll or webhook → update identityStatus. |

---

## 23. TIMELINE & CONFIDENCE

### Phase Timeline

| Phase | Milestones | Weeks | Confidence | Notes |
|-------|-----------|-------|-----------|-------|
| **Phase 0 + 1** | Bootstrap + M1 + M2 | 1–3 | High | ~60% is StrategyNavigator pattern lift |
| **Phase 2** | M3 + M4 + M5 | 4–9 | Medium-High | Wizard well-specified; document generation has complexity |
| **Phase 3** | M6 + M7 | 10–14 | Medium | State machine + escalation workflows have many edge cases |
| **Phase 4** | M8 + M9 | 14–19 | Medium-Low | Provider integration timing depends on sandbox access |
| **Phase 5** | M10 | 19–23 | High | Well-defined checklist |
| **Diamond Layer** | D2→D1→D3→D7→D4→D6→D5→D8 | +8–16 weeks after M10 | High | Each Diamond is isolated and well-specified |
| **Landing Page** | 3D hero + 11 sections | Parallel with Phase 1 | High | No backend dependencies until S8 pricing |

### Priority Decision Framework

When time-constrained, prioritise in this order:

1. **Workspace isolation** (M1) — triple-layer, 100% tests. Cannot be retrofitted.
2. **Audit log immutability** (M1) — DB trigger + immutability test.
3. **File state machine chain of custody** (M6) — every transition → history row.
4. **SMR workflow** (G1 fix, M7) — regulatory non-compliance risk.
5. **Provider timeout handling** (G5 fix, M8) — never false-clear a PROCESSING check.
6. **Document checksum integrity** (G11 fix, M4) — evidence integrity.
7. **Identity verification production gate** (G10 fix, M2) — prevent stub in production.
8. Diamond features in priority order.

### Key Build Insights

- **60% of M1+M2 is StrategyNavigator pattern lift** — the auth, workspace isolation, RBAC, and audit middleware follow the same pattern exactly. Focus on the compliance-specific additions.
- **The wizard DynamicFormRenderer is the most important reusable component** — it drives 6 wizard steps + 17 CDD/ECDD/SOF form schemas. Get it right in M3.
- **The interactive state diagram (S5 on landing)** is the single most powerful demo tool for compliance officers. Prioritise its quality.
- **BullMQ from day 1** — configuring Upstash free tier from M1 is 30 minutes of setup that saves significant debugging later.
- **Mock adapters with realistic latency** — `Math.random() * 1500 + 500` ms added to all mock submit() calls catches every async UX bug before real providers are integrated.
- **Pulsing dot on PENDING_CHECKS badge** — small detail, high UX impact. Implement in M6.
- **`reason` field minimum 10 characters enforced at API level** — every approval, decline, state transition. Non-negotiable. Frontend shows minimum-length indicator.

---

*INTEGRITY SOLVE — MASTER BUILD PLAN*  
*Complete analysis: all 17 source files + 2021-line docx-generator document*  
*Total: 12 gaps identified, 8 diamond features, 43 tables, 36 secrets, 5 UAT scripts, 23 test categories*
