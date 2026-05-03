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
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* 3D Orbs */}
      <div className="orb orb-emerald w-96 h-96 top-[-10%] left-[-10%] opacity-60" />
      <div className="orb orb-blue w-80 h-80 bottom-[-5%] right-[-5%] opacity-40" />
      <div className="orb orb-amber w-64 h-64 top-[60%] left-[10%] opacity-20" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-emerald glow-emerald">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-xl text-white tracking-tight">Integrity Solve</div>
            <div className="text-xs text-white/40 tracking-widest uppercase">AML/CTF Platform</div>
          </div>
        </div>

        {/* Card */}
        <div className="glass-dark rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-white/50">Sign in to your compliance workspace</p>
          </div>

          <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com.au"
                autoComplete="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-emerald focus:ring-brand-emerald/20 h-11"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-emerald focus:ring-brand-emerald/20 h-11 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {!!login.error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {(login.error as Error).message || 'Invalid email or password'}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 gradient-emerald hover:opacity-90 text-white font-semibold glow-emerald transition-all duration-200 border-0"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Signing in...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" />Sign in securely</>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-white/40">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-emerald hover:text-emerald-400 font-medium transition-colors">
              Start free 14-day trial
            </Link>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/25">
          <span>🔒 SOC2 Type II</span>
          <span>🇦🇺 Australian data residency</span>
          <span>✓ AUSTRAC aligned</span>
        </div>
      </div>
    </div>
  );
}
