import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Question, QuestionPayload } from '../types/question';

/** Teacher/admin only — this response includes `correctAnswer`. */
export function listQuestions(signal?: AbortSignal): Promise<PaginatedResult<Question>> {
  return request<unknown>('/questions', { signal }).then(normalizeList<Question>);
}

export async function getQuestion(id: string, signal?: AbortSignal): Promise<Question> {
  return unwrap<Question>(await request(`/questions/${id}`, { signal }));
}

export async function createQuestion(
examID: string,
payload: QuestionPayload)
: Promise<Question> {
  return unwrap<Question>(
    await request(`/questions/${examID}`, { method: 'POST', body: payload })
  );
}

export async function updateQuestion(id: string, payload: QuestionPayload): Promise<Question> {
  return unwrap<Question>(await request(`/questions/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteQuestion(id: string): Promise<void> {
  await request(`/questions/${id}`, { method: 'DELETE' });
}