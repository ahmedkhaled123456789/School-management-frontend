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
  data?: unknown;
  token?: string;
  accessToken?: string;
  access?: unknown;
  user?: Record<string, unknown>;
}

function findToken(value: unknown, depth = 0): string | undefined {
  if (depth > 4 || value === null || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  const directToken = [record.token, record.accessToken]
    .find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);

  if (directToken) return directToken.trim();

  return [record.data, record.access]
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

  const token =
    typeof raw.data === 'string' ?
    raw.data.trim() :
    findToken(raw) ?? '';

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