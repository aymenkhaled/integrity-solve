import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatABN } from '@/lib/utils';

export default function SettingsPage() {
  const { user, workspace } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and workspace settings." />

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input defaultValue={user?.fullName ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input defaultValue={user?.email ?? ''} disabled />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Email status:</Label>
              {user?.emailVerifiedAt ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <Badge variant="warning">Unverified</Badge>
              )}
            </div>
            <Button size="sm">Save profile</Button>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace</CardTitle>
            <CardDescription>Your business information and compliance settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Legal name</Label>
              <Input defaultValue={workspace?.legalName ?? ''} />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Subscription</span>
                <Badge>{workspace?.subscriptionTier}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Billing status</span>
                <span className="font-medium">{workspace?.billingStatus}</span>
              </div>
              {workspace?.trialEndsAt && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span className="font-medium">{formatDate(workspace.trialEndsAt)}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Industry pathway</span>
                <span className="font-medium">{workspace?.industryPathway ?? 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Implementation status</span>
                <span className="font-medium">{workspace?.implementationStatus}</span>
              </div>
            </div>
            <Button size="sm">Save workspace</Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input type="password" />
              </div>
            </div>
            <Button size="sm" variant="outline">Change password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
