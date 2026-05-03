import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  CalendarCheck, Clock, AlertCircle, GraduationCap,
  CheckSquare, CreditCard, ChevronRight, ArrowRight,
} from 'lucide-react';
import { taskApi, reviewApi, trainingApi, billingApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  date: Date;
  title: string;
  type: 'review' | 'task' | 'training' | 'billing' | 'overdue';
  severity: 'critical' | 'warning' | 'info';
  href: string;
  subtext?: string;
}

const TYPE_CONFIG = {
  overdue:  { icon: AlertCircle, color: 'text-red-400',    bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'Overdue' },
  review:   { icon: CalendarCheck, color: 'text-blue-400', bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Periodic Review' },
  task:     { icon: CheckSquare, color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Task Deadline' },
  training: { icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Training Expiry' },
  billing:  { icon: CreditCard, color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20',   label: 'Billing' },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function CalendarGrid({ year, month, events }: {
  year: number;
  month: number;
  events: CalendarEvent[];
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const d = ev.date;
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day]!.push(ev);
      }
    });
    return map;
  }, [events, year, month]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {cells.map((day, idx) => {
          const isToday = day !== null && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const dayEvents = day ? (eventsByDay[day] ?? []) : [];
          const hasOverdue = dayEvents.some((e) => e.type === 'overdue' || e.severity === 'critical');
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          return (
            <div key={idx} className={`min-h-[80px] p-1.5 text-xs ${day === null ? 'bg-muted/20' : 'bg-card'} ${isWeekend && day !== null ? 'bg-muted/30' : ''}`}>
              {day !== null && (
                <>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full mb-1 text-xs font-medium ${isToday ? 'bg-indigo-500 text-white' : 'text-foreground'} ${hasOverdue && !isToday ? 'text-red-400 font-bold' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cfg = TYPE_CONFIG[ev.type];
                      return (
                        <div key={ev.id} className={`px-1 py-0.5 rounded text-[9px] font-medium truncate ${cfg.bg} ${cfg.color} leading-tight`}>
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComplianceCalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const { data: rawTasks } = useQuery({
    queryKey: ['tasks-calendar'],
    queryFn: () => taskApi.list({ limit: '100' }) as Promise<{ tasks?: { id: string; title: string; dueAt: string | null; status: string }[]; } | { id: string; title: string; dueAt: string | null; status: string }[]>,
  });
  const { data: rawReviews } = useQuery({
    queryKey: ['reviews-calendar'],
    queryFn: () => reviewApi.list({ limit: '100', status: 'SCHEDULED' }) as Promise<{ reviews?: { id: string; customerId: string; dueAt: string; status: string }[]; } | { id: string; customerId: string; dueAt: string; status: string }[]>,
  });
  const { data: overdueReviewsData } = useQuery({
    queryKey: ['reviews', 'overdue'],
    queryFn: () => reviewApi.overdue() as Promise<{ reviews: { id: string; customerId: string; dueAt: string }[]; total: number }>,
  });
  const { data: rawTraining } = useQuery({
    queryKey: ['training-calendar'],
    queryFn: () => trainingApi.list() as Promise<{ records?: { id: string; moduleName: string; expiresAt: string | null; status: string }[]; } | { id: string; moduleName: string; expiresAt: string | null; status: string }[]>,
  });
  const { data: billingData } = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn: () => billingApi.overview() as Promise<{ workspace: { currentPeriodEnd: string | null; trialEndsAt: string | null } }>,
  });

  const events = useMemo((): CalendarEvent[] => {
    const result: CalendarEvent[] = [];

    const tasks = Array.isArray(rawTasks) ? rawTasks : ((rawTasks as { tasks?: unknown[] })?.tasks ?? []) as { id: string; title: string; dueAt: string | null; status: string }[];
    tasks.forEach((t) => {
      if (t.dueAt && t.status !== 'COMPLETE') {
        const d = new Date(t.dueAt);
        const isOverdue = d < now;
        result.push({
          id: `task-${t.id}`,
          date: d,
          title: t.title,
          type: isOverdue ? 'overdue' : 'task',
          severity: isOverdue ? 'critical' : 'warning',
          href: '/tasks',
          subtext: isOverdue ? 'OVERDUE' : undefined,
        });
      }
    });

    const reviews = Array.isArray(rawReviews) ? rawReviews : ((rawReviews as { reviews?: unknown[] })?.reviews ?? []) as { id: string; customerId: string; dueAt: string; status: string }[];
    reviews.forEach((r) => {
      if (r.dueAt) {
        result.push({
          id: `review-${r.id}`,
          date: new Date(r.dueAt),
          title: `Periodic review due`,
          type: 'review',
          severity: 'info',
          href: '/reviews',
        });
      }
    });

    (overdueReviewsData?.reviews ?? []).forEach((r) => {
      result.push({
        id: `overdue-review-${r.id}`,
        date: new Date(r.dueAt),
        title: 'Overdue review',
        type: 'overdue',
        severity: 'critical',
        href: '/reviews',
      });
    });

    const training = Array.isArray(rawTraining) ? rawTraining : ((rawTraining as { records?: unknown[] })?.records ?? []) as { id: string; moduleName: string; expiresAt: string | null; status: string }[];
    training.forEach((t) => {
      if (t.expiresAt && t.status !== 'EXPIRED') {
        const d = new Date(t.expiresAt);
        const daysUntil = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        if (daysUntil <= 60) {
          result.push({
            id: `training-${t.id}`,
            date: d,
            title: `${t.moduleName} expires`,
            type: daysUntil <= 0 ? 'overdue' : 'training',
            severity: daysUntil <= 0 ? 'critical' : daysUntil <= 14 ? 'warning' : 'info',
            href: '/training',
          });
        }
      }
    });

    if (billingData?.workspace?.currentPeriodEnd) {
      result.push({
        id: 'billing-renewal',
        date: new Date(billingData.workspace.currentPeriodEnd),
        title: 'Subscription renewal',
        type: 'billing',
        severity: 'info',
        href: '/billing',
      });
    }
    if (billingData?.workspace?.trialEndsAt) {
      result.push({
        id: 'billing-trial',
        date: new Date(billingData.workspace.trialEndsAt),
        title: 'Trial ends',
        type: 'billing',
        severity: 'warning',
        href: '/billing',
      });
    }

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [rawTasks, rawReviews, overdueReviewsData, rawTraining, billingData]);

  const upcomingEvents = events.filter((e) => {
    const d = e.date;
    const in30 = new Date(now.getTime() + 30 * 86400000);
    return d >= new Date(now.getTime() - 7 * 86400000) && d <= in30;
  });

  const overdueEvents = events.filter((e) => e.type === 'overdue');
  const criticalEvents = events.filter((e) => e.severity === 'critical').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Calendar"
        description="All upcoming compliance obligations, deadlines, and renewals in one place."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'This month',     value: events.filter((e) => e.date.getMonth() === month && e.date.getFullYear() === year).length, icon: CalendarCheck, color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'Overdue',        value: overdueEvents.length,   icon: AlertCircle,  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
          { label: 'Next 30 days',   value: upcomingEvents.length,  icon: Clock,        color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
          { label: 'Critical items', value: criticalEvents,         icon: AlertCircle,  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
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
      {overdueEvents.length > 0 && (
        <div className="flex items-center gap-4 rounded-2xl px-5 py-4 bg-red-500/5 border border-red-500/20">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-red-400">{overdueEvents.length} overdue item{overdueEvents.length !== 1 ? 's' : ''} </span>
            <span className="text-sm text-muted-foreground">— immediate action required to maintain compliance.</span>
          </div>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" asChild>
            <Link href="/reviews">Review now <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-4 w-4 text-primary" />
                {MONTH_NAMES[month]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarGrid year={year} month={month} events={events} />

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((k) => {
                  const cfg = TYPE_CONFIG[k];
                  const Icon = cfg.icon;
                  return (
                    <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className={`h-2.5 w-2.5 rounded-sm ${cfg.bg}`} />
                      {cfg.label}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming events list */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-400" />
                Upcoming (next 30 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-4 text-center">
                  <CalendarCheck className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming items in the next 30 days.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {upcomingEvents.slice(0, 10).map((ev) => {
                    const cfg = TYPE_CONFIG[ev.type];
                    const Icon = cfg.icon;
                    const isOverdue = ev.type === 'overdue';
                    const daysUntil = Math.ceil((ev.date.getTime() - now.getTime()) / 86400000);
                    return (
                      <Link key={ev.id} href={ev.href}
                        className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors block">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold truncate ${isOverdue ? 'text-red-400' : 'text-foreground'}`}>
                            {ev.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(ev.date.toISOString())}
                            {isOverdue
                              ? ' — OVERDUE'
                              : daysUntil === 0
                              ? ' — Today!'
                              : daysUntil === 1
                              ? ' — Tomorrow'
                              : ` — in ${daysUntil} days`}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {[
                  { label: 'Schedule a review',   icon: CalendarCheck, href: '/reviews',  color: 'text-blue-400' },
                  { label: 'Create a task',        icon: CheckSquare,   href: '/tasks',    color: 'text-amber-400' },
                  { label: 'Enroll in training',  icon: GraduationCap, href: '/training', color: 'text-purple-400' },
                  { label: 'View billing',         icon: CreditCard,    href: '/billing',  color: 'text-green-400' },
                ].map(({ label, icon: Icon, href, color }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <Icon className={`h-4 w-4 ${color} flex-shrink-0`} />
                    <span className="text-sm flex-1">{label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
