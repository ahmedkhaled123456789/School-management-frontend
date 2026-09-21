export type ApiErrorKind =
'validation' |
'unauthorized' |
'forbidden' |
'notFound' |
'server' |
'network' |
'timeout' |
'unknown';

export class ApiError extends Error {
  status: number;
  kind: ApiErrorKind;
  details?: unknown;

  constructor(message: string, status: number, kind: ApiErrorKind, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.details = details;
  }
}

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status >= 500) return 'server';
  return 'unknown';
}