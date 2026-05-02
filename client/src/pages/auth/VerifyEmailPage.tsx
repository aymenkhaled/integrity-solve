import { useState } from 'react';
import { Shield, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const { user } = useAuth();
  const logout = useLogout();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyEmail(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Verification failed';
      toast.error(msg);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: (data: unknown) => {
      toast.success('Verification code sent');
      // In dev: show OTP in toast
      const d = data as { _devOtp?: string };
      if (d?._devOtp) {
        toast.info(`Dev OTP: ${d._devOtp}`, { duration: 30000 });
      }
    },
    onError: () => toast.error('Failed to resend verification code'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Integrity Solve</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              We sent a 6-digit code to <strong>{user?.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              className="w-full"
              onClick={() => verifyMutation.mutate()}
              disabled={code.length !== 6 || verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
              ) : (
                'Verify email'
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
              >
                Resend code
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => logout.mutate()}
              >
                Sign out
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
