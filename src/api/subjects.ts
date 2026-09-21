import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Subject, SubjectPayload } from '../types/subject';

export function listSubjects(signal?: AbortSignal): Promise<PaginatedResult<Subject>> {
  return request<unknown>('/subjects', { signal }).then(normalizeList<Subject>);
}

export async function getSubject(id: string, signal?: AbortSignal): Promise<Subject> {
  return unwrap<Subject>(await request(`/subjects/${id}`, { signal }));
}

/** POST /subjects */
export async function createSubject(payload: SubjectPayload): Promise<Subject> {
  return unwrap<Subject>(await request('/subjects', { method: 'POST', body: payload }));
}

/** PUT /subjects/:id — the backend route does not enforce auth on this one. */
export async function updateSubject(id: string, payload: SubjectPayload): Promise<Subject> {
  return unwrap<Subject>(await request(`/subjects/${id}`, { method: 'PUT', body: payload }));
}

/** DELETE /subjects/:id — the backend route does not enforce auth on this one. */
export async function deleteSubject(id: string): Promise<void> {
  await request(`/subjects/${id}`, { method: 'DELETE' });
}