import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { trainingApi } from '@/lib/api';
import { GraduationCap, Plus, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
  NOT_STARTED: { label: 'Not Started',  variant: 'outline' },
  IN_PROGRESS: { label: 'In Progress',  variant: 'warning' },
  COMPLETED:   { label: 'Completed',    variant: 'success' },
  EXPIRED:     { label: 'Expired',      variant: 'warning' },
  FAILED:      { label: 'Failed',       variant: 'destructive' },
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

export default function TrainingPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [module, setModule] = useState(MODULES[0]!);
  const [scoreOpen, setScoreOpen] = useState<string | null>(null);
  const [score, setScore] = useState('');

  const { data: records, isLoading } = useQuery({
    queryKey: ['training'],
    queryFn:  () => trainingApi.list() as Promise<TrainingRecord[]>,
  });

  const enroll = useMutation({
    mutationFn: (data: { userId: string; moduleName: string }) =>
      trainingApi.enroll(data),
    onSuccess: () => {
      toast.success('Enrolled in training module');
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

  const completedCount = records?.filter((r) => r.status === 'COMPLETED').length ?? 0;
  const totalCount     = records?.length ?? 0;
  const completionPct  = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Training Tracker"
        description="Monitor and manage AML/CTF training compliance for your team."
        action={
          <Button onClick={() => setEnrollOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Enrol in Module
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">Total Enrolments</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">Completed</div>
            <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">In Progress</div>
            <div className="text-2xl font-bold text-amber-600">
              {records?.filter((r) => r.status === 'IN_PROGRESS').length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground mb-1">Team Completion</div>
            <div className="text-2xl font-bold">{completionPct}%</div>
            <div className="h-1.5 mt-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : !records?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No training records yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Enrol team members in AML/CTF training modules.
            </p>
            <Button onClick={() => setEnrollOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Enrol in Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Module</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Attempts</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => {
                    const sc = STATUS_CONFIG[r.status] ?? { label: r.status, variant: 'outline' };
                    const passed = r.score !== null && r.score >= r.passingScore;
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.userFullName ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.moduleName}</div>
                          <div className="text-xs text-muted-foreground">v{r.moduleVersion}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {r.score !== null ? (
                            <span className={passed ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                              {r.score}% {passed ? <CheckCircle className="inline h-3 w-3" /> : <XCircle className="inline h-3 w-3" />}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.attempts}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {r.expiresAt ? formatDate(r.expiresAt) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.status !== 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => setScoreOpen(r.id)}
                            >
                              Record Score
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

      {/* Enrol dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enrol in Training Module</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Module</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={module}
                onChange={(e) => setModule(e.target.value)}
              >
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button
              onClick={() => enroll.mutate({ userId: user!.id, moduleName: module })}
              disabled={enroll.isPending}
            >
              {enroll.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Enrol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score dialog */}
      <Dialog open={!!scoreOpen} onOpenChange={(o) => !o && setScoreOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Training Score</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Score (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 85"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoreOpen(null)}>Cancel</Button>
            <Button
              onClick={() => {
                const s = Number(score);
                const record = records?.find((r) => r.id === scoreOpen);
                const status = record && s >= record.passingScore ? 'COMPLETED' : 'FAILED';
                updateScore.mutate({ id: scoreOpen!, score: s, status });
              }}
              disabled={!score || updateScore.isPending}
            >
              {updateScore.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
