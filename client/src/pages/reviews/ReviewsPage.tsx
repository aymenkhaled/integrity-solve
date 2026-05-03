import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { reviewApi, customerApi } from '@/lib/api';
import { CalendarCheck, Plus, Loader2, Clock, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { RiskBadge } from '@/components/shared/RiskBadge';

interface Review {
  id: string;
  customerId: string;
  status: string;
  dueAt: string;
  completedAt: string | null;
  previousRating: string | null;
  newRating: string | null;
  reviewType: string;
  notes: string | null;
  createdAt: string;
}

interface Customer { id: string; referenceNumber: string; givenNames: string | null; familyName: string | null; entityName: string | null; riskRating: string; }

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  SCHEDULED:   { label: 'Scheduled',   variant: 'outline' },
  IN_PROGRESS: { label: 'In Progress', variant: 'warning' },
  COMPLETE:    { label: 'Complete',    variant: 'success' },
  OVERDUE:     { label: 'Overdue',     variant: 'destructive' },
  CANCELLED:   { label: 'Cancelled',   variant: 'outline' },
};

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ customerId: '', dueAt: '', notes: '' });
  const [completeForm, setCompleteForm] = useState({
    newRating: 'MEDIUM' as string,
    notes: '',
    reason: '',
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', statusFilter],
    queryFn:  () => reviewApi.list({ status: statusFilter || undefined }) as Promise<Review[]>,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', { limit: 100 }],
    queryFn:  () => customerApi.list({ limit: '100', page: '1' }) as Promise<{ items: Customer[] }>,
  });

  const schedule = useMutation({
    mutationFn: (data: typeof form) => reviewApi.schedule(data),
    onSuccess: () => {
      toast.success('Review scheduled');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setScheduleOpen(false);
      setForm({ customerId: '', dueAt: '', notes: '' });
    },
    onError: () => toast.error('Failed to schedule review'),
  });

  const start = useMutation({
    mutationFn: (id: string) => reviewApi.start(id),
    onSuccess: () => {
      toast.success('Review started');
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: () => toast.error('Failed to start review'),
  });

  const complete = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof completeForm }) => reviewApi.complete(id, data),
    onSuccess: () => {
      toast.success('Review completed and customer risk rating updated');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setCompleteId(null);
      setCompleteForm({ newRating: 'MEDIUM', notes: '', reason: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const overdueCount = reviews?.filter(
    (r) => r.status === 'SCHEDULED' && new Date(r.dueAt) < new Date(),
  ).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Periodic Reviews"
        description="Schedule and track customer due diligence reviews."
        action={
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Review
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Reviews',   value: reviews?.length ?? 0,                                         color: '' },
          { label: 'Scheduled',       value: reviews?.filter((r) => r.status === 'SCHEDULED').length ?? 0, color: '' },
          { label: 'Overdue',         value: overdueCount,                                                  color: 'text-red-600' },
          { label: 'Completed',       value: reviews?.filter((r) => r.status === 'COMPLETE').length ?? 0,  color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-4">
        {[
          { label: 'All',         value: '' },
          { label: 'Scheduled',   value: 'SCHEDULED' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          { label: 'Complete',    value: 'COMPLETE' },
          { label: 'Overdue',     value: 'OVERDUE' },
        ].map(({ label, value }) => (
          <Button
            key={value || 'all'}
            size="sm"
            variant={statusFilter === value ? 'default' : 'outline'}
            onClick={() => setStatusFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <span className="font-semibold">{overdueCount} review{overdueCount !== 1 ? 's' : ''} overdue.</span>
              {' '}These customers require immediate CDD review.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !reviews?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No reviews scheduled</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Schedule periodic reviews for your active customers.
            </p>
            <Button onClick={() => setScheduleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const sc = STATUS_CONFIG[review.status] ?? { label: review.status, variant: 'outline' };
            const isOverdue = review.status === 'SCHEDULED' && new Date(review.dueAt) < new Date();
            const customer = customersData?.items.find((c) => c.id === review.customerId);
            const customerName = customer
              ? (customer.entityName ?? `${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim()) || review.customerId
              : review.customerId.slice(0, 12) + '…';

            return (
              <Card key={review.id} className={isOverdue ? 'border-red-200' : ''}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${isOverdue ? 'bg-red-50' : 'bg-muted'}`}>
                    <CalendarCheck className={`h-5 w-5 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{customerName}</span>
                      <Badge variant={isOverdue ? 'destructive' : sc.variant} className="text-xs">
                        {isOverdue ? 'OVERDUE' : sc.label}
                      </Badge>
                      {review.previousRating && (
                        <RiskBadge rating={review.previousRating} />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {formatDate(review.dueAt)}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {review.reviewType.toLowerCase()} review
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(review.status === 'SCHEDULED' || isOverdue) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => start.mutate(review.id)}
                        disabled={start.isPending}
                      >
                        Start
                      </Button>
                    )}
                    {review.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCompleteId(review.id)}
                      >
                        Complete
                      </Button>
                    )}
                    {review.completedAt && review.newRating && (
                      <RiskBadge rating={review.newRating} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Periodic Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Customer</label>
              <Select value={form.customerId} onValueChange={(v) => setForm((p) => ({ ...p, customerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {customersData?.items.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.entityName ?? `${c.givenNames ?? ''} ${c.familyName ?? ''}`.trim()} ({c.riskRating})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Any context for this review…"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              onClick={() => schedule.mutate(form)}
              disabled={!form.customerId || !form.dueAt || schedule.isPending}
            >
              {schedule.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={!!completeId} onOpenChange={(o) => !o && setCompleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Risk Rating</label>
              <Select value={completeForm.newRating} onValueChange={(v) => setCompleteForm((p) => ({ ...p, newRating: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNRATED'].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Findings / Notes <span className="text-muted-foreground">(min 10 chars)</span>
              </label>
              <Textarea
                placeholder="Summary of findings from this review…"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Reason for Rating Change <span className="text-muted-foreground">(min 10 chars)</span>
              </label>
              <Textarea
                placeholder="Justification for the new risk rating…"
                value={completeForm.reason}
                onChange={(e) => setCompleteForm((p) => ({ ...p, reason: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteId(null)}>Cancel</Button>
            <Button
              onClick={() => complete.mutate({ id: completeId!, data: completeForm })}
              disabled={
                completeForm.notes.length < 10 ||
                completeForm.reason.length < 10 ||
                complete.isPending
              }
            >
              {complete.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Complete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
