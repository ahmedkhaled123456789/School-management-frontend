import { request, unwrap } from './client';
import type { LoginPayload, LoginResponse } from '../types/auth';
import type { Role } from '../types/common';

const LOGIN_PATHS: Record<Role, string> = {
  admin: '/admins/login',
  teacher: '/teachers/login',
  student: '/students/login',
  parent: '/parents/login'
};

interface RawLogin {
  status?: string;
  message?: string;
  data?: unknown;
  token?: string;
  accessToken?: string;
  access?: unknown;
  user?: Record<string, unknown>;
  /** Admin login only: effective role + permissions. */
  role?: string;
  permissions?: string[];
}

function findToken(value: unknown, depth = 0): string | undefined {
  if (depth > 6 || value === null || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  const directToken = [record.token, record.accessToken]
    .find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);

  if (directToken) return directToken.trim();

  return Object.values(record)
    .filter((nested) => typeof nested === 'object' && nested !== null)
    .map((nested) => findToken(nested, depth + 1))
    .find((candidate): candidate is string => Boolean(candidate));
}

/**
 * Normalize the backend's supported token envelopes into one login response.
 */
export async function login(role: Role, payload: LoginPayload): Promise<LoginResponse> {
  const raw = await request<RawLogin>(LOGIN_PATHS[role], {
    method: 'POST',
    body: payload,
    anonymous: true
  });

  const token = findToken(raw) ?? '';

  const userSource =
    (typeof raw.data === 'object' && raw.data !== null ? raw.data : undefined) ?? raw.user ?? {};

  const userRecord = userSource as Record<string, unknown>;

  return {
    token,
    user: {
      _id: String(userRecord._id ?? ''),
      name: userRecord.name as string | undefined,
      email:
        userRecord.email as string | undefined ?? payload.email,
      role,
      image: userRecord.image as string | undefined,
      staffRole: role === 'admin' ? raw.role : undefined,
      permissions: role === 'admin' && Array.isArray(raw.permissions) ? raw.permissions : undefined
    }
  };
}

export interface MeResponse {
  data: Record<string, unknown> & {_id: string;name?: string;email?: string;image?: string;};
  role: string;
  permissions: string[];
}

/** GET /me — the signed-in user with the current role and permissions. */
export function fetchMe(signal?: AbortSignal): Promise<MeResponse> {
  return request<MeResponse>('/me', { signal });
}

/** Fetches the signed-in principal for teacher/student/parent. */
export async function fetchProfile(role: Role): Promise<Record<string, unknown> | null> {
  if (role === 'teacher') return unwrap(await request('/teachers/profile'));
  if (role === 'student') return unwrap(await request('/students/profile'));
  if (role === 'parent') return unwrap(await request('/parents/profile'));
  return null;
}