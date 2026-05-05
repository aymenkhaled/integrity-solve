import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi, wizardApi, diditApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ChevronLeft, Shield, FileText, Download, Play, CheckCircle2,
  Clock, AlertTriangle, ExternalLink, RefreshCw, Zap, AlertCircle,
  ThumbsUp, HelpCircle, ArrowUpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaseSummary {
  case: {
    id: string; caseType: string; status: string; title: string;
    designatedService?: string; partyType?: string; riskLevel?: string;
    recommendation?: string; createdAt: string;
  };
  wizardRuns: WizardRun[];
  checks: DiditSession[];
  results: DiditResult[];
  audit: AuditEntry[];
}

interface WizardRun {
  id: string; wizardType: string; status: string; currentStep: string;
  routeResult?: Record<string, unknown>; completedAt?: string; createdAt: string;
}

interface DiditSession {
  id: string; capability: string; status: string;
  sessionUrl?: string; providerRequestId?: string; createdAt: string;
}

interface DiditResult {
  id: string; diditSessionId: string; status: string; decision: string;
  summary?: string; riskSignals?: string[]; createdAt: string;
}

interface AuditEntry {
  id: string; action: string; reason?: string; createdAt: string;
}

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

const REVIEWER_DECISIONS = [
  { value: 'approve_proceed',    label: 'Approve to proceed',          icon: ThumbsUp },
  { value: 'request_more_info',  label: 'Request more information',    icon: HelpCircle },
  { value: 'escalate_officer',   label: 'Escalate to Compliance Officer', icon: ArrowUpCircle },
];

export default function CaseDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc           = useQueryClient();
  const [startingCheck, setStartingCheck] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<CaseSummary>({
    queryKey: ['case-summary', id],
    queryFn:  () => casesApi.summary(id!) as Promise<CaseSummary>,
    enabled:  !!id,
    refetchInterval: 10000,
  });

  const startWizardMutation = useMutation({
    mutationFn: (wizardType: string) =>
      wizardApi.start({ caseId: id!, wizardType: wizardType as 'PROGRAM_SETUP' | 'TRANSACTION_CDD' }),
    onSuccess: (run: WizardRun) => {
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
      const page = run.wizardType === 'PROGRAM_SETUP' ? 'program' : 'transaction';
      navigate(`/cases/${id}/wizard/${page}/${run.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createCheckMutation = useMutation({
    mutationFn: (capability: string) =>
      diditApi.createSession({
        caseId:     id!,
        capability: capability as 'kyc' | 'kyb' | 'aml_screening' | 'company_aml',
        reason:     `Initiated from case detail for ${capability} check`,
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

  const handleReviewDecision = async () => {
    if (!reviewDecision || !summary) return;
    setSubmittingReview(true);
    try {
      const label = REVIEWER_DECISIONS.find(d => d.value === reviewDecision)?.label ?? reviewDecision;
      toast.success(`Reviewer decision recorded: ${label}`);
      setReviewDecision('');
      qc.invalidateQueries({ queryKey: ['case-summary', id] });
    } finally {
      setSubmittingReview(false);
    }
  };

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

  const { case: caseRow, wizardRuns, checks, results, audit } = summary;
  const latestWizard = wizardRuns[0];
  const routeResult  = latestWizard?.routeResult as Record<string, unknown> | undefined;

  const recommendedChecks = (routeResult?.['recommendedChecks'] as string[] | undefined) ?? [];
  const escalations       = (routeResult?.['escalations']       as string[] | undefined) ?? [];

  const isTransaction = caseRow.caseType === 'TRANSACTION_CDD';
  const wizardDone    = latestWizard?.status === 'COMPLETED';
  const isMockMode    = true; // always show mock badge — determined by server env

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
                  - {caseRow.riskLevel} risk
                </span>
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

            <Button variant="outline" asChild className="gap-2">
              <a href={`/api/cases/${id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />PDF
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Case metadata */}
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

      <Tabs defaultValue="wizard">
        <TabsList>
          <TabsTrigger value="wizard">Wizard</TabsTrigger>
          <TabsTrigger value="checks">Verification Checks</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Wizard tab */}
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
                    variant="outline"
                    size="sm"
                    className="gap-2"
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

                {escalations.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Escalation Requirements
                    </div>
                    <ul className="space-y-1">
                      {escalations.map(e => (
                        <li key={e} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                          <span className="mt-0.5">-</span>{e}
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
                      ? 'Complete - Standard CDD - can proceed without reviewer'
                      : 'Warning - Reviewer or Compliance Officer approval required'}
                  </div>
                )}

                {/* Reviewer decision stub */}
                {wizardDone && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Reviewer Decision
                    </div>
                    <Select value={reviewDecision} onValueChange={setReviewDecision}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select decision..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REVIEWER_DECISIONS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!reviewDecision || submittingReview}
                      onClick={handleReviewDecision}
                      className="gap-2"
                    >
                      {submittingReview ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                      Record Decision
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Checks tab */}
        <TabsContent value="checks" className="mt-4 space-y-4">
          {wizardDone && recommendedChecks.length > 0 && (
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
                        disabled={alreadyDone || createCheckMutation.isPending}
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
              return (
                <Card key={ch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="font-semibold uppercase text-sm">{ch.capability}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', CHECK_STATUS_BADGE[ch.status] ?? CHECK_STATUS_BADGE['queued'])}>
                            {ch.status.replace('_', ' ')}
                          </span>
                          {isMockMode && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Mock mode
                            </Badge>
                          )}
                        </div>
                        {latestResult && (
                          <p className="text-sm text-muted-foreground mt-1">{latestResult.summary}</p>
                        )}
                        {latestResult?.riskSignals && (latestResult.riskSignals as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(latestResult.riskSignals as string[]).map(s => (
                              <Badge key={s} variant="destructive" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1.5">
                          Created {new Date(ch.createdAt).toLocaleString('en-AU')}
                          {ch.providerRequestId && ` - ID: ${ch.providerRequestId.slice(0, 20)}...`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ch.sessionUrl && (
                          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                            <a href={ch.sessionUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />Verify
                            </a>
                          </Button>
                        )}
                        {ch.status === 'processing' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5 text-xs"
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

        {/* Audit tab */}
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
                  <div className="text-sm font-medium">{entry.action}</div>
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
