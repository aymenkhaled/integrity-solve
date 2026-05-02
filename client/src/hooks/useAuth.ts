import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import type { AuthSession } from '@shared/types';

export function useAuth() {
  const { data: session, isLoading, error } = useQuery<AuthSession>({
    queryKey: ['auth', 'me'],
    queryFn:  () => authApi.me() as Promise<AuthSession>,
    retry:    false,
    staleTime: 60_000,
  });

  return {
    session,
    user:      session?.user,
    workspace: session?.workspace,
    isLoading,
    isAuthed:  !!session?.user,
    isAdmin:   session?.workspace?.role === 'WORKSPACE_ADMIN',
    isCO:      session?.workspace?.role === 'COMPLIANCE_OFFICER',
    error,
  };
}

export function useLogin() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/dashboard');
      toast.success('Welcome back!');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Login failed';
      toast.error(msg);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.clear();
      navigate('/login');
      toast.success('Logged out successfully');
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: (data: unknown) => authApi.register(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      navigate('/verify-email');
      toast.success('Account created! Please verify your email.');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : 'Registration failed';
      toast.error(msg);
    },
  });
}
