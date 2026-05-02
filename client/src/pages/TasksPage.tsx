import { useState } from 'react';
import { Plus, CheckSquare, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { taskApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { CreateTaskSchema } from '@shared/validators';
import type { z } from 'zod';
import type { Task } from '@shared/schema';

type FormData = z.infer<typeof CreateTaskSchema>;

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    'text-blue-600 bg-blue-50',
  MEDIUM: 'text-amber-600 bg-amber-50',
  HIGH:   'text-orange-600 bg-orange-50',
  URGENT: 'text-red-600 bg-red-50',
};

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const qc = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn:  () => taskApi.list({ status: statusFilter }) as Promise<Task[]>,
  });

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
  });

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Track and manage compliance tasks across your team."
        actions={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New task</Button>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        {['OPEN', 'IN_PROGRESS', 'COMPLETE'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === 'OPEN' ? 'Open' : s === 'IN_PROGRESS' ? 'In Progress' : 'Complete'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
        </div>
      ) : !tasks?.length ? (
        <EmptyState
          icon={CheckSquare}
          title={`No ${statusFilter.toLowerCase()} tasks`}
          description="Tasks help you track compliance activities and deadlines."
          action={<Button onClick={() => setOpen(true)}>Create task</Button>}
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <button
                  className="flex h-5 w-5 items-center justify-center rounded border-2 border-muted-foreground/30 hover:border-primary transition-colors flex-shrink-0"
                  onClick={() => task.status === 'OPEN' && completeMutation.mutate(task.id)}
                  disabled={task.status === 'COMPLETE'}
                >
                  {task.status === 'COMPLETE' && (
                    <div className="h-3 w-3 rounded-sm bg-primary" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${task.status === 'COMPLETE' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[task.priority] ?? ''}`}>
                    {task.priority}
                  </span>
                  {task.dueAt && (
                    <span className="text-xs text-muted-foreground">{formatDate(task.dueAt)}</span>
                  )}
                  <StatusBadge status={task.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="Task title..." {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Optional description..." {...register('description')} />
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
                <Label>Due date</Label>
                <Input type="date" {...register('dueAt')} />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : 'Create task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
