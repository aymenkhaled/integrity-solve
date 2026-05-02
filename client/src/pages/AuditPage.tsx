import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { auditApi } from '@/lib/api';
import { formatDateTime, truncate } from '@/lib/utils';
import type { AuditLogEntry } from '@shared/schema';

const ACTION_COLORS: Record<string, string> = {
  'customer.created':          'text-emerald-600',
  'customer.updated':          'text-blue-600',
  'customer.riskRating.updated': 'text-orange-600',
  'customer.status.changed':   'text-purple-600',
  'escalation.created':        'text-red-600',
  'smr.submitted':             'text-red-700',
  'program.published':         'text-emerald-700',
  'member.invited':            'text-blue-600',
  'check.requested':           'text-blue-500',
};

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn:  () => auditApi.list({ limit: '100' }) as Promise<{ items: AuditLogEntry[]; total: number }>,
  });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable record of all significant actions taken within this workspace."
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !data?.items?.length ? (
            <EmptyState
              icon={History}
              title="No audit entries yet"
              description="Actions taken within this workspace will appear here."
              className="py-16"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs ${ACTION_COLORS[entry.action] ?? 'text-foreground'}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <span className="text-muted-foreground">{entry.entityType}</span>
                          {' · '}
                          <span className="font-mono">{entry.entityId.slice(0, 12)}…</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {truncate(entry.reason, 60)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {entry.actorUserId.slice(0, 10)}…
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
