import { normalizeList, request, unwrap } from './client';
import type { ListParams, PaginatedResult } from '../types/common';
import type { Parent } from '../types/parent';
import type {
  ChildProfile,
  ChildResult,
  ParentChild,
  ParentSelfUpdatePayload } from
'../types/parentPortal';

/** GET /parents/me/children — the signed-in parent's children (+ latest published result). */
export function listMyChildren(
params: ListParams,
signal?: AbortSignal)
: Promise<PaginatedResult<ParentChild>> {
  return request<unknown>('/parents/me/children', { params, signal }).then(
    normalizeList<ParentChild>
  );
}

/** GET /parents/me/children/:studentId — 403 when the student is not the parent's child. */
export async function getMyChild(studentId: string, signal?: AbortSignal): Promise<ChildProfile> {
  return unwrap<ChildProfile>(await request(`/parents/me/children/${studentId}`, { signal }));
}

/** GET /parents/me/children/:studentId/results — published results only. */
export function listMyChildResults(
studentId: string,
params: ListParams,
signal?: AbortSignal)
: Promise<PaginatedResult<ChildResult>> {
  return request<unknown>(`/parents/me/children/${studentId}/results`, { params, signal }).then(
    normalizeList<ChildResult>
  );
}

/** GET /parents/profile */
export async function getParentProfile(signal?: AbortSignal): Promise<Parent> {
  return unwrap<Parent>(await request('/parents/profile', { signal }));
}

/** PUT /parents/me */
export async function updateParentProfile(payload: ParentSelfUpdatePayload): Promise<Parent> {
  return unwrap<Parent>(await request('/parents/me', { method: 'PUT', body: payload }));
}
