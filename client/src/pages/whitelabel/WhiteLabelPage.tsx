import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { whitelabelApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Palette, Globe, Mail, Shield, Image, CheckCircle,
  Monitor, FileText, Sparkles, Building2,
} from 'lucide-react';

interface Branding {
  companyDisplayName:             string;
  primaryColor:                   string;
  accentColor:                    string;
  logoUrl:                        string;
  faviconUrl:                     string;
  supportEmail:                   string;
  customDomain:                   string;
  emailFooter:                    string;
  hideIntegritySolveBranding:     boolean;
  reportWatermark:                string;
}

interface WhitelabelData {
  branding:      Branding;
  workspaceName: string;
}

const DEFAULT: Branding = {
  companyDisplayName:         '',
  primaryColor:               '#10B981',
  accentColor:                '#0B1A33',
  logoUrl:                    '',
  faviconUrl:                 '',
  supportEmail:               '',
  customDomain:               '',
  emailFooter:                '',
  hideIntegritySolveBranding: false,
  reportWatermark:            '',
};

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function WhiteLabelPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Branding>(DEFAULT);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['whitelabel'],
    queryFn:  () => whitelabelApi.get() as Promise<WhitelabelData>,
  });

  useEffect(() => {
    if (data?.branding) {
      setForm({ ...DEFAULT, ...data.branding });
      setDirty(false);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (b: Partial<Branding>) => whitelabelApi.update(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whitelabel'] });
      toast.success('Branding saved');
      setDirty(false);
    },
    onError: () => toast.error('Failed to save branding'),
  });

  const set = <K extends keyof Branding>(key: K, value: Branding[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = () => updateMutation.mutate(form);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="White-label Branding"
        description="Customise your workspace branding, domain, and appearance for a fully white-labelled experience."
        actions={
          <Button
            className={dirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-2' : ''}
            variant={dirty ? 'default' : 'outline'}
            onClick={save}
            disabled={!dirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving…' : dirty ? '● Save changes' : 'Saved'}
          </Button>
        }
      />

      {/* Live preview strip */}
      <div
        className="rounded-2xl border p-4 flex items-center gap-4"
        style={{ borderColor: form.primaryColor + '40', background: form.accentColor + '10' }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white text-lg font-black" style={{ background: form.primaryColor }}>
          {(form.companyDisplayName || data?.workspaceName || 'WS').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-sm">{form.companyDisplayName || data?.workspaceName || 'Your Company'}</div>
          <div className="text-xs text-muted-foreground">AML/CTF PLATFORM</div>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="h-7 px-3 rounded-lg text-white text-xs flex items-center font-semibold" style={{ background: form.primaryColor }}>
            Sign in securely
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground italic hidden sm:block">Live preview</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Identity */}
        <Section icon={Building2} title="Company Identity">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company display name</Label>
              <Input
                placeholder={data?.workspaceName ?? 'Your Company Name'}
                value={form.companyDisplayName}
                onChange={(e) => set('companyDisplayName', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Shown in the nav header and on generated reports.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo URL</Label>
              <Input
                placeholder="https://your-cdn.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => set('logoUrl', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Favicon URL</Label>
              <Input
                placeholder="https://your-cdn.com/favicon.ico"
                value={form.faviconUrl}
                onChange={(e) => set('faviconUrl', e.target.value)}
              />
            </div>
          </div>
        </Section>

        {/* Colours */}
        <Section icon={Palette} title="Brand Colours">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs">Primary colour</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer bg-transparent"
                />
                <Input
                  className="font-mono text-sm"
                  value={form.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Used for buttons, badges, and active nav items.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accent / background colour</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => set('accentColor', e.target.value)}
                  className="h-10 w-14 rounded-lg border cursor-pointer bg-transparent"
                />
                <Input
                  className="font-mono text-sm"
                  value={form.accentColor}
                  onChange={(e) => set('accentColor', e.target.value)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Used for the sidebar, header, and card backgrounds.</p>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: form.accentColor + '20' }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: form.primaryColor }}>
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold">Colour preview</div>
                  <div className="text-xs text-muted-foreground">Primary on accent background</div>
                </div>
                <div className="ml-auto h-7 px-3 rounded-lg text-white text-xs flex items-center" style={{ background: form.primaryColor }}>
                  Action
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Domain + Support */}
        <Section icon={Globe} title="Custom Domain & Support">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Custom domain</Label>
              <Input
                placeholder="compliance.yourcompany.com.au"
                value={form.customDomain}
                onChange={(e) => set('customDomain', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">CNAME your domain to app.integritysolve.com.au — TLS is provisioned automatically.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Support email</Label>
              <Input
                type="email"
                placeholder="compliance@yourcompany.com.au"
                value={form.supportEmail}
                onChange={(e) => set('supportEmail', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Shown to users on error pages and in email footers.</p>
            </div>
          </div>
        </Section>

        {/* Documents + Branding visibility */}
        <Section icon={FileText} title="Reports & Documents">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Report watermark text</Label>
              <Input
                placeholder="CONFIDENTIAL — Not for distribution"
                value={form.reportWatermark}
                onChange={(e) => set('reportWatermark', e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Printed as a watermark on all exported PDF reports.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email footer text</Label>
              <Textarea
                rows={3}
                placeholder="This message is from Your Company Pty Ltd..."
                value={form.emailFooter}
                onChange={(e) => set('emailFooter', e.target.value)}
                className="resize-none text-sm"
              />
              <p className="text-[11px] text-muted-foreground">Appended to all system notification emails.</p>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <div className="text-sm font-medium">Hide Integrity Solve branding</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Remove "Powered by Integrity Solve" from the UI and documents.</div>
              </div>
              <Switch
                checked={form.hideIntegritySolveBranding}
                onCheckedChange={(v) => set('hideIntegritySolveBranding', v)}
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Checklist */}
      <Card className="card-3d">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            White-label setup checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Company name set',    done: !!form.companyDisplayName,         icon: Building2 },
              { label: 'Brand colours set',   done: form.primaryColor !== '#10B981',   icon: Palette },
              { label: 'Custom domain set',   done: !!form.customDomain,              icon: Globe },
              { label: 'Logo URL provided',   done: !!form.logoUrl,                   icon: Image },
              { label: 'Support email set',   done: !!form.supportEmail,              icon: Mail },
              { label: 'Report watermark set',done: !!form.reportWatermark,           icon: FileText },
              { label: 'Email footer set',    done: !!form.emailFooter,               icon: Mail },
              { label: 'Branding hidden',     done: form.hideIntegritySolveBranding,  icon: Monitor },
            ].map(({ label, done, icon: Icon }) => (
              <div key={label} className={`flex items-center gap-2 rounded-xl border p-3 ${done ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/30'}`}>
                {done
                  ? <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  : <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-40" />
                }
                <span className={`text-xs font-medium ${done ? 'text-green-400' : 'text-muted-foreground'}`}>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
