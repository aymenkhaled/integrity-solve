import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { cn, initials } from '@/lib/utils';
import {
  LayoutDashboard, Users, FileText, AlertTriangle,
  CheckSquare, History, Settings, Users2, Menu, X,
  Shield, LogOut, Bell, ChevronDown, CreditCard,
  BookOpen, GraduationCap, CalendarCheck, ShieldAlert,
  ChevronRight, Brain, BarChart2, ShoppingBag, Key, Palette, Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
      { href: '/customers',   label: 'Customers',         icon: Users },
      { href: '/programs',    label: 'AML Program',       icon: FileText },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/risk',        label: 'Risk Intelligence', icon: Brain },
      { href: '/analytics',   label: 'Analytics',         icon: BarChart2 },
      { href: '/escalations', label: 'Escalations',       icon: AlertTriangle },
      { href: '/alerts',      label: 'Smart Alerts',      icon: ShieldAlert },
      { href: '/reviews',     label: 'Periodic Reviews',  icon: CalendarCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/tasks',       label: 'Tasks',             icon: CheckSquare },
      { href: '/documents',   label: 'Documents',         icon: BookOpen },
      { href: '/training',    label: 'Training',          icon: GraduationCap },
      { href: '/providers',   label: 'Providers',         icon: ShoppingBag },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: '/audit',       label: 'Audit Log',         icon: History },
      { href: '/members',     label: 'Members',           icon: Users2 },
      { href: '/billing',     label: 'Billing',           icon: CreditCard },
      { href: '/groups',      label: 'Group Workspaces',  icon: Network },
      { href: '/gateway',     label: 'API Gateway',       icon: Key },
      { href: '/whitelabel',  label: 'White-label',       icon: Palette },
      { href: '/settings',    label: 'Settings',          icon: Settings },
    ],
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, workspace } = useAuth();
  const logout = useLogout();

  const showAdminLink = user?.isPlatformAdmin;

  const isActive = (href: string) =>
    location === href || (href !== '/dashboard' && location.startsWith(href + '/'));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-navy transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/8 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-emerald glow-emerald flex-shrink-0">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-white tracking-wide truncate">Integrity Solve</p>
            <p className="text-[10px] text-white/35 truncate leading-tight">
              {workspace?.legalName ?? 'Loading...'}
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-white/40 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Plan badge */}
        {workspace && (
          <div className="px-5 pt-3 pb-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald/10 border border-brand-emerald/20 px-2.5 py-1 text-[10px] font-semibold text-brand-emerald uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald" />
              {workspace.subscriptionTier}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-hide">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                          active
                            ? 'nav-active text-brand-emerald'
                            : 'text-white/55 hover:bg-white/5 hover:text-white/90',
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {label}
                        {active && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {showAdminLink && (
            <div className="mt-2 pt-3 border-t border-white/10">
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">Platform</div>
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive('/admin')
                    ? 'nav-active text-brand-emerald'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/90',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                Platform Admin
              </Link>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-white/8 p-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 transition-colors group">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-emerald/20 text-brand-emerald text-xs font-bold flex-shrink-0 border border-brand-emerald/30">
                  {initials(user?.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user?.fullName ?? 'User'}</p>
                  <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-white/25 flex-shrink-0 group-hover:text-white/50 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="cursor-pointer">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer focus:text-destructive"
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6 flex-shrink-0">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb-like location display */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium capitalize">
              {location.split('/')[1] || 'Home'}
            </span>
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild>
            <Link href="/alerts">
              <Bell className="h-4 w-4" />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
                {initials(user?.fullName)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-1">
                <div className="font-medium text-foreground">{user?.fullName}</div>
                <div>{user?.email}</div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="cursor-pointer">Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer focus:text-destructive"
                onClick={() => logout.mutate()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="container max-w-7xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
