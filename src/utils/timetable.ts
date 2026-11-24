import type { Period, SchoolDay, Section, SlotConflict, TimetableEntry, WeekDay } from '../types/sections';

/** Week order starting Saturday (as used in Egypt); display follows the school's configured days. */
export const ALL_DAYS: WeekDay[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

export const DAY_LABEL: Record<WeekDay, string> = {
  sat: 'Saturday',
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday'
};

export const DAY_SHORT: Record<WeekDay, string> = {
  sat: 'Sat',
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri'
};

const JS_DAY: WeekDay[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const weekDayOf = (date = new Date()): WeekDay => JS_DAY[date.getDay()];

/** "08:05" => 485 ; invalid => NaN */
export function toMinutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
}

/** 12h display: "13:20" => "1:20 PM" */
export function formatTime(time: string): string {
  const minutes = toMinutes(time);
  if (Number.isNaN(minutes)) return time;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const periodRange = (period: Period) => `${formatTime(period.start)} – ${formatTime(period.end)}`;

/** The period running now (or null) — used to highlight "now" in the grid. */
export function currentPeriod(schoolDay: SchoolDay, now = new Date()): Period | null {
  if (!schoolDay.days.includes(weekDayOf(now))) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return schoolDay.periods.find((p) => toMinutes(p.start) <= minutes && minutes < toMinutes(p.end)) ?? null;
}

export const sortedDays = (days: WeekDay[]) => ALL_DAYS.filter((day) => days.includes(day));

export const sectionLabel = (section: Pick<Section, 'name' | 'classLevel'>) => `${section.classLevel.name} / ${section.name}`;

/** Validates a bell schedule; returns readable problems (empty = valid). */
export function validateSchoolDay(schoolDay: SchoolDay): string[] {
  const problems: string[] = [];
  if (schoolDay.days.length === 0) problems.push('Choose at least one school day.');
  if (!schoolDay.periods.some((p) => !p.isBreak)) problems.push('Add at least one teaching period.');
  schoolDay.periods.forEach((period, index) => {
    const name = period.label.trim() || `Row ${index + 1}`;
    if (!period.label.trim()) problems.push(`Row ${index + 1} needs a label.`);
    const start = toMinutes(period.start);
    const end = toMinutes(period.end);
    if (Number.isNaN(start) || Number.isNaN(end)) problems.push(`${name}: use times like 08:00.`);else
    if (start >= end) problems.push(`${name}: the end must be after the start.`);
    const previous = schoolDay.periods[index - 1];
    if (previous && toMinutes(previous.end) > start) problems.push(`${name} starts before ${previous.label || 'the previous row'} ends.`);
  });
  return problems;
}

/**
 * Everything that stops `draft` from being placed. Shared by the mock server
 * (rejects with 409) and the editor (explains, before saving).
 */
export function findConflicts(
draft: Pick<TimetableEntry, 'day' | 'periodId' | 'section' | 'teacher' | 'room'>,
entries: TimetableEntry[],
schoolDay: SchoolDay,
ignoreId?: string)
: SlotConflict[] {
  const conflicts: SlotConflict[] = [];
  const period = schoolDay.periods.find((p) => p._id === draft.periodId);
  if (!schoolDay.days.includes(draft.day) || !period) {
    conflicts.push({ kind: 'closed', message: 'This slot is not part of the school day.' });
    return conflicts;
  }
  if (period.isBreak) {
    conflicts.push({ kind: 'break', message: `${period.label} is a break.` });
    return conflicts;
  }
  const sameSlot = entries.filter((e) => e._id !== ignoreId && e.day === draft.day && e.periodId === draft.periodId);
  const sectionTaken = sameSlot.find((e) => e.section._id === draft.section._id);
  if (sectionTaken) {
    conflicts.push({ kind: 'section', message: `${draft.section.name} already has ${sectionTaken.subject.name} in this period.`, entry: sectionTaken });
  }
  const teacherBusy = draft.teacher && sameSlot.find((e) => e.teacher._id === draft.teacher._id && e.section._id !== draft.section._id);
  if (teacherBusy) {
    conflicts.push({ kind: 'teacher', message: `${draft.teacher.name} teaches ${teacherBusy.section.name} in this period.`, entry: teacherBusy });
  }
  const roomBusy = draft.room && sameSlot.find((e) => e.room?._id === draft.room?._id && e.section._id !== draft.section._id);
  if (roomBusy && draft.room) {
    conflicts.push({ kind: 'room', message: `${draft.room.name} is used by ${roomBusy.section.name} in this period.`, entry: roomBusy });
  }
  return conflicts;
}

// soft, readable colors; a subject always gets the same one (full class
// names so Tailwind keeps them)
const PALETTE = [
'bg-sky-50 border-sky-200 text-sky-900',
'bg-emerald-50 border-emerald-200 text-emerald-900',
'bg-amber-50 border-amber-200 text-amber-900',
'bg-violet-50 border-violet-200 text-violet-900',
'bg-rose-50 border-rose-200 text-rose-900',
'bg-teal-50 border-teal-200 text-teal-900',
'bg-orange-50 border-orange-200 text-orange-900',
'bg-indigo-50 border-indigo-200 text-indigo-900'];


export function subjectColor(subjectId: string): string {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i += 1) hash = hash * 31 + subjectId.charCodeAt(i) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** Teaching periods per teacher for a set of entries. */
export function loadByTeacher(entries: TimetableEntry[]): Map<string, number> {
  const load = new Map<string, number>();
  entries.forEach((entry) => load.set(entry.teacher._id, (load.get(entry.teacher._id) ?? 0) + 1));
  return load;
}
