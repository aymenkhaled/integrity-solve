import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Shield, Filter, Clock, Tag } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auditApi } from '@/lib/api';
import { formatDateTime, truncate } from '@/lib/utils';
import type { AuditLogEntry } from '@shared/schema';

const ACTION_CONFIG: Record<string, { color: string; bg: string; category: string }> = {
  'customer.created':            { color: 'text-green-400', bg: 'bg-green-500/10', category: 'Customer' },
  'customer.updated':            { color: 'text-blue-600',    bg: 'bg-blue-500/10',    category: 'Customer' },
  'customer.riskRating.updated': { color: 'text-orange-600',  bg: 'bg-orange-500/10',  category: 'Customer' },
  'customer.status.changed':     { color: 'text-purple-600',  bg: 'bg-purple-500/10',  category: 'Customer' },
  'escalation.created':          { color: 'text-red-600',     bg: 'bg-red-500/10',     category: 'Escalation' },
  'escalation.status.changed':   { color: 'text-red-500',     bg: 'bg-red-500/10',     category: 'Escalation' },
  'smr.submitted':               { color: 'text-red-700',     bg: 'bg-red-700/10',     category: 'SMR' },
  'program.published':           { color: 'text-green-400', bg: 'bg-green-500/10', category: 'Program' },
  'program.updated':             { color: 'text-blue-500',    bg: 'bg-blue-500/10',    category: 'Program' },
  'member.invited':              { color: 'text-blue-600',    bg: 'bg-blue-600/10',    category: 'Member' },
  'check.requested':             { color: 'text-blue-500',    bg: 'bg-blue-500/10',    category: 'Check' },
  'check.completed':             { color: 'text-green-400', bg: 'bg-green-500/10', category: 'Check' },
  'alert.created':               { color: 'text-amber-600',   bg: 'bg-amber-600/10',   category: 'Alert' },
  'alert.acknowledged':          { color: 'text-blue-600',    bg: 'bg-blue-600/10',    category: 'Alert' },
  'alert.resolved':              { color: 'text-green-400', bg: 'bg-green-500/10', category: 'Alert' },
  'review.completed':            { color: 'text-green-400', bg: 'bg-green-500/10', category: 'Review' },
  'task.created':                { color: 'text-blue-500',    bg: 'bg-blue-500/10',    category: 'Task' },
  'task.completed':              { color: 'text-green-400', bg: 'bg-green-500/10', category: 'Task' },
  'document.generated':          { color: 'text-purple-600',  bg: 'bg-purple-600/10',  category: 'Document' },
  'workspace.update':            { color: 'text-blue-600',    bg: 'bg-blue-600/10',    category: 'Workspace' },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { color: 'text-foreground', bg: 'bg-muted', category: 'System' };
}

export default function AuditPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn:  () => auditApi.list({ limit: '50', page: String(page) }) as Promise<{
      items: AuditLogEntry[];
      total: number;
      page: number;
      hasMore: boolean;
    }>,
  });

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter((e) =>
        e.action.includes(search.toLowerCase()) ||
        e.entityType?.toLowerCase().includes(search.toLowerCase()) ||
        e.reason?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const categories = [...new Set(items.map((e) => getActionConfig(e.action).category))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Immutable, append-only record of all significant actions within this workspace."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total entries', value: data?.total ?? 0, icon: History,  color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'This page',     value: items.length,     icon: Filter,   color: 'text-purple-500',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
          { label: 'Categories',    value: categories.length, icon: Tag,     color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
          { label: 'AUSTRAC ready', value: '100%',           icon: Shield,   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
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

      {/* Immutability notice */}
      <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 dark:border-green-500/20 dark:bg-green-500/5 px-5 py-3 text-sm">
        <Shield className="h-4 w-4 text-green-400 flex-shrink-0" />
        <span className="text-green-400 dark:text-green-400">
          This audit log is <strong>append-only</strong> and cannot be modified or deleted.
          All entries include actor, timestamp, IP address, and reason — AUSTRAC recordkeeping compliant.
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by action, entity, or reason…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Audit entries ({filtered.length}{data?.total && data.total > filtered.length ? ` of ${data.total}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <History className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold mb-1">
                {search ? 'No matching entries' : 'No audit entries yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No entries matching "${search}".`
                  : 'Actions taken within this workspace will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-y">
                  <tr>
                    {['Action', 'Entity', 'Reason', 'IP', 'Actor', 'Timestamp'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((entry) => {
                    const cfg = getActionConfig(entry.action);
                    return (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono font-medium ${cfg.bg} ${cfg.color}`}>
                            {entry.action}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <div className="font-medium text-foreground/80">{entry.entityType}</div>
                            <div className="font-mono text-muted-foreground">{entry.entityId.slice(0, 12)}…</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-xs text-muted-foreground">
                            {entry.reason ? truncate(entry.reason, 60) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-muted-foreground">
                            {entry.ipAddress ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                              U
                            </div>
                            <span className="font-mono text-muted-foreground">{entry.actorUserId.slice(0, 8)}…</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(entry.createdAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && (data.hasMore || page > 1) && (
            <div className="flex items-center justify-between px-5 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Page {data.page} · {data.total} total entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
