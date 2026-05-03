import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ExternalLink, AlertTriangle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationApi } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { Link } from 'wouter';
import { toast } from 'sonner';

interface Notification {
  id: string;
  channel: string;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: rawData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationApi.list(false) as Promise<Notification[] | { notifications: Notification[]; total: number; unread: number }>,
    refetchInterval: 30000,
  });

  const notifications: Notification[] = Array.isArray(rawData)
    ? rawData
    : ((rawData as { notifications?: Notification[] })?.notifications ?? []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((p) => !p)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-500">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => markAll.mutate()}
                    disabled={markAll.isPending}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {notifications.slice(0, 15).map((notif) => {
                    const isUnread = !notif.readAt;
                    return (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-3 p-3.5 hover:bg-muted/30 transition-colors cursor-pointer ${isUnread ? 'bg-primary/5' : ''}`}
                        onClick={() => { if (isUnread) markRead.mutate(notif.id); }}
                      >
                        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${isUnread ? 'bg-indigo-500/15' : 'bg-muted/60'}`}>
                          {notif.subject?.toLowerCase().includes('alert') || notif.subject?.toLowerCase().includes('critical')
                            ? <AlertTriangle className={`h-3.5 w-3.5 ${isUnread ? 'text-red-400' : 'text-muted-foreground'}`} />
                            : <Info className={`h-3.5 w-3.5 ${isUnread ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.subject}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.body}
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatRelative(notif.createdAt)}
                          </div>
                        </div>
                        {isUnread && (
                          <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--muted)/0.3)' }}>
              <span className="text-[11px] text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-primary" asChild onClick={() => setOpen(false)}>
                <Link href="/alerts">
                  View alerts <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
