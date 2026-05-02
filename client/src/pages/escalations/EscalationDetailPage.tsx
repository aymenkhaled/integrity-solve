import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RiskBadge } from '@/components/shared/RiskBadge';
import { escalationApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Escalation, SmrDraft } from '@shared/schema';

export default function EscalationDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['escalations', params.id],
    queryFn:  () => escalationApi.get(params.id!) as Promise<Escalation & { smrDrafts: SmrDraft[] }>,
  });

  const escalateMutation = useMutation({
    mutationFn: () => escalationApi.escalate(params.id!, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('Escalated to SMR');
      setReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to escalate'),
  });

  const closeMutation = useMutation({
    mutationFn: () => escalationApi.close(params.id!, { reason, closeType: 'CLOSED_NO_ACTION' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['escalations', params.id] });
      toast.success('Escalation closed');
      setReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to close'),
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Escalation not found.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/escalations"><a>Back</a></Link>
        </Button>
      </div>
    );
  }

  const isOpen = !['CLOSED_NO_ACTION', 'CLOSED_FALSE_POSITIVE', 'SMR_SUBMITTED'].includes(data.status);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/escalations"><a><ArrowLeft className="h-4 w-4" />Escalations</a></Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{data.subject}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={data.status} />
            <RiskBadge rating={data.riskRating} />
            <span className="text-sm text-muted-foreground">Created {formatDate(data.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{data.summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Grounds for Escalation</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{data.grounds}</p>
            </CardContent>
          </Card>

          {/* SMR Drafts */}
          {data.smrDrafts && data.smrDrafts.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">SMR Drafts</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y">
                  {data.smrDrafts.map((smr) => (
                    <div key={smr.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{smr.reportingEntity}</div>
                        <StatusBadge status={smr.status} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {formatDateTime(smr.createdAt)}
                        {smr.submittedAt && ` · Submitted ${formatDateTime(smr.submittedAt)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">
          {isOpen && (
            <Card>
              <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-xs text-muted-foreground">(required, min 10 chars)</span></Label>
                  <Input
                    placeholder="Reason for action..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                {data.status === 'DRAFT' || data.status === 'UNDER_REVIEW' ? (
                  <Button
                    className="w-full"
                    onClick={() => escalateMutation.mutate()}
                    disabled={reason.trim().length < 10 || escalateMutation.isPending}
                  >
                    {escalateMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Escalating...</>
                      : 'Escalate to SMR'}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => closeMutation.mutate()}
                  disabled={reason.trim().length < 10 || closeMutation.isPending}
                >
                  Close — No Action Required
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{formatDate(data.createdAt)}</span>
                </div>
                {data.reviewedAt && (
                  <div className="flex justify-between">
                    <span>Reviewed</span>
                    <span>{formatDate(data.reviewedAt)}</span>
                  </div>
                )}
                {data.closedAt && (
                  <div className="flex justify-between">
                    <span>Closed</span>
                    <span>{formatDate(data.closedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
