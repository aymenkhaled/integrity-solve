import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCustomers } from '@/hooks/useCustomers';
import { formatDate } from '@/lib/utils';
import type { Customer } from '@shared/schema';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCustomers({ page: String(page), limit: '25', search: search || undefined });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer records, CDD status, and risk ratings."
        actions={
          <Button asChild>
            <Link href="/customers/new"><a><Plus className="h-4 w-4" />New customer</a></Link>
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !data?.items?.length ? (
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Start by adding your first customer to begin the CDD process."
              action={
                <Button asChild>
                  <Link href="/customers/new"><a>Add customer</a></Link>
                </Button>
              }
              className="py-20"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Reference</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Risk</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">CDD</th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.items.map((customer: Customer) => (
                      <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/customers/${customer.id}`}>
                            <a className="text-sm font-mono text-primary hover:underline">
                              {customer.referenceNumber}
                            </a>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/customers/${customer.id}`}>
                            <a className="text-sm font-medium hover:text-primary transition-colors">
                              {customer.entityName ??
                                `${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim() ||
                                '—'}
                            </a>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                          {customer.customerType?.toLowerCase().replace('_', ' ')}
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
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(customer.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  {data.total} customer{data.total !== 1 ? 's' : ''}
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
                  <span className="text-sm">Page {page}</span>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
