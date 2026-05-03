import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Shield, CheckCircle, ArrowRight, Lock, FileText,
  Users, BarChart3, Zap, Star, ChevronRight,
  AlertTriangle, TrendingUp, Clock, Database, Globe,
  Brain, Key, Palette, Network, GraduationCap, Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ComplianceCommandCenter from '@/components/hero/ComplianceCommandCenter';

/* ── Data ────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: FileText,   title: 'AML/CTF Program Builder',   desc: '12-step guided wizard generates a publication-ready AML/CTF program tailored to your industry pathway.', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  { icon: Users,      title: 'Customer Due Diligence',     desc: 'Full CDD, EDD, and SDD workflows with beneficial owner tracking, identity verification, and registry checks.', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  { icon: Shield,     title: 'Escalation & SMR Workflow',  desc: 'Structured escalation pathway from suspicious matter detection through to AUSTRAC SMR submission.', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { icon: Brain,      title: 'Risk Intelligence Engine',   desc: 'Automated composite risk scoring with configurable factor weights across 12 risk dimensions and live signals.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: Lock,       title: 'Immutable Audit Trail',      desc: 'Append-only audit log with reason enforcement on every significant decision — AUSTRAC compliant.', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Zap,        title: 'Smart Alerts & Reviews',     desc: 'AI-assisted monitoring alerts with configurable thresholds and periodic review automation.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { icon: BarChart3,  title: 'Analytics & Reporting',      desc: 'SMR analytics, training completion rates, review dashboards — full operational visibility.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { icon: Network,    title: 'Group Workspaces',           desc: 'Manage entire practice groups with parent/child workspace hierarchies and aggregated compliance stats.', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { icon: Key,        title: 'API Gateway',                desc: 'Scoped API keys, usage tracking, and endpoint documentation for third-party integrations.', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
];

const PATHWAYS = [
  'Accounting & Bookkeeping', 'Legal Services', 'Real Estate Agents',
  'Financial Services', 'Gambling & Wagering', 'Precious Metals & Stones',
  'Trust & Company Services', 'Digital Currency Exchange', 'Mortgage Broking',
];

const PRICING = [
  {
    name: 'Starter', price: '$199', period: '/mo',
    desc: 'For small reporting entities getting started with AML/CTF compliance.',
    features: ['3 team members', 'AML Program wizard', '100 customer records', '50 identity checks/mo', 'Email support'],
    cta: 'Start 14-day trial', highlight: false, badge: '',
  },
  {
    name: 'Professional', price: '$499', period: '/mo',
    desc: 'For established compliance programs with active customer onboarding.',
    features: ['10 team members', 'Full CDD/EDD/SDD', 'Unlimited customers', '500 checks/mo', 'SMR workflow', 'Periodic reviews', 'Priority support'],
    cta: 'Start 14-day trial', highlight: true, badge: 'Most Popular',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    desc: 'For group practices and enterprise reporting entities at scale.',
    features: ['Unlimited seats', 'Group workspace management', 'Custom provider integrations', 'API gateway access', 'White-label option', 'SLA guarantee'],
    cta: 'Contact sales', highlight: false, badge: '',
  },
];

const STATS = [
  { value: '12', label: 'AML Program sections' },
  { value: '7+',  label: 'Compliance check types' },
  { value: '100%', label: 'Immutable audit trail' },
  { value: '4.9★', label: 'Customer satisfaction' },
];

const TESTIMONIALS = [
  { text: 'Integrity Solve transformed how we manage our AML obligations. The program wizard alone saved us weeks of work.', author: 'Sarah Chen', role: 'Head of Compliance, Pacific Legal Partners', initials: 'SC' },
  { text: "The audit trail and SMR workflow gives our board complete confidence we're meeting our AUSTRAC requirements.", author: 'Michael Okafor', role: 'CFO, Brisbane Real Estate Group', initials: 'MO' },
  { text: 'Finally, a compliance platform built specifically for Australian reporting entities. The customer onboarding flows are outstanding.', author: 'Priya Nair', role: 'AML/CTF Officer, Summit Accounting', initials: 'PN' },
];

const FAQ = [
  { q: 'What is Integrity Solve?', a: 'Integrity Solve is a production-grade AML/CTF compliance SaaS platform built specifically for Australian reporting entities. It covers program creation, customer due diligence, escalation workflows, and AUSTRAC SMR submission.' },
  { q: 'Do I need technical knowledge to use it?', a: 'No. The platform is designed for compliance professionals, not developers. The guided wizard, structured forms, and automated document generation mean you never need to write a single line of code.' },
  { q: 'Is my data stored in Australia?', a: 'Yes. All data is stored in Australian data centres. We maintain Australian data residency to support your regulatory obligations under the Privacy Act and AML/CTF Act.' },
  { q: 'How does the 14-day free trial work?', a: 'You get full access to all Starter plan features for 14 days with no credit card required. After the trial ends, you choose a plan or your workspace is automatically paused.' },
  { q: 'Can I manage multiple entities?', a: 'Yes. The Enterprise plan includes Group Workspaces, which lets you manage multiple reporting entities under a single parent workspace with aggregated compliance visibility.' },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }) };

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f', color: '#fafafa' }}>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/8 backdrop-blur-xl" style={{ backgroundColor: 'rgba(10,10,15,0.85)' }}>
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Integrity Solve</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            {[['#features','Features'],['#pathways','Pathways'],['#pricing','Pricing'],['#testimonials','Reviews']].map(([href,label]) => (
              <a key={href} href={href} className="text-white/50 hover:text-white transition-colors font-medium">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 font-medium" asChild>
              <Link href="/register">Start free trial →</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden noise" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'radial-gradient(ellipse at 60% -20%, rgba(99,102,241,0.15) 0%, transparent 50%), #0a0a0f' }}>
        <div className="container max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
              <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm mb-8 text-white/70">
                <span className="h-2 w-2 rounded-full bg-indigo-400 pulse-dot" />
                Built for Australian reporting entities under the AML/CTF Act 2006
              </div>

              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
                AML/CTF Compliance{' '}
                <span className="gradient-text">done right.</span>
              </h1>

              <p className="text-lg text-white/55 max-w-xl mb-10 leading-relaxed">
                The production-grade compliance platform built specifically for Australian reporting entities.
                From AML program creation to AUSTRAC SMR submission — all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12 px-8 text-base font-semibold glow-indigo-sm transition-all" asChild>
                  <Link href="/register" className="flex items-center gap-2">
                    Start 14-day free trial <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/15 text-white/80 hover:bg-white/8 hover:border-white/25 h-12 px-8 text-base" asChild>
                  <Link href="/login">Sign in to your account</Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-5 text-sm text-white/35">
                {['No credit card required','14-day free trial','Australian data residency','Cancel anytime'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-400" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: Compliance Command Center visualization */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.25, ease: 'easeOut' }}
              className="relative h-[500px] lg:h-[580px]">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
              <ComplianceCommandCenter />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="border-y" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="container max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(({ value, label }, i) => (
              <motion.div key={label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="text-3xl font-bold counter mb-1" style={{ color: '#818cf8' }}>{value}</div>
                <div className="text-sm text-white/40">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-28">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-4" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <Cpu className="h-3.5 w-3.5" /> Platform capabilities
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white">Everything you need for AML/CTF compliance</h2>
            <p className="text-white/50 max-w-xl mx-auto text-lg">A complete compliance operating system — not just a document generator.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="card-3d group rounded-2xl p-6 cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.bg} border ${f.border} mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-base mb-2 text-white">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                <div className={`flex items-center gap-1 mt-4 text-xs font-medium ${f.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Learn more <ChevronRight className="h-3 w-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-3 text-white">How Integrity Solve works</h2>
            <p className="text-white/45">From onboarding to AUSTRAC submission in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', icon: FileText, title: 'Build your AML Program', desc: 'Complete the 12-step wizard to create your tailored AML/CTF program aligned to your industry pathway and AUSTRAC requirements.' },
              { step: '02', icon: Users,    title: 'Onboard & monitor customers', desc: 'Run CDD, EDD, and SDD checks. Track beneficial owners. Monitor transactions for suspicious patterns with Smart Alerts.' },
              { step: '03', icon: Shield,   title: 'Escalate & submit SMRs', desc: 'Escalate suspicious matters through the structured workflow. Draft, review, and submit Suspicious Matter Reports to AUSTRAC.' },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div key={step} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="relative text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 glow-indigo-sm mx-auto mb-5">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-5xl font-black absolute -top-3 left-1/2 -translate-x-1/2 -z-10 select-none" style={{ color: 'rgba(255,255,255,0.04)' }}>{step}</div>
                <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industry pathways ───────────────────────────────────────────── */}
      <section id="pathways" className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-white">Built for every reporting entity type</h2>
            <p className="text-white/45">Industry-specific program pathways and designated service templates.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mb-14">
            {PATHWAYS.map((pathway) => (
              <div key={pathway} className="rounded-full px-4 py-2 text-sm font-medium cursor-default transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(99,102,241,0.1)'; el.style.borderColor='rgba(99,102,241,0.3)'; el.style.color='#818cf8'; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background='rgba(255,255,255,0.04)'; el.style.borderColor='rgba(255,255,255,0.08)'; el.style.color='rgba(255,255,255,0.65)'; }}
              >{pathway}</div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Database,   title: 'Immutable audit log',      desc: "Every action logged with actor, reason, and timestamp. Cannot be modified or deleted." },
              { icon: TrendingUp, title: 'Risk-based approach',       desc: "Configurable risk factor weights align with AUSTRAC's risk-based approach guidance." },
              { icon: Clock,      title: 'Periodic review engine',    desc: "Automated scheduling and overdue detection for all customer review obligations." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl p-5 text-center card-3d"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 mx-auto mb-3">
                  <Icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="font-semibold text-sm mb-1 text-white">{title}</div>
                <div className="text-xs text-white/40">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-white">Trusted by compliance professionals</h2>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-sm text-white/40">4.9 / 5 average rating</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {TESTIMONIALS.map(({ text, author, role, initials }, i) => (
              <motion.div key={author} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="rounded-2xl p-6 card-3d"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex mb-3">{[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                <p className="text-sm text-white/50 leading-relaxed mb-5">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">{initials}</div>
                  <div>
                    <div className="text-sm font-semibold text-white">{author}</div>
                    <div className="text-xs text-white/40">{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-28">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-white">Simple, transparent pricing</h2>
            <p className="text-white/45 text-lg">14-day free trial on all plans. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-7 relative card-3d ${plan.highlight ? '' : ''}`}
                style={plan.highlight ? {
                  background: 'rgba(99,102,241,0.05)',
                  border: '2px solid #6366f1',
                  boxShadow: '0 0 40px rgba(99,102,241,0.2)',
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-indigo-600 px-4 py-1 text-[10px] font-bold text-white shadow-lg uppercase tracking-widest">{plan.badge}</div>
                  </div>
                )}
                <h3 className="font-bold text-xl mb-1 text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black counter text-white">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-white/45 mb-6 leading-relaxed">{plan.desc}</p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                      <CheckCircle className="h-4 w-4 text-indigo-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className={`w-full h-11 font-semibold ${plan.highlight ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-0' : 'border border-white/15 text-white/70 hover:bg-white/8 hover:text-white bg-transparent'}`} asChild>
                  <Link href={plan.name === 'Enterprise' ? '#' : '/register'}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-24" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 text-white">Frequently asked questions</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ.map(({ q, a }, i) => (
              <details key={i} className="group rounded-2xl p-5 cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <summary className="flex items-center justify-between text-sm font-semibold text-white list-none">
                  {q}
                  <ChevronRight className="h-4 w-4 text-white/30 group-open:rotate-90 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <p className="mt-3 text-sm text-white/50 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 noise"
        style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 60%), #0a0a0f' }}>
        <div className="orb orb-indigo w-96 h-96 -top-20 -right-20 opacity-30" />
        <div className="orb orb-violet w-64 h-64 -bottom-10 -left-10 opacity-20" />
        <div className="container max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 glow-indigo-sm mx-auto mb-6">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-white max-w-2xl mx-auto">
            Start your compliance journey today
          </h2>
          <p className="text-white/50 max-w-lg mx-auto mb-10 text-lg">
            Join Australian reporting entities using Integrity Solve to meet their AUSTRAC obligations with confidence. Start free, scale as you grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-12 px-8 font-semibold glow-indigo-sm" asChild>
              <Link href="/register" className="flex items-center gap-2">
                Start free trial <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/15 text-white/80 hover:bg-white/8 h-12 px-8" asChild>
              <Link href="/login">Sign in →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-bold text-white">Integrity Solve</span>
              <span className="text-white/25 text-xs ml-2">AML/CTF Compliance Platform</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/35">
              {['Privacy Policy','Terms of Service','Security','Contact'].map((l) => (
                <a key={l} href="#" className="hover:text-white/70 transition-colors">{l}</a>
              ))}
            </div>
            <div className="text-xs text-white/25">© 2026 Integrity Solve. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
