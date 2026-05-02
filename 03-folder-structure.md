# 03 — Folder structure

Mirrors StrategyNavigator exactly. Single Replit repo. No monorepo, no workspaces.

```
integrity-solve/
├── client/                              # React 18 + Vite frontend
│   ├── index.html
│   ├── public/
│   │   ├── favicon.svg
│   │   └── og-image.png
│   └── src/
│       ├── main.tsx                     # App entry, providers, router
│       ├── App.tsx                      # Route table, lazy-loaded pages
│       ├── index.css                    # Tailwind base
│       ├── components/
│       │   ├── ui/                      # shadcn primitives (~50 files)
│       │   ├── layout/
│       │   │   ├── AppShell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── TopBar.tsx
│       │   │   ├── MobileBottomNav.tsx
│       │   │   └── WorkspaceSwitcher.tsx
│       │   ├── auth/
│       │   │   ├── ProtectedRoute.tsx
│       │   │   ├── PermissionGate.tsx
│       │   │   └── RoleBadge.tsx
│       │   ├── wizard/
│       │   │   ├── WizardLayout.tsx
│       │   │   ├── StepNavigator.tsx
│       │   │   ├── AutosaveIndicator.tsx
│       │   │   ├── StepValidation.tsx
│       │   │   └── ContextHelpPanel.tsx
│       │   ├── forms/
│       │   │   ├── DynamicFormRenderer.tsx
│       │   │   ├── ConditionalSection.tsx
│       │   │   ├── EvidenceUploader.tsx
│       │   │   ├── BeneficialOwnerForm.tsx
│       │   │   └── fields/              # Reusable field components
│       │   ├── workflow/
│       │   │   ├── FileStateBadge.tsx
│       │   │   ├── FileTimeline.tsx
│       │   │   ├── RiskRatingCard.tsx
│       │   │   ├── ReviewDecisionModal.tsx
│       │   │   └── EscalationCard.tsx
│       │   ├── documents/
│       │   │   ├── DocumentViewer.tsx
│       │   │   ├── DocumentVersionList.tsx
│       │   │   └── DownloadButton.tsx
│       │   ├── billing/
│       │   │   ├── PlanPicker.tsx
│       │   │   ├── PaymentMethodForm.tsx
│       │   │   ├── UsageBreakdown.tsx
│       │   │   └── BillingStatusBanner.tsx
│       │   ├── tables/
│       │   │   ├── DataTable.tsx        # TanStack Table wrapper
│       │   │   └── ExportButton.tsx
│       │   ├── notifications/
│       │   │   ├── NotificationBell.tsx
│       │   │   └── NotificationList.tsx
│       │   ├── landing/                 # Public landing page
│       │   │   ├── Hero3D.tsx           # Three.js / R3F scene
│       │   │   ├── HeroScene.tsx        # The actual <Canvas> contents
│       │   │   ├── FeatureGrid.tsx
│       │   │   ├── PricingTable.tsx
│       │   │   ├── TestimonialCarousel.tsx
│       │   │   ├── ScrollProgress.tsx
│       │   │   └── CtaBanner.tsx
│       │   └── shared/                  # Misc shared widgets
│       ├── pages/
│       │   ├── public/
│       │   │   ├── Landing.tsx
│       │   │   ├── Pricing.tsx
│       │   │   ├── Features.tsx
│       │   │   ├── Compliance.tsx       # Trust / security page
│       │   │   ├── About.tsx
│       │   │   └── Contact.tsx
│       │   ├── auth/
│       │   │   ├── Login.tsx
│       │   │   ├── Register.tsx
│       │   │   ├── VerifyEmail.tsx
│       │   │   ├── VerifyMobile.tsx
│       │   │   ├── VerifyIdentity.tsx
│       │   │   ├── ForgotPassword.tsx
│       │   │   ├── ResetPassword.tsx
│       │   │   ├── AcceptInvite.tsx
│       │   │   └── RegisterBusiness.tsx
│       │   ├── app/
│       │   │   ├── DashboardOnboarding.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── setup/
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
│       │   │   ├── intelligence/        # Diamond features 2 + 6
│       │   │   │   ├── MonitoringDashboard.tsx
│       │   │   │   └── RegulatoryFeed.tsx
│       │   │   ├── training/            # Diamond 5
│       │   │   │   ├── CourseLibrary.tsx
│       │   │   │   ├── LessonPlayer.tsx
│       │   │   │   └── CompetencyDashboard.tsx
│       │   │   └── group/               # Diamond 4
│       │   │       └── GroupDashboard.tsx
│       │   ├── customer-portal/         # Diamond 7 (separate sub-app)
│       │   │   ├── PortalLanding.tsx
│       │   │   ├── PortalIdentity.tsx
│       │   │   ├── PortalBeneficialOwners.tsx
│       │   │   └── PortalSourceOfFunds.tsx
│       │   └── platform/                # Platform admin tools
│       │       ├── PlatformDashboard.tsx
│       │       ├── WorkspaceList.tsx
│       │       ├── ProviderHealth.tsx
│       │       └── SupportRequests.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useWorkspace.ts
│       │   ├── usePermission.ts
│       │   ├── useWebSocket.ts
│       │   ├── useAutosave.ts
│       │   ├── useDocumentGenerationProgress.ts
│       │   └── useToast.ts
│       ├── lib/
│       │   ├── api.ts                   # Typed fetch + auto cookie + 401 refresh
│       │   ├── queryClient.ts           # TanStack Query config
│       │   ├── stripe.ts                # Stripe.js loader
│       │   ├── ws-client.ts             # WebSocket client
│       │   ├── format.ts                # Date / currency / number
│       │   ├── routes.ts                # Centralised route paths
│       │   └── utils.ts                 # cn(), etc.
│       ├── stores/
│       │   ├── wizardStore.ts           # Zustand
│       │   ├── notificationStore.ts
│       │   └── themeStore.ts
│       └── styles/
│           └── globals.css
│
├── server/                              # Express + TypeScript backend
│   ├── index.ts                         # App entry, env, listen
│   ├── app.ts                           # Express app factory (testable)
│   ├── db.ts                            # Drizzle client + pool
│   ├── env.ts                           # Zod-validated process.env
│   ├── logger.ts                        # Pino instance
│   ├── ws.ts                            # WebSocketService
│   ├── vite.ts                          # Vite dev middleware (StrategyNavigator pattern)
│   ├── middleware/
│   │   ├── requireAuth.ts
│   │   ├── withWorkspace.ts
│   │   ├── requireAction.ts             # RBAC
│   │   ├── withAudit.ts
│   │   ├── rateLimit.ts
│   │   ├── requestId.ts
│   │   ├── errorHandler.ts
│   │   └── billingActive.ts             # 402 if billing inactive
│   ├── routes/                          # One file per resource
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
│   │   ├── webhooks.routes.ts           # Stripe + provider webhooks
│   │   ├── audit.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── platform.routes.ts           # Platform admin
│   │   ├── customer-portal.routes.ts    # Diamond 7
│   │   ├── ai.routes.ts                 # Diamond 1
│   │   ├── monitoring.routes.ts         # Diamond 2
│   │   ├── evidence-pack.routes.ts      # Diamond 3
│   │   ├── group.routes.ts              # Diamond 4
│   │   ├── training-modules.routes.ts   # Diamond 5
│   │   ├── regulatory-feed.routes.ts    # Diamond 6
│   │   └── benchmarking.routes.ts       # Diamond 8
│   ├── storage/                         # One file per entity (StrategyNavigator pattern)
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
│   ├── services/                        # Pure business logic, no Express
│   │   ├── auth.service.ts
│   │   ├── workspace.service.ts
│   │   ├── workspace-state.service.ts   # State machine
│   │   ├── registry.service.ts          # ABN/ACN lookup
│   │   ├── program-form.service.ts
│   │   ├── document-generation.service.ts
│   │   ├── pdf.service.ts
│   │   ├── docx.service.ts
│   │   ├── file-storage.service.ts      # R2/S3 wrapper with signed URLs
│   │   ├── customer-file.service.ts
│   │   ├── customer-file-state.service.ts  # State machine
│   │   ├── risk-calculator.service.ts
│   │   ├── check-orchestrator.service.ts
│   │   ├── escalation.service.ts
│   │   ├── periodic-review.service.ts
│   │   ├── billing.service.ts
│   │   ├── stripe-webhook.service.ts
│   │   ├── usage-event.service.ts
│   │   ├── notification.service.ts
│   │   ├── email.service.ts             # Nodemailer wrapper
│   │   ├── sms.service.ts               # Twilio wrapper
│   │   ├── audit.service.ts
│   │   ├── concurrency.service.ts       # AI request limiter (StrategyNavigator pattern)
│   │   ├── ai-narrative.service.ts      # Diamond 1
│   │   ├── monitoring.service.ts        # Diamond 2
│   │   ├── evidence-pack.service.ts     # Diamond 3
│   │   ├── group.service.ts             # Diamond 4
│   │   ├── training-module.service.ts   # Diamond 5
│   │   ├── regulatory-feed.service.ts   # Diamond 6
│   │   ├── customer-portal.service.ts   # Diamond 7
│   │   └── benchmarking.service.ts      # Diamond 8
│   ├── providers/                       # Provider adapter layer
│   │   ├── types.ts                     # ProviderAdapter interface
│   │   ├── registry.ts                  # ProviderRegistry
│   │   ├── mock/
│   │   │   ├── mock-identity.adapter.ts
│   │   │   ├── mock-aml.adapter.ts
│   │   │   ├── mock-kyb.adapter.ts
│   │   │   └── mock-config.ts           # always_pass / always_fail / random
│   │   ├── facia/
│   │   │   └── facia-identity.adapter.ts
│   │   ├── aml-watcher/
│   │   │   ├── aml-watcher-individual.adapter.ts
│   │   │   └── aml-watcher-entity.adapter.ts
│   │   └── abr/
│   │       └── abr-kyb.adapter.ts
│   ├── jobs/
│   │   ├── index.ts                     # Cron registration
│   │   ├── scheduler.ts                 # withDistributedLock helper
│   │   ├── document-generate.job.ts
│   │   ├── check-submit.job.ts
│   │   ├── check-poll.job.ts
│   │   ├── check-reconcile.job.ts
│   │   ├── webhook-process.job.ts
│   │   ├── review-scheduler.job.ts
│   │   ├── recurring-screening.job.ts
│   │   ├── watchlist-delta.job.ts
│   │   ├── regulatory-feed.job.ts
│   │   ├── billing-usage-report.job.ts
│   │   ├── evidence-pack-generate.job.ts
│   │   └── notification-digest.job.ts
│   ├── templates/                       # Document templates + variable maps
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
│   └── emails/                          # React Email templates
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
├── shared/                              # Code shared between client and server
│   ├── schema.ts                        # Drizzle schema (single source of truth)
│   ├── enums.ts                         # All enums (TS + Zod)
│   ├── zod-schemas.ts                   # Validation schemas reused frontend + backend
│   ├── rbac.ts                          # PERMISSIONS matrix + can()
│   ├── state-machines.ts                # Customer file + workspace transitions
│   ├── form-schemas/                    # JSON form schemas for DynamicFormRenderer
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
│   └── risk-rules.ts                    # Risk rating rule set
│
├── tests/
│   ├── unit/
│   │   ├── risk-calculator.test.ts
│   │   ├── customer-file-state.test.ts
│   │   ├── workspace-state.test.ts
│   │   ├── rbac.test.ts
│   │   └── provider-normalizers.test.ts
│   ├── integration/
│   │   ├── auth.routes.test.ts
│   │   ├── workspace-isolation.test.ts  # cross-tenant check
│   │   ├── program-wizard.routes.test.ts
│   │   ├── customer-file.routes.test.ts
│   │   ├── checks.routes.test.ts
│   │   ├── billing-webhook.test.ts
│   │   └── audit-immutability.test.ts
│   └── e2e/
│       ├── register-and-onboard.spec.ts
│       ├── wizard-and-generate.spec.ts
│       ├── high-risk-escalation.spec.ts
│       └── billing-paywall.spec.ts
│
├── drizzle/                             # Generated migrations
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
├── replit.md                            # Project memory
└── README.md
```

**Path aliases (tsconfig + vite):**
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@server/*` → `server/*` (server-only, not imported from client)

**Lazy loading.** All `pages/app/**` and `pages/platform/**` are imported via `React.lazy()` in `App.tsx`. The 3D landing scene is also lazy-loaded so the protected app shell doesn't pay for Three.js.
