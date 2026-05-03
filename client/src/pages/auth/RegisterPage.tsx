import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'wouter';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRegister } from '@/hooks/useAuth';

const schema = z.object({
  email:     z.string().email('Valid email required'),
  password:  z.string().min(10, 'Min 10 characters')
               .regex(/[A-Z]/, 'Must contain uppercase')
               .regex(/[0-9]/, 'Must contain number')
               .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  fullName:  z.string().min(2, 'Full name required'),
  legalName: z.string().min(2, 'Business legal name required'),
  abn:       z.string().regex(/^\d{11}$/, 'ABN must be 11 digits').optional().or(z.literal('')),
  pathway:   z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PATHWAYS = [
  { value: 'ACCOUNTING',             label: 'Accounting / Bookkeeping' },
  { value: 'LEGAL',                  label: 'Legal Services' },
  { value: 'REAL_ESTATE',            label: 'Real Estate Agents' },
  { value: 'FINANCIAL_SERVICES',     label: 'Financial Services' },
  { value: 'GAMBLING',               label: 'Gambling / Wagering' },
  { value: 'PRECIOUS_METALS',        label: 'Precious Metals & Stones' },
  { value: 'TRUST_COMPANY_SERVICES', label: 'Trust & Company Services' },
  { value: 'OTHER',                  label: 'Other Reporting Entity' },
];

export default function RegisterPage() {
  const register2 = useRegister();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    register2.mutate({
      ...data,
      abn: data.abn || undefined,
      pathway: data.pathway || undefined,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Integrity Solve</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Create your compliance platform</CardTitle>
            <CardDescription>14-day free trial. No credit card required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Your full name</Label>
                  <Input id="fullName" placeholder="Jane Smith" {...register('fullName')} />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" placeholder="you@firm.com.au" {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min 10 chars, uppercase, number, symbol" {...register('password')} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="legalName">Business legal name</Label>
                <Input id="legalName" placeholder="Smith & Associates Pty Ltd" {...register('legalName')} />
                {errors.legalName && <p className="text-xs text-destructive">{errors.legalName.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="abn">ABN (optional)</Label>
                  <Input id="abn" placeholder="12345678901" maxLength={11} {...register('abn')} />
                  {errors.abn && <p className="text-xs text-destructive">{errors.abn.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Industry pathway</Label>
                  <Select onValueChange={(v) => setValue('pathway', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pathway..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PATHWAYS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={register2.isPending}>
                {register2.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                  'Create account & start trial'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
