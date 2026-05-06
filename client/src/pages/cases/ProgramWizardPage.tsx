import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wizardApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, CheckCircle2, FileText,
  AlertTriangle, Loader2, Building2, Users, MapPin, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DESIGNATED_SERVICES } from '@shared/caseWorkflow';

const INDUSTRY_PATHWAYS = [
  { value: 'real_estate',    label: 'Real Estate Agents / Conveyancers' },
  { value: 'finance',        label: 'Finance / Mortgage Brokers' },
  { value: 'digital_assets', label: 'Digital Currency Exchange' },
  { value: 'gambling',       label: 'Gambling Service Providers' },
  { value: 'legal',          label: 'Solicitors / Law Firms' },
  { value: 'bullion',        label: 'Bullion Dealers' },
  { value: 'remittance',     label: 'Remittance / International Transfer' },
  { value: 'other',          label: 'Other Regulated Entity' },
];

const STEPS = [
  { key: 'industry',   label: 'Industry',           icon: Building2 },
  { key: 'services',   label: 'Designated Services', icon: FileText },
  { key: 'structure',  label: 'Business Structure',  icon: Users },
  { key: 'locations',  label: 'Locations',           icon: MapPin },
  { key: 'program',    label: 'Program Readiness',   icon: BookOpen },
];

type StepAnswers = {
  industry:   { industryPathway: string };
  services:   { designatedServices: string[] };
  structure:  { businessStructure: string; staffCount: number; abn: string };
  locations:  { locations: string[] };
  program:    { existingAmlProgram: boolean; complianceOfficerNamed: boolean; riskApproach: string };
};

interface WizardDetail {
  run: {
    status: string;
    currentStep: string;
    answers?: Partial<StepAnswers>;
    routeResult?: Record<string, unknown>;
  };
}

const DEFAULT_ANSWERS: Partial<StepAnswers> = {
  services:  { designatedServices: [] },
  locations: { locations: [] },
  structure: { businessStructure: '', staffCount: 1, abn: '' },
  program:   { existingAmlProgram: false, complianceOfficerNamed: false, riskApproach: '' },
};

function stepComplete(key: string, answers: Partial<StepAnswers>): boolean {
  if (key === 'industry')  return !!answers.industry?.industryPathway;
  if (key === 'services')  return (answers.services?.designatedServices?.length ?? 0) > 0;
  if (key === 'structure') return !!answers.structure?.businessStructure;
  if (key === 'locations') return (answers.locations?.locations?.length ?? 0) > 0;
  if (key === 'program')   return answers.program?.complianceOfficerNamed !== undefined;
  return false;
}

interface WizardStepResult {
  run: unknown;
  routeResult: Record<string, unknown>;
}

