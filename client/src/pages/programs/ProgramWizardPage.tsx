import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { programApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ProgramForm } from '@shared/schema';

const STEPS = [
  { id: 0, title: 'Business Profile',         description: 'Legal entity details and ABN' },
  { id: 1, title: 'Designated Services',       description: 'Services that trigger AML/CTF obligations' },
  { id: 2, title: 'ML/TF Risk Assessment',     description: 'Money laundering & terrorism financing risk' },
  { id: 3, title: 'Part A Program',            description: 'Customer-facing obligations' },
  { id: 4, title: 'Part B Program',            description: 'Internal controls and governance' },
  { id: 5, title: 'Customer Due Diligence',    description: 'CDD policies and procedures' },
  { id: 6, title: 'Ongoing Monitoring',        description: 'Transaction and relationship monitoring' },
  { id: 7, title: 'Reporting Obligations',     description: 'SMR, TTR, and IFTI reporting' },
  { id: 8, title: 'Record Keeping',            description: 'Document retention requirements' },
  { id: 9, title: 'Independent Review',        description: 'Annual review requirements' },
  { id: 10, title: 'Employee Due Diligence',   description: 'Staff screening and training' },
  { id: 11, title: 'Training Program',         description: 'AML/CTF staff training' },
  { id: 12, title: 'Board Oversight',          description: 'Governance and accountability' },
];

export default function ProgramWizardPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const { data: program, isLoading } = useQuery({
    queryKey: ['programs', params.id],
    queryFn:  () => programApi.get(params.id!) as Promise<ProgramForm & { versions: unknown[] }>,
    onSuccess: (data: ProgramForm & { versions: unknown[] }) => {
      setCurrentStep(data.currentStep);
      setFormData(data.formData as Record<string, unknown> ?? {});
    },
  } as Parameters<typeof useQuery>[0]);

  const saveStep = useMutation({
    mutationFn: (data: { step: number; data: Record<string, unknown>; reason: string }) =>
      programApi.saveStep(params.id!, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs', params.id] });
      toast.success('Step saved');
      if (currentStep < 12) setCurrentStep((s) => s + 1);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save step');
    },
  });

  const publishProgram = useMutation({
    mutationFn: () => programApi.publish(params.id!, { reason: reason || 'Program published after completing all sections.' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs', params.id] });
      toast.success('Program published successfully!');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to publish program');
    },
  });

  const handleSave = () => {
    if (!reason || reason.trim().length < 10) {
      toast.error('Please enter a reason of at least 10 characters');
      return;
    }
    const stepKey = `step_${currentStep}`;
    saveStep.mutate({
      step:   currentStep,
      data:   (formData[stepKey] as Record<string, unknown>) ?? {},
      reason,
    });
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid lg:grid-cols-4 gap-6">
          <Skeleton className="h-96" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!program) return null;

  const isLocked = !!program.lockedAt;
  const step = STEPS[currentStep]!;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/programs" className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Programs</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{program.title}</span>
        {isLocked && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            <Lock className="h-3 w-3" />Published
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Step nav */}
        <div>
          <Card>
            <CardContent className="p-3">
              <div className="space-y-1">
                {STEPS.map((s) => {
                  const isDone  = s.id < program.currentStep || isLocked;
                  const isActive = s.id === currentStep;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStep(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors text-sm',
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <div className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold flex-shrink-0',
                        isDone  ? 'bg-primary text-primary-foreground' :
                        isActive ? 'border-2 border-primary text-primary' :
                        'border-2 border-muted-foreground/30 text-muted-foreground',
                      )}>
                        {isDone ? <CheckCircle className="h-3.5 w-3.5" /> : s.id + 1}
                      </div>
                      <span className={cn('truncate', isActive && 'font-medium text-foreground')}>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step content */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="text-xs text-muted-foreground">Step {currentStep + 1} of 13</div>
              <CardTitle>{step.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Generic textarea for each step */}
              <div className="space-y-1.5">
                <Label>Section content</Label>
                <Textarea
                  rows={8}
                  placeholder={`Describe your ${step.title.toLowerCase()} policies and procedures...`}
                  disabled={isLocked}
                  value={(formData[`step_${currentStep}`] as { content?: string })?.content ?? ''}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    [`step_${currentStep}`]: { content: e.target.value },
                  }))}
                />
              </div>

              {!isLocked && (
                <div className="space-y-1.5">
                  <Label htmlFor="reason">
                    Reason for this change <span className="text-destructive">*</span>
                    <span className="text-xs text-muted-foreground ml-1">(min 10 characters)</span>
                  </Label>
                  <Input
                    id="reason"
                    placeholder="e.g. Initial draft of business profile section"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {!isLocked && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-3">
                {currentStep === 12 ? (
                  <Button
                    onClick={() => publishProgram.mutate()}
                    disabled={publishProgram.isPending}
                  >
                    {publishProgram.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Publishing...</>
                    ) : (
                      <>Publish program</>
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saveStep.isPending}>
                    {saveStep.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
                    ) : (
                      <>Save & continue <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
