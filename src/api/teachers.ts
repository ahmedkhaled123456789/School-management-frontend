import { normalizeList, request, unwrap } from './client';
import type { ListParams, PaginatedResult } from '../types/common';
import type {
  AssignTeacherPayload,
  AdminUpdateTeacherPayload,
  CreateTeacherPayload,
  Teacher,
  TeacherSelfUpdatePayload } from
'../types/teacher';

export function listTeachers(
params: ListParams,
signal?: AbortSignal)
: Promise<PaginatedResult<Teacher>> {
  return request<unknown>('/teachers/admin', { params, signal }).then(normalizeList<Teacher>);
}

export async function getTeacher(teacherID: string, signal?: AbortSignal): Promise<Teacher> {
  return unwrap<Teacher>(await request(`/teachers/${teacherID}/admin`, { signal }));
}

export async function getTeacherProfile(signal?: AbortSignal): Promise<Teacher> {
  return unwrap<Teacher>(await request('/teachers/profile', { signal }));
}

export async function createTeacher(payload: CreateTeacherPayload): Promise<Teacher> {
  return unwrap<Teacher>(
    await request('/teachers/admins/register', { method: 'POST', body: payload })
  );
}

export async function assignTeacher(
teacherID: string,
payload: AssignTeacherPayload)
: Promise<Teacher> {
  return unwrap<Teacher>(
    await request(`/teachers/${teacherID}/admin`, { method: 'PUT', body: payload })
  );
}

export async function adminUpdateTeacher(
teacherID: string,
payload: AdminUpdateTeacherPayload)
: Promise<Teacher> {
  return unwrap<Teacher>(
    await request(`/teachers/${teacherID}/admin`, { method: 'PUT', body: payload })
  );
}

export async function updateTeacherProfile(
teacherID: string,
payload: TeacherSelfUpdatePayload)
: Promise<Teacher> {
  return unwrap<Teacher>(
    await request(`/teachers/${teacherID}/update`, { method: 'PUT', body: payload })
  );
}

/** DELETE /teachers/:teacherID/admin — the backend route does not enforce auth. */
export async function deleteTeacher(teacherID: string): Promise<void> {
  await request(`/teachers/${teacherID}/admin`, { method: 'DELETE' });
}

/*
 * BACKEND REQUIRED — teacher suspend / withdraw / application-status endpoints
 * are placeholders in the current backend. They are intentionally NOT wired up here.
 */