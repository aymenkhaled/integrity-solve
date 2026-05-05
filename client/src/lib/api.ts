/**
 * client/src/lib/api.ts — Typed fetch wrapper for the backend API.
 */
import type { ApiResponse } from '@shared/types';

const BASE = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept':        'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const data = (await res.json()) as ApiResponse<T>;

  if (!data.ok) {
    const err = new ApiError(data.error.message, data.error.code, data.error.field);
    throw err;
  }

  return data.data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body?: unknown)  => request<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown)  => request<T>('PATCH',  path, body),
  put:    <T>(path: string, body?: unknown)  => request<T>('PUT',    path, body),
  delete: <T>(path: string, body?: unknown)  => request<T>('DELETE', path, body),
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register:            (data: unknown) => api.post('/auth/register', data),
  login:               (data: unknown) => api.post('/auth/login', data),
  logout:              ()              => api.post('/auth/logout'),
  me:                  ()              => api.get('/auth/me'),
  verifyEmail:         (code: string)  => api.post('/auth/verify-email', { code }),
  resendVerification:  ()              => api.post('/auth/resend-verification'),
  switchWorkspace:     (workspaceId: string) => api.post('/auth/switch-workspace', { workspaceId }),
  updateProfile:       (data: { fullName: string }) => api.patch('/auth/profile', data),
  changePassword:      (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

// ─── Workspace ────────────────────────────────────────────────────────────────

export const workspaceApi = {
  current:         ()              => api.get('/workspaces/current'),
  update:          (data: unknown) => api.patch('/workspaces/current', data),
  members:         ()              => api.get('/workspaces/members'),
  invite:          (data: unknown) => api.post('/workspaces/members/invite', data),
  removeMember:    (userId: string) => api.delete(`/workspaces/members/${userId}`),
  acceptInvitation:(token: string)  => api.post('/workspaces/invitations/accept', { token }),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customerApi = {
  list:         (params?: Record<string, unknown>) =>
    api.get(`/customers?${new URLSearchParams(params as Record<string, string>).toString()}`),
  create:       (data: unknown) => api.post('/customers', data),
  get:          (id: string)    => api.get(`/customers/${id}`),
  update:       (id: string, data: unknown) => api.patch(`/customers/${id}`, data),
  updateStatus: (id: string, status: string, reason: string) =>
    api.patch(`/customers/${id}/status`, { status, reason }),
  updateRisk:   (id: string, data: unknown) => api.patch(`/customers/${id}/risk-rating`, data),
  listBOs:      (id: string)    => api.get(`/customers/${id}/beneficial-owners`),
  createBO:     (id: string, data: unknown) => api.post(`/customers/${id}/beneficial-owners`, data),
};

// ─── Checks ───────────────────────────────────────────────────────────────────

export const checkApi = {
  run:       (data: unknown)    => api.post('/checks/run', data),
  get:       (id: string)       => api.get(`/checks/${id}`),
  list:      (params?: Record<string, unknown>) =>
    api.get(`/checks?${new URLSearchParams(params as Record<string, string>).toString()}`),
  override:  (id: string, data: unknown) => api.post(`/checks/${id}/override`, data),
};

// ─── Escalations / SMR ────────────────────────────────────────────────────────

export const escalationApi = {
  list:      ()                => api.get('/escalations'),
  create:    (data: unknown)   => api.post('/escalations', data),
  get:       (id: string)      => api.get(`/escalations/${id}`),
  update:    (id: string, data: unknown) => api.patch(`/escalations/${id}`, data),
  escalate:  (id: string, reason: string) => api.post(`/escalations/${id}/escalate`, { reason }),
  close:     (id: string, data: unknown)  => api.post(`/escalations/${id}/close`, data),
  createSmr: (id: string, data: unknown)  => api.post(`/escalations/${id}/smr`, data),
  approveSmr:(id: string, smrId: string, reason: string) =>
    api.post(`/escalations/${id}/smr/${smrId}/approve`, { reason }),
  submitSmr: (id: string, smrId: string, reason: string) =>
    api.post(`/escalations/${id}/smr/${smrId}/submit`, { reason }),
};

// ─── Programs ─────────────────────────────────────────────────────────────────

export const programApi = {
  list:    ()                  => api.get('/programs'),
  create:  (data: unknown)     => api.post('/programs', data),
  get:     (id: string)        => api.get(`/programs/${id}`),
  saveStep:(id: string, data: unknown) => api.patch(`/programs/${id}/step`, data),
  publish: (id: string, data: unknown) => api.post(`/programs/${id}/publish`, data),
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const taskApi = {
  list:   (params?: Record<string, unknown>) =>
    api.get(`/tasks?${new URLSearchParams(params as Record<string, string>).toString()}`),
  create: (data: unknown)              => api.post('/tasks', data),
  get:    (id: string)                 => api.get(`/tasks/${id}`),
  update: (id: string, data: unknown)  => api.patch(`/tasks/${id}`, data),
  delete: (id: string)                 => api.delete(`/tasks/${id}`),
};

// ─── Audit ────────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    api.get(`/audit?${new URLSearchParams(params as Record<string, string>).toString()}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationApi = {
  list:    (unreadOnly?: boolean) => api.get(`/notifications${unreadOnly ? '?unread=true' : ''}`),
  markRead:(id: string)           => api.post(`/notifications/${id}/read`),
  markAllRead: ()                 => api.post('/notifications/read-all'),
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export const billingApi = {
  overview: ()              => api.get('/billing/overview'),
  usage:    ()              => api.get('/billing/usage'),
  checkout: (tier: string)  => api.post('/billing/checkout', { tier }),
  portal:   ()              => api.post('/billing/portal'),
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const documentApi = {
  list:     ()                              => api.get('/documents'),
  generate: (data: unknown)                => api.post('/documents/generate', data),
  delete:   (id: string)                   => api.delete(`/documents/${id}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  stats:      ()                               => api.get('/admin/stats'),
  workspaces: (params?: Record<string, unknown>) =>
    api.get(`/admin/workspaces?${new URLSearchParams(params as Record<string, string>).toString()}`),
  workspace:  (id: string)                     => api.get(`/admin/workspaces/${id}`),
  updateWorkspace: (id: string, data: unknown) => api.patch(`/admin/workspaces/${id}`, data),
  users:      (params?: Record<string, unknown>) =>
    api.get(`/admin/users?${new URLSearchParams(params as Record<string, string>).toString()}`),
  audit:      (params?: Record<string, unknown>) =>
    api.get(`/admin/audit?${new URLSearchParams(params as Record<string, string>).toString()}`),
};

// ─── Training ─────────────────────────────────────────────────────────────────

export const trainingApi = {
  list:   (params?: Record<string, unknown>) =>
    api.get(`/training?${new URLSearchParams(params as Record<string, string>).toString()}`),
  enroll: (data: unknown) => api.post('/training', data),
  update: (id: string, data: unknown) => api.patch(`/training/${id}`, data),
  delete: (id: string) => api.delete(`/training/${id}`),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alertApi = {
  list:         (params?: Record<string, unknown>) =>
    api.get(`/alerts?${new URLSearchParams(params as Record<string, string>).toString()}`),
  create:       (data: unknown)        => api.post('/alerts', data),
  get:          (id: string)           => api.get(`/alerts/${id}`),
  acknowledge:  (id: string)           => api.post(`/alerts/${id}/acknowledge`),
  resolve:      (id: string, note: string) => api.post(`/alerts/${id}/resolve`, { resolutionNote: note }),
  falsePositive:(id: string, note: string) => api.post(`/alerts/${id}/false-positive`, { resolutionNote: note }),
};

// ─── Providers ────────────────────────────────────────────────────────────────

export const providersApi = {
  list: () => api.get('/providers'),
};

// ─── Groups (D2) ──────────────────────────────────────────────────────────────

export const groupsApi = {
  list:   () => api.get('/groups'),
  link:   (childWorkspaceId: string) => api.post('/groups/link', { childWorkspaceId }),
  unlink: (childId: string) => api.delete(`/groups/link/${childId}`),
};

// ─── Gateway (D8) ─────────────────────────────────────────────────────────────

export const gatewayApi = {
  listKeys:  () => api.get('/gateway/keys'),
  createKey: (body: { name: string; scopes: string[]; expiresInDays?: number }) =>
    api.post('/gateway/keys', body),
  revokeKey: (id: string) => api.delete(`/gateway/keys/${id}`),
  getUsage:  () => api.get('/gateway/usage'),
};

// ─── White-label (D5) ─────────────────────────────────────────────────────────

export const whitelabelApi = {
  get:    () => api.get('/whitelabel'),
  update: (body: Record<string, unknown>) => api.patch('/whitelabel', body),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  smr:       () => api.get('/analytics/smr'),
  training:  () => api.get('/analytics/training'),
  reviews:   () => api.get('/analytics/reviews'),
  dashboard: () => api.get('/analytics/dashboard'),
};

// ─── Risk Intelligence ────────────────────────────────────────────────────────

export const riskApi = {
  analytics: () => api.get('/risk/analytics'),
  signals:   () => api.get('/risk/signals'),
};

// ─── Cases (Milestone 1) ──────────────────────────────────────────────────────

export const casesApi = {
  list:    ()                  => api.get('/cases'),
  create:  (data: unknown)     => api.post('/cases', data),
  summary: (id: string)        => api.get(`/cases/${id}/summary`),
  pdf:     (id: string)        => `/api/cases/${id}/pdf`, // direct download URL
};

// ─── Wizard (Milestone 1) ─────────────────────────────────────────────────────

export const wizardApi = {
  start:    (data: { caseId: string; wizardType: 'PROGRAM_SETUP' | 'TRANSACTION_CDD' }) =>
    api.post('/wizard/start', data),
  saveStep: (id: string, data: { stepKey: string; answers: Record<string, unknown>; complete: boolean }) =>
    api.patch(`/wizard/${id}/step`, data),
  get:      (id: string)       => api.get(`/wizard/${id}`),
  forCase:  (caseId: string)   => api.get(`/wizard/case/${caseId}`),
};

// ─── Didit (Milestone 1) ──────────────────────────────────────────────────────

export const diditApi = {
  createSession: (data: {
    caseId: string;
    capability: 'kyc' | 'kyb' | 'aml_screening' | 'company_aml';
    subjectId?: string;
    contactDetails?: { email?: string; phone?: string };
    reason: string;
  }) => api.post('/providers/didit/session', data),

  sessions:     (caseId?: string) =>
    api.get(`/providers/didit/sessions${caseId ? `?caseId=${caseId}` : ''}`),

  session:      (id: string)     => api.get(`/providers/didit/sessions/${id}`),

  mockComplete: (sessionId: string, outcome = 'Approved') =>
    api.post(`/providers/didit/mock-complete/${sessionId}`, { outcome }),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviewApi = {
  list:     (params?: Record<string, unknown>) =>
    api.get(`/reviews?${new URLSearchParams(params as Record<string, string>).toString()}`),
  overdue:  ()                         => api.get('/reviews/overdue'),
  schedule: (data: unknown)            => api.post('/reviews', data),
  get:      (id: string)               => api.get(`/reviews/${id}`),
  start:    (id: string)               => api.post(`/reviews/${id}/start`),
  complete: (id: string, data: unknown) => api.post(`/reviews/${id}/complete`, data),
  cancel:   (id: string, reason?: string) => api.post(`/reviews/${id}/cancel`, { reason }),
};
