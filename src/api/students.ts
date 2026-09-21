import { normalizeList, request, unwrap } from './client';
import type { ListParams, PaginatedResult } from '../types/common';
import type {
  AdminUpdateStudentPayload,
  CreateStudentPayload,
  Student,
  StudentSelfUpdatePayload,
  WriteExamPayload } from
'../types/student';

export function listStudents(
params: ListParams,
signal?: AbortSignal)
: Promise<PaginatedResult<Student>> {
  return request<unknown>('/students/admin', { params, signal }).then(normalizeList<Student>);
}

export async function getStudent(studentID: string, signal?: AbortSignal): Promise<Student> {
  return unwrap<Student>(await request(`/students/${studentID}/admin`, { signal }));
}

export async function getStudentProfile(signal?: AbortSignal): Promise<Student> {
  return unwrap<Student>(await request('/students/profile', { signal }));
}

export async function createStudent(payload: CreateStudentPayload): Promise<Student> {
  return unwrap<Student>(
    await request('/students/admins/register', { method: 'POST', body: payload })
  );
}

export async function adminUpdateStudent(
studentID: string,
payload: AdminUpdateStudentPayload)
: Promise<Student> {
  return unwrap<Student>(
    await request(`/students/${studentID}/update/admin`, { method: 'PUT', body: payload })
  );
}

export async function updateStudentProfile(payload: StudentSelfUpdatePayload): Promise<Student> {
  return unwrap<Student>(await request('/students/update', { method: 'PUT', body: payload }));
}

/** DELETE /students/:studentID/admin — the backend route does not enforce auth. */
export async function deleteStudent(studentID: string): Promise<void> {
  await request(`/students/${studentID}/admin`, { method: 'DELETE' });
}

export async function writeExam(examID: string, payload: WriteExamPayload): Promise<unknown> {
  return request(`/students/exam/${examID}/write`, { method: 'POST', body: payload });
}