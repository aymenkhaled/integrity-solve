import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { providersApi } from '@/lib/api';
import {
  Shield, CheckCircle, AlertTriangle, Globe, Zap,
  ExternalLink, ShoppingBag, Activity, Database,
  IdCard, Search, BookOpen,
} from 'lucide-react';
import { formatRelative } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  vendor: string;
  category: string;
  description: string;
  checkTypes: string[];
  docUrl: string | null;
  envKey: string | null;
  sla: string;
  region: string;
  features: string[];
  configured: boolean;
  stats: { total: number; passed: number; failed: number; review: number };
}

interface ProvidersResponse {
  providers: Provider[];
  recent: {
    provider: string; checkType: string; status: string;
    result: string | null; createdAt: string;
  }[];
  summary: { total: number; configured: number; totalChecks: number };
}

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  IDENTITY: { icon: IdCard,   color: 'text-blue-600',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Identity' },
  SANCTIONS:{ icon: Shield,   color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'Sanctions' },
  PEP:      { icon: Search,   color: 'text-purple-600',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  label: 'PEP' },
  REGISTRY: { icon: Database, color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Registry' },
};

const RESULT_META: Record<string, { color: string; bg: string }> = {
  PASS:          { color: 'text-green-400', bg: 'bg-green-500/10' },
  FAIL:          { color: 'text-red-600',     bg: 'bg-red-500/10' },
  MANUAL_REVIEW: { color: 'text-amber-600',   bg: 'bg-amber-500/10' },
};

function ProviderCard({ provider }: { provider: Provider }) {
  const catMeta = CATEGORY_META[provider.category] ?? CATEGORY_META['IDENTITY']!;
  const CatIcon = catMeta.icon;
  const passRate = provider.stats.total > 0
    ? Math.round((provider.stats.passed / provider.stats.total) * 100)
    : null;

  return (
    <Card className="card-3d flex flex-col">
      <CardContent className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${catMeta.bg} border ${catMeta.border}`}>
              <CatIcon className={`h-5 w-5 ${catMeta.color}`} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm">{provider.name}</div>
              <div className="text-[11px] text-muted-foreground">{provider.vendor}</div>
            </div>
          </div>
          <div className="flex-shrink-0">
            {provider.configured ? (
              <div className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold bg-green-500/10 border border-green-500/20 text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Connected
              </div>
            ) : provider.envKey == null ? (
              <div className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Public
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold bg-muted/80 border border-border text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Not configured
              </div>
            )}
          </div>
        </div>

        {/* Category + region tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${catMeta.bg} border ${catMeta.border} ${catMeta.color}`}>
            {catMeta.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-muted/50 border text-muted-foreground">
            <Globe className="h-2.5 w-2.5" />{provider.region}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-muted/50 border text-muted-foreground">
            <Zap className="h-2.5 w-2.5" />{provider.sla}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
          {provider.description}
        </p>

        {/* Check types */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {provider.checkTypes.map((ct) => (
            <span key={ct} className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
              {ct}
            </span>
          ))}
        </div>

        {/* Features */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Features</div>
          <div className="flex flex-wrap gap-1.5">
            {provider.features.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle className="h-2.5 w-2.5 text-green-400 flex-shrink-0" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Usage stats */}
        {provider.stats.total > 0 ? (
          <div className="rounded-xl bg-muted/40 p-3 mb-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Usage Stats</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-base font-black text-primary">{provider.stats.total}</div>
                <div className="text-[10px] text-muted-foreground">Checks</div>
              </div>
              <div>
                <div className="text-base font-black text-green-400">{passRate}%</div>
                <div className="text-[10px] text-muted-foreground">Pass rate</div>
              </div>
              <div>
                <div className="text-base font-black text-red-600">{provider.stats.failed}</div>
                <div className="text-[10px] text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/30 border border-dashed p-3 mb-4 text-center">
            <div className="text-[11px] text-muted-foreground">No checks run yet</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          {provider.envKey != null && !provider.configured ? (
            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white border-0 text-xs" disabled>
              Configure API Key
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 text-xs" disabled>
              {provider.configured || provider.envKey == null ? 'Manage' : 'View Details'}
            </Button>
          )}
          {provider.docUrl && (
            <Button size="sm" variant="ghost" className="text-xs" asChild>
              <a href={provider.docUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProvidersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn:  () => providersApi.list() as Promise<ProvidersResponse>,
    refetchInterval: 60_000,
  });

  const categories = ['IDENTITY', 'SANCTIONS', 'REGISTRY'] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Marketplace"
        description="Manage and monitor identity, sanctions, and registry check providers connected to your workspace."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          [
            { label: 'Total Providers',   value: data?.summary.total ?? 0,       icon: ShoppingBag, color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/20' },
            { label: 'Connected',         value: data?.summary.configured ?? 0,  icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { label: 'Total Checks Run',  value: data?.summary.totalChecks ?? 0, icon: Activity,    color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
            { label: 'Not Configured',    value: (data?.providers.filter((p) => !p.configured && p.envKey != null).length) ?? 0, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
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

      {/* Provider grid by category */}
      {isLoading ? (
        <div className="grid lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      ) : (
        categories.map((cat) => {
          const catMeta = CATEGORY_META[cat]!;
          const CatIcon = catMeta.icon;
          const catProviders = data?.providers.filter((p) => p.category === cat || p.checkTypes.includes(cat)) ?? [];
          if (catProviders.length === 0) return null;

          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${catMeta.bg} border ${catMeta.border}`}>
                  <CatIcon className={`h-3.5 w-3.5 ${catMeta.color}`} />
                </div>
                <h2 className="font-semibold text-sm">{catMeta.label} Providers</h2>
                <span className="text-xs text-muted-foreground">({catProviders.length})</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catProviders.map((p) => (
                  <ProviderCard key={p.id} provider={p} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Recent activity */}
      <Card className="card-3d">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Recent Provider Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
            </div>
          ) : data?.recent.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
              No provider checks run yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-y">
                  <tr>
                    {['Provider', 'Check Type', 'Status', 'Result', 'When'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.recent.map((r, i) => {
                    const resultMeta = r.result ? (RESULT_META[r.result] ?? { color: 'text-muted-foreground', bg: 'bg-muted/50' }) : null;
                    return (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-xs">{r.provider ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.checkType ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium">{r.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {resultMeta && r.result ? (
                            <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${resultMeta.bg} border ${resultMeta.color}`}>
                              {r.result.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelative(r.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
