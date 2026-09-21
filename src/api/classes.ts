import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { ClassLevel, ClassLevelPayload } from '../types/classLevel';

const BASE = '/class-Level';

export function listClassLevels(signal?: AbortSignal): Promise<PaginatedResult<ClassLevel>> {
  return request<unknown>(BASE, { signal }).then(normalizeList<ClassLevel>);
}

export async function getClassLevel(id: string, signal?: AbortSignal): Promise<ClassLevel> {
  return unwrap<ClassLevel>(await request(`${BASE}/${id}`, { signal }));
}

export async function createClassLevel(payload: ClassLevelPayload): Promise<ClassLevel> {
  return unwrap<ClassLevel>(await request(BASE, { method: 'POST', body: payload }));
}

export async function updateClassLevel(
id: string,
payload: ClassLevelPayload)
: Promise<ClassLevel> {
  return unwrap<ClassLevel>(await request(`${BASE}/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteClassLevel(id: string): Promise<void> {
  await request(`${BASE}/${id}`, { method: 'DELETE' });
}