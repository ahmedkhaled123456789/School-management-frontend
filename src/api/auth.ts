import { request, unwrap } from './client';
import type { LoginPayload, LoginResponse } from '../types/auth';
import type { Role } from '../types/common';

const LOGIN_PATHS: Record<Role, string> = {
  admin: '/admins/login',
  teacher: '/teachers/login',
  student: '/students/login'
};

interface RawLogin {
  status?: string;
  message?: string;
  data?: string | {token?: string;[key: string]: unknown;};
  token?: string;
  user?: Record<string, unknown>;
}

/**
 * The backend returns the JWT either as `data` (string) or nested on the payload.
 * Normalize both shapes into a single `LoginResponse`.
 */
export async function login(role: Role, payload: LoginPayload): Promise<LoginResponse> {
  const raw = await request<RawLogin>(LOGIN_PATHS[role], {
    method: 'POST',
    body: payload,
    anonymous: true
  });

  const token =
  typeof raw.data === 'string' ?
  raw.data :
  raw.data?.token as string | undefined ?? raw.token ?? '';

  const userSource =
  (typeof raw.data === 'object' && raw.data !== null ? raw.data : undefined) ?? raw.user ?? {};

  return {
    token,
    user: {
      _id: String((userSource as Record<string, unknown>)._id ?? ''),
      name: (userSource as Record<string, unknown>).name as string | undefined,
      email:
      (userSource as Record<string, unknown>).email as string | undefined ?? payload.email,
      role
    }
  };
}

/** Fetches the signed-in principal for teacher/student. Admin has no profile endpoint. */
export async function fetchProfile(role: Role): Promise<Record<string, unknown> | null> {
  if (role === 'teacher') return unwrap(await request('/teachers/profile'));
  if (role === 'student') return unwrap(await request('/students/profile'));
  return null;
}