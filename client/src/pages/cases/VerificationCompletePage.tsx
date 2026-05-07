import { Link } from 'wouter';
import { CheckCircle2, FolderOpen, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

function StatusIcon({ status }: { status: string | null }) {
  const s = (status ?? '').toLowerCase();
  if (s === 'approved')
    return <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />;
  if (s === 'declined' || s === 'rejected' || s === 'failed')
    return <XCircle className="h-12 w-12 text-red-500 mx-auto" />;
  if (s === 'review' || s === 'pending')
    return <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />;
  return <Clock className="h-12 w-12 text-muted-foreground mx-auto" />;
}

function statusBadgeClass(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
  if (s === 'declined' || s === 'rejected' || s === 'failed') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  if (s === 'review' || s === 'pending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  return 'bg-muted text-muted-foreground';
}

export default function VerificationCompletePage() {
  const params = new URLSearchParams(window.location.search);
  const caseId            = params.get('case_id') ?? params.get('caseId');
  const verificationSessionId = params.get('verificationSessionId') ?? params.get('session_id');
  const status            = params.get('status');

  const { isAuthed, isLoading: authLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-lg w-full shadow-lg">
        <CardContent className="p-8 space-y-6 text-center">

          <StatusIcon status={status} />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Verification Submitted</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your identity verification has been submitted to Integrity Solve.
              The final result will appear in the compliance case after Didit sends the webhook confirmation.
            </p>
          </div>

          {status && (
            <div className="flex justify-center">
              <Badge className={statusBadgeClass(status)}>
                Status received: {status}
              </Badge>
            </div>
          )}

          {verificationSessionId && (
            <div className="rounded-lg bg-muted p-3 text-left space-y-1">
              <div className="text-xs text-muted-foreground font-medium">Verification Session ID</div>
              <div className="font-mono text-xs break-all">{verificationSessionId}</div>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300 text-left">
            <strong>Important:</strong> This page only confirms the verification was submitted.
            The result shown above is the status Didit returned at redirect time — the authoritative
            decision arrives via webhook and will update your compliance case automatically.
          </div>

          <p className="text-sm text-muted-foreground">You may close this tab at any time.</p>

          {!authLoading && isAuthed && caseId && (
            <Button asChild className="w-full gap-2">
              <Link href={`/cases/${caseId}`}>
                <FolderOpen className="h-4 w-4" />
                Back to Case
              </Link>
            </Button>
          )}

          {!authLoading && isAuthed && !caseId && (
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href="/cases">
                <FolderOpen className="h-4 w-4" />
                Back to Cases
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
