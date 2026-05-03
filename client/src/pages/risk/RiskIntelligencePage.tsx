import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { riskApi } from '@/lib/api';
import { Link } from 'wouter';
import {
  Brain, TrendingUp, AlertTriangle, Shield, Users,
  Activity, ArrowUpRight, Zap, Target, BarChart2,
  FileWarning, Eye,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';

interface RiskAnalytics {
  summary: {
    total: number;
    openEscalations: number;
    riskScore: number;
    recentHighRisk: number;
  };
  riskDistribution:  { rating: string; count: number }[];
  statusBreakdown:   { status: string; count: number }[];
  typeBreakdown:     { type: string; count: number }[];
  highRiskCustomers: {
    id: string; entityName: string | null; familyName: string | null;
    givenNames: string | null; riskRating: string; status: string;
    customerType: string; updatedAt: string;
  }[];
  alertsBySeverity:  { severity: string; count: number }[];
  alertsByType:      { alertType: string; count: number }[];
  checkPassFail:     { result: string; count: number }[];
}

interface SignalResponse {
  signals: {
    id: string; alertType: string; severity: string; title: string;
    description: string | null; status: string; createdAt: string;
    customerId: string | null;
  }[];
}

const RISK_META: Record<string, { color: string; bg: string; border: string; barColor: string }> = {
  LOW:      { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', barColor: 'bg-green-500' },
  MEDIUM:   { color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   barColor: 'bg-amber-500' },
  HIGH:     { color: 'text-orange-600',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  barColor: 'bg-orange-500' },
  CRITICAL: { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     barColor: 'bg-red-500' },
};

const SEV_META: Record<string, { color: string; bg: string; border: string }> = {
  LOW:      { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  MEDIUM:   { color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  HIGH:     { color: 'text-orange-600',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  CRITICAL: { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

function RiskScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-red-500' : score >= 40 ? 'text-amber-500' : 'text-green-400';
  const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Low Risk';
  const ring  = score >= 70 ? 'stroke-red-500' : score >= 40 ? 'stroke-amber-500' : 'stroke-green-500';

  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
          <circle
            cx="64" cy="64" r={r} fill="none" strokeWidth="10"
            className={`${ring} transition-all duration-1000`}
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${color}`}>{score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className={`text-sm font-semibold mt-1 ${color}`}>{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">Composite risk index</div>
    </div>
  );
}

function customerName(c: { entityName: string | null; familyName: string | null; givenNames: string | null }) {
  if (c.entityName) return c.entityName;
  return [c.givenNames, c.familyName].filter(Boolean).join(' ') || 'Unknown';
}

export default function RiskIntelligencePage() {
  const { data: analytics, isLoading: aLoading } = useQuery({
    queryKey: ['risk', 'analytics'],
    queryFn:  () => riskApi.analytics() as Promise<RiskAnalytics>,
    refetchInterval: 60_000,
  });

  const { data: signalData, isLoading: sLoading } = useQuery({
    queryKey: ['risk', 'signals'],
    queryFn:  () => riskApi.signals() as Promise<SignalResponse>,
    refetchInterval: 30_000,
  });

  const total = analytics?.summary.total ?? 0;
  const maxCount = Math.max(...(analytics?.riskDistribution.map((r) => r.count) ?? [1]), 1);
  const checkTotal = analytics?.checkPassFail.reduce((s, c) => s + c.count, 0) ?? 0;
  const passPct = checkTotal
    ? Math.round(((analytics?.checkPassFail.find((c) => c.result === 'PASS')?.count ?? 0) / checkTotal) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Intelligence"
        description="Real-time risk signals, composite scoring, and exposure analysis across your customer portfolio."
        actions={
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 glow-indigo">
            <Link href="/alerts">
              <Zap className="h-4 w-4 mr-2" />
              View Alerts
            </Link>
          </Button>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {aLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          [
            {
              label: 'Total Customers',
              value: analytics?.summary.total.toLocaleString() ?? '0',
              icon: Users,
              color: 'text-blue-500',
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
              sub: 'In portfolio',
            },
            {
              label: 'High / Critical',
              value: [
                analytics?.riskDistribution.find((r) => r.rating === 'HIGH')?.count ?? 0,
                analytics?.riskDistribution.find((r) => r.rating === 'CRITICAL')?.count ?? 0,
              ].reduce((a, b) => a + b, 0).toLocaleString(),
              icon: AlertTriangle,
              color: 'text-red-500',
              bg: 'bg-red-500/10',
              border: 'border-red-500/20',
              sub: 'Require attention',
            },
            {
              label: 'Open Escalations',
              value: analytics?.summary.openEscalations.toLocaleString() ?? '0',
              icon: FileWarning,
              color: 'text-amber-500',
              bg: 'bg-amber-500/10',
              border: 'border-amber-500/20',
              sub: 'Pending review',
            },
            {
              label: 'Check Pass Rate',
              value: `${passPct}%`,
              icon: Shield,
              color: 'text-green-400',
              bg: 'bg-green-500/10',
              border: 'border-green-500/20',
              sub: 'Last 90 days',
            },
          ].map(({ label, value, icon: Icon, color, bg, border, sub }) => (
            <Card key={label} className="card-3d">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold counter">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Risk score gauge */}
        <Card className="card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Portfolio Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading ? (
              <div className="flex justify-center py-8"><Skeleton className="h-36 w-36 rounded-full" /></div>
            ) : (
              <RiskScoreGauge score={analytics?.summary.riskScore ?? 0} />
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-muted/40 p-2">
                <div className="text-base font-bold text-amber-500">
                  {analytics?.summary.recentHighRisk ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Upgraded last 30d</div>
              </div>
              <div className="rounded-xl bg-muted/40 p-2">
                <div className="text-base font-bold text-red-500">
                  {signalData?.signals.length ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground">Active signals</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk distribution */}
        <Card className="card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading ? (
              <div className="space-y-3 mt-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((rating) => {
                  const row  = analytics?.riskDistribution.find((r) => r.rating === rating);
                  const cnt  = row?.count ?? 0;
                  const pct  = total ? Math.round((cnt / total) * 100) : 0;
                  const meta = RISK_META[rating]!;
                  return (
                    <div key={rating}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.bg} border ${meta.border} ${meta.color}`}>
                          {rating}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">{cnt} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${meta.barColor}`}
                          style={{ width: `${maxCount > 0 ? (cnt / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert severity breakdown */}
        <Card className="card-3d">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Open Alerts by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading ? (
              <div className="space-y-3 mt-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {analytics?.alertsBySeverity.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Shield className="h-8 w-8 text-green-400 mb-2" />
                    <div className="text-sm font-medium text-green-400">No open alerts</div>
                    <div className="text-xs text-muted-foreground">Portfolio looks clean</div>
                  </div>
                ) : (
                  (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                    const row  = analytics?.alertsBySeverity.find((a) => a.severity === sev);
                    if (!row || row.count === 0) return null;
                    const meta = SEV_META[sev]!;
                    const total_ = analytics?.alertsBySeverity.reduce((s, a) => s + a.count, 0) ?? 1;
                    const pct  = Math.round((row.count / total_) * 100);
                    return (
                      <div key={sev}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.bg} border ${meta.border} ${meta.color}`}>
                            {sev}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">{row.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              sev === 'CRITICAL' ? 'bg-red-500' :
                              sev === 'HIGH' ? 'bg-orange-500' :
                              sev === 'MEDIUM' ? 'bg-amber-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Live risk signals */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Live Risk Signals
                {signalData && signalData.signals.length > 0 && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
                    {signalData.signals.length}
                  </span>
                )}
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/alerts">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : signalData?.signals.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-5">
                <Shield className="h-10 w-10 text-green-400 mb-3 opacity-80" />
                <div className="text-sm font-semibold text-green-400">All clear</div>
                <div className="text-xs text-muted-foreground mt-1">No active risk signals detected</div>
              </div>
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {signalData?.signals.map((sig) => {
                  const meta = SEV_META[sig.severity] ?? SEV_META['MEDIUM']!;
                  return (
                    <div key={sig.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg} border ${meta.border}`}>
                        <AlertTriangle className={`h-3.5 w-3.5 ${meta.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{sig.title}</span>
                          <span className={`flex-shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.bg} border ${meta.border} ${meta.color}`}>
                            {sig.severity}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {sig.alertType.replace(/_/g, ' ')} · {formatRelative(sig.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* High-risk customer watchlist */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-4 w-4 text-red-500" />
                High Risk Watchlist
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link href="/customers">View all <ArrowUpRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {aLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : analytics?.highRiskCustomers.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center px-5">
                <Shield className="h-10 w-10 text-green-400 mb-3 opacity-80" />
                <div className="text-sm font-semibold text-green-400">No high risk customers</div>
                <div className="text-xs text-muted-foreground mt-1">Portfolio exposure looks healthy</div>
              </div>
            ) : (
              <div className="divide-y max-h-80 overflow-y-auto">
                {analytics?.highRiskCustomers.map((c) => {
                  const meta = RISK_META[c.riskRating] ?? RISK_META['HIGH']!;
                  return (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {customerName(c)[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{customerName(c)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {c.customerType.replace(/_/g, ' ')} · {formatRelative(c.updatedAt)}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${meta.bg} border ${meta.border} ${meta.color}`}>
                        {c.riskRating}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Alert type breakdown */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Alert Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
            ) : analytics?.alertsByType.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">No alert data</div>
            ) : (
              <div className="space-y-3">
                {analytics?.alertsByType.map((a) => {
                  const total_ = analytics.alertsByType.reduce((s, x) => s + x.count, 0);
                  const pct = total_ ? Math.round((a.count / total_) * 100) : 0;
                  return (
                    <div key={a.alertType}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate max-w-[65%]">
                          {a.alertType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-muted-foreground">{a.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check pass/fail + customer type */}
        <div className="space-y-5">
          <Card className="card-3d">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Check Engine Results (90d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aLoading ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : (
                <div className="flex gap-3">
                  {analytics?.checkPassFail.map((c) => {
                    const pct = checkTotal ? Math.round((c.count / checkTotal) * 100) : 0;
                    const isPass = c.result === 'PASS';
                    return (
                      <div key={c.result} className={`flex-1 rounded-xl p-3 text-center border ${isPass ? 'bg-green-500/10 border-green-500/20' : c.result === 'FAIL' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                        <div className={`text-xl font-black ${isPass ? 'text-green-400' : c.result === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}>
                          {c.count}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">{c.result} ({pct}%)</div>
                      </div>
                    );
                  })}
                  {(!analytics?.checkPassFail || analytics.checkPassFail.length === 0) && (
                    <div className="w-full text-center text-sm text-muted-foreground py-3">No checks run yet</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-3d">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Customer Type Mix
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
              ) : (
                <div className="space-y-2">
                  {analytics?.typeBreakdown.map((t) => {
                    const pct = total ? Math.round((t.count / total) * 100) : 0;
                    return (
                      <div key={t.type} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 truncate flex-shrink-0">
                          {t.type?.replace(/_/g, ' ') ?? 'Unknown'}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0">{t.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                  {(!analytics?.typeBreakdown || analytics.typeBreakdown.length === 0) && (
                    <div className="text-center text-sm text-muted-foreground py-4">No customers yet</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
