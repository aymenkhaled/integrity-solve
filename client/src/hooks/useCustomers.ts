import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import type { Customer } from '@shared/schema';

export function useCustomers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn:  () => customerApi.list(params) as Promise<{ items: Customer[]; total: number; page: number; limit: number; hasMore: boolean }>,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn:  () => customerApi.get(id) as Promise<Customer & { beneficialOwners: unknown[] }>,
    enabled:  !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => customerApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to create customer';
      toast.error(msg);
    },
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => customerApi.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers', id] });
      void qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to update customer';
      toast.error(msg);
    },
  });
}

export function useUpdateRiskRating(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { riskRating: string; reason: string; riskNotes?: string }) =>
      customerApi.updateRisk(customerId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers', customerId] });
      void qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Risk rating updated');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Failed to update risk rating';
      toast.error(msg);
    },
  });
}
