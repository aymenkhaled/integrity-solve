import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi, wizardApi, diditApi, taskApi, customerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ChevronLeft, Shield, Download, Play, CheckCircle2,
  AlertTriangle, ExternalLink, RefreshCw, Zap, AlertCircle,
  ThumbsUp, HelpCircle, ArrowUpCircle, User, ListChecks,
  Package, ClipboardCheck, Plus, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomerRecord {
  id: string; referenceNumber: string; customerType: string; status: string;
  riskRating: string; givenNames?: string; familyName?: string;
  entityName?: string; email?: string;
}

interface EscalationRecord {
  id: string; subject: string; status: string; riskRating: string;
  raisedBy: string; createdAt: string;
}

interface ProgramFormRecord {
  id: string; title: string; status: string; pathway?: string; currentStep: number;
}

interface TaskRecord {
  id: string; title: string; status: string; priority: string;
  dueAt?: string; createdAt: string; description?: string;
}

interface CaseSummary {
  case: {
    id: string; caseType: string; status: string; title: string;
    designatedService?: string; partyType?: string; riskLevel?: string;
    recommendation?: string; createdAt: string;
    customerId?: string; escalationId?: string; programFormId?: string;
    reviewerDecision?: string; reviewerDecisionBy?: string; reviewerDecisionAt?: string;
    reviewerNotes?: string;
  };
  customer:     CustomerRecord | null;
  escalation:   EscalationRecord | null;
  programForm:  ProgramFormRecord | null;
  wizardRuns:   WizardRun[];
  checks:       DiditSession[];
  results:      DiditResult[];
  checkRequests: CheckRequest[];
  checkResults:  CheckResult[];
  tasks:        TaskRecord[];
  audit:        AuditEntry[];
}

interface WizardRun {
  id: string; wizardType: string; status: string; currentStep: string;
  routeResult?: Record<string, unknown>; completedAt?: string; createdAt: string;
}

interface DiditSession {
  id: string; capability: string; status: string;
  sessionUrl?: string; providerRequestId?: string; createdAt: string;
  checkRequestId?: string;
}

interface DiditConfig {
  mode: string;
  hasApiKey: boolean;
  hasWebhookSecret: boolean;
  hasKycWorkflowId: boolean;
  hasKybWorkflowId: boolean;
  baseUrl: string;
}

interface DiditResult {
  id: string; diditSessionId: string; status: string; decision: string;
  summary?: string; riskSignals?: string[]; createdAt: string;
}

interface CheckRequest {
  id: string; checkType: string; provider: string; status: string; createdAt: string;
}

interface CheckResult {
  id: string; checkRequestId: string; outcome: string; manualOverride: boolean; createdAt: string;
}

interface AuditEntry {
  id: string; action: string; reason?: string; createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  low:          'text-emerald-600 dark:text-emerald-400',
  medium:       'text-amber-600 dark:text-amber-400',
  high:         'text-red-600 dark:text-red-400',
  not_assessed: 'text-muted-foreground',
};

const CHECK_STATUS_BADGE: Record<string, string> = {
  queued:          'bg-muted text-muted-foreground',
  processing:      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  passed:          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  failed:          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  review_required: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  error:           'bg-destructive/10 text-destructive',
};

const CHECK_OUTCOME_BADGE: Record<string, string> = {
  CLEAR:           'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  HIT:             'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  POTENTIAL_HIT:   'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  UNABLE_TO_VERIFY:'bg-muted text-muted-foreground',
  ERROR:           'bg-destructive/10 text-destructive',
};

