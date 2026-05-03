import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  Users, AlertTriangle, CheckSquare, FileText,
  Clock, ArrowRight, Shield, TrendingUp, Bell,
  ChevronRight, Zap, BarChart3,
} from 'lucide-react';
import { customerApi, escalationApi, taskApi, programApi, alertApi } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Customer, Escalation, Task } from '@shared/schema';

/* ── Colour palettes ─────────────────────────────────────────────────────── */
const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  violet: { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20'  },
  amber:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20'   },
  red:    { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'     },
  blue:   { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'    },
  green:  { bg: 'bg-green-500/10',   text: 'text-green-400',   border: 'border-green-500/20'   },
} as const;
type Color = keyof typeof COLOR_MAP;

/* ── Stat Card ───────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  color?: Color;
  href?: string;
}

function StatCard({ icon: Icon, title, value, sub, trend, trendUp, color = 'indigo', href }: StatCardProps) {
  const c = COLOR_MAP[color];
  const inner = (
    <div className="stat-card card-3d relative rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} border ${c.border}`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
        {href && <ArrowRight className="h-4 w-4 text-muted-foreground/30" />}
      </div>
      <div className="counter text-3xl font-bold mb-1 tracking-tight">{value}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className={`h-3 w-3 ${!trendUp ? 'rotate-180' : ''}`} />
          {trend}
        </div>
      )}
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

/* ── Mini chart ──────────────────────────────────────────────────────────── */
function MiniChart({ values, color = '#6366f1' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm opacity-70 bar-hover"
          style={{ height: `${(v / max) * 100}%`, minHeight: 2, background: color }} />
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, workspace } = useAuth();

  const { data: customersData } = useQuery({
    queryKey: ['customers', { limit: 5 }],
    queryFn: () => customerApi.list({ limit: '5', page: '1' }) as Promise<{ customers: Customer[]; total: number }>,
  });
  const { data: escalationsData } = useQuery({
    queryKey: ['escalations'],
    queryFn: () => escalationApi.list() as Promise<{ escalations: Escalation[]; total: number } | Escalation[]>,
  });
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { status: 'OPEN' }],
    queryFn: () => taskApi.list({ status: 'OPEN' }) as Promise<{ tasks: Task[]; total: number } | Task[]>,
  });
  const { data: programsData } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programApi.list() as Promise<unknown[]>,
  });
  const { data: alertsData } = useQuery({
    queryKey: ['alerts', { status: 'OPEN' }],
    queryFn: () => alertApi.list({ status: 'OPEN' }) as Promise<unknown[]>,
  });

  const customers     = Array.isArray(customersData) ? customersData : (customersData?.customers ?? []);
  const customerTotal = Array.isArray(customersData) ? customers.length : (customersData?.total ?? 0);
  const escalations   = Array.isArray(escalationsData) ? escalationsData : ((escalationsData as any)?.escalations ?? []);
  const tasks         = Array.isArray(tasksData) ? tasksData : ((tasksData as any)?.tasks ?? []);
  const alerts        = Array.isArray(alertsData) ? alertsData : [];

  const openEscalations = escalations.filter(
    (e: Escalation) => !['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'].includes(e.status),
  );

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {workspace ? `${workspace.legalName} · ${workspace.subscriptionTier} plan` : 'Loading workspace...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/alerts" className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {alerts.length}
                </span>
              )}
              Alerts
            </Link>
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" asChild>
            <Link href="/customers/new">+ New customer</Link>
          </Button>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}         title="Total Customers"    value={customerTotal}         sub="Across all risk levels" color="blue"   href="/customers" />
        <StatCard icon={AlertTriangle} title="Open Escalations"   value={openEscalations.length} sub="Requiring action"       color={openEscalations.length > 0 ? 'red' : 'green'} href="/escalations" />
        <StatCard icon={CheckSquare}   title="Open Tasks"         value={tasks.length}           sub="Assigned to team"       color="amber"  href="/tasks" />
        <StatCard icon={Zap}           title="Smart Alerts"       value={alerts.length}          sub="Unresolved"             color={alerts.length > 0 ? 'red' : 'green'}          href="/alerts" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="col-span-2 card-3d">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AML Programs</div>
                <div className="text-2xl font-bold counter mt-1">{programsData?.length ?? '—'}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                <FileText className="h-5 w-5 text-violet-400" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">Activity (7 days)</div>
            <MiniChart values={[2, 4, 3, 6, 5, 8, 7]} color="#8b5cf6" />
          </CardContent>
        </Card>

        <Card className="card-3d">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Compliance Score</div>
            <div className="text-3xl font-bold text-indigo-400 counter">94%</div>
            <div className="text-xs text-muted-foreground mt-1">Excellent standing</div>
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: '94%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-3d">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Trial / Plan</div>
            <div className="text-lg font-bold">{workspace?.subscriptionTier ?? '—'}</div>
            {workspace?.trialEndsAt && (
              <div className="text-xs text-amber-400 mt-1 font-medium">
                Trial ends {formatDate(workspace.trialEndsAt)}
              </div>
            )}
            <Button size="sm" variant="outline" className="mt-3 h-7 text-xs w-full" asChild>
              <Link href="/billing">Upgrade plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main content row */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Customers */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" />
              Recent Customers
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
              <Link href="/customers">View all <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {!customersData ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">No customers yet</p>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" asChild>
                  <Link href="/customers/new">Add first customer</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {customers.map((customer) => (
                  <Link key={customer.id} href={`/customers/${customer.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/60 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                        {((customer.entityName ?? (`${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim() || '?'))[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {customer.entityName || (`${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim()) || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">{customer.referenceNumber} · {formatDate(customer.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <RiskBadge rating={customer.riskRating} />
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Open Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-amber-400" />
                Open Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/tasks">All <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {!tasksData ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-2xl mb-1">🎉</div>
                  <p className="text-xs text-muted-foreground">No open tasks!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tasks.slice(0, 5).map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">{task.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {task.dueAt ? `Due ${formatDate(task.dueAt)}` : formatRelative(task.createdAt)}
                        </div>
                      </div>
                      <StatusBadge status={task.priority} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Escalations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Escalations
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/escalations">All <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {openEscalations.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-xl mb-1">✓</div>
                  <p className="text-xs text-muted-foreground">No open escalations</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {openEscalations.slice(0, 4).map((esc: Escalation) => (
                    <Link key={esc.id} href={`/escalations/${esc.id}`}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">{esc.summary}</div>
                        <div className="text-[11px] text-muted-foreground">{formatRelative(esc.createdAt)}</div>
                      </div>
                      <StatusBadge status={esc.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AML program setup banner */}
      {workspace?.implementationStatus === 'NOT_STARTED' && (
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-amber-300">AML/CTF Program not started</div>
            <div className="text-sm text-amber-400/70 mt-0.5">
              Australian reporting entities must have a compliant program in place under the AML/CTF Act 2006.
            </div>
          </div>
          <Button className="flex-shrink-0 bg-amber-600 hover:bg-amber-500 text-white border-0" asChild>
            <Link href="/programs">Create program <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
        </div>
      )}
    </div>
  );
}
