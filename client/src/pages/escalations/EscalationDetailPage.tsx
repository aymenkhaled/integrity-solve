import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, AlertTriangle, Loader2, FileText, Send,
  CheckCircle, XCircle, Clock, Shield, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { escalationApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Escalation, SmrDraft } from '@shared/schema';

const STATUS_STEPS = [
  { key: 'DRAFT',         label: 'Draft',           icon: Clock },
  { key: 'UNDER_REVIEW',  label: 'Under Review',    icon: AlertTriangle },
  { key: 'ESCALATED',     label: 'Escalated',       icon: Shield },
  { key: 'SMR_SUBMITTED', label: 'SMR Submitted',   icon: CheckCircle },
];

export default function EscalationDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  // SMR creation dialog
  const [smrOpen, setSmrOpen]         = useState(false);
  const [approveOpen, setApproveOpen] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen]   = useState<string | null>(null);
  const [smrReason, setSmrReason]     = useState('');
  const [smrForm, setSmrForm] = useState({
    reportingEntity: '',
    narrative:       '',
    suspicionGrounds:'',
    reportPeriodStart: '',
    reportPeriodEnd:   '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['escalations', params.id],
    queryFn:  () => escalationApi.get(params.id!) as Promise<Escalation & { smrDrafts: SmrDraft[] }>,
  });

  const escalateMutation = useMutation({
    mutationFn: () => escalationApi.escalate(params.id!, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('Escalated to SMR workflow');
      setReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to escalate'),
  });

  const closeMutation = useMutation({
    mutationFn: () => escalationApi.close(params.id!, { reason, closeType: 'CLOSED_NO_ACTION' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('Escalation closed — no action required');
      setReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to close'),
  });

  const closeFalseMutation = useMutation({
    mutationFn: () => escalationApi.close(params.id!, { reason, closeType: 'CLOSED_FALSE_POSITIVE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('Escalation closed as false positive');
      setReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to close'),
  });

  const createSmrMutation = useMutation({
    mutationFn: () => escalationApi.createSmr(params.id!, {
      reportingEntity:   smrForm.reportingEntity,
      narrative:         smrForm.narrative,
      suspicionGrounds:  smrForm.suspicionGrounds,
      reportPeriodStart: smrForm.reportPeriodStart || undefined,
      reportPeriodEnd:   smrForm.reportPeriodEnd   || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('SMR draft created successfully');
      setSmrOpen(false);
      setSmrForm({ reportingEntity: '', narrative: '', suspicionGrounds: '', reportPeriodStart: '', reportPeriodEnd: '' });
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to create SMR draft'),
  });

  const approveSmrMutation = useMutation({
    mutationFn: ({ smrId }: { smrId: string }) =>
      escalationApi.approveSmr(params.id!, smrId, smrReason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('SMR approved');
      setApproveOpen(null);
      setSmrReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to approve SMR'),
  });

  const submitSmrMutation = useMutation({
    mutationFn: ({ smrId }: { smrId: string }) =>
      escalationApi.submitSmr(params.id!, smrId, smrReason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('SMR submitted to AUSTRAC');
      setSubmitOpen(null);
      setSmrReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to submit SMR'),
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Escalation not found.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/escalations">Back</Link>
        </Button>
      </div>
    );
  }

  const isOpen = !['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'].includes(data.status);
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === data.status);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/escalations" className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Escalations</Link>
        </Button>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate max-w-xs">{data.subject}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{data.subject}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={data.status} />
            <RiskBadge rating={data.riskRating} />
            <span className="text-sm text-muted-foreground">Created {formatDate(data.createdAt)}</span>
          </div>
        </div>
        {isOpen && data.status === 'ESCALATED' && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 flex-shrink-0 gap-1.5"
            onClick={() => setSmrOpen(true)}
          >
            <FileText className="h-4 w-4" />
            Create SMR Draft
          </Button>
        )}
      </div>

      {/* Status stepper */}
      {isOpen && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx <= currentStepIdx;
                const isCurrent   = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex items-center flex-1 min-w-0">
                    <div className={`flex items-center gap-2 flex-shrink-0 ${isCurrent ? 'text-indigo-400' : isCompleted ? 'text-green-400' : 'text-muted-foreground/40'}`}>
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${isCurrent ? 'border-indigo-400 bg-indigo-400/10' : isCompleted ? 'border-green-400 bg-green-400/10' : 'border-border bg-transparent'}`}>
                        {isCompleted && !isCurrent ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${idx < currentStepIdx ? 'bg-green-400/50' : 'bg-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.summary}</p>
            </CardContent>
          </Card>

          {/* Grounds */}
          <Card>
            <CardHeader><CardTitle className="text-base">Grounds for Escalation</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.grounds}</p>
            </CardContent>
          </Card>

          {/* SMR Drafts */}
          {data.smrDrafts && data.smrDrafts.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-400" />
                  SMR Drafts ({data.smrDrafts.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setSmrOpen(true)} className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  New draft
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.smrDrafts.map((smr) => (
                    <div key={smr.id} className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="text-sm font-semibold">{smr.reportingEntity}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Created {formatDateTime(smr.createdAt)}
                            {smr.submittedAt && ` · Submitted to AUSTRAC ${formatDateTime(smr.submittedAt)}`}
                          </div>
                        </div>
                        <StatusBadge status={smr.status} />
                      </div>
                      {smr.narrative && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{smr.narrative}</p>
                      )}
                      {/* SMR workflow actions */}
                      <div className="flex items-center gap-2">
                        {smr.status === 'DRAFT' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => { setApproveOpen(smr.id); setSmrReason(''); }}>
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </Button>
                        )}
                        {smr.status === 'APPROVED' && (
                          <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1"
                            onClick={() => { setSubmitOpen(smr.id); setSmrReason(''); }}>
                            <Send className="h-3 w-3" />
                            Submit to AUSTRAC
                          </Button>
                        )}
                        {smr.status === 'SUBMITTED' && (
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[11px]">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted to AUSTRAC
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prompt to create SMR if escalated but no drafts */}
          {data.status === 'ESCALATED' && (!data.smrDrafts || data.smrDrafts.length === 0) && (
            <div className="flex items-center gap-4 rounded-2xl px-5 py-4 bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-amber-400">SMR reporting may be required. </span>
                <span className="text-sm text-muted-foreground">Create an SMR draft for review before submitting to AUSTRAC within 24 hours of forming a suspicion.</span>
              </div>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 flex-shrink-0"
                onClick={() => setSmrOpen(true)}>
                Create SMR Draft
              </Button>
            </div>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {isOpen && (
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-xs text-muted-foreground">(required, min 10 chars)</span></Label>
                  <Textarea
                    rows={3}
                    placeholder="Document your decision and reasoning…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                {(data.status === 'DRAFT' || data.status === 'UNDER_REVIEW') && (
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                    onClick={() => escalateMutation.mutate()}
                    disabled={reason.trim().length < 10 || escalateMutation.isPending}
                  >
                    {escalateMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Escalating…</>
                      : <><Shield className="h-4 w-4 mr-2" />Escalate to SMR Workflow</>}
                  </Button>
                )}
                {data.status === 'ESCALATED' && (
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                    onClick={() => setSmrOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Create SMR Draft
                  </Button>
                )}
                <Button variant="outline" className="w-full"
                  onClick={() => closeMutation.mutate()}
                  disabled={reason.trim().length < 10 || closeMutation.isPending}>
                  {closeMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Closing…</> : <><XCircle className="h-4 w-4 mr-2" />Close — No Action Required</>}
                </Button>
                <Button variant="outline" className="w-full text-muted-foreground"
                  onClick={() => closeFalseMutation.mutate()}
                  disabled={reason.trim().length < 10 || closeFalseMutation.isPending}>
                  {closeFalseMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Closing…</> : 'Close as False Positive'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Created</span>
                  <span>{formatDate(data.createdAt)}</span>
                </div>
                {data.reviewedAt && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Reviewed</span>
                    <span>{formatDate(data.reviewedAt)}</span>
                  </div>
                )}
                {data.closedAt && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" />Closed</span>
                    <span>{formatDate(data.closedAt)}</span>
                  </div>
                )}
                {data.smrDrafts?.some((s) => s.submittedAt) && (
                  <div className="flex items-center justify-between text-green-400">
                    <span className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5" />Submitted to AUSTRAC</span>
                    <span>{formatDate(data.smrDrafts.find((s) => s.submittedAt)!.submittedAt!)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Create SMR Draft Dialog ───────────────────────────────── */}
      <Dialog open={smrOpen} onOpenChange={setSmrOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Create SMR Draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Reporting entity <span className="text-destructive">*</span></Label>
              <Input placeholder="Your business/entity name as registered with AUSTRAC"
                value={smrForm.reportingEntity}
                onChange={(e) => setSmrForm((p) => ({ ...p, reportingEntity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Narrative / description <span className="text-destructive">*</span></Label>
              <Textarea rows={4} placeholder="Describe the suspicious activity in detail, including who, what, when, where and how…"
                value={smrForm.narrative}
                onChange={(e) => setSmrForm((p) => ({ ...p, narrative: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Grounds for suspicion <span className="text-destructive">*</span></Label>
              <Textarea rows={3} placeholder="What specific indicators gave rise to your suspicion?"
                value={smrForm.suspicionGrounds}
                onChange={(e) => setSmrForm((p) => ({ ...p, suspicionGrounds: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Report period start</Label>
                <Input type="date" value={smrForm.reportPeriodStart}
                  onChange={(e) => setSmrForm((p) => ({ ...p, reportPeriodStart: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Report period end</Label>
                <Input type="date" value={smrForm.reportPeriodEnd}
                  onChange={(e) => setSmrForm((p) => ({ ...p, reportPeriodEnd: e.target.value }))} />
              </div>
            </div>
            <div className="rounded-xl border bg-amber-500/5 border-amber-500/20 px-4 py-3 text-xs text-muted-foreground">
              <strong className="text-amber-400">AUSTRAC requirement: </strong>
              SMRs must be submitted within 24 hours of forming a suspicion relating to terrorism financing, or 3 business days for other suspicious matters (AML/CTF Act s.41).
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmrOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={createSmrMutation.isPending || !smrForm.reportingEntity || !smrForm.narrative || !smrForm.suspicionGrounds}
              onClick={() => createSmrMutation.mutate()}>
              {createSmrMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : 'Create SMR draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Approve SMR Dialog ────────────────────────────────────── */}
      <Dialog open={!!approveOpen} onOpenChange={(o) => !o && setApproveOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Approve SMR Draft
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Approving this SMR draft marks it as ready for submission to AUSTRAC. A compliance officer approval is required.</p>
            <div className="space-y-1.5">
              <Label>Approval reason / note <span className="text-destructive">*</span></Label>
              <Textarea rows={3} placeholder="I approve this SMR because…"
                value={smrReason} onChange={(e) => setSmrReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-500 text-white border-0"
              disabled={approveSmrMutation.isPending || smrReason.trim().length < 10}
              onClick={() => approveOpen && approveSmrMutation.mutate({ smrId: approveOpen })}>
              {approveSmrMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Approving…</> : 'Approve SMR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Submit to AUSTRAC Dialog ──────────────────────────────── */}
      <Dialog open={!!submitOpen} onOpenChange={(o) => !o && setSubmitOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-400" />
              Submit SMR to AUSTRAC
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-red-500/5 border-red-500/20 px-4 py-3 text-sm text-muted-foreground">
              <strong className="text-red-400">Important: </strong>
              This action submits the SMR to AUSTRAC and cannot be undone. Ensure all details are correct before proceeding.
            </div>
            <div className="space-y-1.5">
              <Label>Submission confirmation note <span className="text-destructive">*</span></Label>
              <Textarea rows={3} placeholder="I confirm this SMR is accurate and complete…"
                value={smrReason} onChange={(e) => setSmrReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={submitSmrMutation.isPending || smrReason.trim().length < 10}
              onClick={() => submitOpen && submitSmrMutation.mutate({ smrId: submitOpen })}>
              {submitSmrMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : <><Send className="h-4 w-4 mr-2" />Submit to AUSTRAC</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
