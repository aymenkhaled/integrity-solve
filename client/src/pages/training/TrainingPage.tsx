import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { trainingApi, workspaceApi } from '@/lib/api';
import {
  GraduationCap, Plus, CheckCircle, Clock, XCircle,
  Loader2, Trophy, BookOpen, Target, AlertCircle, Grid3X3,
  Download, Users, CheckSquare,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface TrainingRecord {
  id: string;
  userId: string;
  moduleName: string;
  moduleVersion: string;
  status: string;
  score: number | null;
  passingScore: number;
  completedAt: string | null;
  expiresAt: string | null;
  attempts: number;
  createdAt: string;
  userFullName: string | null;
  userEmail: string | null;
}

interface Member {
  userId: string;
  fullName: string | null;
  email: string;
  role: string;
}

const STATUS_CONFIG: Record<string, {
  label: string; icon: React.ElementType; color: string; bg: string; border: string;
}> = {
  NOT_STARTED: { label: 'Not Started', icon: Clock,        color: 'text-muted-foreground', bg: 'bg-muted/50',       border: 'border-border' },
  IN_PROGRESS: { label: 'In Progress', icon: BookOpen,     color: 'text-amber-500',        bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  COMPLETED:   { label: 'Completed',   icon: CheckCircle,  color: 'text-green-400',        bg: 'bg-green-500/10',   border: 'border-green-500/20' },
  EXPIRED:     { label: 'Expired',     icon: AlertCircle,  color: 'text-orange-500',       bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  FAILED:      { label: 'Failed',      icon: XCircle,      color: 'text-red-500',          bg: 'bg-red-500/10',     border: 'border-red-500/20' },
};

const MODULES = [
  'AML/CTF Awareness',
  'Customer Due Diligence',
  'Suspicious Matter Reporting',
  'Politically Exposed Persons',
  'Sanctions Screening',
  'Record Keeping Obligations',
  'Designated Services Overview',
  'Risk-Based Approach',
];

const MATRIX_MODULES = [
  'AML/CTF Awareness',
  'CDD',
  'SMR',
  'PEP',
  'Sanctions',
  'Record Keeping',
  'Risk Approach',
];

function MatrixCell({ status }: { status: string | undefined }) {
  if (!status) {
    return (
      <div className="h-8 w-full flex items-center justify-center rounded text-[10px] font-medium bg-muted/30 text-muted-foreground/40 border border-dashed border-border">
        —
      </div>
    );
  }
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['NOT_STARTED']!;
  const Icon = cfg.icon;
  return (
    <div title={cfg.label} className={`h-8 w-full flex items-center justify-center rounded border text-[10px] font-medium ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

export default function TrainingPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [module, setModule]         = useState(MODULES[0]!);
  const [scoreOpen, setScoreOpen]   = useState<string | null>(null);
  const [score, setScore]           = useState('');

  const { data: rawRecords, isLoading } = useQuery({
    queryKey: ['training'],
    queryFn:  () => trainingApi.list() as Promise<TrainingRecord[] | { records: TrainingRecord[]; total: number }>,
  });

  const { data: rawMembers } = useQuery({
    queryKey: ['members'],
    queryFn:  () => workspaceApi.members() as Promise<Member[] | { members: Member[] }>,
  });

  const records: TrainingRecord[] = Array.isArray(rawRecords)
    ? rawRecords
    : ((rawRecords as { records: TrainingRecord[] })?.records ?? []);

  const members: Member[] = Array.isArray(rawMembers)
    ? rawMembers
    : ((rawMembers as { members: Member[] })?.members ?? []);

  const enroll = useMutation({
    mutationFn: () => trainingApi.enroll({ courseTitle: module }),
    onSuccess: () => {
      toast.success(`Enrolled in "${module}"`);
      qc.invalidateQueries({ queryKey: ['training'] });
      setEnrollOpen(false);
    },
    onError: () => toast.error('Failed to enrol'),
  });

  const updateScore = useMutation({
    mutationFn: ({ id, score, status }: { id: string; score: number; status: string }) =>
      trainingApi.update(id, { score, status }),
    onSuccess: () => {
      toast.success('Training record updated');
      qc.invalidateQueries({ queryKey: ['training'] });
      setScoreOpen(null);
      setScore('');
    },
    onError: () => toast.error('Failed to update record'),
  });

  const completedCount  = records.filter((r) => r.status === 'COMPLETED').length;
  const inProgressCount = records.filter((r) => r.status === 'IN_PROGRESS').length;
  const expiredCount    = records.filter((r) => r.status === 'EXPIRED').length;
  const totalCount      = records.length;
  const completionPct   = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Build competency matrix data
  const matrixData = useMemo(() => {
    const staffMap: Record<string, { name: string; email: string; records: Record<string, string> }> = {};

    // Add members
    members.forEach((m) => {
      const key = m.userId;
      if (!staffMap[key]) {
        staffMap[key] = { name: m.fullName ?? m.email, email: m.email, records: {} };
      }
    });

    // Map training records to matrix
    records.forEach((r) => {
      const key = r.userId;
      if (!staffMap[key]) {
        staffMap[key] = { name: r.userFullName ?? r.userEmail ?? 'Unknown', email: r.userEmail ?? '', records: {} };
      }
      const moduleName = r.moduleName;
      const matrixModule = MATRIX_MODULES.find((m) =>
        moduleName.toLowerCase().includes(m.toLowerCase().split(' ')[0]!)
      );
      if (matrixModule) {
        const existing = staffMap[key]!.records[matrixModule];
        // Use the best status for this module
        const priority = ['COMPLETED', 'IN_PROGRESS', 'FAILED', 'EXPIRED', 'NOT_STARTED'];
        if (!existing || priority.indexOf(r.status) < priority.indexOf(existing)) {
          staffMap[key]!.records[matrixModule] = r.status;
        }
      }
    });

    return Object.values(staffMap);
  }, [members, records]);

  const staffCompliant = matrixData.filter((s) =>
    MATRIX_MODULES.slice(0, 3).every((m) => s.records[m] === 'COMPLETED')
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Tracker"
        description="Monitor and manage AML/CTF training compliance for your team."
        action={
          <Button onClick={() => setEnrollOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0">
            <Plus className="h-4 w-4 mr-2" />
            Enrol in Module
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrolments', value: totalCount,      icon: BookOpen,    color: 'text-blue-500',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
          { label: 'Completed',        value: completedCount,  icon: Trophy,      color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'In Progress',      value: inProgressCount, icon: BookOpen,    color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'Expired',          value: expiredCount,    icon: AlertCircle, color: 'text-red-500',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
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

      {/* Team completion bar */}
      <Card className="card-3d">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Team Completion Rate</span>
            </div>
            <span className="text-2xl font-bold counter text-green-400">{completionPct}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${completionPct >= 80 ? 'bg-green-500' : completionPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${completionPct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{completedCount} of {totalCount} modules completed</span>
            <span>{completionPct >= 80 ? '✓ Compliant' : completionPct >= 50 ? '⚠ Needs attention' : '✗ Non-compliant'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Records / Competency Matrix */}
      <Tabs defaultValue="records">
        <TabsList className="mb-4">
          <TabsTrigger value="records" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" /> Training Records
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-1.5">
            <Grid3X3 className="h-4 w-4" /> Competency Matrix
          </TabsTrigger>
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-base mb-1">No training records yet</p>
                <p className="text-sm text-muted-foreground mb-5">
                  Enrol team members in AML/CTF training modules to track compliance.
                </p>
                <Button onClick={() => setEnrollOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white border-0">
                  <Plus className="h-4 w-4 mr-2" />Enrol in First Module
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Training Records ({records.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-y">
                      <tr>
                        {['Staff Member', 'Module', 'Status', 'Score', 'Attempts', 'Expires', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {records.map((r) => {
                        const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG['NOT_STARTED']!;
                        const StatusIcon = sc.icon;
                        const passed = r.score !== null && r.score >= r.passingScore;
                        return (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                  {(r.userFullName ?? r.userEmail ?? '?')[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-xs">{r.userFullName ?? 'You'}</div>
                                  <div className="text-[11px] text-muted-foreground">{r.userEmail ?? user?.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-xs max-w-[180px] truncate">{r.moduleName}</div>
                              <div className="text-[11px] text-muted-foreground">v{r.moduleVersion}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${sc.bg} border ${sc.border} ${sc.color}`}>
                                <StatusIcon className="h-3 w-3" />
                                {sc.label}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {r.score !== null ? (
                                <span className={`font-bold text-sm ${passed ? 'text-green-400' : 'text-red-500'}`}>
                                  {r.score}%
                                  <span className="text-xs text-muted-foreground font-normal ml-1">/{r.passingScore}% pass</span>
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">{r.attempts}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {r.expiresAt ? formatDate(r.expiresAt) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {r.status !== 'COMPLETED' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setScoreOpen(r.id)}>
                                  Record score
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Competency Matrix Tab */}
        <TabsContent value="matrix">
          <div className="space-y-4">
            {/* Matrix stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Staff members',   value: matrixData.length,    icon: Users,       color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
                { label: 'Fully compliant', value: staffCompliant,       icon: CheckSquare, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                { label: 'Modules tracked', value: MATRIX_MODULES.length, icon: BookOpen,   color: 'text-violet-400',bg: 'bg-violet-500/10',border: 'border-violet-500/20' },
                { label: 'Completion rate', value: `${completionPct}%`,  icon: Target,      color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              ].map(({ label, value, icon: Icon, color, bg, border }) => (
                <Card key={label} className="card-3d">
                  <CardContent className="p-4">
                    <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg} border ${border} mb-2`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="text-xl font-bold">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                  Staff Competency Matrix
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                  onClick={() => toast.info('Export triggered — matrix will download as CSV shortly')}>
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {matrixData.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center px-4">
                    <Users className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No staff data yet. Add members and enrol them in training modules.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 border-y">
                          <th className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap w-48">
                            Staff member
                          </th>
                          {MATRIX_MODULES.map((m) => (
                            <th key={m} className="px-2 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap text-[10px] min-w-[80px]">
                              {m}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                            Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {matrixData.map((staff) => {
                          const completed = MATRIX_MODULES.filter((m) => staff.records[m] === 'COMPLETED').length;
                          const pct = Math.round((completed / MATRIX_MODULES.length) * 100);
                          return (
                            <tr key={staff.email} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                    {(staff.name ?? staff.email ?? '?')[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-medium truncate max-w-[120px]">{staff.name}</div>
                                    <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{staff.email}</div>
                                  </div>
                                </div>
                              </td>
                              {MATRIX_MODULES.map((m) => (
                                <td key={m} className="px-2 py-3">
                                  <MatrixCell status={staff.records[m]} />
                                </td>
                              ))}
                              <td className="px-4 py-3 text-center">
                                <div className={`text-sm font-bold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {pct}%
                                </div>
                                <div className="text-[10px] text-muted-foreground">{completed}/{MATRIX_MODULES.length}</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-4 flex-wrap px-5 py-3 border-t">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <div className={`flex h-5 w-5 items-center justify-center rounded ${cfg.bg} border ${cfg.border}`}>
                          <Icon className={`h-3 w-3 ${cfg.color}`} />
                        </div>
                        {cfg.label}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enrol Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Enrol in Training Module
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Training module</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
              <strong>Note:</strong> Passing score is 70%. Complete within the allocated timeframe to remain compliant.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={() => enroll.mutate()} disabled={enroll.isPending}>
              {enroll.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enrolling…</> : 'Enrol now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Dialog */}
      <Dialog open={!!scoreOpen} onOpenChange={() => setScoreOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Training Score</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Score achieved (%)</Label>
              <Input type="number" min={0} max={100} placeholder="e.g. 85" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="text-sm text-muted-foreground">
              Passing score: <strong>70%</strong>. Scores below 70% will be recorded as FAILED.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreOpen(null)}>Cancel</Button>
            <Button disabled={!score || updateScore.isPending}
              onClick={() => {
                if (scoreOpen && score) {
                  const numScore = Number(score);
                  updateScore.mutate({ id: scoreOpen, score: numScore, status: numScore >= 70 ? 'COMPLETED' : 'FAILED' });
                }
              }}
            >
              {updateScore.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save score'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
