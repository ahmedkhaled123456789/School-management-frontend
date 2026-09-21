import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Admin, AdminUpdatePayload } from '../types/admin';

/** GET /admins — admin only. */
export function listAdmins(signal?: AbortSignal): Promise<PaginatedResult<Admin>> {
  return request<unknown>('/admins', { signal }).then(normalizeList<Admin>);
}

/** GET /admins/profile — the signed-in administrator. */
export async function getAdminProfile(signal?: AbortSignal): Promise<Admin> {
  return unwrap<Admin>(await request('/admins/profile', { signal }));
}

/**
 * PUT /admins/:id
 * NOTE: the backend route does not enforce auth on this endpoint, so the UI only
 * ever targets the signed-in administrator's own id.
 */
export async function updateAdmin(id: string, payload: AdminUpdatePayload): Promise<Admin> {
  return unwrap<Admin>(await request(`/admins/${id}`, { method: 'PUT', body: payload }));
}