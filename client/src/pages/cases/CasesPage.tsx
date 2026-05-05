import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { casesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FolderOpen, Plus, Shield, AlertTriangle, CheckCircle2, Clock,
  FileText, ArrowRight, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Case {
  id: string;
  caseType: string;
  status: string;
  title: string;
  designatedService?: string;
  partyType?: string;
  riskLevel?: string;
  recommendation?: string;
  createdAt: string;
}

const RISK_BADGE: Record<string, string> = {
  low:          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  medium:       'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  high:         'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  not_assessed: 'bg-muted text-muted-foreground',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  DRAFT:       <Clock className="h-4 w-4 text-muted-foreground" />,
  IN_PROGRESS: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
  COMPLETED:   <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  ARCHIVED:    <FileText className="h-4 w-4 text-muted-foreground" />,
};

const DESIGNATED_SERVICES = [
  'Account providers',
  'Bullion dealers',
  'Digital currency exchange',
  'Gambling service providers',
  'International funds transfer',
  'Loan providers',
  'Mortgage brokers',
  'Real estate agents',
  'Solicitors / Conveyancers',
  'Superannuation trustees',
  'Other remittance dealers',
];

export default function CasesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    caseType:         'TRANSACTION_CDD' as 'TRANSACTION_CDD' | 'PROGRAM_SETUP',
    title:            '',
    designatedService: '',
    partyType:        '' as '' | 'individual' | 'company' | 'trust' | 'beneficial_owner',
  });

  const { data, isLoading } = useQuery<{ data: Case[] }>({
    queryKey: ['cases'],
    queryFn:  () => casesApi.list() as Promise<{ data: Case[] }>,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) => casesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      setOpen(false);
      setForm({ caseType: 'TRANSACTION_CDD', title: '', designatedService: '', partyType: '' });
      toast.success('Case created — start the wizard to guide through verification.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const caseList = data?.data ?? [];

  const programCases    = caseList.filter(c => c.caseType === 'PROGRAM_SETUP');
  const transactionCases = caseList.filter(c => c.caseType === 'TRANSACTION_CDD');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            Cases
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Wizard-led AML/CTF compliance cases — program setup and transaction CDD
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />New Case</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Case Type</Label>
                <Select
                  value={form.caseType}
                  onValueChange={(v) => setForm(f => ({ ...f, caseType: v as typeof form.caseType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSACTION_CDD">Transaction / CDD</SelectItem>
                    <SelectItem value="PROGRAM_SETUP">AML Program Setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Case Title</Label>
                <Input
                  placeholder={form.caseType === 'PROGRAM_SETUP' ? 'e.g. Acme Realty AML Program 2025' : 'e.g. Smith – Property Purchase CDD'}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {form.caseType === 'TRANSACTION_CDD' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Designated Service</Label>
                    <Select
                      value={form.designatedService}
                      onValueChange={v => setForm(f => ({ ...f, designatedService: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service…" />
                      </SelectTrigger>
                      <SelectContent>
                        {DESIGNATED_SERVICES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Party Type</Label>
                    <Select
                      value={form.partyType}
                      onValueChange={v => setForm(f => ({ ...f, partyType: v as typeof form.partyType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Who is the service for?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="trust">Trust</SelectItem>
                        <SelectItem value="beneficial_owner">Beneficial Owner / Controller</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                className="w-full"
                disabled={!form.title || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Case & Start Wizard'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cases',   value: caseList.length,                                icon: FolderOpen },
          { label: 'In Progress',   value: caseList.filter(c => c.status === 'IN_PROGRESS').length,  icon: RefreshCw },
          { label: 'Completed',     value: caseList.filter(c => c.status === 'COMPLETED').length,    icon: CheckCircle2 },
          { label: 'High Risk',     value: caseList.filter(c => c.riskLevel === 'high').length,      icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="text-center text-muted-foreground py-12">Loading cases…</div>
      )}

      {/* Transaction Cases */}
      {transactionCases.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Transaction / CDD Cases
          </h2>
          <div className="space-y-2">
            {transactionCases.map(c => (
              <CaseRow key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* Program Cases */}
      {programCases.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            AML Program Setup Cases
          </h2>
          <div className="space-y-2">
            {programCases.map(c => (
              <CaseRow key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && caseList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold">No cases yet</p>
            <p className="text-muted-foreground text-sm mb-6">
              Create your first case to start the wizard-led compliance workflow
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Create First Case
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CaseRow({ c }: { c: Case }) {
  return (
    <Link href={`/cases/${c.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">{STATUS_ICON[c.status] ?? <Clock className="h-4 w-4" />}</div>
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  {c.designatedService && <span>{c.designatedService}</span>}
                  {c.partyType && <span className="capitalize">· {c.partyType.replace('_', ' ')}</span>}
                  <span>· {new Date(c.createdAt).toLocaleDateString('en-AU')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.riskLevel && c.riskLevel !== 'not_assessed' && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', RISK_BADGE[c.riskLevel])}>
                  {c.riskLevel} risk
                </span>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                {c.status.replace('_', ' ').toLowerCase()}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
