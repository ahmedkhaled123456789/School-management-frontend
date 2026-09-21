import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { AcademicTerm, AcademicTermPayload } from '../types/academicTerm';

export function listAcademicTerms(signal?: AbortSignal): Promise<PaginatedResult<AcademicTerm>> {
  return request<unknown>('/terms', { signal }).then(normalizeList<AcademicTerm>);
}

export async function getAcademicTerm(id: string, signal?: AbortSignal): Promise<AcademicTerm> {
  return unwrap<AcademicTerm>(await request(`/terms/${id}`, { signal }));
}

export async function createAcademicTerm(payload: AcademicTermPayload): Promise<AcademicTerm> {
  return unwrap<AcademicTerm>(await request('/terms', { method: 'POST', body: payload }));
}

export async function updateAcademicTerm(
id: string,
payload: AcademicTermPayload)
: Promise<AcademicTerm> {
  return unwrap<AcademicTerm>(await request(`/terms/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteAcademicTerm(id: string): Promise<void> {
  await request(`/terms/${id}`, { method: 'DELETE' });
}