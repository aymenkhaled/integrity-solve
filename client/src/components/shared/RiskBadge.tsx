import { cn, riskRatingColor } from '@/lib/utils';

interface RiskBadgeProps {
  rating: string;
  className?: string;
}

const RATING_LABELS: Record<string, string> = {
  LOW:      'Low',
  MEDIUM:   'Medium',
  HIGH:     'High',
  CRITICAL: 'Critical',
  UNRATED:  'Unrated',
};

export function RiskBadge({ rating, className }: RiskBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
      riskRatingColor(rating),
      className,
    )}>
      {RATING_LABELS[rating] ?? rating}
    </span>
  );
}
