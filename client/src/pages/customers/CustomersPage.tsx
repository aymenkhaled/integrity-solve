import { useState } from 'react';
import { Link } from 'wouter';
import {
  Plus, Search, Users, Filter, ChevronLeft, ChevronRight,
  TrendingUp, Shield, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCustomers } from '@/hooks/useCustomers';
import { formatDate, formatRelative } from '@/lib/utils';
import type { Customer } from '@shared/schema';

const RISK_STATS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const RISK_COLORS = {
  LOW:      { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Shield },
  MEDIUM:   { color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: TrendingUp },
  HIGH:     { color: 'text-orange-600',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  icon: AlertTriangle },
  CRITICAL: { color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: AlertTriangle },
};

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('');

  const { data, isLoading } = useCustomers({
    page: String(page),
    limit: '25',
    search: search || undefined,
    riskRating: riskFilter || undefined,
  } as Parameters<typeof useCustomers>[0]);

  const items: Customer[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const hasMore: boolean = data?.hasMore ?? false;

  const riskCounts = RISK_STATS.reduce((acc, r) => {
    acc[r] = items.filter((c) => c.riskRating === r).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer records, CDD status, and risk ratings."
        action={
          <Button
            asChild
            className="gradient-emerald text-white border-0 hover:opacity-90"
          >
            <Link href="/customers/new">
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Link>
          </Button>
        }
      />

      {/* Risk distribution */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {RISK_STATS.map((r) => {
          const cfg = RISK_COLORS[r];
          const Icon = cfg.icon;
          return (
            <Card
              key={r}
              className={`card-3d cursor-pointer transition-all ${riskFilter === r ? 'ring-2 ring-primary' : 'hover:border-primary/20'}`}
              onClick={() => setRiskFilter(riskFilter === r ? '' : r)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.bg} border ${cfg.border}`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  {riskFilter === r && (
                    <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20">Active</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold counter">{riskCounts[r] ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.charAt(0) + r.slice(1).toLowerCase()} risk</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {riskFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRiskFilter('')}
            className="text-xs gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            {riskFilter} risk
            <span className="ml-1">×</span>
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {isLoading ? '…' : `${total} customer${total !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold text-base mb-1">
                {search || riskFilter ? 'No matching customers' : 'No customers yet'}
              </p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs text-center">
                {search || riskFilter
                  ? 'Try adjusting your search or filter.'
                  : 'Start by adding your first customer to begin the CDD process.'}
              </p>
              {!search && !riskFilter && (
                <Button
                  asChild
                  className="gradient-emerald text-white border-0"
                >
                  <Link href="/customers/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add customer
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-y">
                    <tr>
                      {['Reference', 'Name', 'Type', 'Risk', 'Status', 'CDD Level', 'Created'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((customer) => {
                      const name = customer.entityName
                        || `${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim()
                        || '—';
                      return (
                        <tr key={customer.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="text-sm font-mono text-primary hover:underline"
                            >
                              {customer.referenceNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <Link
                              href={`/customers/${customer.id}`}
                              className="font-semibold text-sm hover:text-primary transition-colors block truncate"
                            >
                              {name}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground capitalize">
                              {customer.customerType?.toLowerCase().replace(/_/g, ' ') ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <RiskBadge rating={customer.riskRating} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={customer.status} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={customer.cddLevel} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-muted-foreground">
                              <div>{formatDate(customer.createdAt)}</div>
                              <div className="opacity-70">{formatRelative(customer.createdAt)}</div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {total} customer{total !== 1 ? 's' : ''}
                  {riskFilter && ` · ${riskFilter} risk filter active`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[4rem] text-center">Page {page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={!hasMore}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
