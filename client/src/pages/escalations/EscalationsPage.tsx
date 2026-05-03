import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, AlertTriangle, Loader2, ChevronRight, Shield, Clock, Filter } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { escalationApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatRelative } from '@/lib/utils';
import type { Escalation } from '@shared/schema';

const schema = z.object({
  subject:    z.string().min(5, 'Subject required (min 5 chars)'),
  summary:    z.string().min(20, 'Summary must be at least 20 characters'),
  grounds:    z.string().min(20, 'Grounds must be at least 20 characters'),
  riskRating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  reason:     z.string().min(10, 'Reason must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

const STATUS_CLOSED = ['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'];

const RISK_COLORS = {
  LOW:      { text: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  MEDIUM:   { text: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  HIGH:     { text: 'text-orange-600',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  CRITICAL: { text: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

export default function EscalationsPage() {
  const [open, setOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState('');
  const qc = useQueryClient();

  const { data: rawEscalations, isLoading } = useQuery({
    queryKey: ['escalations'],
    queryFn:  () => escalationApi.list() as Promise<Escalation[] | { escalations: Escalation[]; total: number }>,
  });

  const escalations: Escalation[] = Array.isArray(rawEscalations)
    ? rawEscalations
    : ((rawEscalations as { escalations: Escalation[] })?.escalations ?? []);

  const filtered = riskFilter
    ? escalations.filter((e) => e.riskRating === riskFilter)
    : escalations;

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { riskRating: 'HIGH' },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => escalationApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations'] });
      toast.success('Escalation created');
      reset();
      setOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create escalation');
    },
  });

  const openCount    = escalations.filter((e) => !STATUS_CLOSED.includes(e.status)).length;
  const criticalCount = escalations.filter((e) => e.riskRating === 'CRITICAL' && !STATUS_CLOSED.includes(e.status)).length;
  const closedCount  = escalations.filter((e) => STATUS_CLOSED.includes(e.status)).length;
  const smrCount     = escalations.filter((e) => e.status === 'SMR_SUBMITTED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalations"
        description="Manage suspicious matter reports and escalations to AUSTRAC."
        action={
          <Button
            onClick={() => setOpen(true)}
            className="gradient-emerald text-white border-0 hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Escalation
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open',     value: openCount,    color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: AlertTriangle },
          { label: 'Critical', value: criticalCount, color: 'text-red-600',   bg: 'bg-red-600/10',    border: 'border-red-600/20',    icon: AlertTriangle },
          { label: 'Closed',   value: closedCount,  color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Shield },
          { label: 'SMR Submitted', value: smrCount, color: 'text-blue-500',  bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: Shield },
        ].map(({ label, value, color, bg, border, icon: Icon }) => (
          <Card key={label} className="card-3d">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold counter">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex gap-1.5">
          {[
            { label: 'All', value: '' },
            { label: 'Critical', value: 'CRITICAL' },
            { label: 'High', value: 'HIGH' },
            { label: 'Medium', value: 'MEDIUM' },
            { label: 'Low', value: 'LOW' },
          ].map(({ label, value }) => (
            <Button
              key={value || 'all'}
              size="sm"
              variant={riskFilter === value ? 'default' : 'outline'}
              className={`h-7 text-xs ${riskFilter === value ? 'gradient-emerald text-white border-0' : ''}`}
              onClick={() => setRiskFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Escalations list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <p className="font-semibold text-base mb-1">No escalations</p>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm text-center">
              {riskFilter
                ? `No ${riskFilter} risk escalations found.`
                : 'Escalations are created when you identify suspicious activity requiring further investigation or AUSTRAC reporting.'}
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="gradient-emerald text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create escalation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((esc) => {
            const isClosed = STATUS_CLOSED.includes(esc.status);
            const rc = RISK_COLORS[esc.riskRating as keyof typeof RISK_COLORS] ?? RISK_COLORS.HIGH;
            return (
              <Card
                key={esc.id}
                className={`card-3d group hover:border-primary/20 transition-all ${isClosed ? 'opacity-70' : ''}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${rc.bg} border ${rc.border}`}>
                    <AlertTriangle className={`h-5 w-5 ${rc.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Link
                        href={`/escalations/${esc.id}`}
                        className="font-semibold text-sm hover:text-primary transition-colors"
                      >
                        {esc.subject}
                      </Link>
                      <StatusBadge status={esc.status} />
                      <RiskBadge rating={esc.riskRating} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelative(esc.createdAt)}
                      </span>
                      <span>Created {formatDate(esc.createdAt)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <Link href={`/escalations/${esc.id}`}>
                      View details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              New Escalation
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="Suspicious transaction pattern — multiple rapid transfers" {...register('subject')} />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Risk rating</Label>
              <Select defaultValue="HIGH" onValueChange={(v) => setValue('riskRating', v as FormData['riskRating'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">Critical — immediate action required</SelectItem>
                  <SelectItem value="HIGH">High — escalate within 24h</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Textarea rows={3} placeholder="Summarise the suspicious activity…" {...register('summary')} />
              {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Grounds for escalation</Label>
              <Textarea rows={3} placeholder="Explain specifically why this activity is suspicious…" {...register('grounds')} />
              {errors.grounds && <p className="text-xs text-destructive">{errors.grounds.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>
                Reason
                <span className="text-xs text-muted-foreground ml-1">(audit trail — min 10 chars)</span>
              </Label>
              <Input placeholder="e.g. Initial escalation based on transaction review on 2026-05-01" {...register('reason')} />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="gradient-emerald text-white border-0 hover:opacity-90"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
                  : 'Create escalation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
