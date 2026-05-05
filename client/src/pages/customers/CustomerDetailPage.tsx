import { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, Plus, CheckCircle, XCircle, Clock, RefreshCw,
  Loader2, FileText, AlertCircle, Edit3, ShieldAlert, UserCheck,
  Download, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useCustomer } from '@/hooks/useCustomers';
import { customerApi, checkApi, documentApi, ApiError } from '@/lib/api';
import { formatDate, formatABN, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import type { BeneficialOwner } from '@shared/schema';

interface CheckRequest {
  id: string;
  checkType: string;
  provider: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  results?: { outcome: string; hitDetails: unknown[] }[];
}

interface Document {
  id: string;
  documentType: string;
  fileName: string | null;
  mimeType: string | null;
  createdAt: string;
  generatedBy: string | null;
}

const CHECK_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  PENDING:       { icon: Clock,         color: 'text-muted-foreground', bg: 'bg-muted/50',      border: 'border-border',          label: 'Pending' },
  RUNNING:       { icon: RefreshCw,     color: 'text-blue-400',         bg: 'bg-blue-500/10',   border: 'border-blue-500/20',     label: 'Running' },
  PASS:          { icon: CheckCircle,   color: 'text-green-400',        bg: 'bg-green-500/10',  border: 'border-green-500/20',    label: 'Pass' },
  FAIL:          { icon: XCircle,       color: 'text-red-400',          bg: 'bg-red-500/10',    border: 'border-red-500/20',      label: 'Fail' },
  REFER:         { icon: AlertCircle,   color: 'text-amber-400',        bg: 'bg-amber-500/10',  border: 'border-amber-500/20',    label: 'Refer' },
  ERROR:         { icon: AlertCircle,   color: 'text-orange-400',       bg: 'bg-orange-500/10', border: 'border-orange-500/20',   label: 'Error' },
  TIMEOUT:       { icon: Clock,         color: 'text-orange-400',       bg: 'bg-orange-500/10', border: 'border-orange-500/20',   label: 'Timeout' },
  MANUAL_REVIEW: { icon: Eye,           color: 'text-violet-400',       bg: 'bg-violet-500/10', border: 'border-violet-500/20',   label: 'Manual Review' },
};

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b last:border-0">
      <div className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</div>
      <div className="text-sm font-medium flex-1">{value || '—'}</div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: customer, isLoading, error } = useCustomer(params.id!);

  // Dialog states
  const [editOpen, setEditOpen]           = useState(false);
  const [riskOpen, setRiskOpen]           = useState(false);
  const [statusOpen, setStatusOpen]       = useState(false);
  const [runCheckOpen, setRunCheckOpen]   = useState(false);
  const [addOwnerOpen, setAddOwnerOpen]   = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    email: '', phone: '', addressLine1: '', suburb: '', state: '', postcode: '',
  });
  const [riskForm, setRiskForm] = useState({ riskRating: '', cddLevel: '', riskNotes: '', reason: '' });
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [checkForm, setCheckForm] = useState({ checkType: 'IDENTITY', provider: 'MOCK', reason: '' });
  const [ownerForm, setOwnerForm] = useState({
    givenNames: '', familyName: '', ownershipPct: '', roleTitle: '', isController: false,
  });

  // Mutations
  const updateCustomer = useMutation({
    mutationFn: (data: unknown) => customerApi.update(params.id!, data),
    onSuccess: () => {
      toast.success('Customer updated');
      qc.invalidateQueries({ queryKey: ['customer', params.id] });
      setEditOpen(false);
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to update'),
  });

  const updateRisk = useMutation({
    mutationFn: (data: unknown) => customerApi.updateRisk(params.id!, data),
    onSuccess: () => {
      toast.success('Risk rating updated');
      qc.invalidateQueries({ queryKey: ['customer', params.id] });
      setRiskOpen(false);
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to update risk'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason: string }) =>
      customerApi.updateStatus(params.id!, status, reason),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['customer', params.id] });
      setStatusOpen(false);
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to update status'),
  });

  const runCheck = useMutation({
    mutationFn: () => checkApi.run({
      subjectType: 'CUSTOMER',
      subjectId: params.id!,
      checkType: checkForm.checkType,
      provider: checkForm.provider,
      reason: checkForm.reason,
    }),
    onSuccess: () => {
      toast.success('Check initiated — results will appear shortly');
      qc.invalidateQueries({ queryKey: ['checks', params.id] });
      setRunCheckOpen(false);
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to run check'),
  });

  const addOwner = useMutation({
    mutationFn: () => customerApi.createBO(params.id!, {
      givenNames: ownerForm.givenNames,
      familyName: ownerForm.familyName,
      ownershipPct: Number(ownerForm.ownershipPct),
      roleTitle: ownerForm.roleTitle || undefined,
      isController: ownerForm.isController,
    }),
    onSuccess: () => {
      toast.success('Beneficial owner added');
      qc.invalidateQueries({ queryKey: ['customer', params.id] });
      setAddOwnerOpen(false);
      setOwnerForm({ givenNames: '', familyName: '', ownershipPct: '', roleTitle: '', isController: false });
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to add owner'),
  });

  // Checks query (customer-specific)
  const { data: rawChecks, isLoading: checksLoading } = useQuery({
    queryKey: ['checks', params.id],
    queryFn: () => checkApi.list({ customerId: params.id }) as Promise<CheckRequest[]>,
    enabled: !!params.id,
  });
  const checks: CheckRequest[] = Array.isArray(rawChecks) ? rawChecks : [];

  // Documents query
  const { data: rawDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', params.id],
    queryFn: () => documentApi.list() as Promise<Document[]>,
    enabled: !!params.id,
  });
  const allDocs: Document[] = Array.isArray(rawDocs) ? rawDocs : [];

  const openEdit = () => {
    if (customer) {
      setEditForm({
        email:       customer.email       ?? '',
        phone:       customer.phone       ?? '',
        addressLine1:customer.addressLine1 ?? '',
        suburb:      customer.suburb      ?? '',
        state:       customer.state       ?? '',
        postcode:    customer.postcode    ?? '',
      });
    }
    setEditOpen(true);
  };

  const openRisk = () => {
    if (customer) {
      setRiskForm({ riskRating: customer.riskRating ?? '', cddLevel: customer.cddLevel ?? '', riskNotes: customer.riskNotes ?? '', reason: '' });
    }
    setRiskOpen(true);
  };

  const openStatus = () => {
    if (customer) setStatusForm({ status: customer.status ?? '', reason: '' });
    setStatusOpen(true);
  };

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
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm font-mono text-muted-foreground">{customer.referenceNumber}</span>
            <RiskBadge rating={customer.riskRating} />
            <StatusBadge status={customer.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={openRisk} className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Risk
          </Button>
          <Button variant="outline" size="sm" onClick={openStatus} className="gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Status
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1.5" onClick={() => setRunCheckOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Run Check
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="beneficial-owners">Beneficial Owners</TabsTrigger>
              <TabsTrigger value="checks">
                Checks {checks.length > 0 && <span className="ml-1.5 inline-flex h-4 px-1 items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{checks.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
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

            {/* Beneficial Owners Tab */}
            <TabsContent value="beneficial-owners">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Beneficial Owners</CardTitle>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddOwnerOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add owner
                  </Button>
                </CardHeader>
                <CardContent>
                  {!customer.beneficialOwners?.length ? (
                    <div className="flex flex-col items-center py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        No beneficial owners recorded. For companies and trusts, you must identify all beneficial owners with ≥25% ownership.
                      </p>
                      <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setAddOwnerOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add first owner
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {(customer.beneficialOwners as BeneficialOwner[]).map((bo) => (
                        <div key={bo.id} className="py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium text-sm">{bo.givenNames} {bo.familyName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                <span className="font-semibold text-foreground">{bo.ownershipPct}%</span> ownership
                                {bo.isController ? ' · Controller' : ''}
                                {bo.roleTitle ? ` · ${bo.roleTitle}` : ''}
                              </div>
                            </div>
                            <StatusBadge status={bo.identityStatus} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Checks Tab */}
            <TabsContent value="checks">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Identity & Screening Checks
                  </CardTitle>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1.5" onClick={() => setRunCheckOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Run check
                  </Button>
                </CardHeader>
                <CardContent className={checksLoading || checks.length > 0 ? 'p-0' : undefined}>
                  {checksLoading ? (
                    <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
                  ) : checks.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center px-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">No checks run yet. Run identity, sanctions, PEP, and registry checks to verify this customer.</p>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={() => setRunCheckOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Run first check
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {checks.map((check) => {
                        const cfg = CHECK_STATUS_CONFIG[check.status] ?? CHECK_STATUS_CONFIG['PENDING']!;
                        const StatusIcon = cfg.icon;
                        return (
                          <div key={check.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                              <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{check.checkType}</span>
                                <Badge variant="outline" className="text-[10px] h-5">{check.provider}</Badge>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {cfg.label}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatDateTime(check.createdAt)}
                                {check.completedAt && ` · Completed ${formatDateTime(check.completedAt)}`}
                              </div>
                            </div>
                            {check.results && check.results.length > 0 && (
                              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                                {check.results[0]?.outcome ?? 'No outcome'}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Documents & Evidence
                  </CardTitle>
                </CardHeader>
                <CardContent className={docsLoading || allDocs.length > 0 ? 'p-0' : undefined}>
                  {docsLoading ? (
                    <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
                  ) : allDocs.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center px-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">No documents yet. Documents and evidence files will appear here once generated.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {allDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 flex-shrink-0">
                            <FileText className="h-4 w-4 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{doc.fileName ?? doc.documentType}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {doc.documentType.replace(/_/g, ' ')} · {formatDate(doc.createdAt)}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Risk Assessment */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Risk Assessment</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openRisk}>
                <Edit3 className="h-3 w-3 mr-1" />
                Update
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <RiskBadge rating={customer.riskRating} />
                <Badge variant="outline" className="text-xs">{customer.cddLevel} CDD</Badge>
              </div>
              {customer.riskNotes && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">{customer.riskNotes}</p>
              )}
              {customer.nextReviewDue && (
                <div className="mt-3 text-xs">
                  <span className="text-muted-foreground">Next review: </span>
                  <span className="font-medium">{formatDate(customer.nextReviewDue)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Onboarding Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Onboarding Status</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openStatus}>
                <Edit3 className="h-3 w-3 mr-1" />
                Change
              </Button>
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

          {/* Quick check summary */}
          {checks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Check Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(['PASS', 'FAIL', 'REFER', 'PENDING'] as const).map((s) => {
                    const count = checks.filter((c) => c.status === s).length;
                    if (!count) return null;
                    const cfg = CHECK_STATUS_CONFIG[s]!;
                    const Icon = cfg.icon;
                    return (
                      <div key={s} className="flex items-center justify-between text-xs">
                        <span className={`flex items-center gap-1.5 ${cfg.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                        <span className="font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Edit Customer Dialog ─────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="customer@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+61 4XX XXX XXX" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address line 1</Label>
              <Input value={editForm.addressLine1} onChange={(e) => setEditForm((p) => ({ ...p, addressLine1: e.target.value }))} placeholder="123 Street Name" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-1">
                <Label>Suburb</Label>
                <Input value={editForm.suburb} onChange={(e) => setEditForm((p) => ({ ...p, suburb: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={editForm.state} onValueChange={(v) => setEditForm((p) => ({ ...p, state: v }))}>
                  <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {['NSW','VIC','QLD','SA','WA','TAS','ACT','NT'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Postcode</Label>
                <Input value={editForm.postcode} onChange={(e) => setEditForm((p) => ({ ...p, postcode: e.target.value }))} placeholder="2000" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={updateCustomer.isPending}
              onClick={() => updateCustomer.mutate(editForm)}>
              {updateCustomer.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Risk Rating Dialog ───────────────────────────────────────── */}
      <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Update Risk Rating
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Risk rating <span className="text-destructive">*</span></Label>
                <Select value={riskForm.riskRating} onValueChange={(v) => setRiskForm((p) => ({ ...p, riskRating: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                  <SelectContent>
                    {['LOW','MEDIUM','HIGH','CRITICAL','UNRATED'].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>CDD level <span className="text-destructive">*</span></Label>
                <Select value={riskForm.cddLevel} onValueChange={(v) => setRiskForm((p) => ({ ...p, cddLevel: v }))}>
                  <SelectTrigger><SelectValue placeholder="CDD level" /></SelectTrigger>
                  <SelectContent>
                    {['SDD','STANDARD','EDD'].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Risk notes</Label>
              <Textarea rows={3} placeholder="Reason for this risk classification…"
                value={riskForm.riskNotes} onChange={(e) => setRiskForm((p) => ({ ...p, riskNotes: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason for change <span className="text-destructive">*</span></Label>
              <Input placeholder="Regulatory or policy justification (min 10 chars)" value={riskForm.reason}
                onChange={(e) => setRiskForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={updateRisk.isPending || !riskForm.riskRating || riskForm.reason.trim().length < 10}
              onClick={() => updateRisk.mutate({ riskRating: riskForm.riskRating, cddLevel: riskForm.cddLevel, riskNotes: riskForm.riskNotes, reason: riskForm.reason })}>
              {updateRisk.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Update risk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Status Change Dialog ─────────────────────────────────────── */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-400" />
              Change Customer Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>New status <span className="text-destructive">*</span></Label>
              <Select value={statusForm.status} onValueChange={(v) => setStatusForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {['DRAFT','PENDING_CDD','CDD_IN_PROGRESS','ACTIVE','SUSPENDED','EXITED','REJECTED'].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Input placeholder="Reason for status change (min 10 chars)" value={statusForm.reason}
                onChange={(e) => setStatusForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={updateStatus.isPending || !statusForm.status || statusForm.reason.trim().length < 10}
              onClick={() => updateStatus.mutate(statusForm)}>
              {updateStatus.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Update status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Run Check Dialog ─────────────────────────────────────────── */}
      <Dialog open={runCheckOpen} onOpenChange={setRunCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-indigo-400" />
              Run Compliance Check
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Check type <span className="text-destructive">*</span></Label>
                <Select value={checkForm.checkType} onValueChange={(v) => setCheckForm((p) => ({ ...p, checkType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['IDENTITY','REGISTRY','SANCTIONS','PEP','AML','ADDRESS','DOCUMENT'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select value={checkForm.provider} onValueChange={(v) => setCheckForm((p) => ({ ...p, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['MOCK','GREENID','EQUIFAX','ILLION','REFINITIV','TRULIOO'].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Input placeholder="Regulatory justification (min 10 chars)" value={checkForm.reason}
                onChange={(e) => setCheckForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
            <div className="rounded-xl bg-muted/40 border px-4 py-3 text-xs text-muted-foreground">
              Check will be run asynchronously. Results appear in the Checks tab once complete.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunCheckOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={runCheck.isPending || checkForm.reason.trim().length < 10}
              onClick={() => runCheck.mutate()}>
              {runCheck.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Running…</> : 'Run check'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Beneficial Owner Dialog ──────────────────────────────── */}
      <Dialog open={addOwnerOpen} onOpenChange={setAddOwnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-400" />
              Add Beneficial Owner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Given names <span className="text-destructive">*</span></Label>
                <Input value={ownerForm.givenNames} onChange={(e) => setOwnerForm((p) => ({ ...p, givenNames: e.target.value }))} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <Label>Family name <span className="text-destructive">*</span></Label>
                <Input value={ownerForm.familyName} onChange={(e) => setOwnerForm((p) => ({ ...p, familyName: e.target.value }))} placeholder="Smith" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ownership % <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} max={100} value={ownerForm.ownershipPct}
                  onChange={(e) => setOwnerForm((p) => ({ ...p, ownershipPct: e.target.value }))} placeholder="e.g. 50" />
              </div>
              <div className="space-y-1.5">
                <Label>Role / title</Label>
                <Input value={ownerForm.roleTitle} onChange={(e) => setOwnerForm((p) => ({ ...p, roleTitle: e.target.value }))} placeholder="e.g. Director" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOwnerForm((p) => ({ ...p, isController: !p.isController }))}
                className={`relative h-5 w-9 rounded-full transition-colors ${ownerForm.isController ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${ownerForm.isController ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <Label className="text-sm font-normal cursor-pointer" onClick={() => setOwnerForm((p) => ({ ...p, isController: !p.isController }))}>
                This person is a controller of the entity
              </Label>
            </div>
            <div className="rounded-xl border bg-blue-500/5 border-blue-500/20 px-4 py-3 text-xs text-muted-foreground">
              Under the AML/CTF Act, you must identify all beneficial owners who hold ≥25% ownership interest or effective control.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOwnerOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
              disabled={addOwner.isPending || !ownerForm.givenNames || !ownerForm.familyName || !ownerForm.ownershipPct}
              onClick={() => addOwner.mutate()}>
              {addOwner.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding…</> : 'Add owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
