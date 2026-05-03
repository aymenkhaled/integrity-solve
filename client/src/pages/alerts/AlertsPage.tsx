import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { alertApi } from '@/lib/api';
import { AlertTriangle, Bell, CheckCircle, X, Plus, Loader2, Filter } from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/utils';
import { toast } from 'sonner';

interface Alert {
  id: string;
  severity: string;
  status: string;
  alertType: string;
  title: string;
  description: string;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  customerId: string | null;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string }> = {
  INFO:     { color: 'text-blue-600',   bg: 'bg-blue-50' },
  WARNING:  { color: 'text-amber-600',  bg: 'bg-amber-50' },
  HIGH:     { color: 'text-orange-600', bg: 'bg-orange-50' },
  CRITICAL: { color: 'text-red-600',    bg: 'bg-red-50' },
};

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  OPEN:           'destructive',
  ACKNOWLEDGED:   'warning',
  RESOLVED:       'success',
  FALSE_POSITIVE: 'outline',
};

export default function AlertsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveFP, setResolveFP] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    severity: 'WARNING', alertType: 'MANUAL', title: '', description: '',
  });

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn:  () => alertApi.list({ status: statusFilter || undefined }) as Promise<Alert[]>,
  });

  const acknowledge = useMutation({
    mutationFn: (id: string) => alertApi.acknowledge(id),
    onSuccess: () => {
      toast.success('Alert acknowledged');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => toast.error('Failed to acknowledge alert'),
  });

  const resolve = useMutation({
    mutationFn: ({ id, note, fp }: { id: string; note: string; fp: boolean }) =>
      fp ? alertApi.falsePositive(id, note) : alertApi.resolve(id, note),
    onSuccess: () => {
      toast.success('Alert resolved');
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setResolveId(null);
      setResolveNote('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const create = useMutation({
    mutationFn: (data: typeof newAlert) => alertApi.create(data),
    onSuccess: () => {
      toast.success('Alert created');
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setCreateOpen(false);
      setNewAlert({ severity: 'WARNING', alertType: 'MANUAL', title: '', description: '' });
    },
    onError: () => toast.error('Failed to create alert'),
  });

  const openCount    = alerts?.filter((a) => a.status === 'OPEN').length ?? 0;
  const criticalCount = alerts?.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length ?? 0;

  return (
    <div>
      <PageHeader
        title="Smart Alerts"
        description="Monitor and manage compliance alerts across your workspace."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Alert
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Open',     value: alerts?.filter((a) => a.status === 'OPEN').length ?? 0,          color: 'text-red-600' },
          { label: 'Critical', value: criticalCount,                                                    color: 'text-red-700' },
          { label: 'Acknowledged', value: alerts?.filter((a) => a.status === 'ACKNOWLEDGED').length ?? 0, color: 'text-amber-600' },
          { label: 'Resolved', value: alerts?.filter((a) => a.status === 'RESOLVED').length ?? 0,       color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground mb-1">{label} Alerts</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2">
          {['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE', ''].map((s) => (
            <Button
              key={s || 'all'}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {s || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : !alerts?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No alerts</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter ? `No ${statusFilter.toLowerCase()} alerts.` : 'Your workspace is clear.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.INFO!;
            return (
              <Card key={alert.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${sev.bg}`}>
                    <AlertTriangle className={`h-4 w-4 ${sev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      <Badge variant={STATUS_VARIANT[alert.status] ?? 'outline'} className="text-xs">
                        {alert.status}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${sev.color}`}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {alert.alertType}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{alert.description}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatRelative(alert.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {alert.status === 'OPEN' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => acknowledge.mutate(alert.id)}
                          disabled={acknowledge.isPending}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setResolveId(alert.id); setResolveFP(false); }}
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setResolveId(alert.id); setResolveFP(false); }}
                      >
                        Resolve
                      </Button>
                    )}
                    {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => { setResolveId(alert.id); setResolveFP(true); }}
                      >
                        False Positive
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolve dialog */}
      <Dialog open={!!resolveId} onOpenChange={(o) => !o && setResolveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resolveFP ? 'Mark as False Positive' : 'Resolve Alert'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">
              Resolution Note <span className="text-muted-foreground">(min 10 characters)</span>
            </label>
            <Textarea
              className="mt-1.5"
              placeholder="Describe the resolution or why this is a false positive…"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button
              onClick={() => resolve.mutate({ id: resolveId!, note: resolveNote, fp: resolveFP })}
              disabled={resolveNote.length < 10 || resolve.isPending}
            >
              {resolve.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {resolveFP ? 'Mark False Positive' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create alert dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Severity</label>
                <Select value={newAlert.severity} onValueChange={(v) => setNewAlert((p) => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['INFO', 'WARNING', 'HIGH', 'CRITICAL'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Input
                  placeholder="e.g. MANUAL"
                  value={newAlert.alertType}
                  onChange={(e) => setNewAlert((p) => ({ ...p, alertType: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Alert title…"
                value={newAlert.title}
                onChange={(e) => setNewAlert((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe the alert…"
                value={newAlert.description}
                onChange={(e) => setNewAlert((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => create.mutate(newAlert)}
              disabled={!newAlert.title || !newAlert.description || create.isPending}
            >
              {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
