import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { escalationApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { Escalation } from '@shared/schema';

const schema = z.object({
  subject:    z.string().min(5, 'Subject required'),
  summary:    z.string().min(20, 'Summary must be at least 20 characters'),
  grounds:    z.string().min(20, 'Grounds must be at least 20 characters'),
  riskRating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  reason:     z.string().min(10, 'Reason must be at least 10 characters'),
});

type FormData = z.infer<typeof schema>;

export default function EscalationsPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: escalations, isLoading } = useQuery({
    queryKey: ['escalations'],
    queryFn:  () => escalationApi.list() as Promise<Escalation[]>,
  });

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

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Manage suspicious matter reports and escalations to AUSTRAC."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />New escalation
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded animate-pulse" />)}
        </div>
      ) : !escalations?.length ? (
        <EmptyState
          icon={AlertTriangle}
          title="No escalations"
          description="Escalations are created when you identify suspicious activity requiring further investigation."
          action={<Button onClick={() => setOpen(true)}>Create escalation</Button>}
        />
      ) : (
        <div className="space-y-3">
          {escalations.map((esc) => (
            <Card key={esc.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <Link href={`/escalations/${esc.id}`}>
                      <a className="font-semibold text-sm hover:text-primary transition-colors">
                        {esc.subject}
                      </a>
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Created {formatDate(esc.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge rating={esc.riskRating} />
                  <StatusBadge status={esc.status} />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/escalations/${esc.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Escalation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input placeholder="Suspicious transaction pattern..." {...register('subject')} />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Risk rating</Label>
              <Select defaultValue="HIGH" onValueChange={(v) => setValue('riskRating', v as FormData['riskRating'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Textarea rows={3} placeholder="Summarise the suspicious activity..." {...register('summary')} />
              {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Grounds for escalation</Label>
              <Textarea rows={3} placeholder="Explain why this activity is suspicious..." {...register('grounds')} />
              {errors.grounds && <p className="text-xs text-destructive">{errors.grounds.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-xs text-muted-foreground">(audit trail, min 10 chars)</span></Label>
              <Input placeholder="Initial escalation based on transaction review" {...register('reason')} />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : 'Create escalation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
