/** Helpers shared by the reports pages. */

export type CsvRow = Array<string | number>;

/** Downloads rows as a UTF-8 CSV (with BOM so Excel shows Arabic names correctly). */
export function downloadCsv(name: string, columns: string[], rows: CsvRow[]) {
  const escape = (cell: string | number) => {
    const text = String(cell ?? '');
    // neutralise spreadsheet formulas from data (CSV injection)
    const safe = /^[=+\-@]/.test(text) && typeof cell === 'string' ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [columns, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Counts items per key, keeping the first-seen order. */
export function countBy<T>(items: T[], key: (item: T) => string | undefined | null): Map<string, number> {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const k = key(item);
    if (k) map.set(k, (map.get(k) ?? 0) + 1);
  });
  return map;
}

export const sumBy = <T,>(items: T[], value: (item: T) => number) => items.reduce((s, i) => s + (value(i) || 0), 0);

export const percent = (part: number, whole: number) => whole ? Math.round(part / whole * 1000) / 10 : 0;

export type Period = '30d' | '12m' | 'all';

export const PERIOD_LABEL: Record<Period, string> = {
  '30d': 'Last 30 days',
  '12m': 'Last 12 months',
  all: 'All time'
};

/** Start date of a period (null = all time). */
export function periodStart(period: Period, now = new Date()): Date | null {
  if (period === 'all') return null;
  const d = new Date(now);
  if (period === '30d') d.setDate(d.getDate() - 29);else
  d.setMonth(d.getMonth() - 11, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const inPeriod = (value: string | Date | undefined | null, start: Date | null) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && (!start || date >= start);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Time buckets for a period: days for 30 days, months otherwise (all time =
 * from the first record). Every bucket is present, empty ones as 0, so gaps show.
 */
export function timeBuckets(period: Period, dates: Array<string | Date | undefined | null>, now = new Date()) {
  const valid = dates.map((d) => d ? new Date(d) : null).filter((d): d is Date => Boolean(d) && !Number.isNaN((d as Date).getTime()));
  if (period === '30d') {
    const start = periodStart('30d', now) as Date;
    return Array.from({ length: 30 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = dayKey(day);
      return { key, label: `${day.getDate()} ${MONTHS[day.getMonth()]}` };
    });
  }
  let start = periodStart('12m', now) as Date;
  if (period === 'all' && valid.length) {
    const first = new Date(Math.min(...valid.map((d) => d.getTime())));
    start = new Date(first.getFullYear(), first.getMonth(), 1);
  }
  const buckets: Array<{key: string;label: string;}> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= end && buckets.length < 120) {
    buckets.push({ key: monthKey(cursor), label: `${MONTHS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}` });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Local calendar day "yyyy-mm-dd" (not UTC, so late-evening records stay on their day). */
export const dayKey = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;

/** Key of the bucket a date falls in (day or month, matching timeBuckets). */
export const bucketKey = (period: Period, value: string | Date) => {
  const d = new Date(value);
  return period === '30d' ? dayKey(d) : monthKey(d);
};
