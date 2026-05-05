import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateCustomerSchema } from '@shared/validators';
import { useCreateCustomer } from '@/hooks/useCustomers';
import type { z } from 'zod';

type FormData = z.infer<typeof CreateCustomerSchema>;

export default function NewCustomerPage() {
  const [customerType, setCustomerType] = useState<string>('INDIVIDUAL');
  const [, navigate] = useLocation();
  const createCustomer = useCreateCustomer();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: { customerType: 'INDIVIDUAL', country: 'AU' },
  });

  const onSubmit = async (data: FormData) => {
    const result = await createCustomer.mutateAsync(data) as { id: string } | null;
    if (result && 'id' in result) {
      navigate(`/customers/${result.id}`);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customers" className="flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Customers</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">New Customer</span>
      </div>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                defaultValue="INDIVIDUAL"
                onValueChange={(v) => {
                  setCustomerType(v);
                  setValue('customerType', v as FormData['customerType']);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                  <SelectItem value="TRUST">Trust</SelectItem>
                  <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                  <SelectItem value="ASSOCIATION">Association</SelectItem>
                  <SelectItem value="GOVERNMENT">Government</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {customerType === 'INDIVIDUAL' ? 'Personal Details' : 'Entity Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerType === 'INDIVIDUAL' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Given names</Label>
                      <Input placeholder="Jane Mary" {...register('givenNames')} />
                      {errors.givenNames && <p className="text-xs text-destructive">{errors.givenNames.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Family name</Label>
                      <Input placeholder="Smith" {...register('familyName')} />
                      {errors.familyName && <p className="text-xs text-destructive">{errors.familyName.message}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Date of birth</Label>
                      <Input type="date" {...register('dateOfBirth')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nationality (ISO code)</Label>
                      <Input placeholder="AU" maxLength={2} {...register('nationality')} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Entity name</Label>
                    <Input placeholder="Smith Holdings Pty Ltd" {...register('entityName')} />
                    {errors.entityName && <p className="text-xs text-destructive">{errors.entityName.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>ABN</Label>
                      <Input placeholder="12345678901" maxLength={11} {...register('abn')} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>ACN</Label>
                      <Input placeholder="123456789" maxLength={9} {...register('acn')} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact & Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...register('email')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input {...register('phone')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Street address</Label>
                <Input {...register('addressLine1')} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Suburb</Label>
                  <Input {...register('suburb')} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select onValueChange={(v) => setValue('state', v)}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Postcode</Label>
                  <Input maxLength={4} {...register('postcode')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                'Create customer'
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/customers">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
