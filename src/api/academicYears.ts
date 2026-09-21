import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { AcademicYear, AcademicYearPayload } from '../types/academicYear';

export function listAcademicYears(signal?: AbortSignal): Promise<PaginatedResult<AcademicYear>> {
  return request<unknown>('/academics', { signal }).then(normalizeList<AcademicYear>);
}

export async function getAcademicYear(id: string, signal?: AbortSignal): Promise<AcademicYear> {
  return unwrap<AcademicYear>(await request(`/academics/${id}`, { signal }));
}

export async function createAcademicYear(payload: AcademicYearPayload): Promise<AcademicYear> {
  return unwrap<AcademicYear>(await request('/academics', { method: 'POST', body: payload }));
}

export async function updateAcademicYear(
id: string,
payload: AcademicYearPayload)
: Promise<AcademicYear> {
  return unwrap<AcademicYear>(
    await request(`/academics/${id}`, { method: 'PUT', body: payload })
  );
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await request(`/academics/${id}`, { method: 'DELETE' });
}