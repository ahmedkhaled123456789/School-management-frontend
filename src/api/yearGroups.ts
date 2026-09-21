import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { YearGroup, YearGroupPayload } from '../types/yearGroup';

const BASE = '/year-Groups';

export function listYearGroups(signal?: AbortSignal): Promise<PaginatedResult<YearGroup>> {
  return request<unknown>(BASE, { signal }).then(normalizeList<YearGroup>);
}

export async function getYearGroup(id: string, signal?: AbortSignal): Promise<YearGroup> {
  return unwrap<YearGroup>(await request(`${BASE}/${id}`, { signal }));
}

export async function createYearGroup(payload: YearGroupPayload): Promise<YearGroup> {
  return unwrap<YearGroup>(await request(BASE, { method: 'POST', body: payload }));
}

export async function updateYearGroup(id: string, payload: YearGroupPayload): Promise<YearGroup> {
  return unwrap<YearGroup>(await request(`${BASE}/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteYearGroup(id: string): Promise<void> {
  await request(`${BASE}/${id}`, { method: 'DELETE' });
}