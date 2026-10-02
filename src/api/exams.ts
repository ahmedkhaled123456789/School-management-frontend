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
 * GET /students/exam/:examID — student-safe paper: exam info + questions and their
 * options, WITHOUT `correctAnswer`. Only works while the exam is live.
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