import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { billingApi } from '@/lib/api';
import { CheckCircle, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  tier: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  seats: number;
  checks: number;
  customers: number;
  features: string[];
}

interface BillingOverview {
  workspace: {
    billingStatus: string;
    subscriptionTier: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  };
  usage: { eventType: string; total: string }[];
  plans: Plan[];
}

export default function BillingPage() {
  const { workspace } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'overview'],
    queryFn:  () => billingApi.overview() as Promise<BillingOverview>,
  });

  const checkout = useMutation({
    mutationFn: (tier: string) => billingApi.checkout(tier) as Promise<{ url: string }>,
    onSuccess: (result) => {
      toast.success('Redirecting to checkout…');
      window.location.href = result.url;
    },
    onError: () => toast.error('Failed to initiate checkout'),
  });

  const portal = useMutation({
    mutationFn: () => billingApi.portal() as Promise<{ url: string }>,
    onSuccess: (result) => {
      toast.success('Opening customer portal…');
      window.location.href = result.url;
    },
  });

  const currentTier = workspace?.subscriptionTier ?? 'TRIAL';
  const trialEnd = data?.workspace?.trialEndsAt
    ? new Date(data.workspace.trialEndsAt).toLocaleDateString('en-AU', { dateStyle: 'long' })
    : null;

  const trialDaysLeft = data?.workspace?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(data.workspace.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div>
      <PageHeader
        title="Billing & Subscription"
        description="Manage your plan, usage, and payment details."
      />

      {/* Current plan banner */}
      <Card className="mb-6 border-emerald-200 bg-emerald-50">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-emerald-900">
              Current plan: <span className="uppercase">{currentTier}</span>
            </div>
            <div className="text-sm text-emerald-700 mt-0.5">
              Status: {data?.workspace?.billingStatus ?? '—'}
              {trialEnd && <span className="ml-3">· Trial ends {trialEnd}</span>}
            </div>
          </div>
          {trialDaysLeft !== null && trialDaysLeft <= 7 && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg text-sm font-medium">
              <AlertCircle className="h-4 w-4" />
              {trialDaysLeft} days left
            </div>
          )}
          {currentTier !== 'TRIAL' && (
            <Button
              variant="outline"
              className="border-emerald-300"
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
            >
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Usage stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            {[
              { label: 'Checks Run',      type: 'CHECK_RUN',           icon: TrendingUp },
              { label: 'Docs Generated',  type: 'DOCUMENT_GENERATED',  icon: CheckCircle },
              { label: 'API Calls',       type: 'API_CALL',            icon: TrendingUp },
              { label: 'Storage (MB)',    type: 'STORAGE_MB',          icon: TrendingUp },
            ].map(({ label, type, icon: Icon }) => {
              const usage = data?.usage?.find((u) => u.eventType === type);
              return (
                <Card key={type}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {usage ? Number(usage.total).toFixed(0) : '0'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">this billing period</div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Plan comparison */}
      <h2 className="text-lg font-semibold mb-4">Choose a Plan</h2>
      {isLoading ? (
        <div className="grid lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-4">
          {(data?.plans ?? []).map((plan) => {
            const isCurrent = plan.tier === currentTier;
            const isEnterprise = plan.tier === 'ENTERPRISE';
            return (
              <Card
                key={plan.tier}
                className={isCurrent ? 'border-primary ring-1 ring-primary' : ''}
              >
                <CardHeader className="pb-3">
                  {isCurrent && (
                    <Badge className="w-fit mb-2 bg-primary text-primary-foreground text-xs">
                      Current Plan
                    </Badge>
                  )}
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription>
                    {isEnterprise ? (
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-foreground">
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground text-sm ml-1">AUD/{plan.period}</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{plan.seats < 0 ? 'Unlimited' : plan.seats} seats</div>
                    <div>{plan.checks < 0 ? 'Unlimited' : plan.checks} checks/month</div>
                    <div>{plan.customers < 0 ? 'Unlimited' : plan.customers} customers</div>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : isEnterprise ? (
                    <Button className="w-full" variant="outline" asChild>
                      <a href="mailto:sales@integritysolve.com.au">Contact Sales</a>
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => checkout.mutate(plan.tier)}
                      disabled={checkout.isPending}
                    >
                      {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
