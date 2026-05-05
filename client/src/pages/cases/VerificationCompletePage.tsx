import { Link } from 'wouter';
import { CheckCircle2, FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VerificationCompletePage() {
  const params = new URLSearchParams(window.location.search);
  const caseId = params.get('case_id') ?? params.get('caseId');

  return (
    <div className="p-6 min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <div>
            <h1 className="text-xl font-semibold">Verification Submitted</h1>
            <p className="text-sm text-muted-foreground mt-1">
              The Didit hosted verification flow has returned to Integrity Solve. The result will appear in the case when the webhook is received.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href={caseId ? `/cases/${caseId}` : '/cases'}>
              <FolderOpen className="h-4 w-4" />
              {caseId ? 'Back to Case' : 'Back to Cases'}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
