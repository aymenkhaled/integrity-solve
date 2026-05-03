import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, action, className }: PageHeaderProps) {
  const content = actions ?? action;
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {content && <div className="flex items-center gap-2 flex-shrink-0">{content}</div>}
    </div>
  );
}
