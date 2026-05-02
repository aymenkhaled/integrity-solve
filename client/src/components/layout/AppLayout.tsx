import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { cn, initials } from '@/lib/utils';
import {
  LayoutDashboard, Users, FileText, AlertTriangle,
  CheckSquare, History, Settings, Users2, Menu, X,
  Shield, LogOut, Bell, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/customers',    label: 'Customers',     icon: Users },
  { href: '/programs',     label: 'AML Program',   icon: FileText },
  { href: '/escalations',  label: 'Escalations',   icon: AlertTriangle },
  { href: '/tasks',        label: 'Tasks',         icon: CheckSquare },
  { href: '/audit',        label: 'Audit Log',     icon: History },
  { href: '/members',      label: 'Members',       icon: Users2 },
  { href: '/settings',     label: 'Settings',      icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, workspace } = useAuth();
  const logout = useLogout();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-navy text-white transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
          <Shield className="h-7 w-7 text-brand-emerald flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-sm tracking-wide truncate">Integrity Solve</p>
            <p className="text-xs text-white/50 truncate">
              {workspace?.legalName ?? 'Loading...'}
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-white/50 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = location === href || location.startsWith(href + '/');
              return (
                <li key={href}>
                  <Link href={href}>
                    <a
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-emerald/20 text-brand-emerald'
                          : 'text-white/70 hover:bg-white/5 hover:text-white',
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-emerald/20 text-brand-emerald text-xs font-bold flex-shrink-0">
                  {initials(user?.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user?.fullName ?? 'User'}</p>
                  <p className="text-xs text-white/50 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-white/30 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => logout.mutate()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {workspace && (
            <Badge variant="outline" className="hidden sm:flex">
              {workspace.subscriptionTier}
            </Badge>
          )}

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
