import { useState } from 'react';
import { Plus, CheckSquare, Loader2, Clock, Flag, Circle, CheckCircle2, Filter } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { taskApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate, formatRelative } from '@/lib/utils';
import { CreateTaskSchema } from '@shared/validators';
import type { z } from 'zod';
import type { Task } from '@shared/schema';

type FormData = z.infer<typeof CreateTaskSchema>;

const PRIORITY_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}> = {
  LOW:    { label: 'Low',    color: 'text-blue-600',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: Flag },
  MEDIUM: { label: 'Medium', color: 'text-amber-600',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Flag },
  HIGH:   { label: 'High',   color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Flag },
  URGENT: { label: 'Urgent', color: 'text-red-600',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: Flag },
};

const STATUS_FILTERS = [
  { label: 'Open',        value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Complete',    value: 'COMPLETE' },
];

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const qc = useQueryClient();

  const { data: rawTasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn:  () => taskApi.list({ status: statusFilter }) as Promise<Task[] | { tasks: Task[]; total: number }>,
  });

  const tasks: Task[] = Array.isArray(rawTasks)
    ? rawTasks
    : ((rawTasks as { tasks: Task[] })?.tasks ?? []);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => taskApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
      reset();
      setOpen(false);
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to create task'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => taskApi.update(id, { status: 'COMPLETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task completed');
    },
    onError: () => toast.error('Failed to complete task'),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => taskApi.update(id, { status: 'IN_PROGRESS' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task started');
    },
    onError: () => toast.error('Failed to start task'),
  });

  const openCount     = tasks.filter((t) => t.status === 'OPEN').length;
  const urgentCount   = tasks.filter((t) => t.priority === 'URGENT').length;
  const overdueCount  = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'COMPLETE').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Track and manage compliance tasks, deadlines, and team assignments."
        action={
          <Button
            onClick={() => setOpen(true)}
            className="gradient-emerald text-white border-0 hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open tasks',     value: openCount,     icon: Circle,       color: 'text-blue-500',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'Urgent',         value: urgentCount,   icon: Flag,         color: 'text-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          { label: 'Overdue',        value: overdueCount,  icon: Clock,        color: 'text-orange-500',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
          { label: 'Completed',      value: completedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
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

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(({ label, value }) => (
            <Button
              key={value}
              size="sm"
              variant={statusFilter === value ? 'default' : 'outline'}
              className={`h-7 text-xs ${statusFilter === value ? 'gradient-emerald text-white border-0' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-base mb-1">
              No {statusFilter.toLowerCase().replace('_', ' ')} tasks
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Tasks help track compliance activities and regulatory deadlines.
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="gradient-emerald text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG['MEDIUM']!;
            const PIcon = pc.icon;
            const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'COMPLETE';
            const isDone = task.status === 'COMPLETE';
            return (
              <Card key={task.id} className={`card-3d transition-all hover:border-primary/20 ${isOverdue ? 'border-orange-200 dark:border-orange-800/30' : ''}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <button
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all flex-shrink-0 ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-muted-foreground/30 hover:border-primary'
                    }`}
                    onClick={() => {
                      if (task.status === 'OPEN') startMutation.mutate(task.id);
                      else if (task.status === 'IN_PROGRESS') completeMutation.mutate(task.id);
                    }}
                    disabled={isDone || completeMutation.isPending || startMutation.isPending}
                  >
                    {isDone && <CheckCircle2 className="h-4 w-4 text-white fill-white" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.dueAt && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-orange-600 font-medium' : ''}`}>
                          <Clock className="h-3 w-3" />
                          {isOverdue ? 'Overdue · ' : ''}{formatDate(task.dueAt)}
                        </span>
                      )}
                      <span>{formatRelative(task.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${pc.bg} border ${pc.border} ${pc.color}`}>
                      <PIcon className="h-3 w-3" />
                      {pc.label}
                    </div>
                    <StatusBadge status={task.status} />
                    {task.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => startMutation.mutate(task.id)}
                        disabled={startMutation.isPending}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gradient-emerald text-white border-0 hover:opacity-90"
                        onClick={() => completeMutation.mutate(task.id)}
                        disabled={completeMutation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              New Compliance Task
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Complete quarterly CDD review for high-risk customers" {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea rows={2} placeholder="Additional context or instructions…" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select defaultValue="MEDIUM" onValueChange={(v) => setValue('priority', v as FormData['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input type="date" {...register('dueAt')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="gradient-emerald text-white border-0 hover:opacity-90"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</>
                  : 'Create task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
