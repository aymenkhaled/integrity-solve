import { Link } from 'wouter';
import {
  Shield, CheckCircle, ArrowRight, Lock, FileText,
  Users, BarChart3, Zap, Globe, Star, ChevronRight,
  AlertTriangle, Clock, TrendingUp, Database, Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: FileText,
    title: 'AML/CTF Program Builder',
    description: '12-step guided wizard generates a publication-ready AML/CTF program tailored to your industry pathway.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Users,
    title: 'Customer Due Diligence',
    description: 'Full CDD, EDD, and SDD workflows with beneficial owner tracking, identity verification, and registry checks.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Shield,
    title: 'Escalation & SMR Workflow',
    description: 'Structured escalation pathway from suspicious matter detection through to AUSTRAC SMR submission.',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  {
    icon: BarChart3,
    title: 'Risk Intelligence Engine',
    description: 'Automated risk scoring with configurable factor weights across 12 risk dimensions.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    icon: Lock,
    title: 'Immutable Audit Trail',
    description: 'Append-only audit log with reason enforcement on every significant decision — AUSTRAC compliant.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Zap,
    title: 'Smart Alerts & Reviews',
    description: 'AI-assisted transaction monitoring alerts with configurable thresholds and periodic review automation.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
];

const PATHWAYS = [
  'Accounting & Bookkeeping',
  'Legal Services',
  'Real Estate Agents',
  'Financial Services',
  'Gambling & Wagering',
  'Precious Metals & Stones',
  'Trust & Company Services',
  'Digital Currency Exchange',
  'Mortgage Broking',
];

const PRICING = [
  {
    name: 'Starter',
    price: '$199',
    period: '/mo',
    description: 'For small reporting entities getting started with AML/CTF compliance.',
    features: ['3 team members', 'AML Program wizard', '100 customer records', '50 identity checks/mo', 'Email support'],
    cta: 'Start 14-day trial',
    highlight: false,
    badge: '',
  },
  {
    name: 'Professional',
    price: '$499',
    period: '/mo',
    description: 'For established compliance programs with active customer onboarding.',
    features: ['10 team members', 'Full CDD/EDD/SDD', 'Unlimited customers', '500 checks/mo', 'SMR workflow', 'Periodic reviews', 'Priority support'],
    cta: 'Start 14-day trial',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For group practices and enterprise reporting entities.',
    features: ['Unlimited seats', 'Group workspace management', 'Custom provider integrations', 'API gateway access', 'White-label option', 'SLA guarantee'],
    cta: 'Contact sales',
    highlight: false,
    badge: '',
  },
];

const STATS = [
  { value: '12', label: 'AML Program sections' },
  { value: '7', label: 'Compliance check types' },
  { value: '100%', label: 'Immutable audit trail' },
  { value: '4.9★', label: 'Customer satisfaction' },
];

const TESTIMONIALS = [
  {
    text: 'Integrity Solve transformed how we manage our AML obligations. The program wizard alone saved us weeks of work.',
    author: 'Sarah Chen',
    role: 'Head of Compliance, Pacific Legal Partners',
    initials: 'SC',
  },
  {
    text: "The audit trail and SMR workflow gives our board complete confidence we're meeting our AUSTRAC requirements.",
    author: 'Michael Okafor',
    role: 'CFO, Brisbane Real Estate Group',
    initials: 'MO',
  },
  {
    text: 'Finally, a compliance platform built specifically for Australian reporting entities. The customer onboarding flows are outstanding.',
    author: 'Priya Nair',
    role: 'AML/CTF Officer, Summit Accounting',
    initials: 'PN',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-emerald">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Integrity Solve</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Features</a>
            <a href="#pathways" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Pathways</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Pricing</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Reviews</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="gradient-emerald text-white border-0 hover:opacity-90" asChild>
              <Link href="/register">Start free trial →</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — dark, gradient mesh, 3D orbs */}
      <section className="relative overflow-hidden gradient-mesh text-white py-28 lg:py-36">
        {/* 3D Orbs */}
        <div className="orb orb-emerald w-[600px] h-[600px] -top-40 -right-40 opacity-30" />
        <div className="orb orb-blue w-[400px] h-[400px] -bottom-20 -left-20 opacity-20" />
        <div className="orb orb-amber w-64 h-64 top-1/2 left-1/3 opacity-10" />

        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full glass px-5 py-2 text-sm mb-8 text-white/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
              Built for Australian reporting entities under the AML/CTF Act 2006
            </div>

            {/* Heading */}
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.05]">
              AML/CTF Compliance{' '}
              <span className="gradient-text text-glow">done right.</span>
            </h1>

            <p className="text-lg lg:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              The production-grade compliance platform built specifically for Australian reporting entities.
              From AML program creation to AUSTRAC SMR submission — all in one place.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="gradient-emerald text-white border-0 hover:opacity-90 glow-emerald h-12 px-8 text-base font-semibold" asChild>
                <Link href="/register" className="flex items-center gap-2">
                  Start 14-day free trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-base" asChild>
                <Link href="/login">Sign in to your account</Link>
              </Button>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/40">
              {['No credit card required', '14-day free trial', 'Australian data residency', 'Cancel anytime'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Mock dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative max-w-4xl mx-auto"
          >
            <div className="glass-dark rounded-2xl p-4 shadow-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="h-3 w-3 rounded-full bg-red-400/60" />
                <div className="h-3 w-3 rounded-full bg-amber-400/60" />
                <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
                <div className="flex-1 mx-4 h-5 rounded-md bg-white/5 max-w-48" />
              </div>
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[
                  { label: 'Customers', value: '1,247', color: 'text-blue-400' },
                  { label: 'Open Alerts', value: '3', color: 'text-red-400' },
                  { label: 'Tasks Due', value: '8', color: 'text-amber-400' },
                  { label: 'Compliance', value: '94%', color: 'text-emerald-400' },
                ].map((s) => (
                  <div key={s.label} className="glass rounded-xl p-3 text-left">
                    <div className={`text-xl font-bold counter ${s.color}`}>{s.value}</div>
                    <div className="text-[11px] text-white/40 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 glass rounded-xl p-3 h-28 flex flex-col">
                  <div className="text-xs text-white/40 mb-2">Recent Customers</div>
                  {['John Smith — LOW', 'Acme Corp — MEDIUM', 'Pacific Trust — HIGH'].map((r) => (
                    <div key={r} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                      <div className="h-4 w-4 rounded-full bg-white/10 flex-shrink-0" />
                      <div className="text-[11px] text-white/50 truncate">{r}</div>
                    </div>
                  ))}
                </div>
                <div className="glass rounded-xl p-3 h-28">
                  <div className="text-xs text-white/40 mb-2">Activity</div>
                  <div className="flex items-end gap-1 h-14">
                    {[30, 60, 40, 80, 55, 90, 70].map((v, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-emerald-500/50" style={{ height: `${v}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating glow */}
            <div className="absolute -inset-4 bg-emerald-500/5 rounded-3xl blur-2xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b bg-muted/30">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="text-3xl font-bold text-primary counter mb-1">{value}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-xs font-medium mb-4 text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />
              Platform capabilities
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything you need for AML/CTF compliance</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              A complete compliance operating system — not just a document generator.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="card-3d group rounded-2xl border bg-card p-6 hover:border-primary/30 transition-all"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${feature.bg} border ${feature.border} mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                <div className={`flex items-center gap-1 mt-4 text-xs font-medium ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Learn more <ChevronRight className="h-3 w-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30 border-y">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How Integrity Solve works</h2>
            <p className="text-muted-foreground">From onboarding to AUSTRAC submission in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', icon: FileText, title: 'Build your AML Program', desc: 'Complete the 12-step wizard to create your tailored AML/CTF program aligned to your industry pathway and AUSTRAC requirements.' },
              { step: '02', icon: Users, title: 'Onboard & monitor customers', desc: 'Run CDD, EDD, and SDD checks. Track beneficial owners. Monitor transactions for suspicious patterns with Smart Alerts.' },
              { step: '03', icon: Shield, title: 'Escalate & submit SMRs', desc: 'Escalate suspicious matters through the structured workflow. Draft, review, and submit Suspicious Matter Reports to AUSTRAC.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-emerald glow-emerald mx-auto mb-4">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-4xl font-black text-muted-foreground/20 absolute -top-2 left-1/2 -translate-x-1/2 -z-10 select-none">{step}</div>
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry pathways */}
      <section id="pathways" className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Built for every reporting entity type</h2>
            <p className="text-muted-foreground">Industry-specific program pathways and designated service templates.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {PATHWAYS.map((pathway) => (
              <div
                key={pathway}
                className="rounded-full border bg-background px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-default"
              >
                {pathway}
              </div>
            ))}
          </div>
          {/* Compliance highlights */}
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Database, title: 'Immutable audit log', desc: 'Every action logged with actor, reason, and timestamp. Cannot be modified or deleted.' },
              { icon: TrendingUp, title: 'Risk-based approach', desc: 'Configurable risk factor weights align with AUSTRAC\'s risk-based approach guidance.' },
              { icon: Clock, title: 'Periodic review engine', desc: 'Automated scheduling and overdue detection for all customer review obligations.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border bg-card p-5 text-center card-3d">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-semibold text-sm mb-1">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30 border-y">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Trusted by compliance professionals</h2>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-sm text-muted-foreground">4.9 / 5 average rating</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {TESTIMONIALS.map(({ text, author, role, initials }, i) => (
              <motion.div
                key={author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border bg-card p-6 card-3d"
              >
                <div className="flex mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-emerald text-white text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{author}</div>
                    <div className="text-xs text-muted-foreground">{role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-lg">14-day free trial on all plans. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 relative card-3d ${
                  plan.highlight
                    ? 'border-primary shadow-xl ring-2 ring-primary/20 bg-gradient-to-b from-primary/5 to-background'
                    : 'bg-card'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="rounded-full gradient-emerald px-4 py-1 text-xs font-semibold text-white shadow-lg">
                      {plan.badge}
                    </div>
                  </div>
                )}
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black counter">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{plan.description}</p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 font-semibold ${plan.highlight ? 'gradient-emerald text-white border-0 hover:opacity-90' : ''}`}
                  variant={plan.highlight ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={plan.name === 'Enterprise' ? '#' : '/register'}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden gradient-mesh text-white py-24">
        <div className="orb orb-emerald w-96 h-96 -top-20 -right-20 opacity-30" />
        <div className="orb orb-blue w-64 h-64 -bottom-10 -left-10 opacity-20" />
        <div className="container relative z-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-emerald glow-emerald mx-auto mb-6">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 max-w-2xl mx-auto">
            Start your compliance journey today
          </h2>
          <p className="text-white/60 max-w-lg mx-auto mb-10 text-lg">
            Join Australian reporting entities using Integrity Solve to meet their AUSTRAC obligations
            with confidence. Start free, scale as you grow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gradient-emerald text-white border-0 hover:opacity-90 glow-emerald h-12 px-8 text-base font-semibold" asChild>
              <Link href="/register" className="flex items-center gap-2">
                Start free 14-day trial
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-base" asChild>
              <Link href="/login">Sign in to account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-emerald">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold">Integrity Solve</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Production-grade AML/CTF compliance platform for Australian reporting entities.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              <div>
                <div className="font-semibold mb-3">Product</div>
                <div className="space-y-2 text-muted-foreground">
                  <div><a href="#features" className="hover:text-foreground transition-colors">Features</a></div>
                  <div><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></div>
                  <div><a href="#pathways" className="hover:text-foreground transition-colors">Pathways</a></div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-3">Company</div>
                <div className="space-y-2 text-muted-foreground">
                  <div><a href="#" className="hover:text-foreground transition-colors">About</a></div>
                  <div><a href="#" className="hover:text-foreground transition-colors">Blog</a></div>
                  <div><a href="#" className="hover:text-foreground transition-colors">Contact</a></div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-3">Legal</div>
                <div className="space-y-2 text-muted-foreground">
                  <div><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></div>
                  <div><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></div>
                  <div><a href="#" className="hover:text-foreground transition-colors">Security</a></div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Integrity Solve. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <span>🇦🇺 Australian owned</span>
              <span>🔒 SOC2 Type II</span>
              <span>✓ AUSTRAC aligned</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
