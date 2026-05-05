import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { cn, initials } from '@/lib/utils';
import {
  LayoutDashboard, Users, FileText, AlertTriangle,
  CheckSquare, History, Settings, Users2, Menu, X,
  Shield, LogOut, ChevronDown, CreditCard,
  BookOpen, GraduationCap, CalendarCheck, ShieldAlert,
  ChevronRight, Brain, BarChart2, ShoppingBag, Key, Palette, Network,
  HeartPulse, CalendarDays, Activity, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
      { href: '/cases',       label: 'Cases',             icon: FolderOpen },
      { href: '/customers',   label: 'Customers',         icon: Users },
      { href: '/programs',    label: 'AML Program',       icon: FileText },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/compliance-health', label: 'Health Score',       icon: HeartPulse },
      { href: '/calendar',          label: 'Cal. Obligations',   icon: CalendarDays },
      { href: '/monitoring',        label: 'Transaction Rules',  icon: Activity },
      { href: '/risk',              label: 'Risk Intelligence',  icon: Brain },
      { href: '/analytics',         label: 'Analytics',          icon: BarChart2 },
      { href: '/escalations',       label: 'Escalations',        icon: AlertTriangle },
      { href: '/alerts',            label: 'Smart Alerts',       icon: ShieldAlert },
      { href: '/reviews',           label: 'Periodic Reviews',   icon: CalendarCheck },
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

interface AppLayoutProps { children: React.ReactNode; }

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, workspace } = useAuth();
  const logout = useLogout();
  const showAdminLink = user?.isPlatformAdmin;

  const isActive = (href: string) =>
    location === href || (href !== '/dashboard' && location.startsWith(href + '/'));

  const pageName = location.split('/')[1] || 'Home';
  const displayPageName = pageName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-56 flex-col transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ backgroundColor: 'hsl(var(--card))', borderRight: '1px solid hsl(var(--border))' }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 px-4 flex-shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 flex-shrink-0">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-foreground tracking-wide truncate">Integrity Solve</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">
              {workspace?.legalName ?? 'Loading...'}
            </p>
          </div>
          <button className="ml-auto lg:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Plan badge */}
        {workspace && (
          <div className="px-4 pt-3 pb-1">
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              {workspace.subscriptionTier}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
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
                          'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                          active ? 'nav-active' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{label}</span>
                        {active && <ChevronRight className="h-3 w-3 ml-auto opacity-40 flex-shrink-0" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {showAdminLink && (
            <div className="mt-2 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Platform</div>
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                  isActive('/admin') ? 'nav-active' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                Platform Admin
              </Link>
            </div>
          )}
        </nav>

        {/* Credits widget */}
        {workspace && (
          <div className="px-3 py-2 flex-shrink-0">
            <Link href="/compliance-health">
              <div className="rounded-lg p-3 hover:bg-indigo-500/10 transition-colors cursor-pointer" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                <p className="text-[10px] text-muted-foreground/70 mb-1.5 font-medium flex items-center gap-1">
                  <HeartPulse className="h-3 w-3" />
                  Compliance Status
                </p>
                <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--border))' }}>
                  <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: workspace.implementationStatus === 'COMPLETE' ? '100%' : workspace.implementationStatus === 'IN_PROGRESS' ? '50%' : '10%' }} />
                </div>
                <p className="text-[10px] text-indigo-400 mt-1.5 font-medium capitalize">{workspace.implementationStatus?.replace(/_/g,' ').toLowerCase()}</p>
              </div>
            </Link>
          </div>
        )}

        {/* User section */}
        <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-white/5 transition-colors group">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                  {initials(user?.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.fullName ?? 'User'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer"><Settings className="h-4 w-4 mr-2" />Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="cursor-pointer"><CreditCard className="h-4 w-4 mr-2" />Billing</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive" onClick={() => logout.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 px-4 lg:px-6 flex-shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', backdropFilter: 'blur(12px)' }}>
          <button className="lg:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{displayPageName}</span>
          </div>

          <div className="flex-1" />

          <ThemeToggle />
          <NotificationsDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors"
                style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; }}
              >
                {initials(user?.fullName)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b mb-1">
                <div className="font-medium text-foreground">{user?.fullName}</div>
                <div>{user?.email}</div>
              </div>
              <DropdownMenuItem asChild><Link href="/settings" className="cursor-pointer">Settings</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/billing" className="cursor-pointer">Billing</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive cursor-pointer focus:text-destructive" onClick={() => logout.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'hsl(var(--background))' }}>
          <div className="container max-w-7xl mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
