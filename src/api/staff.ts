import { normalizeList, request, unwrap } from './client';
import type { ListParams, PaginatedResult } from '../types/common';
import type {
  AuditLogEntry,
  SchoolSettings,
  SettingsPayload,
  StaffMember,
  StaffPayload } from
'../types/staff';

/* ------------------------------- staff ----------------------------------- */

/** GET /staff — staff.manage */
export function listStaff(signal?: AbortSignal): Promise<PaginatedResult<StaffMember>> {
  return request<unknown>('/staff', { signal }).then(normalizeList<StaffMember>);
}

export async function createStaff(payload: StaffPayload): Promise<StaffMember> {
  return unwrap<StaffMember>(await request('/staff', { method: 'POST', body: payload }));
}

export async function updateStaff(id: string, payload: StaffPayload): Promise<StaffMember> {
  return unwrap<StaffMember>(await request(`/staff/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteStaff(id: string): Promise<void> {
  await request(`/staff/${id}`, { method: 'DELETE' });
}

/** PUT /staff/me — a staff member's own profile. */
export async function updateMyStaffProfile(payload: Pick<StaffPayload, 'name' | 'email' | 'phone' | 'password'>): Promise<StaffMember> {
  return unwrap<StaffMember>(await request('/staff/me', { method: 'PUT', body: payload }));
}

/* ------------------------------ settings --------------------------------- */

/** GET /settings — any signed-in user. */
export async function getSettings(signal?: AbortSignal): Promise<SchoolSettings> {
  return unwrap<SchoolSettings>(await request('/settings', { signal }));
}

/** PUT /settings — settings.manage */
export async function updateSettings(payload: SettingsPayload): Promise<SchoolSettings> {
  return unwrap<SchoolSettings>(await request('/settings', { method: 'PUT', body: payload }));
}

/* ------------------------------ audit log -------------------------------- */

/** GET /audit-logs — audit.read; filters: actor, entity, action, from, to. */
export function listAuditLogs(params: ListParams, signal?: AbortSignal): Promise<PaginatedResult<AuditLogEntry>> {
  return request<unknown>('/audit-logs', { params, signal }).then(normalizeList<AuditLogEntry>);
}
