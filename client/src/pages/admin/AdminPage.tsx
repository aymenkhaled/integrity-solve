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
import { Building2, Users, Activity, Search, Shield } from 'lucide-react';
import { formatDate } from '@/lib/utils';
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
        <Shield className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Platform admin access is required to view this page.
        </p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const TIER_COLORS: Record<string, string> = {
    TRIAL: 'bg-gray-100 text-gray-700',
    STARTER: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
    GROUP: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      <PageHeader
        title="Platform Admin"
        description="System-wide oversight for platform administrators."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            {[
              { label: 'Workspaces', value: stats?.totals.workspaces ?? 0, icon: Building2 },
              { label: 'Users',      value: stats?.totals.users ?? 0,      icon: Users },
              { label: 'Customers',  value: stats?.totals.customers ?? 0,  icon: Activity },
              { label: 'Tasks',      value: stats?.totals.tasks ?? 0,      icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <Tabs defaultValue="workspaces">
        <TabsList className="mb-6">
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tiers">Tier Breakdown</TabsTrigger>
        </TabsList>

        {/* Workspaces tab */}
        <TabsContent value="workspaces">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <CardTitle className="text-base flex-1">
                All Workspaces {wsData ? `(${wsData.total})` : ''}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search by name…"
                  value={wsSearch}
                  onChange={(e) => setWsSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {wsLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Workspace</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Industry</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Billing</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {wsData?.items.map((ws) => (
                        <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{ws.legalName}</td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">
                            {ws.industryPathway?.toLowerCase().replace('_', ' ') ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[ws.subscriptionTier] ?? ''}`}>
                              {ws.subscriptionTier}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{ws.billingStatus}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(ws.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-3">
              <CardTitle className="text-base flex-1">
                All Users {userData ? `(${userData.total})` : ''}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Identity</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {userData?.items.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{u.fullName ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant={u.identityStatus === 'VERIFIED' ? 'success' : 'outline'} className="text-xs">
                              {u.identityStatus}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                          </td>
                          <td className="px-4 py-3">
                            {u.isPlatformAdmin && (
                              <Badge variant="warning" className="text-xs">Admin</Badge>
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

        {/* Tier breakdown tab */}
        <TabsContent value="tiers">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">By Subscription Tier</CardTitle></CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-48" /> : (
                  <div className="space-y-3">
                    {stats?.tierBreakdown.map((tb) => {
                      const pct = stats.totals.workspaces
                        ? Math.round((Number(tb.count) / stats.totals.workspaces) * 100)
                        : 0;
                      return (
                        <div key={tb.tier}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{tb.tier}</span>
                            <span className="text-muted-foreground">{tb.count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">By Billing Status</CardTitle></CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-48" /> : (
                  <div className="space-y-3">
                    {stats?.billingBreakdown.map((bb) => {
                      const pct = stats.totals.workspaces
                        ? Math.round((Number(bb.count) / stats.totals.workspaces) * 100)
                        : 0;
                      return (
                        <div key={bb.status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{bb.status}</span>
                            <span className="text-muted-foreground">{bb.count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
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
      </Tabs>
    </div>
  );
}
