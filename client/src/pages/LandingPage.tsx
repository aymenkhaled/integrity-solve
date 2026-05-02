import { Link } from 'wouter';
import { Shield, CheckCircle, ArrowRight, Lock, FileText, Users, BarChart3, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    icon: FileText,
    title: 'AML/CTF Program Builder',
    description: '12-step guided wizard generates a publication-ready AML/CTF program tailored to your industry pathway.',
  },
  {
    icon: Users,
    title: 'Customer Due Diligence',
    description: 'Full CDD, EDD, and SDD workflows with beneficial owner tracking, identity verification, and registry checks.',
  },
  {
    icon: Shield,
    title: 'Escalation & SMR Workflow',
    description: 'Structured escalation pathway from suspicious matter detection through to AUSTRAC SMR submission.',
  },
  {
    icon: BarChart3,
    title: 'Risk Intelligence Engine',
    description: 'Automated risk scoring with configurable factor weights across 12 risk dimensions.',
  },
  {
    icon: Lock,
    title: 'Compliance-Grade Audit Trail',
    description: 'Immutable append-only audit log with reason enforcement on every significant decision.',
  },
  {
    icon: Zap,
    title: 'Periodic Review Automation',
    description: 'Schedule and manage periodic customer reviews with automated overdue detection and task assignment.',
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
];

const PRICING = [
  {
    name: 'Starter',
    price: '$199',
    period: '/mo',
    description: 'For small reporting entities getting started with AML/CTF compliance.',
    features: [
      'Up to 3 team members',
      'AML Program wizard',
      '100 customer records',
      '50 identity checks/mo',
      'Email support',
    ],
    cta: 'Start 14-day trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$499',
    period: '/mo',
    description: 'For established compliance programs with active customer onboarding.',
    features: [
      'Up to 10 team members',
      'Full CDD/EDD/SDD workflows',
      'Unlimited customers',
      '500 checks/mo',
      'SMR workflow',
      'Periodic reviews',
      'Priority support',
    ],
    cta: 'Start 14-day trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For group practices and enterprise reporting entities.',
    features: [
      'Unlimited seats',
      'Group workspace management',
      'Custom provider integrations',
      'API access',
      'White-label option',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Integrity Solve</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pathways" className="text-muted-foreground hover:text-foreground transition-colors">Pathways</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login"><a>Sign in</a></Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register"><a>Start free trial</a></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 gradient-brand opacity-5" />
        <div className="container relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm mb-8">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Built for Australian reporting entities under the AML/CTF Act 2006
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
              AML/CTF Compliance{' '}
              <span className="text-primary">done right.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Integrity Solve is the production-grade compliance platform built specifically for Australian
              reporting entities. From AML program creation to AUSTRAC SMR submission — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  <a className="flex items-center gap-2">
                    Start 14-day free trial
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login"><a>Sign in to your account</a></Link>
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
              {['No credit card required', '14-day free trial', 'Cancel anytime'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything you need for AML/CTF compliance</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete compliance operating system — not just a document generator.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry pathways */}
      <section id="pathways" className="py-20 border-t bg-muted/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Built for every reporting entity type</h2>
            <p className="text-muted-foreground">
              Industry-specific program pathways and designated service templates.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {PATHWAYS.map((pathway) => (
              <div
                key={pathway}
                className="rounded-full border bg-background px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors cursor-default"
              >
                {pathway}
              </div>
            ))}
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
            {[
              { label: 'AML Program sections', value: '12' },
              { label: 'Compliance checks', value: '7 types' },
              { label: 'Audit log entries', value: 'Immutable' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border bg-card p-6">
                <div className="text-3xl font-bold text-primary mb-1">{value}</div>
                <div className="text-sm text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 border-t">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">14-day free trial on all plans. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 relative ${
                  plan.highlight
                    ? 'border-primary shadow-lg ring-1 ring-primary'
                    : 'bg-card'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      Most popular
                    </div>
                  </div>
                )}
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.highlight ? 'default' : 'outline'} asChild>
                  <Link href="/register"><a>{plan.cta}</a></Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t bg-brand-navy text-white">
        <div className="container text-center">
          <Globe className="h-10 w-10 text-brand-emerald mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Start your compliance journey today
          </h2>
          <p className="text-white/70 max-w-lg mx-auto mb-8">
            Join Australian reporting entities using Integrity Solve to meet their AUSTRAC obligations
            with confidence.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/register">
              <a className="flex items-center gap-2">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Integrity Solve © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