export default function ProgramWizardPage() {
  const { caseId, runId } = useParams<{ caseId: string; runId: string }>();
  const [, navigate]      = useLocation();
  const qc                = useQueryClient();

  const [step,    setStep]    = useState(0);
  const [answers, setAnswers] = useState<Partial<StepAnswers>>(DEFAULT_ANSWERS);
  const [routeResult, setRouteResult] = useState<Record<string, unknown> | null>(null);
  const [completed,   setCompleted]   = useState(false);

  const { data: wizardDetail, isLoading: wizardLoading } = useQuery<WizardDetail>({
    queryKey: ['wizard-run', runId],
    queryFn:  () => wizardApi.get(runId!) as Promise<WizardDetail>,
    enabled:  !!runId,
  });

  useEffect(() => {
    if (!wizardDetail) return;
    setAnswers({ ...DEFAULT_ANSWERS, ...(wizardDetail.run.answers ?? {}) });
    if (wizardDetail.run.routeResult && Object.keys(wizardDetail.run.routeResult).length > 0) {
      setRouteResult(wizardDetail.run.routeResult);
    }
    if (wizardDetail.run.status === 'COMPLETED' && wizardDetail.run.routeResult) {
      setCompleted(true);
    }
    const savedStep = STEPS.findIndex(s => s.key === wizardDetail.run.currentStep);
    if (savedStep >= 0 && wizardDetail.run.status !== 'COMPLETED') {
      setStep(savedStep);
    }
  }, [wizardDetail]);

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
    const stepKey     = current.key as keyof StepAnswers;
    const stepAnswers = (answers[stepKey] ?? {}) as Record<string, unknown>;

    await saveMutation.mutateAsync({
      stepKey,
      answers:  stepAnswers,
      complete: isLastStep,
    });

    if (isLastStep) {
      setCompleted(true);
    } else {
      setStep(s => s + 1);
    }
  };

  if (completed && routeResult) {
    const missing     = (routeResult['missing']     as string[]) ?? [];
    const riskSignals = (routeResult['riskSignals'] as string[]) ?? [];
    const outputs     = (routeResult['outputs']     as string[]) ?? [];
    const status      = routeResult['completionStatus'] as string;

    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 text-primary mb-2">
          <CheckCircle2 className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Program Setup Complete</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(
              'rounded-lg p-4 font-medium',
              status === 'ready_for_summary'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
            )}>
              {status === 'ready_for_summary'
                ? 'Complete - All required information collected - ready for AML program summary'
                : 'Warning - Some required items are still missing'}
            </div>

            {missing.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1.5">Still required:</p>
                <ul className="space-y-1">
                  {missing.map(m => (
                    <li key={m} className="text-sm text-amber-700 dark:text-amber-300 flex gap-1.5">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {riskSignals.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1.5">Risk Signals Identified:</p>
                <div className="flex flex-wrap gap-1.5">
                  {riskSignals.map(s => (
                    <Badge key={s} variant="destructive" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {outputs.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1.5">Program Outputs:</p>
                <ul className="space-y-1">
                  {outputs.map(o => (
                    <li key={o} className="text-sm flex gap-1.5 items-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => navigate(`/cases/${caseId}`)}>View Case</Button>
          <Button variant="outline" asChild>
            <a href={`/api/cases/${caseId}/pdf`} target="_blank" rel="noreferrer">Download PDF</a>
          </Button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold">AML Program Setup Wizard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Step {step + 1} of {STEPS.length} - {current.label}
        </p>
      </div>

      {wizardLoading && (
        <div className="text-sm text-muted-foreground">Loading saved wizard progress...</div>
      )}

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
          {/* Step: Industry */}
          {step === 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">What is your industry / sector?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INDUSTRY_PATHWAYS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAnswers(a => ({ ...a, industry: { industryPathway: opt.value } }))}
                    className={cn(
                      'border rounded-lg p-3 text-left text-sm transition-all hover:border-primary',
                      answers.industry?.industryPathway === opt.value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Designated Services */}
          {step === 1 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Which designated services does your business provide?
              </Label>
              <p className="text-sm text-muted-foreground">Select all that apply under the AML/CTF Act</p>
              <div className="space-y-2">
                {DESIGNATED_SERVICES.map(svc => {
                  const selected   = answers.services?.designatedServices ?? [];
                  const isSelected = selected.includes(svc);
                  return (
                    <div key={svc} className="flex items-center gap-3">
                      <Checkbox
                        id={svc}
                        checked={isSelected}
                        onCheckedChange={checked => {
                          setAnswers(a => ({
                            ...a,
                            services: {
                              designatedServices: checked
                                ? [...selected, svc]
                                : selected.filter(s => s !== svc),
                            },
                          }));
                        }}
                      />
                      <label htmlFor={svc} className="text-sm cursor-pointer">{svc}</label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Business Structure */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-base font-semibold">Business structure</Label>
                <Select
                  value={answers.structure?.businessStructure ?? ''}
                  onValueChange={v => setAnswers(a => ({
                    ...a,
                    structure: { ...a.structure!, businessStructure: v },
                  }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select structure..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_trader">Sole trader</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="company_pty">Company (Pty Ltd)</SelectItem>
                    <SelectItem value="company_public">Public company</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="government">Government entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ABN</Label>
                <Input
                  placeholder="e.g. 12 345 678 901"
                  value={answers.structure?.abn ?? ''}
                  onChange={e => setAnswers(a => ({
                    ...a,
                    structure: { ...a.structure!, abn: e.target.value },
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Number of staff</Label>
                <Input
                  type="number"
                  min="1"
                  value={answers.structure?.staffCount ?? 1}
                  onChange={e => setAnswers(a => ({
                    ...a,
                    structure: { ...a.structure!, staffCount: parseInt(e.target.value, 10) || 1 },
                  }))}
                />
              </div>
            </div>
          )}

          {/* Step: Locations */}
          {step === 3 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Office / business locations</Label>
              <p className="text-sm text-muted-foreground">Add states or cities where you operate</p>
              <LocationsInput
                value={answers.locations?.locations ?? []}
                onChange={locs => setAnswers(a => ({ ...a, locations: { locations: locs } }))}
              />
            </div>
          )}

          {/* Step: Program Readiness */}
          {step === 4 && (
            <div className="space-y-5">
              <Label className="text-base font-semibold">Current AML/CTF program status</Label>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="existingProgram"
                    checked={answers.program?.existingAmlProgram ?? false}
                    onCheckedChange={v => setAnswers(a => ({
                      ...a,
                      program: { ...a.program!, existingAmlProgram: !!v },
                    }))}
                  />
                  <label htmlFor="existingProgram" className="text-sm cursor-pointer">
                    We already have a documented AML/CTF program
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="complianceOfficer"
                    checked={answers.program?.complianceOfficerNamed ?? false}
                    onCheckedChange={v => setAnswers(a => ({
                      ...a,
                      program: { ...a.program!, complianceOfficerNamed: !!v },
                    }))}
                  />
                  <label htmlFor="complianceOfficer" className="text-sm cursor-pointer">
                    A Compliance Officer has been formally appointed
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Risk approach</Label>
                <Select
                  value={answers.program?.riskApproach ?? ''}
                  onValueChange={v => setAnswers(a => ({
                    ...a,
                    program: { ...a.program!, riskApproach: v },
                  }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select approach..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rule_based">Rule-based (standard thresholds)</SelectItem>
                    <SelectItem value="risk_based">Risk-based approach (recommended)</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nav */}
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
          {isLastStep ? 'Complete Program Setup' : 'Next'}
          {!isLastStep && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function LocationsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="e.g. Sydney NSW, Melbourne VIC..."
        />
        <Button variant="outline" onClick={add} type="button">Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.map(loc => (
          <Badge key={loc} variant="secondary" className="gap-1">
            {loc}
            <button
              onClick={() => onChange(value.filter(l => l !== loc))}
              className="ml-1 hover:text-destructive"
            >x</button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
