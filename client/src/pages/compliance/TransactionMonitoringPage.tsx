import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Activity, Shield, AlertTriangle, DollarSign, Globe,
  Users, Zap, TrendingUp, Edit3, ToggleLeft, ToggleRight,
  Plus, CheckCircle, Info,
} from 'lucide-react';

type RuleCategory = 'velocity' | 'threshold' | 'geographic' | 'pep' | 'structuring' | 'dormant' | 'custom';

interface MonitoringRule {
  id: string;
  name: string;
  category: RuleCategory;
  description: string;
  enabled: boolean;
  threshold?: number;
  thresholdUnit?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  triggeredCount: number;
  lastTriggered: string | null;
  regulatoryBasis: string;
}

const CATEGORY_CONFIG: Record<RuleCategory, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  velocity:     { icon: Zap,          color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Velocity' },
  threshold:    { icon: DollarSign,   color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20',   label: 'Threshold' },
  geographic:   { icon: Globe,        color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  label: 'Geographic' },
  pep:          { icon: Users,        color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: 'PEP' },
  structuring:  { icon: TrendingUp,   color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: 'Structuring' },
  dormant:      { icon: Activity,     color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  label: 'Dormant' },
  custom:       { icon: Edit3,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    label: 'Custom' },
};

const RISK_CONFIG = {
  LOW:      { label: 'Low',      cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  MEDIUM:   { label: 'Medium',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  HIGH:     { label: 'High',     cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  CRITICAL: { label: 'Critical', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const DEFAULT_RULES: MonitoringRule[] = [
  {
    id: 'r001', name: 'High-Velocity Transaction Cluster', category: 'velocity',
    description: 'Flag when a customer has 5 or more transactions within a 24-hour window.',
    enabled: true, threshold: 5, thresholdUnit: 'transactions / 24 hours',
    riskLevel: 'HIGH', triggeredCount: 12, lastTriggered: '2026-05-01',
    regulatoryBasis: 'AML/CTF Act 2006 — s.41 Suspicious Matter Reporting',
  },
  {
    id: 'r002', name: 'High-Value Cash Equivalent Threshold', category: 'threshold',
    description: 'Flag transactions at or above $10,000 AUD for Threshold Transaction Reporting (TTR).',
    enabled: true, threshold: 10000, thresholdUnit: 'AUD',
    riskLevel: 'CRITICAL', triggeredCount: 27, lastTriggered: '2026-05-02',
    regulatoryBasis: 'AML/CTF Rules 2007 — Part 7 (Threshold Transaction Reports)',
  },
  {
    id: 'r003', name: 'Geographic High-Risk Jurisdiction', category: 'geographic',
    description: 'Alert on transactions involving FATF high-risk or non-cooperative jurisdictions.',
    enabled: true,
    riskLevel: 'CRITICAL', triggeredCount: 3, lastTriggered: '2026-04-28',
    regulatoryBasis: 'FATF Recommendations — Countries with strategic AML/CFT deficiencies',
  },
  {
    id: 'r004', name: 'PEP Proximity Detection', category: 'pep',
    description: 'Alert when a customer is identified as a Politically Exposed Person or has a PEP relationship.',
    enabled: true,
    riskLevel: 'HIGH', triggeredCount: 5, lastTriggered: '2026-04-22',
    regulatoryBasis: 'AML/CTF Act 2006 — s.37 Enhanced Customer Due Diligence',
  },
  {
    id: 'r005', name: 'Structuring Detection (Smurfing)', category: 'structuring',
    description: 'Flag multiple transactions below $10,000 within 5 business days that may be designed to avoid TTR reporting.',
    enabled: true, threshold: 9500, thresholdUnit: 'AUD (per-transaction cap)',
    riskLevel: 'CRITICAL', triggeredCount: 8, lastTriggered: '2026-04-30',
    regulatoryBasis: 'AML/CTF Act 2006 — s.142 Structuring offences',
  },
  {
    id: 'r006', name: 'Dormant Account Sudden Activity', category: 'dormant',
    description: 'Alert when a customer with no activity for 12+ months suddenly initiates a significant transaction.',
    enabled: true, threshold: 12, thresholdUnit: 'months of inactivity',
    riskLevel: 'MEDIUM', triggeredCount: 2, lastTriggered: '2026-04-15',
    regulatoryBasis: 'AUSTRAC Guidance — Unusual and suspicious transaction indicators',
  },
  {
    id: 'r007', name: 'Rapid Account Funding & Transfer', category: 'velocity',
    description: 'Flag accounts that receive large deposits and immediately transfer out ≥90% within 24 hours.',
    enabled: false, threshold: 90, thresholdUnit: '% transferred out within 24h',
    riskLevel: 'HIGH', triggeredCount: 1, lastTriggered: '2026-04-10',
    regulatoryBasis: 'AML/CTF Act 2006 — s.41 Suspicious Matter Reporting',
  },
  {
    id: 'r008', name: 'International Fund Transfer Instruction', category: 'threshold',
    description: 'Flag all international fund transfers per IFTI reporting obligations.',
    enabled: true,
    riskLevel: 'HIGH', triggeredCount: 19, lastTriggered: '2026-05-01',
    regulatoryBasis: 'AML/CTF Rules 2007 — Part 6 (International Funds Transfer Instructions)',
  },
  {
    id: 'r009', name: 'Sanctions List Proximity', category: 'pep',
    description: 'Alert when a customer name or associated entity matches entries on DFAT, OFAC, or UN Sanctions lists.',
    enabled: true,
    riskLevel: 'CRITICAL', triggeredCount: 0, lastTriggered: null,
    regulatoryBasis: 'Charter of the United Nations Act 1945 — Autonomous Sanctions Act 2011',
  },
  {
    id: 'r010', name: 'Inconsistent Business Profile Activity', category: 'custom',
    description: 'Flag transaction patterns inconsistent with the customer\'s declared business type or income source.',
    enabled: false,
    riskLevel: 'MEDIUM', triggeredCount: 4, lastTriggered: '2026-04-18',
    regulatoryBasis: 'AUSTRAC Guidance — Risk-Based Approach to AML/CTF',
  },
];

export default function TransactionMonitoringPage() {
  const [rules, setRules] = useState<MonitoringRule[]>(DEFAULT_RULES);
  const [editRule, setEditRule] = useState<MonitoringRule | null>(null);
  const [filterCategory, setFilterCategory] = useState<RuleCategory | ''>('');
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', description: '', category: 'custom' as RuleCategory, riskLevel: 'MEDIUM' as MonitoringRule['riskLevel'] });

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      toast.success(`Rule "${rule.name}" ${rule.enabled ? 'disabled' : 'enabled'}`);
    }
  };

  const saveEdit = () => {
    if (!editRule) return;
    setRules((prev) => prev.map((r) => r.id === editRule.id ? editRule : r));
    toast.success('Rule updated');
    setEditRule(null);
  };

  const addCustomRule = () => {
    if (!newRule.name || !newRule.description) {
      toast.error('Name and description required');
      return;
    }
    const rule: MonitoringRule = {
      id: `custom-${Date.now()}`,
      ...newRule,
      enabled: true,
      triggeredCount: 0,
      lastTriggered: null,
      regulatoryBasis: 'Custom rule — internal policy',
    };
    setRules((prev) => [...prev, rule]);
    toast.success('Custom rule created');
    setAddOpen(false);
    setNewRule({ name: '', description: '', category: 'custom', riskLevel: 'MEDIUM' });
  };

  const filtered = filterCategory ? rules.filter((r) => r.category === filterCategory) : rules;
  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalTriggers = rules.reduce((acc, r) => acc + r.triggeredCount, 0);
  const criticalEnabled = rules.filter((r) => r.enabled && r.riskLevel === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction Monitoring Rules"
        description="Configure and manage automated rules to detect suspicious transaction patterns."
        actions={
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active rules',     value: enabledCount,    icon: CheckCircle,  color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'Total rules',      value: rules.length,    icon: Shield,       color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
          { label: 'Critical rules',   value: criticalEnabled, icon: AlertTriangle,color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20' },
          { label: 'Total triggers',   value: totalTriggers,   icon: Activity,     color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className="card-3d">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} border ${border}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold counter">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AUSTRAC compliance notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-3.5">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <span className="font-semibold text-blue-400">AUSTRAC Regulatory Basis: </span>
          <span className="text-muted-foreground">
            Rules are aligned to AML/CTF Act 2006 reporting obligations. Triggered rules generate alerts that may require a Suspicious Matter Report (SMR) to AUSTRAC within 24 hours of forming a suspicion.
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={filterCategory === '' ? 'default' : 'outline'}
          className={`h-7 text-xs ${filterCategory === '' ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-0' : ''}`}
          onClick={() => setFilterCategory('')}>
          All ({rules.length})
        </Button>
        {(Object.keys(CATEGORY_CONFIG) as RuleCategory[]).map((k) => {
          const count = rules.filter((r) => r.category === k).length;
          if (!count) return null;
          const cfg = CATEGORY_CONFIG[k];
          return (
            <Button key={k} size="sm" variant={filterCategory === k ? 'default' : 'outline'}
              className={`h-7 text-xs ${filterCategory === k ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-0' : ''}`}
              onClick={() => setFilterCategory(k)}>
              {cfg.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {filtered.map((rule) => {
          const catCfg = CATEGORY_CONFIG[rule.category];
          const riskCfg = RISK_CONFIG[rule.riskLevel];
          const CatIcon = catCfg.icon;
          return (
            <Card key={rule.id} className={`card-3d transition-all ${!rule.enabled ? 'opacity-60' : 'hover:border-primary/20'}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${catCfg.bg} border ${catCfg.border}`}>
                    <CatIcon className={`h-5 w-5 ${catCfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-semibold text-sm ${!rule.enabled ? 'text-muted-foreground' : ''}`}>{rule.name}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${riskCfg.cls}`}>{riskCfg.label}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}>{catCfg.label}</span>
                      {!rule.enabled && (
                        <Badge variant="outline" className="text-[10px] h-5">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 max-w-2xl">{rule.description}</p>
                    {rule.threshold && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2 py-0.5 mb-2">
                        <span className="font-mono font-semibold text-foreground">Threshold: {rule.threshold.toLocaleString()} {rule.thresholdUnit}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {rule.triggeredCount} trigger{rule.triggeredCount !== 1 ? 's' : ''}
                      </span>
                      {rule.lastTriggered && (
                        <span>Last: {rule.lastTriggered}</span>
                      )}
                      <span className="text-muted-foreground/60 italic truncate max-w-xs">{rule.regulatoryBasis}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditRule({ ...rule })}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className="flex items-center gap-2 text-xs font-medium transition-colors"
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled
                        ? <ToggleRight className="h-7 w-7 text-green-400" />
                        : <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                      }
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit rule dialog */}
      <Dialog open={!!editRule} onOpenChange={(o) => !o && setEditRule(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" />
              Edit Rule
            </DialogTitle>
          </DialogHeader>
          {editRule && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Rule name</Label>
                <Input value={editRule.name} onChange={(e) => setEditRule({ ...editRule, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={editRule.description} onChange={(e) => setEditRule({ ...editRule, description: e.target.value })} />
              </div>
              {editRule.threshold !== undefined && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Threshold value</Label>
                    <Input type="number" value={editRule.threshold}
                      onChange={(e) => setEditRule({ ...editRule, threshold: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit</Label>
                    <Input value={editRule.thresholdUnit ?? ''} onChange={(e) => setEditRule({ ...editRule, thresholdUnit: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Risk level</Label>
                <Select value={editRule.riskLevel} onValueChange={(v) => setEditRule({ ...editRule, riskLevel: v as MonitoringRule['riskLevel'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <strong>Regulatory basis:</strong> {editRule.regulatoryBasis}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRule(null)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add custom rule dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Custom Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Rule name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Round-dollar transaction pattern" value={newRule.name}
                onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input placeholder="Describe what this rule detects…" value={newRule.description}
                onChange={(e) => setNewRule((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newRule.category} onValueChange={(v) => setNewRule((p) => ({ ...p, category: v as RuleCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_CONFIG) as RuleCategory[]).map((k) => (
                      <SelectItem key={k} value={k}>{CATEGORY_CONFIG[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Risk level</Label>
                <Select value={newRule.riskLevel} onValueChange={(v) => setNewRule((p) => ({ ...p, riskLevel: v as MonitoringRule['riskLevel'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={addCustomRule}>Create rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
