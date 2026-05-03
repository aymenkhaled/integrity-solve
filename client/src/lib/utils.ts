import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return format(new Date(date), 'dd MMM yyyy HH:mm');
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatABN(abn: string | null | undefined): string {
  if (!abn) return '—';
  const digits = abn.replace(/\D/g, '');
  if (digits.length !== 11) return abn;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

export function riskRatingColor(rating: string): string {
  switch (rating) {
    case 'LOW':      return 'text-green-400 bg-green-500/10 border border-green-500/20';
    case 'MEDIUM':   return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
    case 'HIGH':     return 'text-orange-400 bg-orange-500/10 border border-orange-500/20';
    case 'CRITICAL': return 'text-red-400 bg-red-500/10 border border-red-500/20';
    default:         return 'text-muted-foreground bg-muted';
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':       return 'text-green-400 bg-green-500/10 border border-green-500/20';
    case 'PENDING':
    case 'DRAFT':        return 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
    case 'SUSPENDED':
    case 'REJECTED':     return 'text-red-400 bg-red-500/10 border border-red-500/20';
    case 'EXITED':       return 'text-gray-400 bg-gray-500/10 border border-gray-500/20';
    case 'COMPLETE':     return 'text-green-400 bg-green-500/10 border border-green-500/20';
    case 'IN_PROGRESS':  return 'text-blue-400 bg-blue-500/10 border border-blue-500/20';
    case 'OVERDUE':      return 'text-red-400 bg-red-500/10 border border-red-500/20';
    default:             return 'text-muted-foreground bg-muted';
  }
}

export function truncate(str: string | null | undefined, length = 50): string {
  if (!str) return '—';
  return str.length > length ? str.slice(0, length) + '…' : str;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + 's'}`;
}
