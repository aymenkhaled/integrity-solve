import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { analyticsApi } from '@/lib/api';
import { Link } from 'wouter';
import {
  BarChart2, FileWarning, GraduationCap, CalendarCheck,
  TrendingUp, CheckCircle, Clock, AlertTriangle, ArrowUpRight,
  Award, BookOpen, RefreshCw,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SmrAnalytics {
  totals: {
    escalations: number;
    smrDrafts: number;
    smrSubmitted: number;
    submissionRate: number;
  };
  byStatus:  { status: string; count: number }[];
  byRisk:    { riskRating: string; count: number }[];
  smrByStatus: { status: string; count: number }[];
  recentEscalations: {
    id: string; subject: string; status: string;
    riskRating: string; createdAt: string;
  }[];
  monthlyTrend: { month: string; count: number }[];
}

interface TrainingAnalytics {
  totals: {
    total: number; completed: number; passed: number;
    expiringSoon: number; completionRate: number; avgScore: number | null;
  };
  byStatus: { status: string; count: number }[];
  byModule: { moduleName: string; count: number; avgScore: number | null }[];
}

interface ReviewAnalytics {
  reviews: {
    total: number; overdue: number;
    byStatus: { status: string; count: number }[];
  };
  tasks: { byStatus: { status: string; count: number }[] };
}

const STATUS_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  DRAFT:                { color: 'text-muted-foreground', bg: 'bg-muted/50',          border: 'border-border' },
  UNDER_REVIEW:         { color: 'text-blue-600',         bg: 'bg-blue-500/10',       border: 'border-blue-500/20' },
  ESCALATED_TO_SMR:     { color: 'text-amber-600',        bg: 'bg-amber-500/10',      border: 'border-amber-500/20' },
  SMR_SUBMITTED:        { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
  CLOSED_NO_ACTION:     { color: 'text-muted-foreground', bg: 'bg-muted/50',          border: 'border-border' },
  CLOSED_FALSE_POSITIVE:{ color: 'text-muted-foreground', bg: 'bg-muted/50',          border: 'border-border' },
  SUBMITTED:            { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
  APPROVED:             { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
  REJECTED:             { color: 'text-red-600',          bg: 'bg-red-500/10',        border: 'border-red-500/20' },
  NOT_STARTED:          { color: 'text-muted-foreground', bg: 'bg-muted/50',          border: 'border-border' },
  IN_PROGRESS:          { color: 'text-blue-600',         bg: 'bg-blue-500/10',       border: 'border-blue-500/20' },
  COMPLETED:            { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
  PASSED:               { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
  FAILED:               { color: 'text-red-600',          bg: 'bg-red-500/10',        border: 'border-red-500/20' },
  EXPIRED:              { color: 'text-red-600',          bg: 'bg-red-500/10',        border: 'border-red-500/20' },
  SCHEDULED:            { color: 'text-blue-600',         bg: 'bg-blue-500/10',       border: 'border-blue-500/20' },
  COMPLETE:             { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
  CANCELLED:            { color: 'text-muted-foreground', bg: 'bg-muted/50',          border: 'border-border' },
  TODO:                 { color: 'text-muted-foreground', bg: 'bg-muted/50',          border: 'border-border' },
  IN_REVIEW:            { color: 'text-amber-600',        bg: 'bg-amber-500/10',      border: 'border-amber-500/20' },
  DONE:                 { color: 'text-green-400',      bg: 'bg-green-500/10',    border: 'border-green-500/20' },
};

const RISK_COLORS: Record<string, { color: string; bg: string; border: string; bar: string }> = {
  LOW:      { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', bar: 'bg-green-500' },
  MEDIUM:   { color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   bar: 'bg-amber-500' },
  HIGH:     { color: 'text-orange-600',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  bar: 'bg-orange-500' },
  CRITICAL: { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     bar: 'bg-red-500' },
};

function StatusBadgeMini({ status }: { status: string }) {
  const meta = STATUS_COLORS[status] ?? STATUS_COLORS['DRAFT']!;
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${meta.bg} border ${meta.border} ${meta.color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, bg, border }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bg: string; border: string;
}) {
  return (
    <Card className="card-3d">
      <CardContent className="p-5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border} mb-3`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="text-2xl font-bold counter">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: smr, isLoading: smrLoading } = useQuery({
    queryKey: ['analytics', 'smr'],
    queryFn:  () => analyticsApi.smr() as Promise<SmrAnalytics>,
    refetchInterval: 60_000,
  });

  const { data: training, isLoading: trainingLoading } = useQuery({
    queryKey: ['analytics', 'training'],
    queryFn:  () => analyticsApi.training() as Promise<TrainingAnalytics>,
    refetchInterval: 60_000,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['analytics', 'reviews'],
    queryFn:  () => analyticsApi.reviews() as Promise<ReviewAnalytics>,
    refetchInterval: 60_000,
  });

  const maxTrend = Math.max(...(smr?.monthlyTrend.map((t) => t.count) ?? [1]), 1);
  const maxModule = Math.max(...(training?.byModule.map((m) => m.count) ?? [1]), 1);
  const taskTotal = reviews?.tasks.byStatus.reduce((s, t) => s + t.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Analytics"
        description="SMR submission rates, training compliance, and periodic review performance."
      />

      <Tabs defaultValue="smr">
        <TabsList className="mb-4">
          <TabsTrigger value="smr" className="flex items-center gap-1.5">
            <FileWarning className="h-3.5 w-3.5" /> SMR Analytics
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Training
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> Reviews & Tasks
          </TabsTrigger>
        </TabsList>

        {/* SMR Tab */}
        <TabsContent value="smr" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {smrLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
            ) : (
              <>
                <StatCard label="Total Escalations" value={smr?.totals.escalations ?? 0} icon={FileWarning} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" sub="All time" />
                <StatCard label="SMR Drafts" value={smr?.totals.smrDrafts ?? 0} icon={BarChart2} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" sub="Created" />
                <StatCard label="SMRs Submitted" value={smr?.totals.smrSubmitted ?? 0} icon={CheckCircle} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" sub="To AUSTRAC" />
                <StatCard label="Submission Rate" value={`${smr?.totals.submissionRate ?? 0}%`} icon={TrendingUp} color="text-purple-500" bg="bg-purple-500/10" border="border-purple-500/20" sub="SMR conversion" />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Escalation status */}
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Escalation Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smrLoading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {smr?.byStatus.map((r) => {
                      const total = smr.totals.escalations || 1;
                      const pct = Math.round((r.count / total) * 100);
                      const meta = STATUS_COLORS[r.status] ?? STATUS_COLORS['DRAFT']!;
                      return (
                        <div key={r.status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.bg} border ${meta.border} ${meta.color}`}>
                              {r.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {smr?.byStatus.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-6">No escalations yet</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk breakdown */}
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Escalations by Risk Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smrLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((rating) => {
                      const row = smr?.byRisk.find((r) => r.riskRating === rating);
                      const cnt = row?.count ?? 0;
                      const total = smr?.totals.escalations || 1;
                      const pct = Math.round((cnt / total) * 100);
                      const meta = RISK_COLORS[rating]!;
                      return (
                        <div key={rating}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.bg} border ${meta.border} ${meta.color}`}>{rating}</span>
                            <span className="text-xs text-muted-foreground">{cnt} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${meta.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {(!smr?.byRisk || smr.byRisk.length === 0) && (
                      <div className="text-center text-sm text-muted-foreground py-6">No escalation data</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Monthly trend */}
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Escalation Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smrLoading ? (
                  <Skeleton className="h-36 rounded-xl" />
                ) : smr?.monthlyTrend.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-10">No trend data yet</div>
                ) : (
                  <div className="flex items-end gap-2 h-36">
                    {smr?.monthlyTrend.map((t) => {
                      const pct = maxTrend > 0 ? (t.count / maxTrend) * 100 : 0;
                      return (
                        <div key={t.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-primary">{t.count}</span>
                          <div className="w-full rounded-t-md bg-indigo-600 transition-all duration-700" style={{ height: `${Math.max(pct, 4)}%` }} />
                          <span className="text-[9px] text-muted-foreground truncate w-full text-center">{t.month}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent escalations */}
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Recent Escalations
                  </CardTitle>
                  <Link href="/escalations" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {smrLoading ? (
                  <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                ) : smr?.recentEscalations.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-10">No escalations yet</div>
                ) : (
                  <div className="divide-y">
                    {smr?.recentEscalations.map((e) => {
                      const risk = RISK_COLORS[e.riskRating] ?? RISK_COLORS['HIGH']!;
                      return (
                        <Link key={e.id} href={`/escalations/${e.id}`}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${risk.bar}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">{e.subject}</div>
                            <div className="text-[11px] text-muted-foreground">{formatDate(e.createdAt)}</div>
                          </div>
                          <StatusBadgeMini status={e.status} />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {trainingLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
            ) : (
              <>
                <StatCard label="Total Enrolments" value={training?.totals.total ?? 0} icon={BookOpen} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
                <StatCard label="Completion Rate" value={`${training?.totals.completionRate ?? 0}%`} icon={TrendingUp} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" sub="Completed + Passed" />
                <StatCard label="Avg Score" value={training?.totals.avgScore != null ? `${training.totals.avgScore}%` : '—'} icon={Award} color="text-purple-500" bg="bg-purple-500/10" border="border-purple-500/20" />
                <StatCard label="Expiring Soon" value={training?.totals.expiringSoon ?? 0} icon={Clock} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" sub="Within 30 days" />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* By status */}
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Training Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trainingLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {training?.byStatus.map((r) => {
                      const total = training.totals.total || 1;
                      const pct = Math.round((r.count / total) * 100);
                      const meta = STATUS_COLORS[r.status] ?? STATUS_COLORS['DRAFT']!;
                      return (
                        <div key={r.status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.bg} border ${meta.border} ${meta.color}`}>
                              {r.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {training?.byStatus.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-6">No training records yet</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By module */}
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Top Training Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trainingLoading ? (
                  <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : training?.byModule.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">No module data yet</div>
                ) : (
                  <div className="space-y-3">
                    {training?.byModule.map((m) => {
                      const pct = maxModule > 0 ? Math.round((m.count / maxModule) * 100) : 0;
                      return (
                        <div key={m.moduleName}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate max-w-[60%]">{m.moduleName}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {m.avgScore != null && (
                                <span className="text-green-400 font-semibold">{m.avgScore}%</span>
                              )}
                              <span>{m.count} enrolments</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews & Tasks Tab */}
        <TabsContent value="reviews" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {reviewsLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
            ) : (
              <>
                <StatCard label="Total Reviews" value={reviews?.reviews.total ?? 0} icon={CalendarCheck} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
                <StatCard label="Overdue" value={reviews?.reviews.overdue ?? 0} icon={Clock} color="text-red-500" bg="bg-red-500/10" border="border-red-500/20" sub="Past due date" />
                <StatCard label="Total Tasks" value={taskTotal} icon={CheckCircle} color="text-green-400" bg="bg-green-500/10" border="border-green-500/20" />
                <StatCard
                  label="Tasks Done"
                  value={reviews?.tasks.byStatus.find((t) => t.status === 'DONE')?.count ?? 0}
                  icon={TrendingUp}
                  color="text-purple-500"
                  bg="bg-purple-500/10"
                  border="border-purple-500/20"
                />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Reviews by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {reviews?.reviews.byStatus.map((r) => {
                      const total = reviews.reviews.total || 1;
                      const pct = Math.round((r.count / total) * 100);
                      const meta = STATUS_COLORS[r.status] ?? STATUS_COLORS['DRAFT']!;
                      return (
                        <div key={r.status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.bg} border ${meta.border} ${meta.color}`}>
                              {r.status}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {reviews?.reviews.byStatus.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-6">No reviews yet</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Tasks by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
                ) : (
                  <div className="space-y-3">
                    {reviews?.tasks.byStatus.map((r) => {
                      const pct = taskTotal ? Math.round((r.count / taskTotal) * 100) : 0;
                      const meta = STATUS_COLORS[r.status] ?? STATUS_COLORS['TODO']!;
                      return (
                        <div key={r.status}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.bg} border ${meta.border} ${meta.color}`}>
                              {r.status}
                            </span>
                            <span className="text-xs text-muted-foreground">{r.count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {reviews?.tasks.byStatus.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-6">No tasks yet</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
