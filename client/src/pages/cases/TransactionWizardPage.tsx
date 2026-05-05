import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { wizardApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Shield, AlertTriangle,
  Loader2, Users, Building2, DollarSign, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DESIGNATED_SERVICES = [
  'Account providers',          'Bullion dealing',
  'Digital currency exchange',  'Gambling services',
  'International funds transfer', 'Loan provision',
  'Mortgage broking',           'Real estate agency',
  'Remittance dealing',         'Superannuation services',
  'Solicitor / Conveyancing services',
];

const STEPS = [
  { key: 'service',     label: 'Designated Service',   icon: Building2 },
  { key: 'party',       label: 'Party Identification', icon: Users },
  { key: 'risk',        label: 'Risk Assessment',      icon: Shield },
  { key: 'transaction', label: 'Transaction Details',  icon: DollarSign },
];

type TransactionAnswers = {
  service:     { designatedService: string };
  party:       { providedFor: 'individual' | 'company' | 'trust' | 'beneficial_owner'; customerIsNew: boolean; beneficialOwnersKnown: boolean };
  risk:        { politicallyExposedPerson: boolean; adverseMedia: boolean; highRiskJurisdiction: boolean; complexOwnership: boolean; sourceOfFundsRequired: boolean };
  transaction: { transactionValue: number; currency: string };
};

function stepComplete(key: string, a: Partial<TransactionAnswers>): boolean {
  if (key === 'service')     return !!a.service?.designatedService;
  if (key === 'party')       return !!a.party?.providedFor;
  if (key === 'risk')        return true;
  if (key === 'transaction') return (a.transaction?.transactionValue ?? 0) > 0;
  return false;
}

const PARTY_OPTIONS = [
  { value: 'individual',       label: 'Individual',                    icon: '👤', desc: 'Natural person customer' },
  { value: 'company',          label: 'Company',                       icon: '🏢', desc: 'Pty Ltd or similar entity' },
  { value: 'trust',            label: 'Trust',                         icon: '⚖️', desc: 'Discretionary or unit trust' },
  { value: 'beneficial_owner', label: 'Beneficial Owner / Controller', icon: '🔑', desc: 'UBO or controlling person' },
];

const RISK_FLAGS = [
  { key: 'politicallyExposedPerson',  label: 'Politically Exposed Person (PEP)',         severity: 'high' },
  { key: 'adverseMedia',              label: 'Adverse media / negative news found',       severity: 'high' },
  { key: 'highRiskJurisdiction',      label: 'High-risk jurisdiction involved',           severity: 'high' },
  { key: 'complexOwnership',          label: 'Complex / layered ownership structure',     severity: 'medium' },
  { key: 'sourceOfFundsRequired',     label: 'Source of funds / wealth verification needed', severity: 'medium' },
];

interface WizardStepResult {
  run: unknown;
  routeResult: Record<string, unknown>;
}

export default function TransactionWizardPage() {
  const { caseId, runId } = useParams<{ caseId: string; runId: string }>();
  const [, navigate]      = useLocation();
  const qc                = useQueryClient();

  const [step,    setStep]    = useState(0);
  const [answers, setAnswers] = useState<Partial<TransactionAnswers>>({
    party:       { providedFor: 'individual', customerIsNew: true, beneficialOwnersKnown: true },
    risk:        { politicallyExposedPerson: false, adverseMedia: false, highRiskJurisdiction: false, complexOwnership: false, sourceOfFundsRequired: false },
    transaction: { transactionValue: 0, currency: 'AUD' },
  });
  const [routeResult, setRouteResult] = useState<Record<string, unknown> | null>(null);
  const [completed,   setCompleted]   = useState(false);

  const saveMutation = useMutation({
    mutationFn: (payload: { stepKey: string; answers: Record<string, unknown>; complete: boolean }) =>
      wizardApi.saveStep(runId!, payload) as Promise<WizardStepResult>,
    onSuccess: (res: WizardStepResult) => {
      qc.invalidateQueries({ queryKey: ['case-summary', caseId] });
      setRouteResult(res.routeResult);
    },
    onError: (e: Error) => toast.error('Save failed: ' + e.message),
  });

  const current    = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const handleNext = async () => {
    const stepKey     = current.key as keyof TransactionAnswers;
    const stepAnswers = (answers[stepKey] ?? {}) as Record<string, unknown>;
    await saveMutation.mutateAsync({ stepKey, answers: stepAnswers, complete: isLastStep });
    if (isLastStep) setCompleted(true);
    else            setStep(s => s + 1);
  };

  // Results screen
  if (completed && routeResult) {
    const riskLevel         = (routeResult['riskLevel'] as string) ?? 'low';
    const recommendedChecks = (routeResult['recommendedChecks'] as string[]) ?? [];
    const approvalPath      = (routeResult['approvalPath'] as string) ?? '';
    const escalations       = (routeResult['escalations'] as string[]) ?? [];

    const riskColor = riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'amber' : 'emerald';

    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-primary mb-2">
          <CheckCircle2 className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Transaction CDD Complete</h1>
        </div>

        {/* Risk level */}
        <div className={cn(
          'rounded-xl p-5 border-2',
          riskColor === 'red'    ? 'border-red-500 bg-red-50 dark:bg-red-950/30' :
          riskColor === 'amber'  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' :
          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
        )}>
          <div className={cn(
            'text-2xl font-bold capitalize mb-1',
            riskColor === 'red'   ? 'text-red-700 dark:text-red-300' :
            riskColor === 'amber' ? 'text-amber-700 dark:text-amber-300' :
            'text-emerald-700 dark:text-emerald-300',
          )}>
            {riskLevel} Risk
          </div>
          <div className="text-sm text-muted-foreground">
            {riskLevel === 'high'   ? 'Immediate compliance officer review required before proceeding' :
             riskLevel === 'medium' ? 'Reviewer approval required' :
             'Standard CDD - can proceed with verification'}
          </div>
        </div>

        {/* Recommended checks */}
        <div>
          <h3 className="font-semibold mb-3">Recommended Verification Checks</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {recommendedChecks.map(check => (
              <div key={check} className="flex items-center gap-2 border rounded-lg p-3">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium uppercase">{check}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Escalations */}
        {escalations.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Escalation Requirements
            </h3>
            <ul className="space-y-2">
              {escalations.map(e => (
                <li key={e} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <span className="mt-0.5">-</span>{e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Approval path */}
        <div className={cn(
          'rounded-lg p-4 text-sm font-medium',
          approvalPath.includes('standard')
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
        )}>
          {approvalPath === 'standard_cdd_can_proceed'
            ? 'Complete - Standard CDD - verification can proceed'
            : 'Warning - Reviewer or Compliance Officer approval required before proceeding'}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => navigate(`/cases/${caseId}`)}>
            View Case & Start Checks
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/cases/${caseId}/pdf`} target="_blank" rel="noreferrer">
              Download PDF Summary
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Wizard steps
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`/cases/${caseId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />Back to Case
        </button>
        <h1 className="text-xl font-bold">Transaction / CDD Wizard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Step {step + 1} of {STEPS.length} - {current.label}
        </p>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-all',
              i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-muted',
            )}
          />
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Step: Designated Service */}
          {step === 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                What designated service is being provided?
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DESIGNATED_SERVICES.map(svc => (
                  <button
                    key={svc}
                    onClick={() => setAnswers(a => ({ ...a, service: { designatedService: svc } }))}
                    className={cn(
                      'border rounded-lg p-3 text-left text-sm transition-all hover:border-primary',
                      answers.service?.designatedService === svc
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border',
                    )}
                  >
                    {svc}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Party Identification */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Who is the designated service being provided for?
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PARTY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers(a => ({
                        ...a,
                        party: { ...a.party!, providedFor: opt.value as TransactionAnswers['party']['providedFor'] },
                      }))}
                      className={cn(
                        'border rounded-lg p-3 text-left transition-all hover:border-primary',
                        answers.party?.providedFor === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border',
                      )}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      <div className="font-semibold text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="customerNew"
                    checked={answers.party?.customerIsNew ?? true}
                    onCheckedChange={v => setAnswers(a => ({
                      ...a, party: { ...a.party!, customerIsNew: !!v },
                    }))}
                  />
                  <label htmlFor="customerNew" className="text-sm cursor-pointer">
                    This is a new customer (not previously verified)
                  </label>
                </div>

                {(answers.party?.providedFor === 'company' || answers.party?.providedFor === 'trust') && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="boKnown"
                      checked={answers.party?.beneficialOwnersKnown ?? true}
                      onCheckedChange={v => setAnswers(a => ({
                        ...a, party: { ...a.party!, beneficialOwnersKnown: !!v },
                      }))}
                    />
                    <label htmlFor="boKnown" className="text-sm cursor-pointer">
                      All beneficial owners (25%+ ownership) are known and identifiable
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step: Risk Assessment */}
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Are any of the following risk factors present?
              </Label>
              <p className="text-sm text-muted-foreground -mt-2">
                Select all that apply. Each flag may affect the approval path.
              </p>
              <div className="space-y-3">
                {RISK_FLAGS.map(flag => {
                  const riskAnswers = answers.risk ?? {} as TransactionAnswers['risk'];
                  const checked     = riskAnswers[flag.key as keyof TransactionAnswers['risk']] ?? false;
                  return (
                    <div
                      key={flag.key}
                      className={cn(
                        'flex items-start gap-3 border rounded-lg p-3 transition-all cursor-pointer',
                        checked
                          ? flag.severity === 'high'
                            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                            : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                          : 'border-border hover:border-muted-foreground',
                      )}
                      onClick={() => setAnswers(a => ({
                        ...a,
                        risk: { ...a.risk!, [flag.key]: !checked },
                      }))}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => setAnswers(a => ({
                          ...a,
                          risk: { ...a.risk!, [flag.key]: !checked },
                        }))}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium">{flag.label}</div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs mt-1',
                            flag.severity === 'high'
                              ? 'border-red-300 text-red-700 dark:text-red-300'
                              : 'border-amber-300 text-amber-700 dark:text-amber-300',
                          )}
                        >
                          {flag.severity} impact
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Transaction Details */}
          {step === 3 && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Transaction value</Label>
              <p className="text-sm text-muted-foreground -mt-2">
                Values of $10,000 AUD or more may trigger Threshold Transaction Report (TTR) obligations.
              </p>
              <div className="flex gap-3">
                <Select
                  value={answers.transaction?.currency ?? 'AUD'}
                  onValueChange={v => setAnswers(a => ({
                    ...a, transaction: { ...a.transaction!, currency: v },
                  }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'SGD', 'CRYPTO'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={answers.transaction?.transactionValue || ''}
                  onChange={e => setAnswers(a => ({
                    ...a,
                    transaction: { ...a.transaction!, transactionValue: parseFloat(e.target.value) || 0 },
                  }))}
                  className="flex-1"
                />
              </div>

              {(answers.transaction?.transactionValue ?? 0) >= 10000 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 p-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>TTR Alert:</strong> Transactions of $10,000 AUD or more must be reported to AUSTRAC within 10 business days.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!stepComplete(current.key, answers) || saveMutation.isPending}
          className="gap-2"
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLastStep ? 'Complete & Get Recommendations' : 'Next'}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
