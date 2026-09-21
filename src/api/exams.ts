import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Exam, ExamPayload } from '../types/exam';
import type { StudentQuestion } from '../types/question';

export function listExams(signal?: AbortSignal): Promise<PaginatedResult<Exam>> {
  return request<unknown>('/exams', { signal }).then(normalizeList<Exam>);
}

export async function getExam(id: string, signal?: AbortSignal): Promise<Exam> {
  return unwrap<Exam>(await request(`/exams/${id}`, { signal }));
}

export async function createExam(payload: ExamPayload): Promise<Exam> {
  return unwrap<Exam>(await request('/exams', { method: 'POST', body: payload }));
}

export async function updateExam(id: string, payload: Partial<ExamPayload>): Promise<Exam> {
  return unwrap<Exam>(await request(`/exams/${id}`, { method: 'PUT', body: payload }));
}

/**
 * BACKEND REQUIRED — GET /api/v1/students/exam/:examID
 *
 * Student-safe paper: exam info + questions and their options, WITHOUT `correctAnswer`.
 * The real Express backend does not implement this route yet, so against a live server
 * this call 404s and the runner shows the BACKEND REQUIRED notice. In demo mode the
 * in-memory transport serves it (with the answers stripped) so the flow can be tested.
 *
 * We deliberately never fall back to the teacher/admin question endpoints, which leak
 * the correct answers to the student.
 */
export async function getStudentExam(
examID: string,
signal?: AbortSignal)
: Promise<{exam: Exam;questions: StudentQuestion[];}> {
  const payload = unwrap<{exam: Exam;questions: StudentQuestion[];}>(
    await request(`/students/exam/${examID}`, { signal })
  );
  return { exam: payload.exam, questions: payload.questions ?? [] };
}