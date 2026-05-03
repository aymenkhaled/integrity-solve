import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { gatewayApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Key, Plus, Trash2, Copy, CheckCircle, Shield,
  Zap, Activity, Code2, Lock, Eye, EyeOff,
  BarChart2, Globe, AlertTriangle,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';

const AVAILABLE_SCOPES = [
  { id: 'customers:read',  label: 'Read Customers',   desc: 'List and retrieve customer records' },
  { id: 'customers:write', label: 'Write Customers',  desc: 'Create and update customer records' },
  { id: 'checks:read',     label: 'Read Checks',      desc: 'View check requests and results' },
  { id: 'checks:write',    label: 'Write Checks',     desc: 'Run identity and compliance checks' },
  { id: 'reports:read',    label: 'Read Reports',     desc: 'Access escalations and SMR drafts' },
  { id: 'reports:write',   label: 'Write Reports',    desc: 'Create and update escalations' },
  { id: 'audit:read',      label: 'Read Audit Log',   desc: 'Access the append-only audit trail' },
  { id: 'analytics:read',  label: 'Read Analytics',   desc: 'Access compliance analytics data' },
];

interface ApiKey {
  id: string; name: string; prefix: string; scopes: string[];
  createdAt: string; lastUsedAt: string | null; expiresAt: string | null;
  requestCount: number;
}

interface UsageData {
  activeKeys: number; totalChecks: number; totalCustomers: number;
  totalAuditOps: number;
  rateLimit: { rpm: number; daily: number; used: number };
  endpoints: { path: string; scopes: string[]; latency: string }[];
  dailySeries: { date: string; requests: number }[];
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={copy}>
      {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function ApiGatewayPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['customers:read', 'checks:read']);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['gateway-keys'],
    queryFn:  () => gatewayApi.listKeys() as Promise<{ keys: ApiKey[] }>,
    refetchInterval: 30_000,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['gateway-usage'],
    queryFn:  () => gatewayApi.getUsage() as Promise<UsageData>,
    refetchInterval: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (params: { name: string; scopes: string[] }) => gatewayApi.createKey(params),
    onSuccess: (data: any) => {
      setGeneratedKey(data.rawKey);
      qc.invalidateQueries({ queryKey: ['gateway-keys'] });
      toast.success('API key created');
    },
    onError: () => toast.error('Failed to create key'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => gatewayApi.revokeKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gateway-keys'] });
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke key'),
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) return toast.error('Key name is required');
    if (selectedScopes.length === 0) return toast.error('Select at least one scope');
    createMutation.mutate({ name: newKeyName.trim(), scopes: selectedScopes });
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const maxRequests = Math.max(...(usage?.dailySeries.map((d) => d.requests) ?? [1]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Gateway"
        description="Manage workspace API keys for programmatic access to the Integrity Solve platform."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-2" onClick={() => { setShowCreate(true); setGeneratedKey(null); setNewKeyName(''); setSelectedScopes(['customers:read', 'checks:read']); }}>
            <Plus className="h-4 w-4" />
            Generate API Key
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Keys',      value: usageLoading ? '—' : usage?.activeKeys ?? 0,      icon: Key,       color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20' },
          { label: 'Checks (30d)',     value: usageLoading ? '—' : usage?.totalChecks ?? 0,     icon: Shield,    color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'Customers',        value: usageLoading ? '—' : usage?.totalCustomers ?? 0,  icon: Activity,  color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'Rate Limit (RPM)', value: usageLoading ? '—' : usage?.rateLimit.rpm ?? 60,  icon: Zap,       color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
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
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* API Keys list */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="card-3d">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                API Keys ({keysData?.keys.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {keysLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
              ) : keysData?.keys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <div className="text-sm text-muted-foreground">No API keys yet</div>
                  <div className="text-xs text-muted-foreground mt-1">Generate a key to get started</div>
                </div>
              ) : (
                keysData?.keys.map((key) => (
                  <div key={key.id} className="rounded-xl border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-semibold text-sm">{key.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                            {key.prefix}••••••••••••••••
                          </code>
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {key.scopes.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          <Lock className="h-2.5 w-2.5" />{s}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                      <span>Created {formatRelative(key.createdAt)}</span>
                      {key.lastUsedAt && <span>Last used {formatRelative(key.lastUsedAt)}</span>}
                      {key.expiresAt && <span className="text-amber-500">Expires {formatRelative(key.expiresAt)}</span>}
                      <span>{key.requestCount} requests</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Request chart */}
          <Card className="card-3d">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" />
                Daily API Requests (14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-28 rounded-xl" />
              ) : (
                <div className="flex items-end gap-1 h-28">
                  {usage?.dailySeries.map((d) => {
                    const pct = maxRequests > 0 ? (d.requests / maxRequests) * 100 : 0;
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="relative w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t-sm bg-primary/30 group-hover:bg-primary/60 transition-colors bar-hover"
                            style={{ height: `${Math.max(pct, 4)}%` }}
                            title={`${d.date}: ${d.requests} requests`}
                          />
                        </div>
                        {d.date.slice(8) === '01' || d.date.slice(8) === '07' || d.date.slice(8) === '14' ? (
                          <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
                        ) : <span className="text-[9px] text-transparent">.</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Endpoint reference */}
        <div className="space-y-4">
          <Card className="card-3d">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {usageLoading ? (
                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              ) : (
                usage?.endpoints.map((ep) => (
                  <div key={ep.path} className="rounded-lg bg-muted/40 border p-3">
                    <code className="text-[10px] font-mono text-primary block mb-1">{ep.path}</code>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {ep.scopes.map((s) => (
                          <span key={s} className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">{s}</span>
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{ep.latency}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="card-3d">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-3">
              <p>Include your API key in every request header:</p>
              <div className="rounded-lg bg-muted p-3 font-mono text-[11px] text-foreground break-all">
                Authorization: Bearer is_live_••••••••
              </div>
              <p>Base URL:</p>
              <div className="rounded-lg bg-muted p-3 font-mono text-[11px] text-foreground break-all">
                https://api.integritysolve.com.au/v1
              </div>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Never expose API keys in client-side code. Keys provide full access to your workspace data.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create key dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!generatedKey) setShowCreate(o); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {generatedKey ? 'Your new API key' : 'Generate API Key'}
            </DialogTitle>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-400">Key generated successfully</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Copy this key now. It will not be shown again.</p>
                <div className="flex items-center gap-2 bg-background rounded-lg border p-2">
                  <code className={`flex-1 text-[11px] font-mono break-all ${showKey ? '' : 'blur-[4px] select-none'}`}>
                    {generatedKey}
                  </code>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowKey((v) => !v)}>
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <CopyButton value={generatedKey} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={() => { setShowCreate(false); setGeneratedKey(null); }}>
                  Done — I've saved the key
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Key name</Label>
                <Input
                  placeholder="e.g. Production Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Scopes</Label>
                <div className="grid grid-cols-1 gap-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label key={scope.id} className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={selectedScopes.includes(scope.id)}
                        onCheckedChange={() => toggleScope(scope.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-semibold">{scope.label}</div>
                        <div className="text-[11px] text-muted-foreground">{scope.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Generating…' : 'Generate Key'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
