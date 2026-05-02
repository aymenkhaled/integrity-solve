import { useState } from 'react';
import { Plus, Users2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { workspaceApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, initials } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Valid email required'),
  role:  z.enum(['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'PROGRAM_CONTRIBUTOR', 'ONBOARDING_USER', 'REVIEWER', 'READ_ONLY']),
});

type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
  WORKSPACE_ADMIN:    'Workspace Admin',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  PROGRAM_CONTRIBUTOR: 'Program Contributor',
  ONBOARDING_USER:   'Onboarding User',
  REVIEWER:          'Reviewer',
  READ_ONLY:         'Read Only',
};

interface Member {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
}

export default function MembersPage() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn:  () => workspaceApi.members() as Promise<Member[]>,
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'COMPLIANCE_OFFICER' },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: FormData) => workspaceApi.invite(data),
    onSuccess: (data: unknown) => {
      const d = data as { _devToken?: string };
      if (d?._devToken) toast.info(`Dev invite token: ${d._devToken}`, { duration: 30000 });
      toast.success('Invitation sent');
      reset();
      setOpen(false);
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to send invite'),
  });

  return (
    <div>
      <PageHeader
        title="Team Members"
        description="Manage who has access to this workspace."
        actions={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Invite member</Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !members?.length ? (
            <EmptyState
              icon={Users2}
              title="No members yet"
              description="Invite your team to collaborate on compliance."
              action={<Button onClick={() => setOpen(true)}>Invite member</Button>}
              className="py-16"
            />
          ) : (
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                    {initials(m.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{m.fullName ?? m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                    <Badge variant={m.status === 'ACTIVE' ? 'success' : 'warning'}>{m.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground hidden md:block">
                    {m.joinedAt ? `Joined ${formatDate(m.joinedAt)}` : 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => inviteMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email address</Label>
              <Input type="email" placeholder="colleague@firm.com.au" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select defaultValue="COMPLIANCE_OFFICER" onValueChange={(v) => setValue('role', v as FormData['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : 'Send invitation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
