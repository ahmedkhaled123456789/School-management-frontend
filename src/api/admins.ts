import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Admin, AdminUpdatePayload, CreateAdminPayload } from '../types/admin';

/** POST /admins/register — super admin only. */
export async function createAdmin(payload: CreateAdminPayload): Promise<Admin> {
  return unwrap<Admin>(await request('/admins/register', { method: 'POST', body: payload }));
}

/** DELETE /admins/:id — super admin only (not yourself, not the last super admin). */
export async function deleteAdmin(id: string): Promise<void> {
  await request(`/admins/${id}`, { method: 'DELETE' });
}

/** GET /admins — admin only. */
export function listAdmins(signal?: AbortSignal): Promise<PaginatedResult<Admin>> {
  return request<unknown>('/admins', { signal }).then(normalizeList<Admin>);
}

/** GET /admins/profile — the signed-in administrator. */
export async function getAdminProfile(signal?: AbortSignal): Promise<Admin> {
  return unwrap<Admin>(await request('/admins/profile', { signal }));
}

/** PUT /admins/:id — admin only; the UI targets the signed-in administrator's own id. */
export async function updateAdmin(id: string, payload: AdminUpdatePayload): Promise<Admin> {
  return unwrap<Admin>(await request(`/admins/${id}`, { method: 'PUT', body: payload }));
}