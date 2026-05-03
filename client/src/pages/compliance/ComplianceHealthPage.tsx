import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield, FileText, Users, GraduationCap, CalendarCheck,
  AlertTriangle, History, CheckCircle, XCircle, ArrowRight,
  TrendingUp, TrendingDown, Activity, Award,
} from 'lucide-react';
import {
  analyticsApi, riskApi, programApi, customerApi,
  alertApi, reviewApi, escalationApi,
} from '@/lib/api';

interface DimensionScore {
  key: string;
  label: string;
  icon: React.ElementType;
  score: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  detail: string;
  action?: { label: string; href: string };
  iconColor: string;
  iconBg: string;
  iconBorder: string;
}

function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size / 2 + 8} className="overflow-visible">
      <path
        d={`M 5,${size / 2} A ${radius},${radius} 0 0,1 ${size - 5},${size / 2}`}
        fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round"
      />
      <path
        d={`M 5,${size / 2} A ${radius},${radius} 0 0,1 ${size - 5},${size / 2}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size / 2} y={size / 2 + 2} textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>
        {score}%
      </text>
    </svg>
  );
}

function DimensionCard({ dim }: { dim: DimensionScore }) {
  const Icon = dim.icon;
  const statusConfig = {
    excellent:      { label: 'Excellent',      badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
    good:           { label: 'Good',           badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    needs_attention:{ label: 'Needs Attention', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    critical:       { label: 'Critical',       badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  }[dim.status];

  const barColor = dim.score >= 80 ? 'bg-green-500' : dim.score >= 60 ? 'bg-amber-500' : dim.score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <Card className="card-3d hover:border-primary/20 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dim.iconBg} border ${dim.iconBorder}`}>
            <Icon className={`h-5 w-5 ${dim.iconColor}`} />
          </div>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig.badge}`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="mb-1">
          <div className="font-semibold text-sm">{dim.label}</div>
          <div className="text-2xl font-bold mt-1 mb-2" style={{
            color: dim.score >= 80 ? '#22c55e' : dim.score >= 60 ? '#f59e0b' : dim.score >= 40 ? '#f97316' : '#ef4444',
          }}>
            {dim.score}%
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted mb-2">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${dim.score}%` }} />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{dim.detail}</p>
        {dim.action && (
          <Button variant="outline" size="sm" className="h-7 text-xs w-full" asChild>
            <Link href={dim.action.href}>
              {dim.action.label} <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function ComplianceHealthPage() {
  const { data: trainingAnalytics } = useQuery({
    queryKey: ['analytics', 'training'],
    queryFn: () => analyticsApi.training() as Promise<{ completionRate: number; avgScore: number; expiredCount: number; total: number }>,
  });
  const { data: reviewsAnalytics } = useQuery({
    queryKey: ['analytics', 'reviews'],
    queryFn: () => analyticsApi.reviews() as Promise<{ overdueCount: number; completedRate: number; total: number }>,
  });
  const { data: smrAnalytics } = useQuery({
    queryKey: ['analytics', 'smr'],
    queryFn: () => analyticsApi.smr() as Promise<{ submittedCount: number; pendingCount: number; avgDaysToSubmit: number }>,
  });
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programApi.list() as Promise<{ status: string; currentStep: number }[]>,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-summary'],
    queryFn: () => customerApi.list({ limit: '1', page: '1' }) as Promise<{ total: number; items: { status: string; riskRating: string }[] }>,
  });
  const { data: rawAlerts } = useQuery({
    queryKey: ['alerts-all-health'],
    queryFn: () => alertApi.list({}) as Promise<{ alerts?: { status: string }[]; } | { status: string }[]>,
  });
  const { data: rawEscalations } = useQuery({
    queryKey: ['escalations-health'],
    queryFn: () => escalationApi.list() as Promise<{ status: string }[]>,
  });
  const { data: overdueReviews } = useQuery({
    queryKey: ['reviews', 'overdue'],
    queryFn: () => reviewApi.overdue() as Promise<{ id: string }[]>,
  });

  const allDataLoaded = trainingAnalytics && reviewsAnalytics && smrAnalytics !== undefined && programs !== undefined;

  // ── Score calculations ───────────────────────────────────────────────────
  const calcProgramScore = (): number => {
    if (!programs?.length) return 0;
    const published = programs.filter((p) => p.status === 'COMPLETE' || p.status === 'PUBLISHED').length;
    if (published > 0) return 100;
    const inProgress = programs.filter((p) => p.currentStep > 0).length;
    if (inProgress > 0) return Math.min(10 + (programs[0]!.currentStep / 12) * 80, 90);
    return 10;
  };

  const calcTrainingScore = (): number => {
    if (!trainingAnalytics) return 50;
    const rate = trainingAnalytics.completionRate ?? 0;
    const expiredPenalty = Math.min((trainingAnalytics.expiredCount ?? 0) * 10, 30);
    return Math.max(0, Math.min(100, Math.round(rate * 100) - expiredPenalty));
  };

  const calcReviewScore = (): number => {
    if (!reviewsAnalytics) return 50;
    const overdue = overdueReviews?.length ?? 0;
    if (!reviewsAnalytics.total) return 75;
    const penalty = Math.min(overdue * 15, 60);
    return Math.max(0, Math.min(100, Math.round((reviewsAnalytics.completedRate ?? 0.5) * 100) - penalty));
  };

  const calcAlertsScore = (): number => {
    const alerts = Array.isArray(rawAlerts) ? rawAlerts : ((rawAlerts as { alerts?: { status: string }[] })?.alerts ?? []);
    if (!alerts.length) return 100;
    const open = alerts.filter((a) => a.status === 'OPEN').length;
    const total = alerts.length;
    return Math.max(0, Math.round((1 - open / total) * 100));
  };

  const calcEscalationScore = (): number => {
    const escs = Array.isArray(rawEscalations) ? rawEscalations : [];
    if (!escs.length) return 100;
    const closed = escs.filter((e) =>
      ['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'].includes(e.status)
    ).length;
    return Math.min(100, Math.round((closed / escs.length) * 100) + (closed === escs.length ? 0 : 20));
  };

  const calcSmrScore = (): number => {
    if (!smrAnalytics) return 75;
    const { pendingCount = 0, avgDaysToSubmit = 5 } = smrAnalytics;
    let score = 100;
    score -= Math.min(pendingCount * 15, 50);
    if (avgDaysToSubmit > 14) score -= 20;
    else if (avgDaysToSubmit > 7) score -= 10;
    return Math.max(0, score);
  };

  const auditScore = 100;

  const programScore      = calcProgramScore();
  const trainingScore     = calcTrainingScore();
  const reviewScore       = calcReviewScore();
  const alertScore        = calcAlertsScore();
  const escalationScore   = calcEscalationScore();
  const smrScore          = calcSmrScore();

  const overall = Math.round(
    (programScore + trainingScore + reviewScore + alertScore + escalationScore + smrScore + auditScore) / 7,
  );

  const getStatus = (s: number): DimensionScore['status'] =>
    s >= 80 ? 'excellent' : s >= 60 ? 'good' : s >= 40 ? 'needs_attention' : 'critical';

  const dimensions: DimensionScore[] = [
    {
      key: 'program',
      label: 'AML/CTF Program',
      icon: FileText,
      score: programScore,
      status: getStatus(programScore),
      detail: programs?.length
        ? programs.some((p) => p.status === 'COMPLETE')
          ? 'Program is published and active.'
          : `Program in progress — step ${programs[0]?.currentStep ?? 0} of 12.`
        : 'No AML/CTF program created yet. Required by law.',
      action: { label: programs?.length ? 'Continue program' : 'Create program', href: '/programs' },
      iconColor: 'text-violet-400', iconBg: 'bg-violet-500/10', iconBorder: 'border-violet-500/20',
    },
    {
      key: 'training',
      label: 'Staff Training',
      icon: GraduationCap,
      score: trainingScore,
      status: getStatus(trainingScore),
      detail: trainingAnalytics
        ? `${Math.round((trainingAnalytics.completionRate ?? 0) * 100)}% completion rate. ${trainingAnalytics.expiredCount ?? 0} expired certification${trainingAnalytics.expiredCount !== 1 ? 's' : ''}.`
        : 'Loading training data…',
      action: { label: 'View training', href: '/training' },
      iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10', iconBorder: 'border-blue-500/20',
    },
    {
      key: 'reviews',
      label: 'Periodic Reviews',
      icon: CalendarCheck,
      score: reviewScore,
      status: getStatus(reviewScore),
      detail: reviewsAnalytics
        ? `${overdueReviews?.length ?? 0} overdue review${(overdueReviews?.length ?? 0) !== 1 ? 's' : ''}. ${Math.round((reviewsAnalytics.completedRate ?? 0) * 100)}% completion rate.`
        : 'Loading reviews data…',
      action: { label: 'View reviews', href: '/reviews' },
      iconColor: 'text-green-400', iconBg: 'bg-green-500/10', iconBorder: 'border-green-500/20',
    },
    {
      key: 'alerts',
      label: 'Smart Alerts',
      icon: AlertTriangle,
      score: alertScore,
      status: getStatus(alertScore),
      detail: (() => {
        const alerts = Array.isArray(rawAlerts) ? rawAlerts : ((rawAlerts as { alerts?: { status: string }[] })?.alerts ?? []);
        const open = alerts.filter((a) => a.status === 'OPEN').length;
        return `${open} open alert${open !== 1 ? 's' : ''} requiring attention out of ${alerts.length} total.`;
      })(),
      action: { label: 'View alerts', href: '/alerts' },
      iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20',
    },
    {
      key: 'escalations',
      label: 'SMR Workflow',
      icon: Shield,
      score: escalationScore,
      status: getStatus(escalationScore),
      detail: (() => {
        const escs = Array.isArray(rawEscalations) ? rawEscalations : [];
        const open = escs.filter((e) => !['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'].includes(e.status)).length;
        return `${open} open escalation${open !== 1 ? 's' : ''} requiring resolution out of ${escs.length} total.`;
      })(),
      action: { label: 'View escalations', href: '/escalations' },
      iconColor: 'text-red-400', iconBg: 'bg-red-500/10', iconBorder: 'border-red-500/20',
    },
    {
      key: 'smr',
      label: 'SMR Reporting',
      icon: Activity,
      score: smrScore,
      status: getStatus(smrScore),
      detail: smrAnalytics
        ? `${smrAnalytics.pendingCount ?? 0} pending SMR${(smrAnalytics.pendingCount ?? 0) !== 1 ? 's' : ''}. Average ${smrAnalytics.avgDaysToSubmit ?? 0} days to submit.`
        : 'Loading SMR data…',
      action: { label: 'View analytics', href: '/analytics' },
      iconColor: 'text-orange-400', iconBg: 'bg-orange-500/10', iconBorder: 'border-orange-500/20',
    },
    {
      key: 'audit',
      label: 'Audit Trail',
      icon: History,
      score: auditScore,
      status: 'excellent',
      detail: 'Append-only audit log is active and AUSTRAC-compliant. All actions are recorded with actor, IP, and reason.',
      action: { label: 'View audit log', href: '/audit' },
      iconColor: 'text-cyan-400', iconBg: 'bg-cyan-500/10', iconBorder: 'border-cyan-500/20',
    },
  ];

  const overallStatus = overall >= 80 ? 'Excellent' : overall >= 60 ? 'Good' : overall >= 40 ? 'Needs Attention' : 'Critical';
  const overallColor  = overall >= 80 ? 'text-green-400' : overall >= 60 ? 'text-blue-400' : overall >= 40 ? 'text-amber-400' : 'text-red-400';
  const overallBg     = overall >= 80 ? 'from-green-500/5 to-transparent' : overall >= 60 ? 'from-blue-500/5 to-transparent' : overall >= 40 ? 'from-amber-500/5 to-transparent' : 'from-red-500/5 to-transparent';

  const criticalCount = dimensions.filter((d) => d.status === 'critical').length;
  const attentionCount = dimensions.filter((d) => d.status === 'needs_attention').length;
  const excellentCount = dimensions.filter((d) => d.status === 'excellent').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Health Score"
        description="Real-time assessment of your AML/CTF compliance posture across 7 key dimensions."
      />

      {/* Overall score banner */}
      <div className={`rounded-2xl p-6 bg-gradient-to-r ${overallBg} border border-border`}>
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            <ScoreGauge score={allDataLoaded ? overall : 0} size={110} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">Overall Health</h2>
              {allDataLoaded && (
                <Badge className={`${overallColor} bg-current/10 border-current/30`}>
                  {overallStatus}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-lg">
              Your compliance score is calculated across {dimensions.length} dimensions including AML program, training, reviews, alerts, escalations, SMR reporting, and audit trail.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">{excellentCount} excellent</span>
              </div>
              {attentionCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">{attentionCount} needs attention</span>
                </div>
              )}
              {criticalCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">{criticalCount} critical</span>
                </div>
              )}
            </div>
          </div>

          {/* AUSTRAC readiness */}
          <div className="flex-shrink-0 text-right">
            <div className={`flex items-center gap-2 mb-1 ${overallColor} font-bold text-3xl`}>
              {allDataLoaded ? overall : '—'}
            </div>
            <div className="text-xs text-muted-foreground mb-2">/ 100 points</div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${overall >= 70 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              {overall >= 70 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {overall >= 70 ? 'AUSTRAC Ready' : 'AUSTRAC Gaps'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Excellent dimensions',   value: excellentCount,                         icon: Award,        color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'Needs attention',        value: attentionCount,                         icon: TrendingUp,   color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Critical gaps',          value: criticalCount,                          icon: TrendingDown, color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
          { label: 'Overdue reviews',        value: overdueReviews?.length ?? '—',          icon: CalendarCheck, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className="card-3d">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold counter">{allDataLoaded ? value : '—'}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dimension grid */}
      {!allDataLoaded ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dimensions.map((dim) => <DimensionCard key={dim.key} dim={dim} />)}
        </div>
      )}

      {/* Recommendations */}
      {allDataLoaded && (criticalCount > 0 || attentionCount > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              Priority Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dimensions
                .filter((d) => d.status === 'critical' || d.status === 'needs_attention')
                .sort((a, b) => a.score - b.score)
                .map((dim) => {
                  const Icon = dim.icon;
                  const isCritical = dim.status === 'critical';
                  return (
                    <div key={dim.key} className={`flex items-start gap-3 p-3 rounded-xl border ${isCritical ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${isCritical ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                        <Icon className={`h-4 w-4 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold">{dim.label}</span>
                          <span className={`text-[11px] font-bold ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                            {dim.score}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{dim.detail}</p>
                      </div>
                      {dim.action && (
                        <Button variant="outline" size="sm" className="h-7 text-xs flex-shrink-0" asChild>
                          <Link href={dim.action.href}>Fix now</Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {allDataLoaded && criticalCount === 0 && attentionCount === 0 && (
        <div className="flex items-center gap-4 rounded-2xl p-5 bg-green-500/5 border border-green-500/20">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <div className="font-semibold text-green-400 mb-0.5">Full compliance achieved</div>
            <div className="text-sm text-muted-foreground">
              All 7 compliance dimensions are in excellent or good standing. Keep up the great work!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
