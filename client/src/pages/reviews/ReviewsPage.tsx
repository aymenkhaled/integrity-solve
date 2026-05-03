import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { reviewApi, customerApi } from '@/lib/api';
import {
  CalendarCheck, Plus, Loader2, Clock, AlertCircle,
  CheckCircle, RotateCcw, ChevronRight, Filter,
} from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/utils';
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

interface Customer {
  id: string;
  referenceNumber: string;
  givenNames: string | null;
  familyName: string | null;
  entityName: string | null;
  riskRating: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  SCHEDULED:   { label: 'Scheduled',   icon: Clock,         color: 'text-blue-600',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  IN_PROGRESS: { label: 'In Progress', icon: RotateCcw,     color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  COMPLETE:    { label: 'Complete',    icon: CheckCircle,   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  OVERDUE:     { label: 'Overdue',     icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  CANCELLED:   { label: 'Cancelled',   icon: Clock,         color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border' },
};

function customerName(c?: Customer, id?: string): string {
  if (!c) return id ? `${id.slice(0, 8)}…` : '—';
  return c.entityName || `${c.givenNames ?? ''} ${c.familyName ?? ''}`.trim() || c.referenceNumber;
}

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

  const { data: rawReviews, isLoading } = useQuery({
    queryKey: ['reviews', statusFilter],
    queryFn:  () => reviewApi.list({ status: statusFilter || undefined }) as Promise<Review[] | { reviews: Review[]; total: number }>,
  });

  const reviews: Review[] = Array.isArray(rawReviews)
    ? rawReviews
    : ((rawReviews as { reviews: Review[] })?.reviews ?? []);

  const { data: customersData } = useQuery({
    queryKey: ['customers', { limit: 200 }],
    queryFn:  () => customerApi.list({ limit: '200', page: '1' }) as Promise<{ customers?: Customer[]; items?: Customer[] }>,
  });

  const customers: Customer[] = customersData?.customers ?? (customersData as { items?: Customer[] })?.items ?? [];

  const schedule = useMutation({
    mutationFn: (data: typeof form) => reviewApi.schedule({
      ...data,
      reviewType: 'PERIODIC',
      scheduledAt: data.dueAt,
    }),
    onSuccess: () => {
      toast.success('Review scheduled');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setScheduleOpen(false);
      setForm({ customerId: '', dueAt: '', notes: '' });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to schedule review'),
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
      toast.success('Review completed — customer risk rating updated');
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setCompleteId(null);
      setCompleteForm({ newRating: 'MEDIUM', notes: '', reason: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const now = new Date();
  const overdueCount  = reviews.filter((r) => r.status === 'SCHEDULED' && new Date(r.dueAt) < now).length;
  const scheduledCount = reviews.filter((r) => r.status === 'SCHEDULED').length;
  const completedCount = reviews.filter((r) => r.status === 'COMPLETE').length;

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Complete', value: 'COMPLETE' },
    { label: 'Overdue', value: 'OVERDUE' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Periodic Reviews"
        description="Schedule and track customer due diligence reviews."
        action={
          <Button
            onClick={() => setScheduleOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Review
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: reviews.length,   icon: CalendarCheck, color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'Scheduled',   value: scheduledCount,   icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
          { label: 'Overdue',     value: overdueCount,     icon: AlertCircle,   color: 'text-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          { label: 'Completed',   value: completedCount,   icon: CheckCircle,   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
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

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-950/20 px-5 py-4">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-red-700 dark:text-red-400">
              {overdueCount} review{overdueCount !== 1 ? 's' : ''} overdue.
            </span>
            <span className="text-red-600/80 dark:text-red-500 ml-1.5">
              These customers require immediate CDD review to remain compliant.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-red-300 text-red-600 hover:bg-red-100 flex-shrink-0"
            onClick={() => setStatusFilter('OVERDUE')}
          >
            View overdue
          </Button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ label, value }) => (
            <Button
              key={value || 'all'}
              size="sm"
              variant={statusFilter === value ? 'default' : 'outline'}
              onClick={() => setStatusFilter(value)}
              className={`h-7 text-xs ${statusFilter === value ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-0' : ''}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <CalendarCheck className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-base mb-1">No reviews</p>
            <p className="text-sm text-muted-foreground mb-5">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} reviews found.`
                : 'Schedule periodic reviews for your active customers.'}
            </p>
            <Button
              onClick={() => setScheduleOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule First Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isOverdue = review.status === 'SCHEDULED' && new Date(review.dueAt) < now;
            const sc = isOverdue ? STATUS_CONFIG['OVERDUE']! : (STATUS_CONFIG[review.status] ?? STATUS_CONFIG['SCHEDULED']!);
            const StatusIcon = sc.icon;
            const cust = customers.find((c) => c.id === review.customerId);
            return (
              <Card
                key={review.id}
                className={`card-3d transition-colors ${isOverdue ? 'border-red-200 dark:border-red-800/30' : 'hover:border-primary/20'}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${sc.bg} border ${sc.border}`}>
                    <StatusIcon className={`h-5 w-5 ${sc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{customerName(cust, review.customerId)}</span>
                      <div className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${sc.bg} border ${sc.border} ${sc.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {isOverdue ? 'OVERDUE' : sc.label}
                      </div>
                      {review.previousRating && <RiskBadge rating={review.previousRating} />}
                      {review.newRating && review.completedAt && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ChevronRight className="h-3 w-3" />
                          <RiskBadge rating={review.newRating} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {formatDate(review.dueAt)}
                      </span>
                      <span className="capitalize">{review.reviewType.toLowerCase()} review</span>
                      {review.completedAt && (
                        <span>Completed {formatDate(review.completedAt)}</span>
                      )}
                      <span>{formatRelative(review.createdAt)}</span>
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
                        {start.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Start'}
                      </Button>
                    )}
                    {review.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                        onClick={() => setCompleteId(review.id)}
                      >
                        Complete
                      </Button>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Schedule Periodic Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm((p) => ({ ...p, customerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer…" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {customerName(c)} — {c.riskRating}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              onClick={() => schedule.mutate(form)}
              disabled={!form.customerId || !form.dueAt || schedule.isPending}
            >
              {schedule.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Scheduling…</>
                : 'Schedule review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={!!completeId} onOpenChange={(o) => !o && setCompleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Complete Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New risk rating</Label>
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
              <Label>
                Findings / notes
                <span className="text-muted-foreground text-xs ml-1">(min 10 chars)</span>
              </Label>
              <Textarea
                placeholder="Summary of findings from this review…"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Reason for rating change
                <span className="text-muted-foreground text-xs ml-1">(min 10 chars, audit trail)</span>
              </Label>
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
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              onClick={() => complete.mutate({ id: completeId!, data: completeForm })}
              disabled={
                completeForm.notes.length < 10 ||
                completeForm.reason.length < 10 ||
                complete.isPending
              }
            >
              {complete.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Completing…</>
                : 'Complete review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
