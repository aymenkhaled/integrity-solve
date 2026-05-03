import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { groupsApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Building2, Users, Link2, Unlink, Plus, Shield,
  CheckCircle, AlertTriangle, BarChart2, FileText,
  ChevronRight, Network, Globe,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';

const TIER_COLORS: Record<string, string> = {
  TRIAL:      'bg-muted/80 text-muted-foreground border-border',
  STARTER:    'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PROFESSIONAL:'bg-purple-500/10 text-purple-600 border-purple-500/20',
  ENTERPRISE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'text-muted-foreground',
  IN_PROGRESS: 'text-blue-600',
  COMPLETED:   'text-emerald-600',
};

interface ChildWorkspace {
  id: string; legalName: string; tradingName: string | null; abn: string | null;
  subscriptionTier: string; implementationStatus: string; industryPathway: string | null;
  createdAt: string;
  stats: { members: number; customers: number; checks: number; escalations: number };
}

interface GroupData {
  current: {
    id: string; legalName: string; groupWorkspaceId: string | null;
    subscriptionTier: string; isGroupParent: boolean;
  };
  parent: { id: string; legalName: string; subscriptionTier: string } | null;
  children: ChildWorkspace[];
  aggregate: {
    totalChildren: number; totalMembers: number; totalCustomers: number;
    totalChecks: number; totalEscalations: number;
  };
}

function StatPill({ icon: Icon, value, label, color }: { icon: React.ElementType; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-xs font-semibold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default function GroupWorkspacesPage() {
  const qc = useQueryClient();
  const [showLink, setShowLink] = useState(false);
  const [childId, setChildId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupsApi.list() as Promise<GroupData>,
    refetchInterval: 30_000,
  });

  const linkMutation = useMutation({
    mutationFn: (id: string) => groupsApi.link(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Workspace linked to group');
      setShowLink(false);
      setChildId('');
    },
    onError: (err: any) => toast.error(err?.message ?? 'Failed to link workspace'),
  });

  const unlinkMutation = useMutation({
    mutationFn: (id: string) => groupsApi.unlink(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Workspace unlinked from group');
    },
    onError: () => toast.error('Failed to unlink workspace'),
  });

  const agg = data?.aggregate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Workspaces"
        description="Manage your enterprise workspace group — link subsidiary or branch workspaces for consolidated oversight."
        actions={
          <Button className="gradient-emerald text-white border-0 gap-2" onClick={() => setShowLink(true)}>
            <Link2 className="h-4 w-4" />
            Link Workspace
          </Button>
        }
      />

      {/* Parent context banner */}
      {!isLoading && data?.parent && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Network className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="text-sm">
            This workspace is a <span className="font-semibold">child member</span> of group{' '}
            <span className="font-bold">{data.parent.legalName}</span>
          </div>
          <div className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${TIER_COLORS[data.parent.subscriptionTier] ?? ''}`}>
            {data.parent.subscriptionTier}
          </div>
        </div>
      )}

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          [
            { label: 'Child Workspaces', value: agg?.totalChildren ?? 0,   icon: Building2, color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20' },
            { label: 'Total Members',    value: agg?.totalMembers ?? 0,    icon: Users,     color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
            { label: 'Total Customers',  value: agg?.totalCustomers ?? 0,  icon: Globe,     color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'Total Checks',     value: agg?.totalChecks ?? 0,     icon: Shield,    color: 'text-purple-500',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
            { label: 'Escalations',      value: agg?.totalEscalations ?? 0,icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <Card key={label} className="card-3d">
              <CardContent className="p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border ${border} mb-2`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="text-xl font-bold counter">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Child workspace cards */}
      <div>
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Child Workspaces ({data?.children.length ?? 0})
        </h2>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : data?.children.length === 0 ? (
          <Card className="card-3d">
            <CardContent className="py-16 text-center">
              <Network className="h-14 w-14 mx-auto mb-4 opacity-20" />
              <div className="text-base font-semibold mb-1">No child workspaces yet</div>
              <div className="text-sm text-muted-foreground mb-5">
                Link subsidiary or branch workspaces to this group for consolidated compliance oversight.
              </div>
              <Button className="gradient-emerald text-white border-0 gap-2" onClick={() => setShowLink(true)}>
                <Link2 className="h-4 w-4" />
                Link first workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.children.map((child) => (
              <Card key={child.id} className="card-3d flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-sm">
                        {child.legalName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{child.legalName}</div>
                        {child.tradingName && <div className="text-[11px] text-muted-foreground truncate">{child.tradingName}</div>}
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${TIER_COLORS[child.subscriptionTier] ?? ''}`}>
                      {child.subscriptionTier}
                    </span>
                  </div>

                  {/* ABN + pathway */}
                  {(child.abn || child.industryPathway) && (
                    <div className="flex gap-3 mb-3 text-[11px] text-muted-foreground">
                      {child.abn && <span>ABN {child.abn}</span>}
                      {child.industryPathway && <span className="capitalize">{child.industryPathway.replace(/_/g, ' ')}</span>}
                    </div>
                  )}

                  {/* Implementation status */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <CheckCircle className={`h-3.5 w-3.5 ${STATUS_COLORS[child.implementationStatus] ?? ''}`} />
                    <span className={`text-xs font-medium ${STATUS_COLORS[child.implementationStatus] ?? ''}`}>
                      {child.implementationStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 mb-4">
                    <StatPill icon={Users}         value={child.stats.members}     label="members"     color="text-blue-500" />
                    <StatPill icon={Globe}          value={child.stats.customers}   label="customers"   color="text-emerald-500" />
                    <StatPill icon={Shield}         value={child.stats.checks}      label="checks"      color="text-purple-500" />
                    <StatPill icon={AlertTriangle}  value={child.stats.escalations} label="escalations" color="text-red-500" />
                  </div>

                  <div className="text-[11px] text-muted-foreground mb-4 mt-auto">
                    Joined {formatRelative(child.createdAt)}
                  </div>

                  <Button
                    size="sm" variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5"
                    onClick={() => unlinkMutation.mutate(child.id)}
                    disabled={unlinkMutation.isPending}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink from group
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Group overview — current workspace */}
      {!isLoading && data && (
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              Group Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              {/* Parent */}
              {data.parent && (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                  <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 font-black text-xs">
                    {data.parent.legalName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold">{data.parent.legalName}</div>
                  <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Parent Group</span>
                </div>
              )}

              {/* Connector */}
              {data.parent && <div className="ml-4 w-px h-4 bg-border" />}

              {/* Current */}
              <div className={`flex items-center gap-3 rounded-xl border p-3 ${data.parent ? 'ml-8' : ''} bg-primary/5 border-primary/20`}>
                <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary font-black text-xs">
                  {data.current.legalName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold">{data.current.legalName}</div>
                  <div className="text-[11px] text-muted-foreground">Current workspace</div>
                </div>
                {data.current.isGroupParent && (
                  <span className="ml-auto text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">Group Parent</span>
                )}
              </div>

              {/* Children */}
              {data.children.map((child, i) => (
                <div key={child.id} className="ml-8">
                  <div className="ml-4 w-px h-4 bg-border" />
                  <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
                    <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-muted border text-muted-foreground font-black text-xs">
                      {child.legalName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-semibold truncate">{child.legalName}</div>
                    <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded flex-shrink-0">Child</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link workspace dialog */}
      <Dialog open={showLink} onOpenChange={setShowLink}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Link Child Workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                The child workspace must have an <strong>ENTERPRISE</strong> subscription and the owner must confirm the link.
                Enter the exact workspace ID to proceed.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Child Workspace ID</Label>
              <Input
                placeholder="ws_xxxxxxxxxxxxxxxxxxxxxxxx"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Found in the child workspace's Settings page under Workspace Information.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLink(false)}>Cancel</Button>
            <Button
              className="gradient-emerald text-white border-0"
              onClick={() => linkMutation.mutate(childId)}
              disabled={!childId.trim() || linkMutation.isPending}
            >
              {linkMutation.isPending ? 'Linking…' : 'Link workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
