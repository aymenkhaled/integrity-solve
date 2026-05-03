import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/hooks/useAuth';
import { useState } from 'react';

const schema = z.object({
  fullName:  z.string().min(2, 'Full name required'),
  email:     z.string().email('Valid email required'),
  password:  z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'One uppercase letter required').regex(/[0-9]/, 'One number required'),
  legalName: z.string().min(2, 'Company legal name required'),
  abn:       z.string().min(11, 'Valid 11-digit ABN required').max(14),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const register_ = useRegister();
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const pwd = watch('password', '');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0a0a0f' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 30% 70%, rgba(99,102,241,0.08) 0%, transparent 60%)' }} />
      <div className="orb orb-indigo w-[500px] h-[500px] -top-40 -right-20 opacity-30" />
      <div className="orb orb-violet w-80 h-80 -bottom-20 -left-10 opacity-20" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 glow-indigo-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg text-white tracking-tight">Integrity Solve</div>
            <div className="text-xs text-white/35 tracking-widest uppercase">Create your workspace</div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-white mb-1">Start your free trial</h1>
            <p className="text-sm text-white/40">14 days free · No credit card required · Cancel anytime</p>
          </div>

          <form onSubmit={handleSubmit((data) => register_.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Full name</Label>
              <Input placeholder="Jane Smith"
                className="h-10 text-white placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-red-400">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Work email</Label>
              <Input type="email" placeholder="jane@firm.com.au"
                className="h-10 text-white placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="Min. 8 chars, uppercase + number"
                  className="h-10 text-white placeholder:text-white/20 pr-10"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  {...register('password')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwd && (
                <div className="flex gap-4 text-xs mt-1">
                  <span className={pwd.length >= 8 ? 'text-indigo-400' : 'text-white/25'}>✓ 8+ chars</span>
                  <span className={/[A-Z]/.test(pwd) ? 'text-indigo-400' : 'text-white/25'}>✓ Uppercase</span>
                  <span className={/[0-9]/.test(pwd) ? 'text-indigo-400' : 'text-white/25'}>✓ Number</span>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">Company legal name</Label>
              <Input placeholder="Smith & Associates Pty Ltd"
                className="h-10 text-white placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                {...register('legalName')} />
              {errors.legalName && <p className="text-xs text-red-400">{errors.legalName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs uppercase tracking-wider">ABN (11 digits)</Label>
              <Input placeholder="51 824 753 556"
                className="h-10 text-white placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                {...register('abn')} />
              {errors.abn && <p className="text-xs text-red-400">{errors.abn.message}</p>}
            </div>

            {!!register_.error && (
              <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {(register_.error as Error).message || 'Registration failed. Please try again.'}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold border-0 transition-all glow-indigo-sm mt-1" disabled={register_.isPending}>
              {register_.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating workspace...</>
                : 'Create free workspace →'
              }
            </Button>
          </form>

          <div className="mt-5 pt-5 text-center text-sm text-white/35" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[['🔒','Encrypted data'],['🇦🇺','AU residency'],['✓','AUSTRAC aligned']].map(([icon, label]) => (
            <div key={String(label)} className="glass rounded-lg px-3 py-2 text-xs text-white/25">
              <span className="mr-1">{icon}</span>{label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
