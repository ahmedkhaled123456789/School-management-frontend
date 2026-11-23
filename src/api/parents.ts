import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { CreateParentPayload, Parent, UpdateParentPayload } from '../types/parent';

export function listParents(signal?: AbortSignal): Promise<PaginatedResult<Parent>> {
  return request<unknown>('/parents/admin', { signal }).then(normalizeList<Parent>);
}

export async function getParent(id: string, signal?: AbortSignal): Promise<Parent> {
  return unwrap<Parent>(await request(`/parents/${id}/admin`, { signal }));
}

export async function createParent(payload: CreateParentPayload): Promise<Parent> {
  return unwrap<Parent>(await request('/parents/admins/register', { method: 'POST', body: payload }));
}

export async function updateParent(id: string, payload: UpdateParentPayload): Promise<Parent> {
  return unwrap<Parent>(await request(`/parents/${id}/admin`, { method: 'PUT', body: payload }));
}

/** POST /parents/:parentId/students/:studentId — admin, idempotent. */
export async function linkStudentToParent(parentId: string, studentId: string): Promise<Parent> {
  return unwrap<Parent>(
    await request(`/parents/${parentId}/students/${studentId}`, { method: 'POST' })
  );
}

/** DELETE /parents/:parentId/students/:studentId — admin, idempotent. */
export async function unlinkStudentFromParent(parentId: string, studentId: string): Promise<Parent> {
  return unwrap<Parent>(
    await request(`/parents/${parentId}/students/${studentId}`, { method: 'DELETE' })
  );
}