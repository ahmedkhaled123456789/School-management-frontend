import { format, isValid, parseISO } from 'date-fns';

export function formatDate(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? format(date, 'dd MMM yyyy') : fallback;
}

export function formatDateTime(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? format(date, 'dd MMM yyyy, HH:mm') : fallback;
}

export function initials(name?: string): string {
  if (!name) return '?';
  return name.
  trim().
  split(/\s+/).
  slice(0, 2).
  map((part) => part[0]?.toUpperCase() ?? '').
  join('');
}

/** Backend relations may arrive as an id string or a populated document. */
export function relationLabel(value: unknown, fallback = '—'): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value.length === 24 ? fallback : value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const label = record.name ?? record.title;
    if (typeof label === 'string') return label;
  }
  return fallback;
}

export function countOf(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function truncate(value: string | undefined, length = 80): string {
  if (!value) return '—';
  return value.length > length ? `${value.slice(0, length)}…` : value;
}