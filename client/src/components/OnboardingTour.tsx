import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Shield, Users, FileText, Brain, AlertTriangle, Zap, BarChart2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOUR_KEY = 'is_tour_v2_done';

interface Step {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
  description: string;
  benefit: string;
  path: string;
}

const STEPS: Step[] = [
  {
    icon: Shield,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    title: 'Welcome to Integrity Solve',
    subtitle: 'Australia\'s #1 AML/CTF Compliance Platform',
    description: 'Built specifically for Australian reporting entities under the AML/CTF Act 2006. This short tour will walk you through the core features — it takes under 2 minutes.',
    benefit: 'You\'re joining 500+ compliance professionals who trust Integrity Solve to manage their AUSTRAC obligations.',
    path: '/dashboard',
  },
  {
    icon: FileText,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    title: 'AML/CTF Program Builder',
    subtitle: 'Generate your compliance program in minutes',
    description: 'The 12-step guided wizard takes you through every required section of an AML/CTF program — from ML/TF risk assessment through to AUSTRAC reporting procedures.',
    benefit: 'Save 40–60 hours of manual document work. Every section is auto-generated and publication-ready.',
    path: '/programs',
  },
  {
    icon: Users,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    title: 'Customer Due Diligence',
    subtitle: 'CDD, EDD, and SDD in one place',
    description: 'Manage your entire customer lifecycle from initial KYC through to enhanced due diligence. Beneficial owner tracking, identity verification, sanctions screening, and PEP checks are all built in.',
    benefit: 'Never miss a required check. Automated workflows ensure every customer meets your risk appetite before onboarding.',
    path: '/customers',
  },
  {
    icon: Brain,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    title: 'Risk Intelligence Engine',
    subtitle: 'Composite scoring across 12 risk dimensions',
    description: 'The AI-assisted risk engine continuously scores your customers across geography, transaction behaviour, entity type, and political exposure — automatically escalating when thresholds are breached.',
    benefit: 'Catch suspicious activity 3× faster with automated composite risk scoring and live signal monitoring.',
    path: '/risk',
  },
  {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    title: 'Escalation & SMR Workflow',
    subtitle: 'Structured suspicious matter reporting',
    description: 'When suspicious activity is detected, our guided escalation workflow takes you from initial detection through internal review, compliance officer decision, and AUSTRAC SMR submission — with full audit trail.',
    benefit: 'Meet your AUSTRAC reporting obligations with a defensible, documented decision trail on every escalation.',
    path: '/escalations',
  },
  {
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    title: 'Smart Alerts & Periodic Reviews',
    subtitle: 'Never miss a compliance obligation',
    description: 'Configurable smart alerts notify your team when customers breach risk thresholds, reviews become overdue, or suspicious patterns emerge. The periodic review module automates your annual CDD review schedule.',
    benefit: 'Reduce compliance exposure by ensuring no customer falls through the cracks with automated reminders and workflows.',
    path: '/alerts',
  },
  {
    icon: BarChart2,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    title: 'Analytics & Reporting',
    subtitle: 'Full operational compliance visibility',
    description: 'SMR submission analytics, training completion dashboards, review completion rates, and risk distribution charts — everything your board and auditors need in one place.',
    benefit: 'Demonstrate a robust AML/CTF program to AUSTRAC with data-backed evidence of your compliance activities.',
    path: '/analytics',
  },
  {
    icon: GraduationCap,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    title: 'Staff Training Records',
    subtitle: 'AML/CTF training compliance made easy',
    description: 'Track staff training completion, manage training programs, send automated reminders for upcoming renewals, and generate training registers for regulatory inspection.',
    benefit: 'Stay ahead of your s.89 training obligations with automated tracking and reporting across your entire team.',
    path: '/training',
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        const timer = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(TOUR_KEY, '1'); } catch {}
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: '0 0 0 1px rgba(99,102,241,0.1), 0 25px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.1)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Progress bar */}
              <div className="h-1 w-full" style={{ background: 'hsl(var(--border))' }}>
                <motion.div
                  className="h-full bg-indigo-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
                />
              </div>

              <div className="p-7">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${current.bg} border`}
                      style={{ borderColor: current.color.replace('text-', '').includes('indigo') ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.1)' }}>
                      <Icon className={`h-6 w-6 ${current.color}`} />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                        Step {step + 1} of {STEPS.length}
                      </div>
                      <h2 className="text-lg font-bold text-foreground leading-tight">{current.title}</h2>
                    </div>
                  </div>
                  <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5 mt-0.5">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="text-sm font-semibold text-muted-foreground mb-3">{current.subtitle}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{current.description}</p>

                    {/* Benefit callout */}
                    <div className="rounded-xl p-4 mb-6"
                      style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div className="flex items-start gap-2">
                        <div className="h-4 w-4 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        </div>
                        <p className="text-xs text-indigo-300 leading-relaxed font-medium">{current.benefit}</p>
                      </div>
                    </div>

                    {/* Step dots */}
                    <div className="flex items-center justify-center gap-1.5 mb-6">
                      {STEPS.map((_, i) => (
                        <button key={i} onClick={() => setStep(i)}
                          className="rounded-full transition-all duration-200"
                          style={{
                            width: i === step ? 20 : 6,
                            height: 6,
                            background: i === step ? '#6366f1' : i < step ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)',
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={dismiss}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Skip tour
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {step > 0 && (
                      <Button variant="outline" size="sm" onClick={prev}>
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Back
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={next}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                    >
                      {step < STEPS.length - 1 ? (
                        <>Next <ChevronRight className="h-3.5 w-3.5 ml-1" /></>
                      ) : (
                        <>Get started <ChevronRight className="h-3.5 w-3.5 ml-1" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
