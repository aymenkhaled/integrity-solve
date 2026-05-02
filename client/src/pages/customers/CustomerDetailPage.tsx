import { useParams, Link } from 'wouter';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCustomer } from '@/hooks/useCustomers';
import { formatDate, formatABN } from '@/lib/utils';
import type { BeneficialOwner } from '@shared/schema';

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      <div className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</div>
      <div className="text-sm font-medium flex-1">{value || '—'}</div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: customer, isLoading, error } = useCustomer(params.id!);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link href="/customers"><ArrowLeft className="h-4 w-4" /></Link>
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Customer not found.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/customers">Back to customers</Link>
        </Button>
      </div>
    );
  }

  const displayName = (customer.entityName ??
    `${customer.givenNames ?? ''} ${customer.familyName ?? ''}`.trim()) ||
    'Unknown Customer';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers" className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Customers</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{displayName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-mono text-muted-foreground">{customer.referenceNumber}</span>
            <RiskBadge rating={customer.riskRating} />
            <StatusBadge status={customer.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button size="sm">Run Check</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="beneficial-owners">Beneficial Owners</TabsTrigger>
              <TabsTrigger value="checks">Checks</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.customerType === 'INDIVIDUAL' ? (
                    <>
                      <DetailRow label="Given names"    value={customer.givenNames} />
                      <DetailRow label="Family name"    value={customer.familyName} />
                      <DetailRow label="Date of birth"  value={customer.dateOfBirth} />
                      <DetailRow label="Nationality"    value={customer.nationality} />
                    </>
                  ) : (
                    <>
                      <DetailRow label="Entity name"    value={customer.entityName} />
                      <DetailRow label="ABN"            value={formatABN(customer.abn)} />
                      <DetailRow label="ACN"            value={customer.acn} />
                    </>
                  )}
                  <DetailRow label="Email"          value={customer.email} />
                  <DetailRow label="Phone"          value={customer.phone} />
                  <DetailRow label="Address"        value={[customer.addressLine1, customer.suburb, customer.state, customer.postcode].filter(Boolean).join(', ')} />
                  <DetailRow label="Customer type"  value={customer.customerType} />
                  <DetailRow label="CDD level"      value={customer.cddLevel} />
                  <DetailRow label="Created"        value={formatDate(customer.createdAt)} />
                  <DetailRow label="Last updated"   value={formatDate(customer.updatedAt)} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="beneficial-owners">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Beneficial Owners</CardTitle>
                  <Button size="sm" variant="outline">
                    <Users className="h-4 w-4" />
                    Add owner
                  </Button>
                </CardHeader>
                <CardContent>
                  {!customer.beneficialOwners?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No beneficial owners recorded. For companies and trusts, you must identify all beneficial owners with ≥25% ownership.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {(customer.beneficialOwners as BeneficialOwner[]).map((bo) => (
                        <div key={bo.id} className="py-3">
                          <div className="font-medium text-sm">{bo.givenNames} {bo.familyName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {bo.ownershipPct}% ownership
                            {bo.isController ? ' · Controller' : ''}
                            {bo.roleTitle ? ` · ${bo.roleTitle}` : ''}
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={bo.identityStatus} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checks">
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Run identity, sanctions, PEP, and registry checks from here.
                  <div className="mt-4">
                    <Button size="sm">Run check</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Evidence files and generated documents appear here.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <RiskBadge rating={customer.riskRating} />
                <span className="text-sm text-muted-foreground">{customer.cddLevel} CDD</span>
              </div>
              {customer.riskNotes && (
                <p className="text-xs text-muted-foreground">{customer.riskNotes}</p>
              )}
              {customer.nextReviewDue && (
                <div className="mt-3 text-xs">
                  <span className="text-muted-foreground">Next review: </span>
                  <span className="font-medium">{formatDate(customer.nextReviewDue)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Onboarding Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status={customer.status} />
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div>Created: {formatDate(customer.createdAt)}</div>
                {customer.lastReviewedAt && (
                  <div>Last reviewed: {formatDate(customer.lastReviewedAt)}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
