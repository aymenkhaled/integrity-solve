import { useState } from 'react';
import { Plus, Users2, Loader2, Mail, Shield, Clock, Crown, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workspaceApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatRelative, initials } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Valid email required'),
  role:  z.enum(['WORKSPACE_ADMIN', 'COMPLIANCE_OFFICER', 'PROGRAM_CONTRIBUTOR', 'ONBOARDING_USER', 'REVIEWER', 'READ_ONLY']),
});

type FormData = z.infer<typeof schema>;

const ROLE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  WORKSPACE_ADMIN:     { label: 'Workspace Admin',    icon: Crown,        color: 'text-amber-600',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   description: 'Full control over all workspace settings and members' },
  COMPLIANCE_OFFICER:  { label: 'Compliance Officer', icon: Shield,       color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', description: 'Manage AML program, SMRs, reviews, and escalations' },
  PROGRAM_CONTRIBUTOR: { label: 'Program Contributor', icon: CheckCircle2, color: 'text-blue-600',   bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    description: 'Contribute to program drafts and reviews' },
  ONBOARDING_USER:     { label: 'Onboarding User',   icon: Users2,       color: 'text-purple-600',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  description: 'Onboard customers and collect CDD documents' },
  REVIEWER:            { label: 'Reviewer',           icon: CheckCircle2, color: 'text-cyan-600',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    description: 'Review and approve program content and decisions' },
  READ_ONLY:           { label: 'Read Only',          icon: Shield,       color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border',         description: 'View-only access to workspace data' },
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

  const { data: rawMembers, isLoading } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn:  () => workspaceApi.members() as Promise<Member[] | { data: Member[] }>,
  });

  const members: Member[] = Array.isArray(rawMembers)
    ? rawMembers
    : ((rawMembers as { data: Member[] })?.data ?? []);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'COMPLIANCE_OFFICER' },
  });

  const selectedRole = watch('role');

  const inviteMutation = useMutation({
    mutationFn: (data: FormData) => workspaceApi.invite(data),
    onSuccess: (data: unknown) => {
      const d = data as { _devToken?: string };
      if (d?._devToken) {
        toast.info(`Dev invite token: ${d._devToken}`, { duration: 30000 });
      }
      toast.success('Invitation sent');
      reset();
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['workspace', 'members'] });
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to send invite'),
  });

  const activeCount  = members.filter((m) => m.status === 'ACTIVE').length;
  const pendingCount = members.filter((m) => m.status !== 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Members"
        description="Manage who has access to this workspace and their roles."
        action={
          <Button
            onClick={() => setOpen(true)}
            className="gradient-emerald text-white border-0 hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total members',   value: members.length, icon: Users2,       color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'Active',          value: activeCount,    icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Pending invite',  value: pendingCount,   icon: Mail,         color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
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

      {/* Members list */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <Users2 className="h-7 w-7 text-primary" />
              </div>
              <p className="font-semibold mb-1">No members yet</p>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
                Invite your compliance team to collaborate on AML/CTF obligations.
              </p>
              <Button
                onClick={() => setOpen(true)}
                className="gradient-emerald text-white border-0"
              >
                <Plus className="h-4 w-4 mr-2" />
                Invite member
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((m) => {
                const rc = ROLE_CONFIG[m.role] ?? ROLE_CONFIG['READ_ONLY']!;
                const RIcon = rc.icon;
                const isActive = m.status === 'ACTIVE';
                return (
                  <div key={m.userId} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                    <div className="relative flex-shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {initials(m.fullName)}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`}
                        title={isActive ? 'Active' : m.status}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{m.fullName ?? m.email}</span>
                        {m.role === 'WORKSPACE_ADMIN' && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {m.email}
                        </span>
                        {m.lastLoginAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last login {formatRelative(m.lastLoginAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${rc.bg} border ${rc.border} ${rc.color}`}>
                        <RIcon className="h-3 w-3" />
                        {rc.label}
                      </div>
                      <Badge variant={isActive ? 'success' : 'warning'} className="text-xs">
                        {m.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground hidden lg:block w-28 text-right flex-shrink-0">
                      {m.joinedAt ? formatDate(m.joinedAt) : 'Pending invite'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Invite Team Member
            </DialogTitle>
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
                  {Object.entries(ROLE_CONFIG).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && ROLE_CONFIG[selectedRole] && (
                <p className="text-xs text-muted-foreground">{ROLE_CONFIG[selectedRole]!.description}</p>
              )}
            </div>
            <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              An invitation email will be sent. The invitee must create an account or sign in to accept.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="gradient-emerald text-white border-0 hover:opacity-90"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending…</>
                  : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
