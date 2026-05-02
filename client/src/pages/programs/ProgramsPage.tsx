import { Link } from 'wouter';
import { Plus, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { programApi, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { ProgramForm } from '@shared/schema';

export default function ProgramsPage() {
  const qc = useQueryClient();
  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn:  () => programApi.list() as Promise<ProgramForm[]>,
  });

  const createProgram = useMutation({
    mutationFn: () => programApi.create({ title: 'AML/CTF Program' }),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program created');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create program');
    },
  });

  return (
    <div>
      <PageHeader
        title="AML/CTF Program"
        description="Build and manage your AML/CTF compliance program documentation."
        actions={
          <Button onClick={() => createProgram.mutate()} disabled={createProgram.isPending}>
            <Plus className="h-4 w-4" />
            New program
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !programs?.length ? (
        <EmptyState
          icon={FileText}
          title="No AML/CTF program yet"
          description="Australian reporting entities must maintain a compliant AML/CTF program. Create yours to get started."
          action={
            <Button onClick={() => createProgram.mutate()} disabled={createProgram.isPending}>
              Create AML/CTF program
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{program.title}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Step {program.currentStep} of 12 · Last updated {formatDate(program.updatedAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={program.status} />
                  <Button asChild size="sm">
                    <Link href={`/programs/${program.id}/wizard`}>
                      <a>{program.status === 'NOT_STARTED' ? 'Start' : program.status === 'COMPLETE' ? 'View' : 'Continue'}</a>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
