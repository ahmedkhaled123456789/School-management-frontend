import type { AttendanceMark, AttendanceRegister, AttendanceStatus, StaffAttendanceStatus } from '../types/attendance';
import type { SchoolDay } from '../types/sections';
import type { BadgeTone } from '../components/ui/Badge';
import { dayKey } from './reports';
import { sortedDays, toMinutes, weekDayOf } from './timetable';

/* ---------------------------------- dates ---------------------------------- */

/** Local calendar day "YYYY-MM-DD" (never UTC: 1 AM in Cairo is still today). */
export const todayKey = (now = new Date()) => dayKey(now);

export const isDateKey = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateFromKey(value);
  return dayKey(date) === value;
};

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (key: string, days: number) => {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
};

/** Whole days from `a` to `b` (b later => positive). */
export const daysBetween = (a: string, b: string) => Math.round((dateFromKey(b).getTime() - dateFromKey(a).getTime()) / 86_400_000);

export const isSchoolDate = (schoolDay: SchoolDay, key: string) => schoolDay.days.includes(weekDayOf(dateFromKey(key)));

/** The `count` most recent school days up to `from` (inclusive), newest first. */
export function recentSchoolDays(schoolDay: SchoolDay, from: string, count: number): string[] {
  const out: string[] = [];
  if (!schoolDay.days.length) return out;
  for (let key = from; out.length < count; key = addDays(key, -1)) {
    if (isSchoolDate(schoolDay, key)) out.push(key);
  }
  return out;
}

/** The latest school day on or before `from`. */
export const lastSchoolDay = (schoolDay: SchoolDay, from = todayKey()) => recentSchoolDays(schoolDay, from, 1)[0] ?? from;

export const nowTime = (now = new Date()) => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

/** "Mon 23 Nov" */
export const formatDay = (key: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
dateFromKey(key).toLocaleDateString('en-GB', opts);

export const firstTeachingStart = (schoolDay: SchoolDay) => schoolDay.periods.find((p) => !p.isBreak)?.start ?? '08:00';

export const minutesAfter = (time: string, reference: string) => toMinutes(time) - toMinutes(reference);

export const teachingDays = (schoolDay: SchoolDay) => sortedDays(schoolDay.days);

/* --------------------------------- statuses -------------------------------- */

export const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export type DayStatus = AttendanceStatus | 'partial';

export const STATUS_META: Record<DayStatus, {label: string;short: string;tone: BadgeTone;color: string;}> = {
  present: { label: 'Present', short: 'P', tone: 'success', color: 'var(--viz-good)' },
  late: { label: 'Late', short: 'L', tone: 'warn', color: 'var(--viz-warning)' },
  partial: { label: 'Part of the day', short: '½', tone: 'warn', color: 'var(--viz-serious)' },
  absent: { label: 'Absent', short: 'A', tone: 'danger', color: 'var(--viz-critical)' },
  excused: { label: 'Excused', short: 'E', tone: 'info', color: '#8496a9' }
};

export const STAFF_STATUS_META: Record<StaffAttendanceStatus, {label: string;tone: BadgeTone;}> = {
  present: { label: 'Present', tone: 'success' },
  late: { label: 'Late', tone: 'warn' },
  absent: { label: 'Absent', tone: 'danger' },
  leave: { label: 'On leave', tone: 'info' }
};

export const ABSENCE_REASONS = ['Sick', 'Medical appointment', 'Family reason', 'Travel', 'School activity', 'Sent home by the clinic', 'Other'];

/* --------------------------------- tallies --------------------------------- */

export interface Tally {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export const emptyTally = (): Tally => ({ present: 0, late: 0, absent: 0, excused: 0, total: 0 });

export function addMark(tally: Tally, status: AttendanceStatus) {
  tally[status] += 1;
  tally.total += 1;
}

export function tallyMarks(marks: Pick<AttendanceMark, 'status'>[]): Tally {
  const tally = emptyTally();
  marks.forEach((m) => addMark(tally, m.status));
  return tally;
}

/** Attended periods (present + late) out of all marked periods, in %. */
export const rateOf = (t: Tally) => t.total ? Math.round((t.present + t.late) / t.total * 1000) / 10 : 0;

/** A student's day from the periods marked that day (null = nothing taken). */
export function dayStatusOf(t: Tally): DayStatus | null {
  if (!t.total) return null;
  if (t.absent + t.excused === t.total) return t.absent ? 'absent' : 'excused';
  if (t.absent + t.excused > 0) return 'partial';
  if (t.late) return 'late';
  return 'present';
}

export interface StudentSummary {
  periods: Tally;
  rate: number;
  /** date => that day's status and periods */
  days: Record<string, {status: DayStatus;tally: Tally;}>;
  daysAbsent: number;
  daysPartial: number;
  lates: number;
  /** consecutive most-recent recorded days fully absent / excused */
  streak: number;
  bySubject: Array<{subject: string;tally: Tally;rate: number;}>;
  /** most recent first */
  recent: Array<{date: string;period: string;subject: string;mark: AttendanceMark;}>;
}

/** Everything a student / parent / admin page shows about one student. */
export function summarizeStudent(registers: AttendanceRegister[], studentId: string, periodLabel: (id: string) => string = (id) => id): StudentSummary {
  const periods = emptyTally();
  const days: Record<string, Tally> = {};
  const subjects = new Map<string, Tally>();
  const recent: StudentSummary['recent'] = [];
  registers.forEach((register) => {
    const mark = register.marks.find((m) => m.student._id === studentId);
    if (!mark) return;
    addMark(periods, mark.status);
    addMark(days[register.date] ??= emptyTally(), mark.status);
    const subject = subjects.get(register.subject.name) ?? emptyTally();
    addMark(subject, mark.status);
    subjects.set(register.subject.name, subject);
    if (mark.status !== 'present') recent.push({ date: register.date, period: periodLabel(register.periodId), subject: register.subject.name, mark });
  });
  const dayEntries = Object.entries(days).map(([date, tally]) => [date, { status: dayStatusOf(tally) as DayStatus, tally }] as const);
  const sortedDates = dayEntries.map(([d]) => d).sort().reverse();
  let streak = 0;
  for (const date of sortedDates) {
    const status = dayStatusOf(days[date]);
    if (status === 'absent' || status === 'excused') streak += 1;else
    break;
  }
  recent.sort((a, b) => b.date.localeCompare(a.date) || a.period.localeCompare(b.period, undefined, { numeric: true }));
  return {
    periods,
    rate: rateOf(periods),
    days: Object.fromEntries(dayEntries),
    daysAbsent: dayEntries.filter(([, d]) => d.status === 'absent' || d.status === 'excused').length,
    daysPartial: dayEntries.filter(([, d]) => d.status === 'partial').length,
    lates: periods.late,
    streak,
    bySubject: [...subjects.entries()].
    map(([subject, tally]) => ({ subject, tally, rate: rateOf(tally) })).
    sort((a, b) => a.rate - b.rate || a.subject.localeCompare(b.subject)),
    recent
  };
}

/** "Absent 3 days in a row" style alert threshold. */
export const STREAK_ALERT = 3;
/** below this attendance rate a student is flagged */
export const LOW_RATE = 90;
