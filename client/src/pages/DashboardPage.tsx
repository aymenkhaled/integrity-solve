import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  Users, AlertTriangle, CheckSquare, FileText,
  TrendingUp, Clock, ArrowRight, Shield,
} from 'lucide-react';
import { customerApi, escalationApi, taskApi, programApi } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Customer, Escalation, Task } from '@shared/schema';

function StatCard({
  icon: Icon, title, value, sub, color = 'primary', href,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  sub?: string;
  color?: string;
  href?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
          {href && (
            <Link href={href}>
              <a className="text-muted-foreground hover:text-foreground">
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          )}
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, workspace } = useAuth();

  const { data: customersData } = useQuery({
    queryKey: ['customers', { limit: 5 }],
    queryFn:  () => customerApi.list({ limit: '5', page: '1' }) as Promise<{ items: Customer[]; total: number }>,
  });

  const { data: escalations } = useQuery({
    queryKey: ['escalations'],
    queryFn:  () => escalationApi.list() as Promise<Escalation[]>,
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { status: 'OPEN' }],
    queryFn:  () => taskApi.list({ status: 'OPEN' }) as Promise<Task[]>,
  });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn:  () => programApi.list() as Promise<unknown[]>,
  });

  const openEscalations = escalations?.filter((e) => !['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'].includes(e.status)) ?? [];
  const openTasks = tasks?.slice(0, 5) ?? [];

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!`}
        description={workspace ? `${workspace.legalName} — ${workspace.subscriptionTier} plan` : 'Loading workspace...'}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          title="Total Customers"
          value={customersData?.total ?? '—'}
          sub="All statuses"
          href="/customers"
        />
        <StatCard
          icon={AlertTriangle}
          title="Open Escalations"
          value={openEscalations.length}
          sub="Requiring action"
          color="orange-500"
          href="/escalations"
        />
        <StatCard
          icon={CheckSquare}
          title="Open Tasks"
          value={tasks?.length ?? '—'}
          sub="Assigned to team"
          href="/tasks"
        />
        <StatCard
          icon={FileText}
          title="AML Programs"
          value={programs?.length ?? '—'}
          sub={workspace?.implementationStatus ?? ''}
          href="/programs"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Customers</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/customers">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!customersData ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : customersData.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No customers yet.{' '}
                <Link href="/customers/new" className="text-primary hover:underline">Add your first customer</Link>
              </div>
            ) : (
              <div className="divide-y">
                {customersData.items.map((customer) => (
                  <Link key={customer.id} href={`/customers/${customer.id}`} className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors">
                    <div>
                      <div className="font-medium text-sm">
                        {(customer.entityName ?? `${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim()) || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {customer.referenceNumber} · {formatDate(customer.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge rating={customer.riskRating} />
                      <StatusBadge status={customer.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Open Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!tasks ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : openTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No open tasks. Great work!
              </div>
            ) : (
              <div className="divide-y">
                {openTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
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
      </div>

      {/* Compliance status banner */}
      {workspace?.implementationStatus === 'NOT_STARTED' && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 p-6">
            <Shield className="h-8 w-8 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900">Your AML/CTF Program is not yet started</div>
              <div className="text-sm text-amber-700 mt-0.5">
                Australian reporting entities must have a compliant AML/CTF program in place. Start yours today.
              </div>
            </div>
            <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 flex-shrink-0" asChild>
              <Link href="/programs">Create program</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
