import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User, Building2, Shield, Bell, CheckCircle, Lock,
  Mail, AlertTriangle, Save, Eye, EyeOff,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, workspace } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const SECTION_ICON = 'flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, workspace, and security preferences."
      />

      <div className="max-w-2xl space-y-5">

        {/* Profile */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={SECTION_ICON}>
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription className="text-xs">Your personal account details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input defaultValue={user?.fullName ?? ''} placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    defaultValue={user?.email ?? ''}
                    disabled
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Email verification:</span>
              {user?.emailVerifiedAt ? (
                <div className="flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Verified</span>
                  <span className="text-muted-foreground text-xs">({formatDate(user.emailVerifiedAt)})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Badge variant="warning">Unverified</Badge>
                  <Button size="sm" variant="outline" className="h-6 text-xs ml-1">Resend email</Button>
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="gradient-emerald text-white border-0 hover:opacity-90 gap-1.5"
              onClick={() => toast.success('Profile saved')}
            >
              <Save className="h-3.5 w-3.5" />
              Save profile
            </Button>
          </CardContent>
        </Card>

        {/* Workspace info */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={SECTION_ICON}>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Workspace</CardTitle>
                <CardDescription className="text-xs">Your business information and compliance settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Legal name</Label>
              <Input defaultValue={workspace?.legalName ?? ''} />
            </div>
            <div className="rounded-xl border bg-muted/30 divide-y overflow-hidden">
              {[
                { label: 'Subscription tier',    value: workspace?.subscriptionTier,     badge: true },
                { label: 'Billing status',       value: workspace?.billingStatus },
                { label: 'Trial ends',           value: workspace?.trialEndsAt ? formatDate(workspace.trialEndsAt) : null },
                { label: 'Industry pathway',     value: workspace?.industryPathway ?? 'Not configured' },
                { label: 'Implementation status', value: workspace?.implementationStatus },
                { label: 'Member role',          value: workspace?.role ?? null },
              ].filter((r) => r.value).map(({ label, value, badge }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {badge
                    ? <Badge className="gradient-emerald text-white border-0 text-xs">{value}</Badge>
                    : <span className="text-sm font-medium">{value}</span>
                  }
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="gradient-emerald text-white border-0 hover:opacity-90 gap-1.5"
              onClick={() => toast.success('Workspace settings saved')}
            >
              <Save className="h-3.5 w-3.5" />
              Save workspace
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={SECTION_ICON}>
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription className="text-xs">Change your password and security settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <div className="relative">
                <Input type={showCurrent ? 'text' : 'password'} placeholder="Enter current password" />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent((p) => !p)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>New password</Label>
                <div className="relative">
                  <Input type={showNew ? 'text' : 'password'} placeholder="Min 12 characters" />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowNew((p) => !p)}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirm password</Label>
                <div className="relative">
                  <Input type={showConfirm ? 'text' : 'password'} placeholder="Repeat new password" />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm((p) => !p)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => toast.success('Password updated')}
            >
              <Shield className="h-3.5 w-3.5" />
              Change password
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="card-3d">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={SECTION_ICON}>
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription className="text-xs">Choose what you want to be notified about</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Critical alerts',       desc: 'Immediate notification for CRITICAL severity alerts', enabled: true },
                { label: 'Overdue reviews',       desc: 'When a periodic review becomes overdue',             enabled: true },
                { label: 'New escalations',       desc: 'When a new escalation is created',                  enabled: true },
                { label: 'Training reminders',    desc: 'Before training certifications expire',              enabled: false },
                { label: 'Billing updates',       desc: 'Invoice and subscription change notifications',      enabled: true },
                { label: 'Digest summary',        desc: 'Weekly compliance summary email',                   enabled: false },
              ].map(({ label, desc, enabled }) => (
                <div key={label} className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <button
                    className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                    onClick={() => toast.info('Notification preferences (coming soon)')}
                  >
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="card-3d border-red-200 dark:border-red-800/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription className="text-xs">Irreversible actions — proceed with caution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-red-200/50 bg-red-50/50 dark:border-red-800/20 dark:bg-red-950/10 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Export workspace data</div>
                <div className="text-xs text-muted-foreground">Download all your compliance records in JSON format</div>
              </div>
              <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                onClick={() => toast.info('Export requested — you will receive an email when ready.')}>
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-red-200/50 bg-red-50/50 dark:border-red-800/20 dark:bg-red-950/10 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-red-600">Delete workspace</div>
                <div className="text-xs text-muted-foreground">Permanently delete all workspace data. This cannot be undone.</div>
              </div>
              <Button size="sm" variant="destructive" className="flex-shrink-0"
                onClick={() => toast.error('Contact support to delete your workspace.')}>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
