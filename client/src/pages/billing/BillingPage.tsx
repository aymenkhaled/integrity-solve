import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { billingApi } from '@/lib/api';
import {
  CheckCircle, CreditCard, TrendingUp, AlertCircle,
  Shield, Zap, Star, ArrowRight, Clock, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

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

const PLAN_FEATURES: Record<string, string[]> = {
  TRIAL: ['3 team members', 'AML Program wizard', '100 customer records', '50 identity checks/mo', 'Email support'],
  STARTER: ['3 team members', 'AML Program wizard', '100 customers', '50 identity checks/mo', 'Email support'],
  PROFESSIONAL: ['10 team members', 'Full CDD/EDD/SDD', 'Unlimited customers', '500 checks/mo', 'SMR workflow', 'Periodic reviews', 'Priority support'],
  ENTERPRISE: ['Unlimited seats', 'Group workspace management', 'Custom integrations', 'API access', 'White-label option', 'SLA guarantee'],
};

const PLAN_PRICES: Record<string, string> = {
  TRIAL: 'Free',
  STARTER: '$199/mo',
  PROFESSIONAL: '$499/mo',
  ENTERPRISE: 'Custom',
};

const PLAN_COLORS: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  TRIAL:        { icon: Clock,   color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  STARTER:      { icon: Zap,    color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  PROFESSIONAL: { icon: Star,   color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  ENTERPRISE:   { icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

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
    onError: () => toast.error('Failed to open portal'),
  });

  const currentTier = workspace?.subscriptionTier ?? 'TRIAL';
  const pc = PLAN_COLORS[currentTier] ?? PLAN_COLORS['TRIAL']!;
  const PlanIcon = pc.icon;

  const trialDaysLeft = data?.workspace?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(data.workspace.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  const usageMap: Record<string, number> = {};
  for (const u of data?.usage ?? []) {
    usageMap[u.eventType] = Number(u.total);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscription"
        description="Manage your plan, usage, and payment details."
      />

      {/* Current plan card */}
      <Card className="card-3d overflow-hidden">
        <div className="h-1 w-full gradient-emerald" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${pc.bg} border ${pc.border}`}>
                <PlanIcon className={`h-7 w-7 ${pc.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{currentTier} Plan</h2>
                  <Badge variant={
                    data?.workspace?.billingStatus === 'ACTIVE' ? 'default' :
                    data?.workspace?.billingStatus === 'TRIALING' ? 'warning' : 'outline'
                  }>
                    {isLoading ? '…' : (data?.workspace?.billingStatus ?? 'TRIALING')}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {PLAN_PRICES[currentTier]}
                  {data?.workspace?.currentPeriodEnd && (
                    <span className="ml-2">· Renews {formatDate(data.workspace.currentPeriodEnd)}</span>
                  )}
                </div>
                {trialDaysLeft !== null && (
                  <div className={`mt-1 text-sm font-medium ${trialDaysLeft <= 3 ? 'text-red-500' : 'text-amber-500'}`}>
                    ⚡ {trialDaysLeft} trial days remaining
                    {data?.workspace?.trialEndsAt && (
                      <span className="text-muted-foreground font-normal ml-1">
                        (ends {formatDate(data.workspace.trialEndsAt)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {currentTier !== 'ENTERPRISE' && (
                <Button
                  size="sm"
                  className="gradient-emerald text-white border-0 hover:opacity-90"
                  onClick={() => checkout.mutate('PROFESSIONAL')}
                  disabled={checkout.isPending}
                >
                  Upgrade plan
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Billing portal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage metrics */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Usage this period</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'identity_check',    label: 'Identity Checks',     icon: Shield,   max: 500,  color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
            { key: 'sanctions_check',   label: 'Sanctions Checks',    icon: AlertCircle, max: 500, color: 'text-red-500',  bg: 'bg-red-500/10',    border: 'border-red-500/20' },
            { key: 'smr_submission',    label: 'SMR Submissions',     icon: TrendingUp, max: 50, color: 'text-amber-500', bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
            { key: 'customer_created',  label: 'Customers Onboarded', icon: Users,   max: 100,  color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          ].map(({ key, label, icon: Icon, max, color, bg, border }) => {
            const used = usageMap[key] ?? 0;
            const pct = Math.min(100, Math.round((used / max) * 100));
            return (
              <Card key={key} className="card-3d">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border ${border}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{used}/{max}</span>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{pct}% used</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available plans</h3>
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const).map((tier) => {
              const isCurrent = currentTier === tier;
              const c = PLAN_COLORS[tier] ?? PLAN_COLORS['STARTER']!;
              const TierIcon = c.icon;
              const features = PLAN_FEATURES[tier] ?? [];
              return (
                <Card
                  key={tier}
                  className={`card-3d relative ${
                    tier === 'PROFESSIONAL'
                      ? 'border-primary ring-1 ring-primary/20 shadow-lg'
                      : ''
                  } ${isCurrent ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
                >
                  {tier === 'PROFESSIONAL' && !isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <div className="rounded-full gradient-emerald px-3 py-1 text-xs font-semibold text-white">
                        Most popular
                      </div>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                        Current plan
                      </div>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} border ${c.border} mb-4`}>
                      <TierIcon className={`h-5 w-5 ${c.color}`} />
                    </div>
                    <div className="font-bold text-lg mb-0.5">{tier}</div>
                    <div className="text-2xl font-black mb-4">{PLAN_PRICES[tier]}</div>
                    <ul className="space-y-2 mb-6">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${
                        isCurrent
                          ? 'bg-emerald-600/20 text-emerald-600 border-emerald-600/30 hover:bg-emerald-600/30'
                          : tier === 'PROFESSIONAL'
                          ? 'gradient-emerald text-white border-0 hover:opacity-90'
                          : ''
                      }`}
                      variant={isCurrent ? 'outline' : tier === 'PROFESSIONAL' ? 'default' : 'outline'}
                      disabled={isCurrent || checkout.isPending}
                      onClick={() => !isCurrent && checkout.mutate(tier)}
                    >
                      {isCurrent ? '✓ Current plan' : tier === 'ENTERPRISE' ? 'Contact sales' : `Upgrade to ${tier}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment security note */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        <Shield className="h-5 w-5 text-emerald-500 flex-shrink-0" />
        <span>
          Payments are processed securely by Stripe. Integrity Solve never stores your card details.
          All plans include 14-day free trial. Cancel anytime with no lock-in.
        </span>
      </div>
    </div>
  );
}
