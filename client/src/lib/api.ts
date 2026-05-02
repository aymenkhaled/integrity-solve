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
  create: (data: unknown) => api.post('/tasks', data),
  update: (id: string, data: unknown) => api.patch(`/tasks/${id}`, data),
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
