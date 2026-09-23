import type { ApiEnvelope, PaginatedResult, Role } from '../types/common';
import { ApiError, kindForStatus, type ApiErrorKind } from '../lib/apiError';

export { ApiError };
export type { ApiErrorKind };

/* -------------------------------------------------------------------------- */
/* API configuration                                                           */
/* -------------------------------------------------------------------------- */

function configuredBaseUrl(): string {
  const env =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as {env?: Record<string, string>;}).env
      : undefined;
  const fromEnv = env?.VITE_API_BASE_URL ?? env?.VITE_API_URL;

  return fromEnv ||
    (env?.DEV ? '/api/v1' : 'https://dashboard-school-node-js.vercel.app/api/v1');
}

/** Base URL for the real Express backend. */
export const API_BASE_URL = configuredBaseUrl();

/* -------------------------------------------------------------------------- */
/* Session storage                                                             */
/* -------------------------------------------------------------------------- */

const TOKEN_KEY = 'sms.token';
const ROLE_KEY = 'sms.role';
const USER_KEY = 'sms.user';

export const UNAUTHORIZED_EVENT = 'sms:unauthorized';

export const tokenStore = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },

  getRole(): Role | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ROLE_KEY) as Role | null;
  },

  getUser<T>(): T | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(USER_KEY);

    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set(token: string, role: Role, user: unknown) {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(ROLE_KEY, role);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user ?? {}));
  },

  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ROLE_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
};

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

const FRIENDLY: Record<ApiErrorKind, string> = {
  validation: 'Some of the submitted information is invalid.',
  unauthorized: 'Your session has expired. Please sign in again.',
  forbidden: 'You do not have permission to perform this action.',
  notFound: 'The requested record could not be found.',
  server: 'The server ran into a problem. Please try again shortly.',
  network: 'Unable to reach the server. Check your connection and try again.',
  timeout: 'The request took too long and was cancelled.',
  unknown: 'Something went wrong. Please try again.'
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message || FRIENDLY[error.kind];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return FRIENDLY.unknown;
}

/* -------------------------------------------------------------------------- */
/* Request                                                                     */
/* -------------------------------------------------------------------------- */

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<
    string,
    string | number | boolean | undefined | null
  >;
  signal?: AbortSignal;

  /** Skip the Authorization header (login endpoints). */
  anonymous?: boolean;

  timeoutMs?: number;
}

function buildUrl(
  path: string,
  params?: RequestOptions['params']
): string {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  if (!params) return url;

  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return;
    }

    search.append(key, String(value));
  });

  const qs = search.toString();

  return qs ? `${url}?${qs}` : url;
}

/**
 * Extracts the most useful message the backend gave us,
 * without leaking stack traces.
 */
function extractMessage(
  payload: unknown,
  status: number
): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    const candidate = record.message ?? record.error;

    if (
      typeof candidate === 'string' &&
      candidate.length > 0 &&
      candidate.length < 300
    ) {
      return candidate;
    }
  }

  return FRIENDLY[kindForStatus(status)];
}

/** Fires the central 401 handling. */
function handleUnauthorized() {
  tokenStore.clear();

  window.dispatchEvent(
    new CustomEvent(UNAUTHORIZED_EVENT)
  );
}

/**
 * Sends requests directly to the real backend.
 *
 * No mock backend / demo mode is used.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    signal,
    anonymous,
    timeoutMs = 60000
  } = options;
  console.log({timeoutMs});
  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener(
        'abort',
        () => controller.abort(),
        { once: true }
      );
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!anonymous) {
    const token = tokenStore.getToken()?.trim();

    if (!token) {
      console.error('[api] Protected request has no stored token', {
        path,
        apiBaseUrl: API_BASE_URL
      });
      throw new ApiError(FRIENDLY.unauthorized, 401, 'unauthorized');
    }

    headers.Authorization = `Bearer ${token}`;
    console.debug('[api] Protected request authorization attached', {
      path,
      tokenLength: token.length
    });
  }

  let response: Response;

  try {
    response = await fetch(
      buildUrl(path, params),
      {
        method,
        headers,
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
        signal: controller.signal
      }
    );
  } catch (error) {
    window.clearTimeout(timeout);

    if (
      (error as Error)?.name === 'AbortError'
    ) {
      throw new ApiError(
        FRIENDLY.timeout,
        0,
        'timeout'
      );
    }

    throw new ApiError(
      FRIENDLY.network,
      0,
      'network'
    );
  }

  window.clearTimeout(timeout);

  const text = await response.text();

  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const kind = kindForStatus(response.status);

    if (kind === 'unauthorized') {
      handleUnauthorized();
    }

    throw new ApiError(
      extractMessage(payload, response.status),
      response.status,
      kind,
      payload
    );
  }

  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* Response helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The backend wraps successful payloads as:
 * { status, message, data }
 */
export function unwrap<T>(
  payload: ApiEnvelope<T> | T
): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in
      (payload as Record<string, unknown>)
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

interface RawPaginated<T> {
  data?: T[];
  results?: number;
  total?: number;

  next?: {
    page: number;
    limit: number;
  };

  previous?: {
    page: number;
    limit: number;
  };
}

/**
 * Normalizes the backend pagination response
 * into a predictable shape.
 */
export function normalizeList<T>(
  payload: unknown
): PaginatedResult<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      total: payload.length,
      results: payload.length
    };
  }

  const raw = (payload ?? {}) as RawPaginated<T>;

  const items = Array.isArray(raw.data)
    ? raw.data
    : [];

  return {
    items,

    total:
      typeof raw.total === 'number'
        ? raw.total
        : items.length,

    results:
      typeof raw.results === 'number'
        ? raw.results
        : items.length,

    next: raw.next,
    previous: raw.previous
  };
}
