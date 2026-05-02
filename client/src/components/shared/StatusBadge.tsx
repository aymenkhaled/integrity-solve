import { cn, statusColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT:           'Draft',
  PENDING:         'Pending',
  PENDING_CDD:     'Pending CDD',
  CDD_IN_PROGRESS: 'CDD In Progress',
  ACTIVE:          'Active',
  SUSPENDED:       'Suspended',
  EXITED:          'Exited',
  REJECTED:        'Rejected',
  COMPLETE:        'Complete',
  IN_PROGRESS:     'In Progress',
  NOT_STARTED:     'Not Started',
  REQUIRES_REVISION: 'Requires Revision',
  OVERDUE:         'Overdue',
  SCHEDULED:       'Scheduled',
  CANCELLED:       'Cancelled',
  OPEN:            'Open',
  BLOCKED:         'Blocked',
  UNDER_REVIEW:    'Under Review',
  ESCALATED_TO_SMR: 'Escalated to SMR',
  SMR_SUBMITTED:   'SMR Submitted',
  CLOSED_NO_ACTION: 'Closed – No Action',
  CLOSED_FALSE_POSITIVE: 'Closed – False Positive',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED:        'Approved',
  SUBMITTED:       'Submitted',
  TRIALING:        'Trial',
  INACTIVE:        'Inactive',
  SETUP_PENDING:   'Setup Pending',
  PAST_DUE:        'Past Due',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      statusColor(status),
      className,
    )}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
