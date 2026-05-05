import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, CheckCircle, Loader2, Lock, AlertTriangle,
  Building2, Shield, FileText, Users, BookOpen, BarChart3,
  Bell, Archive, Search, UserCheck, GraduationCap, Gavel,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { programApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ProgramForm } from '@shared/schema';

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS = [
  { id: 0,  title: 'Business Profile',        description: 'Legal entity details and ABN',                          icon: Building2 },
  { id: 1,  title: 'Designated Services',      description: 'Services that trigger AML/CTF obligations',             icon: FileText },
  { id: 2,  title: 'ML/TF Risk Assessment',    description: 'Money laundering & terrorism financing risk',           icon: AlertTriangle },
  { id: 3,  title: 'Part A Program',           description: 'Customer-facing obligations',                           icon: Users },
  { id: 4,  title: 'Part B Program',           description: 'Internal controls and governance',                      icon: Shield },
  { id: 5,  title: 'Customer Due Diligence',   description: 'CDD policies and procedures',                          icon: Search },
  { id: 6,  title: 'Ongoing Monitoring',       description: 'Transaction and relationship monitoring',               icon: BarChart3 },
  { id: 7,  title: 'Reporting Obligations',    description: 'SMR, TTR, and IFTI reporting',                         icon: Bell },
  { id: 8,  title: 'Record Keeping',           description: 'Document retention requirements',                       icon: Archive },
  { id: 9,  title: 'Independent Review',       description: 'Annual review requirements',                            icon: BookOpen },
  { id: 10, title: 'Employee Due Diligence',   description: 'Staff screening and training',                         icon: UserCheck },
  { id: 11, title: 'Training Program',         description: 'AML/CTF staff training',                               icon: GraduationCap },
  { id: 12, title: 'Board Oversight',          description: 'Governance and accountability',                         icon: Gavel },
];

const INDUSTRY_PATHWAYS = [
  'ACCOUNTING', 'LEGAL', 'REAL_ESTATE', 'FINANCIAL_SERVICES',
  'GAMBLING', 'PRECIOUS_METALS', 'TRUST_COMPANY_SERVICES', 'OTHER',
];

const DESIGNATED_SERVICES = [
  'Cash dealing services',
  'Current account services',
  'Deposit-taking services',
  'Lending (incl. mortgages)',
  'Currency exchange services',
  'International funds transfer',
  'Electronic funds transfer',
  'Digital currency exchange',
  'Bullion dealing',
  'Betting and gambling services',
  'Conveyancing / real estate settlement',
  'Company / trust formation',
  'Trust and company nominee services',
  'Legal services (certain)',
  'Bookkeeping services',
  'Tax agent services',
];

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'Ad hoc'];

const RETENTION_PERIODS = ['7 years', '10 years', '15 years', '20 years', 'Permanently'];

const STORAGE_METHODS = [
  'Secure cloud storage',
  'On-premises file server',
  'Physical archive + digital backup',
  'Third-party records management',
];

const BACKGROUND_CHECK_TYPES = [
  'Police check (National)',
  'Identity verification',
  'Reference checks',
  'Employment history verification',
  'Financial background check',
  'ASIC / professional register check',
  'Adverse media search',
];

const TRAINING_DELIVERY = [
  'In-person workshop',
  'Online self-paced modules',
  'Webinar / virtual classroom',
  'Blended learning',
  'External training provider',
];

const TRAINING_CONTENT_AREAS = [
  'AML/CTF Act obligations overview',
  'Customer identification procedures',
  'Suspicious matter recognition',
  'SMR reporting process',
  'PEP and sanctions screening',
  'Record keeping requirements',
  'Escalation procedures',
  'Terrorism financing indicators',
];

// ─── Helper components ────────────────────────────────────────────────────────

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function FormSelect({
  value, onChange, options, placeholder, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
      ))}
    </select>
  );
}

function CheckboxGroup({
  options, value, onChange, disabled,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (item: string) => {
    if (disabled) return;
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          onClick={() => toggle(opt)}
          className={cn(
            'flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors',
            value.includes(opt)
              ? 'border-primary/50 bg-primary/5 text-primary'
              : 'border-border/50 hover:border-border',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className={cn(
            'flex h-4 w-4 items-center justify-center rounded border transition-colors flex-shrink-0',
            value.includes(opt) ? 'border-primary bg-primary' : 'border-muted-foreground/40',
          )}>
            {value.includes(opt) && <CheckCircle className="h-3 w-3 text-white" />}
          </div>
          {opt}
        </label>
      ))}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    VERY_HIGH: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  if (!level) return null;
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', map[level])}>
      {level.replace('_', ' ')}
    </span>
  );
}

