import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
import { Shield, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/useAuth';
import { useState } from 'react';

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useLogin();
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0a0a0f' }}>
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 60%)' }} />
      {/* Orbs */}
      <div className="orb orb-indigo w-96 h-96 -top-24 -left-24 opacity-40" />
      <div className="orb orb-violet w-80 h-80 -bottom-20 -right-20 opacity-30" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 glow-indigo-sm">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg text-white tracking-tight">Integrity Solve</div>
            <div className="text-xs text-white/35 tracking-widest uppercase">AML/CTF Platform</div>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-white/45">Sign in to your compliance workspace</p>
          </div>

          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/60 text-xs font-medium uppercase tracking-wider">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com.au" autoComplete="email"
                className="h-11 text-white placeholder:text-white/20"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                {...register('email')} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/60 text-xs font-medium uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password"
                  className="h-11 text-white placeholder:text-white/20 pr-10"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
                  {...register('password')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {!!login.error && (
              <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {(login.error as Error).message || 'Invalid email or password'}
              </div>
            )}

            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold glow-indigo-sm border-0 transition-all" disabled={login.isPending}>
              {login.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</>
                : <><Lock className="h-4 w-4 mr-2" />Sign in securely</>
              }
            </Button>
          </form>

          <div className="mt-5 pt-5 text-center text-sm text-white/35" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            Don't have an account?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Start free 14-day trial
            </Link>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/20">
          <span>🔒 SOC2 Type II</span>
          <span>🇦🇺 Australian data residency</span>
          <span>✓ AUSTRAC aligned</span>
        </div>
      </div>
    </div>
  );
}
