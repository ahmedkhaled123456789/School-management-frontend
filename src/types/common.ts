export type Role = 'admin' | 'teacher' | 'student';

export interface ApiEnvelope<T> {
  status?: string;
  message?: string;
  data: T;
}

export interface PaginationCursor {
  page: number;
  limit: number;
}

/** Normalized shape returned by the API layer for every paginated list endpoint. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  results: number;
  next?: PaginationCursor;
  previous?: PaginationCursor;
}

export interface ListParams {
  page?: number;
  limit?: number;
  name?: string;
}

export interface Timestamped {
  createdAt?: string;
  updatedAt?: string;
}