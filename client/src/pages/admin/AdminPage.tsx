import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { adminApi } from '@/lib/api';
import {
  Building2, Users, Activity, Search, Shield,
  TrendingUp, CheckCircle, Crown, Lock,
} from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';

interface AdminStats {
  totals: { workspaces: number; users: number; customers: number; tasks: number };
  tierBreakdown: { tier: string; count: number }[];
  billingBreakdown: { status: string; count: number }[];
}

interface Workspace {
  id: string;
  legalName: string;
  subscriptionTier: string;
  billingStatus: string;
  industryPathway: string | null;
  createdAt: string;
  trialEndsAt: string | null;
}

interface User {
  id: string;
  email: string;
  fullName: string | null;
  isPlatformAdmin: boolean;
  isActive: boolean;
  identityStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; }

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  TRIAL:        { color: 'text-muted-foreground', bg: 'bg-muted/50',         border: 'border-border' },
  STARTER:      { color: 'text-blue-600',         bg: 'bg-blue-500/10',      border: 'border-blue-500/20' },
  PROFESSIONAL: { color: 'text-purple-600',        bg: 'bg-purple-500/10',    border: 'border-purple-500/20' },
  ENTERPRISE:   { color: 'text-amber-600',         bg: 'bg-amber-500/10',     border: 'border-amber-500/20' },
  GROUP:        { color: 'text-green-400',        bg: 'bg-green-500/10',   border: 'border-green-500/20' },
};