// ─── Step form renderer ────────────────────────────────────────────────────────

function renderStepForm(
  step: number,
  data: Record<string, string | string[]>,
  update: (k: string, v: string | string[]) => void,
  disabled: boolean,
) {
  const str = (k: string) => (data[k] as string) ?? '';
  const arr = (k: string) => (data[k] as string[]) ?? [];

  switch (step) {

    // ── Step 0: Business Profile ─────────────────────────────────────────────
    case 0: return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Legal entity name *">
            <Input disabled={disabled} value={str('legalName')} onChange={(e) => update('legalName', e.target.value)} placeholder="Acme Financial Services Pty Ltd" />
          </FormField>
          <FormField label="Trading name">
            <Input disabled={disabled} value={str('tradingName')} onChange={(e) => update('tradingName', e.target.value)} placeholder="Acme Finance" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="ABN" hint="11-digit Australian Business Number">
            <Input disabled={disabled} value={str('abn')} onChange={(e) => update('abn', e.target.value)} placeholder="12 345 678 901" maxLength={14} />
          </FormField>
          <FormField label="ACN" hint="9-digit Australian Company Number (if applicable)">
            <Input disabled={disabled} value={str('acn')} onChange={(e) => update('acn', e.target.value)} placeholder="123 456 789" maxLength={11} />
          </FormField>
        </div>
        <FormField label="Principal place of business address">
          <Input disabled={disabled} value={str('address')} onChange={(e) => update('address', e.target.value)} placeholder="Level 10, 100 Collins Street, Melbourne VIC 3000" />
        </FormField>
        <FormField label="Industry pathway" hint="Your primary AUSTRAC reporting entity classification">
          <FormSelect disabled={disabled} value={str('industryPathway')} onChange={(v) => update('industryPathway', v)} options={INDUSTRY_PATHWAYS} placeholder="Select pathway…" />
        </FormField>
        <FormField label="Business description" hint="Briefly describe your business activities and the nature of customers you serve">
          <Textarea disabled={disabled} rows={4} value={str('businessDescription')} onChange={(e) => update('businessDescription', e.target.value)} placeholder="We provide accounting and tax services to small-to-medium businesses across Victoria…" />
        </FormField>
        <FormField label="AUSTRAC Reporting Entity ID (REID)" hint="Your unique AUSTRAC identifier, if already registered">
          <Input disabled={disabled} value={str('reid')} onChange={(e) => update('reid', e.target.value)} placeholder="RE-XXXXXXX" />
        </FormField>
      </div>
    );

    // ── Step 1: Designated Services ──────────────────────────────────────────
    case 1: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 px-4 py-3 text-sm text-blue-300">
          Select all designated services your business provides under the <strong>Anti-Money Laundering and Counter-Terrorism Financing Act 2006</strong>. Only items 1–54 of the Act's table of designated services apply.
        </div>
        <FormField label="Applicable designated services *" hint="Select all that apply">
          <CheckboxGroup disabled={disabled} options={DESIGNATED_SERVICES} value={arr('designatedServices')} onChange={(v) => update('designatedServices', v)} />
        </FormField>
        <FormField label="Additional services description" hint="Describe any designated services not listed above or provide additional context">
          <Textarea disabled={disabled} rows={4} value={str('additionalServices')} onChange={(e) => update('additionalServices', e.target.value)} placeholder="Provide additional detail about the nature of each designated service…" />
        </FormField>
        <FormField label="Customer segments" hint="Describe the types of customers who receive your designated services">
          <Textarea disabled={disabled} rows={3} value={str('customerSegments')} onChange={(e) => update('customerSegments', e.target.value)} placeholder="e.g. Individual retail clients, SME businesses, property developers, SMSF trustees…" />
        </FormField>
      </div>
    );

    // ── Step 2: ML/TF Risk Assessment ────────────────────────────────────────
    case 2: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3 text-sm text-amber-300">
          Under s.84 of the AML/CTF Act you must conduct an ML/TF risk assessment of your designated services. Ratings must be reviewed at least every 3 years.
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'customerRisk',        label: 'Customer risk',         hint: 'Risk posed by your customer base (e.g. PEPs, non-residents, cash-intensive businesses)' },
            { key: 'geographicRisk',      label: 'Geographic risk',       hint: 'Risk from countries/jurisdictions you deal with' },
            { key: 'channelRisk',         label: 'Delivery channel risk', hint: 'Risk from how services are delivered (e.g. online, in-person, intermediaries)' },
            { key: 'productServiceRisk',  label: 'Product/service risk',  hint: 'Risk from the nature of products or services offered' },
          ].map(({ key, label, hint }) => (
            <FormField key={key} label={label} hint={hint}>
              <div className="flex items-center gap-2">
                <FormSelect disabled={disabled} value={str(key)} onChange={(v) => update(key, v)} options={RISK_LEVELS} placeholder="Select risk level…" />
                <RiskBadge level={str(key)} />
              </div>
            </FormField>
          ))}
        </div>
        <FormField label="Inherent risk rating" hint="Overall inherent risk level before applying controls">
          <div className="flex items-center gap-3">
            <FormSelect disabled={disabled} value={str('inherentRiskRating')} onChange={(v) => update('inherentRiskRating', v)} options={RISK_LEVELS} placeholder="Select rating…" />
            <RiskBadge level={str('inherentRiskRating')} />
          </div>
        </FormField>
        <FormField label="Risk mitigants" hint="Controls in place that reduce the inherent risk level">
          <Textarea disabled={disabled} rows={4} value={str('riskMitigants')} onChange={(e) => update('riskMitigants', e.target.value)} placeholder="e.g. Robust CDD procedures, real-time transaction monitoring, quarterly risk reviews…" />
        </FormField>
        <FormField label="Residual risk rating" hint="Risk level remaining after applying controls">
          <div className="flex items-center gap-3">
            <FormSelect disabled={disabled} value={str('residualRiskRating')} onChange={(v) => update('residualRiskRating', v)} options={RISK_LEVELS} placeholder="Select rating…" />
            <RiskBadge level={str('residualRiskRating')} />
          </div>
        </FormField>
        <FormField label="ML/TF risk methodology" hint="Describe the methodology used to assess risk">
          <Textarea disabled={disabled} rows={4} value={str('riskMethodology')} onChange={(e) => update('riskMethodology', e.target.value)} placeholder="We use a weighted scoring matrix considering customer, geographic, channel and product/service risk factors…" />
        </FormField>
      </div>
    );

    // ── Step 3: Part A Program ────────────────────────────────────────────────
    case 3: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 px-4 py-3 text-sm text-purple-300">
          Part A addresses your customer-facing obligations including KYC, CDD, and beneficial ownership identification required under Chapter 4 of the AML/CTF Act.
        </div>
        <FormField label="Customer identification procedure" hint="How you identify and verify customers before providing designated services">
          <Textarea disabled={disabled} rows={5} value={str('customerIdProcedure')} onChange={(e) => update('customerIdProcedure', e.target.value)} placeholder="Prior to providing a designated service, we require customers to provide…" />
        </FormField>
        <FormField label="Customer verification procedure" hint="Documents and data sources used to verify customer identity">
          <Textarea disabled={disabled} rows={4} value={str('customerVerProcedure')} onChange={(e) => update('customerVerProcedure', e.target.value)} placeholder="We verify identity using AUSTRAC-compliant documents including: (1) Australian passport, (2) driver's licence…" />
        </FormField>
        <FormField label="Beneficial ownership identification" hint="Process for identifying ultimate beneficial owners of entities">
          <Textarea disabled={disabled} rows={4} value={str('beneficialOwnershipProcedure')} onChange={(e) => update('beneficialOwnershipProcedure', e.target.value)} placeholder="For corporate customers, we identify all natural persons who own ≥25% or exercise significant control…" />
        </FormField>
        <FormField label="Politically exposed person (PEP) policy" hint="How you identify and manage PEPs and their associates">
          <Textarea disabled={disabled} rows={4} value={str('pepPolicy')} onChange={(e) => update('pepPolicy', e.target.value)} placeholder="We screen all customers against PEP databases at onboarding and annually thereafter. PEPs are subject to enhanced due diligence…" />
        </FormField>
        <FormField label="Customer-facing reliance arrangements" hint="Any Third Party providers you rely on for KYC/CDD">
          <Textarea disabled={disabled} rows={3} value={str('relianceArrangements')} onChange={(e) => update('relianceArrangements', e.target.value)} placeholder="We rely on [Provider Name] for identity verification services pursuant to a written arrangement under s.38 of the Act…" />
        </FormField>
      </div>
    );

    // ── Step 4: Part B Program ────────────────────────────────────────────────
    case 4: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 px-4 py-3 text-sm text-indigo-300">
          Part B covers internal controls, governance, and the anti-money laundering compliance officer (AMLCO) / MLRO responsibilities.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="AMLCO / MLRO full name">
            <Input disabled={disabled} value={str('mlroName')} onChange={(e) => update('mlroName', e.target.value)} placeholder="Jane Smith" />
          </FormField>
          <FormField label="AMLCO / MLRO position">
            <Input disabled={disabled} value={str('mlroPosition')} onChange={(e) => update('mlroPosition', e.target.value)} placeholder="Chief Compliance Officer" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="AMLCO / MLRO email">
            <Input disabled={disabled} type="email" value={str('mlroEmail')} onChange={(e) => update('mlroEmail', e.target.value)} placeholder="compliance@company.com.au" />
          </FormField>
          <FormField label="Board reporting frequency" hint="How often the AMLCO reports to the board">
            <FormSelect disabled={disabled} value={str('boardReportingFrequency')} onChange={(v) => update('boardReportingFrequency', v)} options={FREQUENCIES} placeholder="Select frequency…" />
          </FormField>
        </div>
        <FormField label="Internal controls description" hint="Summary of key internal controls in place to manage ML/TF risk">
          <Textarea disabled={disabled} rows={5} value={str('internalControlsDesc')} onChange={(e) => update('internalControlsDesc', e.target.value)} placeholder="Our key internal controls include: (1) pre-onboarding customer screening, (2) transaction monitoring system, (3) dual-authorisation for high-risk transactions…" />
        </FormField>
        <FormField label="Compliance framework and policies" hint="List of supporting compliance policies and their locations">
          <Textarea disabled={disabled} rows={3} value={str('complianceFramework')} onChange={(e) => update('complianceFramework', e.target.value)} placeholder="Our AML/CTF Program is supported by the following policies stored in [document management system]: (1) KYC Policy, (2) SMR Reporting Policy…" />
        </FormField>
        <FormField label="Escalation reporting lines" hint="How suspicious activity is escalated within the organisation">
          <Textarea disabled={disabled} rows={3} value={str('escalationLines')} onChange={(e) => update('escalationLines', e.target.value)} placeholder="Staff report suspicious matters to their direct manager → AMLCO → Board within 24 hours…" />
        </FormField>
      </div>
    );

    // ── Step 5: Customer Due Diligence ────────────────────────────────────────
    case 5: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-green-500/5 border border-green-500/20 px-4 py-3 text-sm text-green-300">
          CDD must be risk-based. Simplified Due Diligence (SDD) applies to lower-risk customers; Enhanced Due Diligence (EDD) applies to high-risk customers, PEPs, and complex structures.
        </div>
        <FormField label="Simplified due diligence (SDD) criteria" hint="Circumstances where simplified CDD may be applied">
          <Textarea disabled={disabled} rows={4} value={str('sddCriteria')} onChange={(e) => update('sddCriteria', e.target.value)} placeholder="SDD applies where the customer is a listed Australian company, government entity, or regulated financial institution…" />
        </FormField>
        <FormField label="Standard CDD procedure" hint="Standard steps for customer due diligence for ordinary-risk customers">
          <Textarea disabled={disabled} rows={5} value={str('standardCddProcedure')} onChange={(e) => update('standardCddProcedure', e.target.value)} placeholder="(1) Collect full legal name, date of birth, residential address, (2) Verify against primary and secondary ID documents, (3) Screen against PEP and sanctions lists…" />
        </FormField>
        <FormField label="Enhanced due diligence (EDD) triggers" hint="Criteria that require EDD to be applied">
          <Textarea disabled={disabled} rows={3} value={str('eddTriggers')} onChange={(e) => update('eddTriggers', e.target.value)} placeholder="EDD is triggered by: (1) Customer risk rating HIGH or VERY HIGH, (2) Politically exposed persons, (3) Correspondent relationships, (4) Complex ownership structures…" />
        </FormField>
        <FormField label="EDD procedure" hint="Additional steps required under enhanced due diligence">
          <Textarea disabled={disabled} rows={4} value={str('eddProcedure')} onChange={(e) => update('eddProcedure', e.target.value)} placeholder="Under EDD we additionally: (1) Obtain senior management approval, (2) Verify source of funds and wealth, (3) Conduct adverse media searches, (4) Review accounts quarterly…" />
        </FormField>
        <FormField label="Ongoing due diligence frequency" hint="How often CDD information is refreshed for existing customers">
          <FormSelect disabled={disabled} value={str('ongoingDdFrequency')} onChange={(v) => update('ongoingDdFrequency', v)} options={FREQUENCIES} placeholder="Select frequency…" />
        </FormField>
      </div>
    );

    // ── Step 6: Ongoing Monitoring ────────────────────────────────────────────
    case 6: return (
      <div className="space-y-4">
        <FormField label="Transaction monitoring approach" hint="How you monitor customer transactions for suspicious activity">
          <Textarea disabled={disabled} rows={5} value={str('transactionMonitoringApproach')} onChange={(e) => update('transactionMonitoringApproach', e.target.value)} placeholder="We use a rule-based transaction monitoring system that flags: (1) Cash transactions ≥$10,000, (2) Structuring patterns, (3) Unusual geographic patterns…" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Cash transaction threshold (AUD)" hint="Threshold above which enhanced scrutiny is applied">
            <Input disabled={disabled} type="number" value={str('ctrThreshold')} onChange={(e) => update('ctrThreshold', e.target.value)} placeholder="10000" />
          </FormField>
          <FormField label="Account review frequency">
            <FormSelect disabled={disabled} value={str('reviewFrequency')} onChange={(v) => update('reviewFrequency', v)} options={FREQUENCIES} placeholder="Select frequency…" />
          </FormField>
        </div>
        <FormField label="Suspicious activity indicators" hint="Red flags and indicators of suspicious activity your staff are trained to identify">
          <Textarea disabled={disabled} rows={5} value={str('suspiciousActivityIndicators')} onChange={(e) => update('suspiciousActivityIndicators', e.target.value)} placeholder="Staff should be alert to: (1) Unusual cash volumes, (2) Structuring below reporting thresholds, (3) Inconsistent financial activity vs stated purpose, (4) Reluctance to provide CDD information…" />
        </FormField>
        <FormField label="Relationship review procedures" hint="Process for periodic review of customer relationships">
          <Textarea disabled={disabled} rows={4} value={str('relationshipReviewProcedure')} onChange={(e) => update('relationshipReviewProcedure', e.target.value)} placeholder="All customer relationships are reviewed [frequency]. Reviews consider changes in risk profile, transaction patterns, and updated sanctions/PEP screening…" />
        </FormField>
      </div>
    );

    // ── Step 7: Reporting Obligations ─────────────────────────────────────────
    case 7: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          Reporting obligations include: Suspicious Matter Reports (SMR), Threshold Transaction Reports (TTR) for cash ≥$10,000, and International Funds Transfer Instructions (IFTI) reports.
        </div>
        <FormField label="SMR policy" hint="Procedure for identifying, assessing, and lodging Suspicious Matter Reports with AUSTRAC">
          <Textarea disabled={disabled} rows={5} value={str('smrPolicy')} onChange={(e) => update('smrPolicy', e.target.value)} placeholder="When staff identify a suspicious matter they must: (1) Document the suspicion in the incident register, (2) Report to the AMLCO within 24 hours, (3) The AMLCO assesses and lodges an SMR with AUSTRAC within 3 business days…" />
        </FormField>
        <FormField label="TTR policy" hint="Process for identifying and reporting threshold transactions (≥$10,000 cash)">
          <Textarea disabled={disabled} rows={4} value={str('ttrPolicy')} onChange={(e) => update('ttrPolicy', e.target.value)} placeholder="All cash transactions of $10,000 or more must be reported to AUSTRAC within 10 business days. TTRs are submitted automatically via [system] or manually by [role]…" />
        </FormField>
        <FormField label="IFTI policy" hint="Process for identifying and reporting international funds transfer instructions">
          <Textarea disabled={disabled} rows={4} value={str('iftiPolicy')} onChange={(e) => update('iftiPolicy', e.target.value)} placeholder="International funds transfer instructions must be reported to AUSTRAC no later than 10 business days after the transfer instruction is transmitted or received…" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="AUSTRAC liaison contact name">
            <Input disabled={disabled} value={str('austracLiaisonName')} onChange={(e) => update('austracLiaisonName', e.target.value)} placeholder="Jane Smith" />
          </FormField>
          <FormField label="AUSTRAC liaison email">
            <Input disabled={disabled} type="email" value={str('austracLiaisonEmail')} onChange={(e) => update('austracLiaisonEmail', e.target.value)} placeholder="compliance@company.com.au" />
          </FormField>
        </div>
      </div>
    );

    // ── Step 8: Record Keeping ────────────────────────────────────────────────
    case 8: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-sm text-muted-foreground">
          The AML/CTF Act requires records to be kept for a minimum of <strong className="text-foreground">7 years</strong> and be accessible within a reasonable timeframe if requested by AUSTRAC.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Minimum retention period *">
            <FormSelect disabled={disabled} value={str('retentionPeriod')} onChange={(v) => update('retentionPeriod', v)} options={RETENTION_PERIODS} placeholder="Select period…" />
          </FormField>
          <FormField label="Primary storage method">
            <FormSelect disabled={disabled} value={str('storageMethod')} onChange={(v) => update('storageMethod', v)} options={STORAGE_METHODS} placeholder="Select method…" />
          </FormField>
        </div>
        <FormField label="Records to be retained" hint="List all types of records kept under the AML/CTF Act">
          <Textarea disabled={disabled} rows={5} value={str('recordTypes')} onChange={(e) => update('recordTypes', e.target.value)} placeholder="Records retained include: (1) Customer identification and verification documents, (2) Transaction records, (3) SMR/TTR/IFTI lodgement records, (4) Risk assessment documentation, (5) Training records, (6) Program review reports…" />
        </FormField>
        <FormField label="Destruction / disposal policy" hint="How records are securely destroyed after the retention period">
          <Textarea disabled={disabled} rows={4} value={str('destructionPolicy')} onChange={(e) => update('destructionPolicy', e.target.value)} placeholder="After the mandatory retention period has elapsed, records are destroyed by [method]. Destruction is logged in [system] and approved by [role]…" />
        </FormField>
        <FormField label="Accessibility arrangements" hint="How records can be retrieved and provided to AUSTRAC upon request">
          <Textarea disabled={disabled} rows={3} value={str('accessibilityArrangements')} onChange={(e) => update('accessibilityArrangements', e.target.value)} placeholder="All records are accessible within 24 hours of request. Offshore records require [additional steps]…" />
        </FormField>
      </div>
    );

    // ── Step 9: Independent Review ────────────────────────────────────────────
    case 9: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 px-4 py-3 text-sm text-blue-300">
          The AML/CTF Program must be reviewed regularly and must be conducted independently of the business (internal audit or external reviewer). AUSTRAC expects this at least annually for higher-risk entities.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Review frequency">
            <FormSelect disabled={disabled} value={str('reviewFrequency')} onChange={(v) => update('reviewFrequency', v)} options={FREQUENCIES} placeholder="Select frequency…" />
          </FormField>
          <FormField label="Reviewer independence">
            <FormSelect disabled={disabled} value={str('reviewerType')} onChange={(v) => update('reviewerType', v)} options={['Internal audit', 'External consultant', 'External auditor', 'Peer review (group entity)']} placeholder="Select type…" />
          </FormField>
        </div>
        <FormField label="Last review date">
          <Input disabled={disabled} type="date" value={str('lastReviewDate')} onChange={(e) => update('lastReviewDate', e.target.value)} />
        </FormField>
        <FormField label="Review scope" hint="What aspects of the AML/CTF Program are covered in each review">
          <Textarea disabled={disabled} rows={5} value={str('reviewScope')} onChange={(e) => update('reviewScope', e.target.value)} placeholder="Each review covers: (1) Risk assessment adequacy, (2) CDD procedure effectiveness, (3) Monitoring system performance, (4) Training completion, (5) SMR/TTR reporting accuracy, (6) Record keeping compliance…" />
        </FormField>
        <FormField label="Findings management" hint="How review findings are tracked and remediated">
          <Textarea disabled={disabled} rows={4} value={str('findingsManagement')} onChange={(e) => update('findingsManagement', e.target.value)} placeholder="Review findings are documented in a Findings Register with priority ratings. Critical findings are escalated to the board within 5 business days. All findings have assigned owners and target resolution dates…" />
        </FormField>
      </div>
    );

    // ── Step 10: Employee Due Diligence ───────────────────────────────────────
    case 10: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-green-500/5 border border-green-500/20 px-4 py-3 text-sm text-green-300">
          Employee due diligence helps prevent ML/TF by ensuring staff with access to customer information and financial transactions have been appropriately screened.
        </div>
        <FormField label="Pre-employment screening procedure" hint="Steps taken before a new staff member commences">
          <Textarea disabled={disabled} rows={4} value={str('preEmploymentScreening')} onChange={(e) => update('preEmploymentScreening', e.target.value)} placeholder="All new employees with access to designated services must complete the following pre-employment checks before commencing: (1) Identity verification, (2) National police check, (3) Employment history verification…" />
        </FormField>
        <FormField label="Background check types" hint="Select all screening checks conducted on new staff">
          <CheckboxGroup disabled={disabled} options={BACKGROUND_CHECK_TYPES} value={arr('backgroundCheckTypes')} onChange={(v) => update('backgroundCheckTypes', v)} />
        </FormField>
        <FormField label="Ongoing monitoring of staff" hint="How existing staff are monitored for changes in risk profile">
          <Textarea disabled={disabled} rows={4} value={str('ongoingStaffMonitoring')} onChange={(e) => update('ongoingStaffMonitoring', e.target.value)} placeholder="Existing staff are subject to: (1) Annual police check renewal, (2) Continuous adverse media screening, (3) Mandatory disclosure of personal insolvency or criminal convictions…" />
        </FormField>
        <FormField label="Contract and confidentiality obligations" hint="AML/CTF obligations embedded in employment contracts">
          <Textarea disabled={disabled} rows={3} value={str('contractObligations')} onChange={(e) => update('contractObligations', e.target.value)} placeholder="All employment contracts include AML/CTF confidentiality clauses and obligations to report suspicious matters. Staff are advised of the 'tipping off' prohibition under s.123 of the Act…" />
        </FormField>
      </div>
    );

    // ── Step 11: Training Program ─────────────────────────────────────────────
    case 11: return (
      <div className="space-y-4">
        <FormField label="Training delivery method">
          <FormSelect disabled={disabled} value={str('trainingDelivery')} onChange={(v) => update('trainingDelivery', v)} options={TRAINING_DELIVERY} placeholder="Select method…" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Training frequency">
            <FormSelect disabled={disabled} value={str('trainingFrequency')} onChange={(v) => update('trainingFrequency', v)} options={FREQUENCIES} placeholder="Select frequency…" />
          </FormField>
          <FormField label="Induction training required?">
            <FormSelect disabled={disabled} value={str('inductionRequired')} onChange={(v) => update('inductionRequired', v)} options={['Yes — before first client contact', 'Yes — within 30 days', 'Yes — within 90 days', 'No']} placeholder="Select…" />
          </FormField>
        </div>
        <FormField label="Training content areas" hint="Select all AML/CTF topics covered in your training program">
          <CheckboxGroup disabled={disabled} options={TRAINING_CONTENT_AREAS} value={arr('trainingContentAreas')} onChange={(v) => update('trainingContentAreas', v)} />
        </FormField>
        <FormField label="Competency assessment" hint="How you test that training has been absorbed">
          <Textarea disabled={disabled} rows={4} value={str('competencyAssessment')} onChange={(e) => update('competencyAssessment', e.target.value)} placeholder="Following each training module, staff complete a [pass mark]% online assessment. Failures require re-training within [X] days. Results are recorded in the staff training register…" />
        </FormField>
        <FormField label="Training records" hint="How training completion is documented and maintained">
          <Textarea disabled={disabled} rows={3} value={str('trainingRecords')} onChange={(e) => update('trainingRecords', e.target.value)} placeholder="Training completion records are maintained in [system]. Records include: staff name, training date, module completed, assessment result, and are retained for 7 years…" />
        </FormField>
      </div>
    );

    // ── Step 12: Board Oversight ──────────────────────────────────────────────
    case 12: return (
      <div className="space-y-4">
        <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 px-4 py-3 text-sm text-purple-300">
          Senior management and the board bear ultimate responsibility for AML/CTF compliance. The program must be adopted by the board and reviewed at the board level.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Board / senior management reporting frequency">
            <FormSelect disabled={disabled} value={str('boardReportingFreq')} onChange={(v) => update('boardReportingFreq', v)} options={FREQUENCIES} placeholder="Select frequency…" />
          </FormField>
          <FormField label="Program adoption date" hint="Date the board formally adopted this AML/CTF program">
            <Input disabled={disabled} type="date" value={str('programAdoptionDate')} onChange={(e) => update('programAdoptionDate', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Governance structure" hint="Describe how AML/CTF governance is structured within the organisation">
          <Textarea disabled={disabled} rows={5} value={str('governanceStructure')} onChange={(e) => update('governanceStructure', e.target.value)} placeholder="The board has ultimate oversight of the AML/CTF program. The AMLCO reports directly to the CEO and presents a compliance update to the board [frequency]. The Audit & Risk Committee oversees compliance matters…" />
        </FormField>
        <FormField label="MLRO escalation to board" hint="Circumstances under which the AMLCO escalates directly to the board">
          <Textarea disabled={disabled} rows={4} value={str('mlroBoardEscalation')} onChange={(e) => update('mlroBoardEscalation', e.target.value)} placeholder="The AMLCO escalates to the board immediately when: (1) A material SMR is lodged, (2) An AUSTRAC investigation is initiated, (3) Systemic control failures are identified, (4) A significant change in risk profile occurs…" />
        </FormField>
        <FormField label="Annual sign-off procedure" hint="How the program is formally reviewed and re-adopted each year">
          <Textarea disabled={disabled} rows={4} value={str('annualSignOff')} onChange={(e) => update('annualSignOff', e.target.value)} placeholder="The AML/CTF Program is reviewed annually by the AMLCO and presented to the board for formal adoption. The board resolution is documented and retained as part of the program records…" />
        </FormField>
      </div>
    );

    default: return null;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProgramWizardPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [reason, setReason] = useState('');
  const [stepData, setStepData] = useState<Record<number, Record<string, string | string[]>>>({});

  const { data: program, isLoading } = useQuery({
    queryKey: ['programs', params.id],
    queryFn:  () => programApi.get(params.id!) as Promise<ProgramForm & { versions: unknown[] }>,
  });

  // Hydrate from server formData on first load
  useEffect(() => {
    if (program) {
      setCurrentStep(program.currentStep ?? 0);
      const saved = (program.formData as Record<string, unknown>) ?? {};
      // Convert from {step_0: {...}, step_1: {...}} format
      const parsed: Record<number, Record<string, string | string[]>> = {};
      for (let i = 0; i < 13; i++) {
        const key = `step_${i}`;
        if (saved[key] && typeof saved[key] === 'object') {
          parsed[i] = saved[key] as Record<string, string | string[]>;
        }
      }
      setStepData(parsed);
    }
  }, [program?.id]);

  const updateField = (k: string, v: string | string[]) => {
    setStepData((prev) => ({
      ...prev,
      [currentStep]: { ...(prev[currentStep] ?? {}), [k]: v },
    }));
  };

  const saveStep = useMutation({
    mutationFn: (payload: { step: number; data: Record<string, unknown>; reason: string }) =>
      programApi.saveStep(params.id!, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs', params.id] });
      toast.success(`Step ${currentStep + 1} saved`);
      if (currentStep < 12) setCurrentStep((s) => s + 1);
      setReason('');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to save step'),
  });

  const publishProgram = useMutation({
    mutationFn: () => programApi.publish(params.id!, { reason: reason || 'AML/CTF Program completed and published.' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['programs', params.id] });
      toast.success('Program published successfully!');
    },
    onError: (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Failed to publish program'),
  });

  const handleSave = () => {
    if (!reason || reason.trim().length < 10) {
      toast.error('Please enter a reason (min 10 characters)');
      return;
    }
    saveStep.mutate({
      step:   currentStep,
      data:   stepData[currentStep] ?? {},
      reason,
    });
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid lg:grid-cols-4 gap-6">
          <Skeleton className="h-96" />
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!program) return null;

  const isLocked  = !!program.lockedAt;
  const step      = STEPS[currentStep]!;
  const StepIcon  = step.icon;
  const current   = stepData[currentStep] ?? {};

  // Completeness indicator
  const completedSteps = new Set<number>();
  for (let i = 0; i < 13; i++) {
    if (i < (program.currentStep ?? 0)) completedSteps.add(i);
    if (stepData[i] && Object.keys(stepData[i]).length > 0) completedSteps.add(i);
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/programs" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Programs
          </Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate max-w-xs">{program.title}</span>
        {isLocked ? (
          <Badge className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
            <Lock className="h-3 w-3" />Published
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {completedSteps.size}/13 sections
          </Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">

        {/* ── Step nav sidebar ─────────────────────────────────────── */}
        <div>
          <Card>
            <CardContent className="p-3">
              <div className="space-y-0.5">
                {STEPS.map((s) => {
                  const isDone   = completedSteps.has(s.id) && s.id !== currentStep;
                  const isActive = s.id === currentStep;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStep(s.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors text-sm',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <div className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0',
                        isDone   ? 'bg-primary text-primary-foreground' :
                        isActive ? 'border-2 border-primary text-primary' :
                        'border border-muted-foreground/30 text-muted-foreground',
                      )}>
                        {isDone ? <CheckCircle className="h-3 w-3" /> : s.id + 1}
                      </div>
                      <span className={cn('truncate text-xs', isActive && 'font-medium text-foreground')}>
                        {s.title}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-4 px-1">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{Math.round((completedSteps.size / 13) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${Math.round((completedSteps.size / 13) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Step content ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <StepIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Step {currentStep + 1} of 13</div>
                  <CardTitle className="text-lg leading-tight">{step.title}</CardTitle>
                </div>
              </div>
              <p className="text-sm text-muted-foreground ml-13">{step.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderStepForm(currentStep, current, updateField, isLocked)}

              {!isLocked && (
                <div className="pt-2 border-t space-y-1.5">
                  <Label htmlFor="reason" className="text-sm">
                    Reason for this change <span className="text-destructive">*</span>
                    <span className="text-xs text-muted-foreground ml-1">(min 10 characters)</span>
                  </Label>
                  <Input
                    id="reason"
                    placeholder="e.g. Updated business profile with new trading name and address"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {!isLocked && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-3">
                {currentStep === 12 ? (
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                    onClick={() => publishProgram.mutate()}
                    disabled={publishProgram.isPending}
                  >
                    {publishProgram.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing…</>
                      : <>Publish program</>}
                  </Button>
                ) : (
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                    onClick={handleSave}
                    disabled={saveStep.isPending}
                  >
                    {saveStep.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                      : <>Save &amp; continue <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
