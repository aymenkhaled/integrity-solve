import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import {
  AlertTriangle, Bell, CheckCircle, X, Plus, Loader2,
  Filter, Info, Shield, Clock,
} from 'lucide-react';
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

const SEVERITY_CONFIG: Record<string, {
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}> = {
  INFO:     { color: 'text-blue-600',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    icon: Info },
  WARNING:  { color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: AlertTriangle },
  HIGH:     { color: 'text-orange-600',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: AlertTriangle },
  CRITICAL: { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: AlertTriangle },
};

const STATUS_COLORS: Record<string, string> = {
  OPEN:           'text-red-600 bg-red-500/10 border-red-500/20',
  ACKNOWLEDGED:   'text-amber-600 bg-amber-500/10 border-amber-500/20',
  RESOLVED:       'text-green-400 bg-green-500/10 border-green-500/20',
  FALSE_POSITIVE: 'text-muted-foreground bg-muted/50 border-border',
};

const FILTER_LABELS: Record<string, string> = {
  '': 'All',
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  RESOLVED: 'Resolved',
  FALSE_POSITIVE: 'False Positive',
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

  const { data: rawAlerts, isLoading } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn:  () => alertApi.list({ status: statusFilter || undefined }) as Promise<Alert[] | { alerts: Alert[]; total: number }>,
  });

  const alerts: Alert[] = Array.isArray(rawAlerts)
    ? rawAlerts
    : ((rawAlerts as { alerts: Alert[] })?.alerts ?? []);

  const acknowledge = useMutation({
    mutationFn: (id: string) => alertApi.acknowledge(id),
    onSuccess: () => {
      toast.success('Alert acknowledged');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => toast.error('Failed to acknowledge'),
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

  const openCount      = alerts.filter((a) => a.status === 'OPEN').length;
  const criticalCount  = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length;
  const ackCount       = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount  = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Alerts"
        description="Monitor and manage compliance alerts across your workspace."
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Alert
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open',         value: openCount,     icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          { label: 'Critical',     value: criticalCount, icon: AlertTriangle, color: 'text-red-700',     bg: 'bg-red-700/10',     border: 'border-red-700/20' },
          { label: 'Acknowledged', value: ackCount,      icon: Bell,          color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
          { label: 'Resolved',     value: resolvedCount, icon: CheckCircle,   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className="card-3d">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold counter">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label} alerts</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex gap-1.5 flex-wrap">
          {['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE', ''].map((s) => (
            <Button
              key={s || 'all'}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              className={`h-7 text-xs ${statusFilter === s ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-0' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {FILTER_LABELS[s] ?? s}
            </Button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
              <Shield className="h-8 w-8 text-green-400" />
            </div>
            <p className="font-semibold text-base mb-1">
              {statusFilter === 'OPEN' ? 'All clear — no open alerts' : `No ${FILTER_LABELS[statusFilter] ?? statusFilter} alerts`}
            </p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'OPEN'
                ? 'Your workspace is fully compliant. Great work.'
                : 'Adjust the filter to see other alerts.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG['INFO']!;
            const SevIcon = sev.icon;
            const statusCls = STATUS_COLORS[alert.status] ?? STATUS_COLORS['OPEN']!;
            return (
              <Card key={alert.id} className="card-3d hover:border-primary/20 transition-colors">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${sev.bg} border ${sev.border}`}>
                    <SevIcon className={`h-5 w-5 ${sev.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-sm">{alert.title}</span>
                      <div className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${statusCls}`}>
                        {alert.status}
                      </div>
                      <div className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${sev.bg} border ${sev.border} ${sev.color}`}>
                        {alert.severity}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                        {alert.alertType}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">{alert.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelative(alert.createdAt)}
                      </span>
                      {alert.acknowledgedAt && (
                        <span>Acknowledged {formatDate(alert.acknowledgedAt)}</span>
                      )}
                      {alert.resolvedAt && (
                        <span>Resolved {formatDate(alert.resolvedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {alert.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => acknowledge.mutate(alert.id)}
                        disabled={acknowledge.isPending}
                      >
                        {acknowledge.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Acknowledge'}
                      </Button>
                    )}
                    {(alert.status === 'OPEN' || alert.status === 'ACKNOWLEDGED') && (
                      <>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                          onClick={() => { setResolveId(alert.id); setResolveFP(false); }}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setResolveId(alert.id); setResolveFP(true); }}
                        >
                          False +ve
                        </Button>
                      </>
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
            <DialogTitle className="flex items-center gap-2">
              {resolveFP
                ? <><X className="h-5 w-5 text-muted-foreground" />Mark as False Positive</>
                : <><CheckCircle className="h-5 w-5 text-green-400" />Resolve Alert</>}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>
              Resolution note
              <span className="text-muted-foreground text-xs ml-1">(min 10 chars — audit trail)</span>
            </Label>
            <Textarea
              className="mt-1.5"
              placeholder={resolveFP
                ? 'Explain why this is a false positive…'
                : 'Describe how this alert was resolved…'}
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveId(null)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              onClick={() => resolve.mutate({ id: resolveId!, note: resolveNote, fp: resolveFP })}
              disabled={resolveNote.length < 10 || resolve.isPending}
            >
              {resolve.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                : resolveFP ? 'Mark False Positive' : 'Resolve alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Create Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={newAlert.severity} onValueChange={(v) => setNewAlert((p) => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Alert type</Label>
                <Input
                  placeholder="MANUAL"
                  value={newAlert.alertType}
                  onChange={(e) => setNewAlert((p) => ({ ...p, alertType: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="Alert title…"
                value={newAlert.title}
                onChange={(e) => setNewAlert((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the alert and any recommended actions…"
                value={newAlert.description}
                onChange={(e) => setNewAlert((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              onClick={() => create.mutate(newAlert)}
              disabled={!newAlert.title || !newAlert.description || create.isPending}
            >
              {create.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
                : 'Create alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