const TASK_STATUS_BADGE: Record<string, string> = {
  OPEN:       'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS:'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  COMPLETE:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  CANCELLED:  'bg-muted text-muted-foreground',
  BLOCKED:    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const REVIEWER_DECISIONS = [
  { value: 'approve_proceed',    label: 'Approve to proceed',             icon: ThumbsUp },
  { value: 'request_more_info',  label: 'Request more information',       icon: HelpCircle },
  { value: 'escalate_officer',   label: 'Escalate to Compliance Officer', icon: ArrowUpCircle },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc           = useQueryClient();
  const [activeTab, setActiveTab] = useState('wizard');

  // Verification check state
  const [startingCheck, setStartingCheck] = useState<string | null>(null);

  // Reviewer decision state
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewNotes, setReviewNotes]       = useState('');

  // Link customer state
  const [showLinkCustomer, setShowLinkCustomer] = useState(false);
  const [customerSearch, setCustomerSearch]     = useState('');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [caseCustomerForm, setCaseCustomerForm] = useState({
    givenNames: '', familyName: '', entityName: '', email: '', country: 'AU',
  });

  // Add task state
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle]     = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');

  // Escalation state
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationForm, setEscalationForm] = useState({
    subject: '', summary: '', grounds: '', riskRating: 'HIGH',
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: summary, isLoading, error } = useQuery<CaseSummary>({
    queryKey: ['case-summary', id],
    queryFn:  () => casesApi.summary(id!) as Promise<CaseSummary>,
    enabled:  !!id,
    refetchInterval: (query) => {
      const data = query.state.data as CaseSummary | undefined;
      return data?.checks.some(ch => ch.status === 'queued' || ch.status === 'processing') ? 10000 : false;
    },
  });

  const { data: diditConfig } = useQuery<DiditConfig>({
    queryKey: ['didit-config-status'],
    queryFn:  () => diditApi.configStatus() as Promise<DiditConfig>,
  });

  const { data: customerList } = useQuery<{ items: CustomerRecord[] }>({
    queryKey: ['customers-search', customerSearch],
    queryFn:  () => customerApi.list({ search: customerSearch, limit: 20 }) as Promise<{ items: CustomerRecord[] }>,
    enabled:  showLinkCustomer,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const startWizardMutation = useMutation<WizardRun, Error, string>({
    mutationFn: (wizardType) =>
      wizardApi.start({ caseId: id!, wizardType: wizardType as 'PROGRAM_SETUP' | 'TRANSACTION_CDD' }) as Promise<WizardRun>,
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      const page = run.wizardType === 'PROGRAM_SETUP' ? 'program' : 'transaction';
      navigate(`/cases/${id}/wizard/${page}/${run.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const createCheckMutation = useMutation({
    mutationFn: (capability: string) =>
      diditApi.createSession({
        caseId:     id!,
        capability: capability as 'kyc' | 'kyb' | 'aml_screening' | 'company_aml',
        reason:     `Initiated from case hub for ${capability} verification`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      setStartingCheck(null);
      toast.success('Verification session created.');
    },
    onError: (e: Error) => {
      setStartingCheck(null);
      toast.error(e.message);
    },
  });

  const mockCompleteMutation = useMutation({
    mutationFn: ({ sessionId, outcome }: { sessionId: string; outcome: string }) =>
      diditApi.mockComplete(sessionId, outcome),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      toast.success('Mock webhook processed.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewerDecisionMutation = useMutation({
    mutationFn: () =>
      casesApi.reviewerDecision(id!, reviewDecision, reviewNotes, `Reviewer decision: ${reviewDecision}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      setReviewDecision('');
      setReviewNotes('');
      const label = REVIEWER_DECISIONS.find(d => d.value === reviewDecision)?.label ?? reviewDecision;
      toast.success(`Decision recorded: ${label}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkCustomerMutation = useMutation({
    mutationFn: (customerId: string) =>
      casesApi.linkCustomer(id!, customerId, 'Linked customer from case hub'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      setShowLinkCustomer(false);
      setCustomerSearch('');
      toast.success('Customer linked to case.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createCustomerFromCaseMutation = useMutation({
    mutationFn: () => {
      const customerType =
        summary?.case.partyType === 'company' ? 'COMPANY' :
        summary?.case.partyType === 'trust' ? 'TRUST' : 'INDIVIDUAL';

      return casesApi.createCustomerFromCase(id!, {
        customerType,
        givenNames: caseCustomerForm.givenNames || undefined,
        familyName: caseCustomerForm.familyName || undefined,
        entityName: caseCustomerForm.entityName || undefined,
        email:      caseCustomerForm.email || undefined,
        country:    caseCustomerForm.country || 'AU',
        reason:     'Created and linked customer from transaction case details',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      setShowCreateCustomer(false);
      setActiveTab('checks');
      setCaseCustomerForm({ givenNames: '', familyName: '', entityName: '', email: '', country: 'AU' });
      toast.success('Customer created and linked to case.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTaskMutation = useMutation({
    mutationFn: () =>
      taskApi.create({
        title:      taskTitle,
        priority:   taskPriority,
        entityType: 'case',
        entityId:   id!,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      setShowAddTask(false);
      setTaskTitle('');
      setTaskPriority('MEDIUM');
      toast.success('Task created.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      taskApi.update(taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-summary', id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const escalationMutation = useMutation({
    mutationFn: () =>
      casesApi.createEscalation(id!, {
        subject:    escalationForm.subject,
        summary:    escalationForm.summary,
        grounds:    escalationForm.grounds,
        riskRating: escalationForm.riskRating,
        reason:     `Escalation created from case hub for case ${id}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      setShowEscalation(false);
      setEscalationForm({ subject: '', summary: '', grounds: '', riskRating: 'HIGH' });
      toast.success('Escalation created and linked to case.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidencePackMutation = useMutation({
    mutationFn: () => casesApi.generateEvidencePack(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      toast.success('Evidence pack generated successfully.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ─── Loading / Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">Failed to load case: {(error as Error).message}</span>
        </div>
        <Link href="/cases" className="mt-4 inline-flex items-center gap-1 text-sm text-primary underline">
          <ChevronLeft className="h-4 w-4" />Back to cases
        </Link>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Case not found.{' '}
        <Link href="/cases" className="text-primary underline">Back to cases</Link>
      </div>
    );
  }

  const {
    case: caseRow, customer, escalation, programForm,
    wizardRuns, checks, results, checkRequests: checkReqs, checkResults: checkRes,
    tasks, audit,
  } = summary;

  const latestWizard     = wizardRuns[0];
  const routeResult      = latestWizard?.routeResult as Record<string, unknown> | undefined;
  const recommendedChecks = (routeResult?.['recommendedChecks'] as string[] | undefined) ?? [];
  const escalationFlags   = (routeResult?.['escalations'] as string[] | undefined) ?? [];
  const isTransaction     = caseRow.caseType === 'TRANSACTION_CDD';
  const wizardDone        = latestWizard?.status === 'COMPLETED';
  const diditMode         = diditConfig?.mode ?? 'mock';
  const isMockMode        = diditMode === 'mock';
  const canStartChecks    = !isTransaction || Boolean(customer);
  const customerTypeForCase =
    caseRow.partyType === 'company' ? 'COMPANY' :
    caseRow.partyType === 'trust' ? 'TRUST' : 'INDIVIDUAL';

  const openTasks     = tasks.filter(t => t.status !== 'COMPLETE' && t.status !== 'CANCELLED');
  const completeTasks = tasks.filter(t => t.status === 'COMPLETE');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Back + Header */}
      <div>
        <Link href="/cases" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 w-fit">
          <ChevronLeft className="h-4 w-4" />Cases
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{caseRow.title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="capitalize">
                {caseRow.caseType.replace('_', ' ').toLowerCase()}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {caseRow.status.replace('_', ' ').toLowerCase()}
              </Badge>
              {caseRow.riskLevel && caseRow.riskLevel !== 'not_assessed' && (
                <span className={cn('text-sm font-semibold capitalize', RISK_COLOR[caseRow.riskLevel])}>
                  — {caseRow.riskLevel} risk
                </span>
              )}
              {isMockMode && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Mock mode</Badge>
              )}
              {!isMockMode && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Didit {diditMode}</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(!latestWizard || latestWizard.status === 'IN_PROGRESS') && (
              <Button
                className="gap-2"
                onClick={() =>
                  latestWizard
                    ? navigate(`/cases/${id}/wizard/${isTransaction ? 'transaction' : 'program'}/${latestWizard.id}`)
                    : startWizardMutation.mutate(caseRow.caseType)
                }
                disabled={startWizardMutation.isPending}
              >
                <Play className="h-4 w-4" />
                {latestWizard ? 'Continue Wizard' : 'Start Wizard'}
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => evidencePackMutation.mutate()}
              disabled={evidencePackMutation.isPending}
            >
              {evidencePackMutation.isPending
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Package className="h-4 w-4" />}
              Evidence Pack
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <a href={`/api/cases/${id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Designated Service', value: caseRow.designatedService ?? '-' },
          { label: 'Party Type',         value: caseRow.partyType ? caseRow.partyType.replace('_', ' ') : '-' },
          { label: 'Risk Level',         value: caseRow.riskLevel ?? 'not assessed' },
          { label: 'Approval Path',      value: caseRow.recommendation?.replace(/_/g, ' ') ?? 'pending' },
        ].map(({ label, value }) => (
          <Card key={label} className="p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-semibold text-sm capitalize mt-1 truncate">{value}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="wizard">Wizard</TabsTrigger>
          <TabsTrigger value="customer">
            Customer {customer && <CheckCircle2 className="ml-1 h-3 w-3 text-emerald-500" />}
          </TabsTrigger>
          <TabsTrigger value="checks">
            Checks {checks.length > 0 && <Badge className="ml-1 h-4 px-1 text-xs">{checks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks {openTasks.length > 0 && <Badge className="ml-1 h-4 px-1 text-xs">{openTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="escalation">
            Escalation {escalation && <AlertTriangle className="ml-1 h-3 w-3 text-amber-500" />}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* ── Wizard tab ─────────────────────────────────────────────────── */}
        <TabsContent value="wizard" className="mt-4 space-y-4">
          {!latestWizard && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Play className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No wizard run yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start the guided wizard to determine checks, risk level, and approval path
                </p>
                <Button
                  onClick={() => startWizardMutation.mutate(caseRow.caseType)}
                  disabled={startWizardMutation.isPending}
                >
                  Start Wizard
                </Button>
              </CardContent>
            </Card>
          )}

          {latestWizard && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Wizard Result
                  </span>
                  <Badge variant={wizardDone ? 'default' : 'secondary'}>
                    {latestWizard.status.replace('_', ' ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!wizardDone && (
                  <Button
                    variant="outline" size="sm" className="gap-2"
                    onClick={() =>
                      navigate(`/cases/${id}/wizard/${isTransaction ? 'transaction' : 'program'}/${latestWizard.id}`)
                    }
                  >
                    <Play className="h-4 w-4" />Continue Wizard
                  </Button>
                )}

                {recommendedChecks.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Recommended Checks</div>
                    <div className="flex flex-wrap gap-2">
                      {recommendedChecks.map(c => (
                        <Badge key={c} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 uppercase text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {escalationFlags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Escalation Requirements
                    </div>
                    <ul className="space-y-1">
                      {escalationFlags.map(e => (
                        <li key={e} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                          <span className="mt-0.5">–</span>{e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {caseRow.recommendation && (
                  <div className={cn(
                    'rounded-lg p-3 text-sm font-medium',
                    caseRow.recommendation.includes('standard')
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
                  )}>
                    {caseRow.recommendation === 'standard_cdd_can_proceed'
                      ? 'Standard CDD — can proceed without reviewer'
                      : 'Reviewer or Compliance Officer approval required'}
                  </div>
                )}

                {/* Linked program form from wizard */}
                {programForm && (
                  <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
                    <div className="text-xs text-muted-foreground">Linked AML Program</div>
                    <div className="font-medium text-sm">{programForm.title}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{programForm.status}</Badge>
                      {programForm.pathway && <span className="text-muted-foreground">{programForm.pathway}</span>}
                      <Link href={`/programs/${programForm.id}/wizard`} className="text-primary underline">
                        Continue Full AML Program Wizard
                      </Link>
                    </div>
                  </div>
                )}

                {/* Reviewer decision */}
                {wizardDone && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Reviewer Decision
                    </div>

                    {/* Show recorded decision if it exists */}
                    {caseRow.reviewerDecision && (
                      <div className="rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 p-3 space-y-1">
                        <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          {REVIEWER_DECISIONS.find(d => d.value === caseRow.reviewerDecision)?.label ?? caseRow.reviewerDecision}
                        </div>
                        {caseRow.reviewerNotes && (
                          <div className="text-xs text-emerald-700 dark:text-emerald-300">{caseRow.reviewerNotes}</div>
                        )}
                        {caseRow.reviewerDecisionAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(caseRow.reviewerDecisionAt).toLocaleString('en-AU')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Allow re-recording a decision */}
                    <Select value={reviewDecision} onValueChange={setReviewDecision}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={caseRow.reviewerDecision ? 'Change decision...' : 'Select decision...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEWER_DECISIONS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Notes (optional)..."
                      className="text-sm resize-none"
                      rows={2}
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!reviewDecision || reviewerDecisionMutation.isPending}
                      onClick={() => reviewerDecisionMutation.mutate()}
                      className="gap-2"
                    >
                      {reviewerDecisionMutation.isPending
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <ClipboardCheck className="h-3.5 w-3.5" />}
                      Record Decision
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Customer tab ───────────────────────────────────────────────── */}
        <TabsContent value="customer" className="mt-4 space-y-4">
          {customer ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Linked Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-semibold text-sm">
                      {customer.givenNames || customer.entityName
                        ? `${customer.givenNames ?? ''} ${customer.familyName ?? customer.entityName ?? ''}`.trim()
                        : 'Unknown'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Reference</div>
                    <div className="font-semibold text-sm">{customer.referenceNumber}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="text-sm capitalize">{customer.customerType.toLowerCase()}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Risk Rating</div>
                    <Badge variant="outline" className="capitalize">{customer.riskRating.toLowerCase()}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge variant="outline" className="capitalize">{customer.status.replace(/_/g, ' ').toLowerCase()}</Badge>
                  </div>
                  {customer.email && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm">{customer.email}</div>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Link href={`/customers/${customer.id}`} className="text-sm text-primary underline">
                    Open customer record →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">No customer linked</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Link an existing customer to connect CDD checks, risk ratings, and audit trails.
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => setShowLinkCustomer(true)}>
                    Link Customer
                  </Button>
                  {isTransaction && (
                    <Button onClick={() => setShowCreateCustomer(true)}>
                      Create from Case
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create customer from case panel */}
          {showCreateCustomer && !customer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Create Customer from Case
                  <Button variant="ghost" size="icon" onClick={() => setShowCreateCustomer(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Customer type: {customerTypeForCase.toLowerCase().replace('_', ' ')}
                </div>
                {customerTypeForCase === 'INDIVIDUAL' ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Given names</Label>
                      <Input
                        value={caseCustomerForm.givenNames}
                        onChange={e => setCaseCustomerForm(f => ({ ...f, givenNames: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Family name</Label>
                      <Input
                        value={caseCustomerForm.familyName}
                        onChange={e => setCaseCustomerForm(f => ({ ...f, familyName: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Entity name</Label>
                    <Input
                      value={caseCustomerForm.entityName}
                      onChange={e => setCaseCustomerForm(f => ({ ...f, entityName: e.target.value }))}
                    />
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={caseCustomerForm.email}
                      onChange={e => setCaseCustomerForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Input
                      value={caseCustomerForm.country}
                      maxLength={2}
                      onChange={e => setCaseCustomerForm(f => ({ ...f, country: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={
                    createCustomerFromCaseMutation.isPending ||
                    (customerTypeForCase === 'INDIVIDUAL'
                      ? (!caseCustomerForm.givenNames || !caseCustomerForm.familyName)
                      : !caseCustomerForm.entityName)
                  }
                  onClick={() => createCustomerFromCaseMutation.mutate()}
                >
                  {createCustomerFromCaseMutation.isPending
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />}
                  Create and Link Customer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Link customer panel */}
          {showLinkCustomer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Link a Customer
                  <Button variant="ghost" size="icon" onClick={() => setShowLinkCustomer(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Search by name or reference..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {(customerList?.items ?? []).map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left rounded-md border p-3 hover:bg-accent text-sm flex items-center justify-between"
                      onClick={() => linkCustomerMutation.mutate(c.id)}
                      disabled={linkCustomerMutation.isPending}
                    >
                      <div>
                        <div className="font-medium">
                          {c.givenNames || c.entityName
                            ? `${c.givenNames ?? ''} ${c.familyName ?? c.entityName ?? ''}`.trim()
                            : 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.referenceNumber} · {c.customerType}</div>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">{c.riskRating.toLowerCase()}</Badge>
                    </button>
                  ))}
                  {customerList?.items?.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">No customers found</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show "link a different customer" if one is already linked */}
          {customer && !showLinkCustomer && (
            <Button variant="ghost" size="sm" onClick={() => setShowLinkCustomer(true)}>
              Link a different customer
            </Button>
          )}
        </TabsContent>

        {/* ── Checks tab ─────────────────────────────────────────────────── */}
        <TabsContent value="checks" className="mt-4 space-y-4">
          {wizardDone && isTransaction && !customer && recommendedChecks.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <CardContent className="p-4 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="font-medium text-sm">Link or create customer before starting Didit checks.</div>
                  <p className="text-sm text-muted-foreground">
                    The transaction wizard has identified recommended checks, but verification evidence must attach to a customer record.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => { setShowCreateCustomer(true); setActiveTab('customer'); }}>
                    Create Customer from Case
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!isMockMode && diditConfig && (!diditConfig.hasApiKey || !diditConfig.hasWebhookSecret) && (
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Didit is set to {diditMode}, but required backend secrets are missing.
                Add the API key, workflow IDs, webhook secret, and APP_URL in Replit Secrets before starting hosted checks.
              </CardContent>
            </Card>
          )}

          {wizardDone && recommendedChecks.length > 0 && canStartChecks && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Start a Verification Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recommendedChecks.map(cap => {
                    const alreadyDone = checks.some(ch => ch.capability === cap);
                    return (
                      <Button
                        key={cap}
                        variant={alreadyDone ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={alreadyDone || createCheckMutation.isPending || !canStartChecks}
                        onClick={() => {
                          setStartingCheck(cap);
                          createCheckMutation.mutate(cap);
                        }}
                        className="gap-2 uppercase text-xs"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {startingCheck === cap && createCheckMutation.isPending ? 'Starting...' : cap}
                        {alreadyDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {checks.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">
              No verification checks yet. Complete the wizard first to get recommended checks.
            </div>
          )}

          <div className="space-y-3">
            {checks.map(ch => {
              const chResults = results.filter(r => r.diditSessionId === ch.id);
              const latestResult = chResults[0];

              // Find linked check engine request + result
              const linkedCheckReq  = ch.checkRequestId ? checkReqs.find(cr => cr.id === ch.checkRequestId) : null;
              const linkedCheckRes  = linkedCheckReq ? checkRes.filter(cr => cr.checkRequestId === linkedCheckReq.id) : [];

              return (
                <Card key={ch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Shield className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold uppercase text-sm">{ch.capability}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', CHECK_STATUS_BADGE[ch.status] ?? CHECK_STATUS_BADGE['queued'])}>
                            {ch.status.replace('_', ' ')}
                          </span>
                          {isMockMode && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Mock</Badge>
                          )}
                        </div>

                        {latestResult?.summary && (
                          <p className="text-sm text-muted-foreground">{latestResult.summary}</p>
                        )}
                        {latestResult?.riskSignals && (latestResult.riskSignals as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(latestResult.riskSignals as string[]).map(s => (
                              <Badge key={s} variant="destructive" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Check engine bridge data */}
                        {linkedCheckReq && (
                          <div className="rounded-md bg-muted/50 p-2 space-y-1 text-xs">
                            <div className="font-medium text-muted-foreground">Check Engine Record</div>
                            <div className="flex flex-wrap gap-2">
                              <span>Type: <strong>{linkedCheckReq.checkType}</strong></span>
                              <span>Provider: <strong>{linkedCheckReq.provider}</strong></span>
                              <span>Status: <strong>{linkedCheckReq.status}</strong></span>
                            </div>
                            {linkedCheckRes.map(cr => (
                              <div key={cr.id} className="flex items-center gap-2">
                                <span>Outcome:</span>
                                <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', CHECK_OUTCOME_BADGE[cr.outcome] ?? '')}>
                                  {cr.outcome}
                                </span>
                                {cr.manualOverride && <Badge variant="outline" className="text-xs">Manual Override</Badge>}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Created {new Date(ch.createdAt).toLocaleString('en-AU')}
                          {ch.providerRequestId && ` · ID: ${ch.providerRequestId.slice(0, 20)}...`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ch.sessionUrl && (
                          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                            <a href={ch.sessionUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />Open Didit Verification
                            </a>
                          </Button>
                        )}
                        {isMockMode && ch.status === 'processing' && (
                          <Button
                            variant="secondary" size="sm" className="gap-1.5 text-xs"
                            onClick={() => mockCompleteMutation.mutate({ sessionId: ch.id, outcome: 'Approved' })}
                            disabled={mockCompleteMutation.isPending}
                          >
                            <Zap className="h-3.5 w-3.5" />Mock Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── Tasks tab ──────────────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {openTasks.length} open · {completeTasks.length} complete
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAddTask(true)}>
              <Plus className="h-4 w-4" />Add Task
            </Button>
          </div>

          {/* Add task form */}
          {showAddTask && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  New Task
                  <Button variant="ghost" size="icon" onClick={() => setShowAddTask(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="Task title..."
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={taskPriority} onValueChange={setTaskPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={!taskTitle.trim() || createTaskMutation.isPending}
                  onClick={() => createTaskMutation.mutate()}
                  className="gap-2"
                >
                  {createTaskMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Create Task
                </Button>
              </CardContent>
            </Card>
          )}

          {tasks.length === 0 && !showAddTask && (
            <div className="text-center text-muted-foreground py-10 text-sm">
              <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No tasks yet. Add a task to track CDD checklist items.
            </div>
          )}

          <div className="space-y-2">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3">
                <button
                  className="shrink-0"
                  onClick={() =>
                    updateTaskMutation.mutate({
                      taskId: t.id,
                      status: t.status === 'COMPLETE' ? 'OPEN' : 'COMPLETE',
                    })
                  }
                  disabled={updateTaskMutation.isPending}
                >
                  <CheckCircle2
                    className={cn('h-5 w-5', t.status === 'COMPLETE' ? 'text-emerald-500' : 'text-muted-foreground')}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div className={cn('text-sm font-medium', t.status === 'COMPLETE' && 'line-through text-muted-foreground')}>
                    {t.title}
                  </div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground truncate">{t.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TASK_STATUS_BADGE[t.status] ?? '')}>
                    {t.status.replace('_', ' ')}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">{t.priority.toLowerCase()}</Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Escalation tab ─────────────────────────────────────────────── */}
        <TabsContent value="escalation" className="mt-4 space-y-4">
          {escalation ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Linked Escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Subject</div>
                    <div className="font-medium">{escalation.subject}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                    <Badge variant="outline">{escalation.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Risk Rating</div>
                    <Badge variant="outline">{escalation.riskRating}</Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Created</div>
                    <div>{new Date(escalation.createdAt).toLocaleDateString('en-AU')}</div>
                  </div>
                </div>
                <Link href={`/escalations/${escalation.id}`} className="text-sm text-primary underline">
                  Open escalation →
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold mb-1">No escalation linked</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an escalation to trigger an SMR review process for this case.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowEscalation(true)}
                  disabled={showEscalation}
                >
                  Create Escalation
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Escalation form */}
          {showEscalation && !escalation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  New Escalation
                  <Button variant="ghost" size="icon" onClick={() => setShowEscalation(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input
                    placeholder="Brief subject line..."
                    value={escalationForm.subject}
                    onChange={e => setEscalationForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Summary</Label>
                  <Textarea
                    placeholder="Summary of suspicious activity (min 20 chars)..."
                    rows={3}
                    value={escalationForm.summary}
                    onChange={e => setEscalationForm(f => ({ ...f, summary: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Grounds</Label>
                  <Textarea
                    placeholder="Legal grounds and reasoning (min 20 chars)..."
                    rows={3}
                    value={escalationForm.grounds}
                    onChange={e => setEscalationForm(f => ({ ...f, grounds: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Risk Rating</Label>
                  <Select
                    value={escalationForm.riskRating}
                    onValueChange={v => setEscalationForm(f => ({ ...f, riskRating: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={
                    !escalationForm.subject ||
                    escalationForm.summary.length < 20 ||
                    escalationForm.grounds.length < 20 ||
                    escalationMutation.isPending
                  }
                  onClick={() => escalationMutation.mutate()}
                  className="gap-2"
                >
                  {escalationMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Create Escalation
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Audit tab ──────────────────────────────────────────────────── */}
        <TabsContent value="audit" className="mt-4">
          {audit.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">No audit events yet.</div>
          )}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3 pl-10">
              {audit.map(entry => (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-6 mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString('en-AU')}</div>
                  <div className="text-sm font-medium">{entry.action.replace(/_/g, ' ')}</div>
                  {entry.reason && <div className="text-sm text-muted-foreground">{entry.reason}</div>}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
