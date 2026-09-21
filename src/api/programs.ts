import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Program, ProgramPayload } from '../types/program';

export function listPrograms(signal?: AbortSignal): Promise<PaginatedResult<Program>> {
  return request<unknown>('/program', { signal }).then(normalizeList<Program>);
}

export async function getProgram(id: string, signal?: AbortSignal): Promise<Program> {
  return unwrap<Program>(await request(`/program/${id}`, { signal }));
}

export async function createProgram(payload: ProgramPayload): Promise<Program> {
  return unwrap<Program>(await request('/program', { method: 'POST', body: payload }));
}

export async function updateProgram(id: string, payload: ProgramPayload): Promise<Program> {
  return unwrap<Program>(await request(`/program/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteProgram(id: string): Promise<void> {
  await request(`/program/${id}`, { method: 'DELETE' });
}