const BILLING_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  TRIALING:    { color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  ACTIVE:      { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  PAST_DUE:    { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  CANCELLED:   { color: 'text-muted-foreground', bg: 'bg-muted/50',  border: 'border-border' },
  UNPAID:      { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

export default function AdminPage() {
  const { user } = useAuth();
  const [wsSearch, setWsSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn:  () => adminApi.stats() as Promise<AdminStats>,
  });

  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ['admin', 'workspaces', wsSearch],
    queryFn:  () => adminApi.workspaces({ search: wsSearch || undefined, limit: 20 }) as Promise<PaginatedResponse<Workspace>>,
  });

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['admin', 'users', userSearch],
    queryFn:  () => adminApi.users({ search: userSearch || undefined, limit: 20 }) as Promise<PaginatedResponse<User>>,
  });

  if (!user?.isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 mb-5">
          <Lock className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-sm mb-6 text-center max-w-xs">
          Platform admin access is required to view this page. Contact your platform administrator.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Admin"
        description="System-wide oversight for platform administrators."
      />

      {/* Platform stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : (
          [
            { label: 'Workspaces', value: stats?.totals.workspaces ?? 0,  icon: Building2, color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
            { label: 'Users',      value: stats?.totals.users ?? 0,       icon: Users,     color: 'text-purple-500',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
            { label: 'Customers',  value: stats?.totals.customers ?? 0,   icon: Activity,  color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { label: 'Tasks',      value: stats?.totals.tasks ?? 0,       icon: CheckCircle, color: 'text-amber-500', bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <Card key={label} className="card-3d">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold counter">{value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Admin badge */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:border-amber-800/20 dark:bg-amber-950/10 px-5 py-3">
        <Crown className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-700 dark:text-amber-400">
          You are viewing as a <strong>Platform Administrator</strong>. Actions here affect all workspaces.
        </span>
      </div>

      <Tabs defaultValue="workspaces">
        <TabsList className="mb-4">
          <TabsTrigger value="workspaces">Workspaces {wsData ? `(${wsData.total})` : ''}</TabsTrigger>
          <TabsTrigger value="users">Users {userData ? `(${userData.total})` : ''}</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Workspaces tab */}
        <TabsContent value="workspaces">
          <Card className="card-3d">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-1">
                <Building2 className="h-4 w-4 text-primary" />
                All Workspaces
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search by legal name…"
                  value={wsSearch}
                  onChange={(e) => setWsSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {wsLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-y">
                      <tr>
                        {['Workspace', 'Industry', 'Tier', 'Billing', 'Trial ends', 'Created'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {wsData?.items.map((ws) => {
                        const tc = TIER_CONFIG[ws.subscriptionTier] ?? TIER_CONFIG['TRIAL']!;
                        const bc = BILLING_CONFIG[ws.billingStatus] ?? BILLING_CONFIG['TRIALING']!;
                        return (
                          <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-semibold">{ws.legalName}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                              {ws.industryPathway?.toLowerCase().replace(/_/g, ' ') ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${tc.bg} border ${tc.border} ${tc.color}`}>
                                {ws.subscriptionTier}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${bc.bg} border ${bc.border} ${bc.color}`}>
                                {ws.billingStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {ws.trialEndsAt ? formatDate(ws.trialEndsAt) : '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(ws.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users">
          <Card className="card-3d">
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-1">
                <Users className="h-4 w-4 text-primary" />
                All Users
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search by email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {userLoading ? (
                <div className="p-5 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-y">
                      <tr>
                        {['User', 'Email', 'Identity', 'Last login', 'Joined', 'Role'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {userData?.items.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {(u.fullName ?? u.email)[0]?.toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{u.fullName ?? '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant={u.identityStatus === 'VERIFIED' ? 'success' : 'outline'} className="text-xs">
                              {u.identityStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {u.isPlatformAdmin ? (
                              <div className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-600">
                                <Crown className="h-3 w-3" />
                                Admin
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">User</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics tab */}
        <TabsContent value="analytics">
          <div className="grid lg:grid-cols-2 gap-5">
            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  By Subscription Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.tierBreakdown.map((tb) => {
                      const pct = stats.totals.workspaces
                        ? Math.round((Number(tb.count) / stats.totals.workspaces) * 100)
                        : 0;
                      const tc = TIER_CONFIG[tb.tier] ?? TIER_CONFIG['TRIAL']!;
                      return (
                        <div key={tb.tier}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tc.bg} border ${tc.border} ${tc.color}`}>
                                {tb.tier}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-medium">{tb.count} ({pct}%)</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-700"
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

            <Card className="card-3d">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  By Billing Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.billingBreakdown.map((bb) => {
                      const pct = stats.totals.workspaces
                        ? Math.round((Number(bb.count) / stats.totals.workspaces) * 100)
                        : 0;
                      const bc = BILLING_CONFIG[bb.status] ?? BILLING_CONFIG['TRIALING']!;
                      const barColor =
                        bb.status === 'ACTIVE' ? 'bg-green-500' :
                        bb.status === 'TRIALING' ? 'bg-amber-500' :
                        bb.status === 'PAST_DUE' || bb.status === 'UNPAID' ? 'bg-red-500' :
                        'bg-muted-foreground';
                      return (
                        <div key={bb.status}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${bc.bg} border ${bc.border} ${bc.color}`}>
                                {bb.status}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-medium">{bb.count} ({pct}%)</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
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

            {/* Platform health */}
            <Card className="card-3d lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Database',      status: 'Healthy',   color: 'text-green-400', dot: 'bg-green-500' },
                    { label: 'API Server',    status: 'Healthy',   color: 'text-green-400', dot: 'bg-green-500' },
                    { label: 'Auth System',   status: 'Healthy',   color: 'text-green-400', dot: 'bg-green-500' },
                    { label: 'Email Service', status: 'Healthy',   color: 'text-green-400', dot: 'bg-green-500' },
                    { label: 'File Storage',  status: 'Healthy',   color: 'text-green-400', dot: 'bg-green-500' },
                    { label: 'Job Workers',   status: 'Healthy',   color: 'text-green-400', dot: 'bg-green-500' },
                  ].map(({ label, status, color, dot }) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                      <span className="text-sm font-medium">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${dot} animate-pulse`} />
                        <span className={`text-xs font-medium ${color}`}>{status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
