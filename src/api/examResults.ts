import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { ExamResult, TogglePublishPayload } from '../types/examResult';

export function listExamResults(signal?: AbortSignal): Promise<PaginatedResult<ExamResult>> {
  return request<unknown>('/exam-results', { signal }).then(normalizeList<ExamResult>);
}

/** Detailed checking endpoint — the backend only returns data for published results. */
export async function getExamResult(id: string, signal?: AbortSignal): Promise<ExamResult> {
  return unwrap<ExamResult>(await request(`/exam-results/${id}/checking`, { signal }));
}

export async function toggleResultPublish(
id: string,
payload: TogglePublishPayload)
: Promise<ExamResult> {
  return unwrap<ExamResult>(
    await request(`/exam-results/${id}/admin-toggle-publish`, { method: 'PUT', body: payload })
  );
}