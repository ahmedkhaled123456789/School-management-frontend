/**
 * Attendance — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET  /attendance/registers, GET/PUT /attendance/registers/:section/:date/:period
 *   GET  /attendance/overview/:date, GET /attendance/stats
 *   POST /attendance/gate, GET /attendance/gate/:date, DELETE /attendance/gate/:id
 *   GET/PUT /attendance/staff, POST /attendance/staff/import
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type {
  AttendanceMark,
  AttendanceRegister,
  AttendanceSettings,
  AttendanceStatus,
  DeviceImportResult,
  GateScan,
  MarkHint,
  RegisterDraft,
  RegisterPayload,
  StaffAttendancePayload,
  StaffAttendanceRecord,
  StaffRef,
  StoredRegister } from
'../types/attendance';
import type { Period, Ref, Section, StudentRef, TimetableEntry } from '../types/sections';
import {
  addDays,
  addMark,
  daysBetween,
  dayStatusOf,
  emptyTally,
  firstTeachingStart,
  isDateKey,
  isSchoolDate,
  minutesAfter,
  nowTime,
  recentSchoolDays,
  STATUSES,
  todayKey,
  type DayStatus,
  type Tally } from
'../utils/attendance';
import { DAY_LABEL, sectionLabel, toMinutes, weekDayOf } from '../utils/timetable';
import { dateFromKey } from '../utils/attendance';
import { seedHealth } from './health';

const READ = 'students.read';
const MANAGE = 'students.manage';
const STAFF = 'staff.manage';

/* -------------------------------- helpers --------------------------------- */

/** Every student known to the sections (any year), for names on old registers. */
function studentIndex(db: MockDb): Map<string, StudentRef> {
  const index = new Map<string, StudentRef>();
  db.sections.forEach((s) => s.students.forEach((st) => index.set(st._id, st)));
  return index;
}

function expand(stored: StoredRegister, index: Map<string, StudentRef>, onlyStudent?: string): AttendanceRegister {
  const { roster, exceptions, ...rest } = stored;
  const byId = new Map(exceptions.map((e) => [e.studentId, e]));
  const marks: AttendanceMark[] = roster.
  filter((id) => !onlyStudent || id === onlyStudent).
  map((id) => {
    const exception = byId.get(id);
    const student = index.get(id) ?? { _id: id, name: exception?.name ?? 'Former student', studentId: exception?.code };
    if (!exception) return { student, status: 'present' as const };
    const { studentId: _sid, name: _name, code: _code, ...mark } = exception;
    return { student, ...mark };
  });
  return { ...rest, marks };
}

function compactMarks(marks: AttendanceMark[]): Pick<StoredRegister, 'roster' | 'exceptions'> {
  return {
    roster: marks.map((m) => m.student._id),
    exceptions: marks.
    filter((m) => m.status !== 'present' || m.note).
    map(({ student, ...mark }) => ({ ...mark, studentId: student._id, name: student.name, code: student.studentId }))
  };
}

const periodOrder = (db: MockDb) => new Map(db.schoolDay.periods.map((p, i) => [p._id, i]));

interface Lesson {
  section: Section;
  entry: TimetableEntry;
  period: Period;
}

/** Validates a (section, date, period) and finds the lesson planned in it. */
function resolveLesson(db: MockDb, academicYear: string, sectionId: string, date: string, periodId: string): Lesson {
  if (!isDateKey(date)) fail(400, 'Use a valid date');
  if (date > todayKey()) fail(400, 'Attendance can not be taken for a future day');
  if (!isSchoolDate(db.schoolDay, date)) fail(400, `${DAY_LABEL[weekDayOf(dateFromKey(date))]} is not a school day`);
  const period = db.schoolDay.periods.find((p) => p._id === periodId);
  if (!period) fail(404, 'Period not found');
  if (period.isBreak) fail(400, `${period.label} is a break`);
  const section = db.sections.find((s) => s._id === sectionId);
  if (!section || section.academicYear !== academicYear) fail(404, 'Section not found');
  const day = weekDayOf(dateFromKey(date));
  const entry = db.entries.find((e) => e.academicYear === academicYear && e.section._id === sectionId && e.day === day && e.periodId === periodId);
  if (!entry) fail(404, `${sectionLabel(section)} has no lesson in ${period.label} on ${DAY_LABEL[day]}`);
  return { section, entry, period };
}

const findStored = (db: MockDb, academicYear: string, sectionId: string, date: string, periodId: string) =>
db.registers.find((r) => r.academicYear === academicYear && r.section._id === sectionId && r.date === date && r.periodId === periodId);

/** Teachers may only touch their own lessons (or their homeroom), and only recently. */
function assertTeacherMay(db: MockDb, lesson: Lesson, date: string, teacherId: string | undefined) {
  if (!teacherId || lesson.entry.teacher._id !== teacherId && lesson.section.homeroomTeacher?._id !== teacherId) {
    fail(403, 'You can only take attendance for your own lessons');
  }
  const age = daysBetween(date, todayKey());
  if (age > db.attendanceSettings.lockDays) {
    fail(403, `Registers older than ${db.attendanceSettings.lockDays} days can only be changed by the school office`);
  }
}

function readerRole(studentId?: string) {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if ((role === 'student' || role === 'parent') && !studentId) fail(403, 'You can only see your own attendance');
  return role;
}

/* -------------------------------- registers -------------------------------- */

export interface RegisterQuery {
  academicYear: string;
  date?: string;
  from?: string;
  to?: string;
  sectionId?: string;
  teacherId?: string;
  studentId?: string;
}

/** Registers matching the query. Students and parents only ever get their own marks. */
export async function listRegisters(q: RegisterQuery): Promise<AttendanceRegister[]> {
  const role = readerRole(q.studentId);
  const privateView = role === 'student' || role === 'parent';
  return read((db) => {
    const index = studentIndex(db);
    const order = periodOrder(db);
    return db.registers.
    filter((r) =>
    r.academicYear === q.academicYear && (
    !q.date || r.date === q.date) && (
    !q.from || r.date >= q.from) && (
    !q.to || r.date <= q.to) && (
    !q.sectionId || r.section._id === q.sectionId) && (
    !q.teacherId || r.teacher._id === q.teacherId) && (
    !q.studentId || r.roster.includes(q.studentId))
    ).
    sort((a, b) => b.date.localeCompare(a.date) || (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0)).
    map((r) => expand(r, index, privateView ? q.studentId : undefined));
  });
}

/**
 * The register to edit: the saved one, or a suggestion built from the gate
 * check-ins, clinic visits and the earlier periods of the same day.
 */
export async function getRegisterDraft(academicYear: string, sectionId: string, date: string, periodId: string, teacherId?: string): Promise<RegisterDraft> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if (role !== 'teacher') fail(403, 'You do not have permission to perform this action');
  return read((db) => {
    const lesson = resolveLesson(db, academicYear, sectionId, date, periodId);
    const { section, entry, period } = lesson;
    if (role === 'teacher' && teacherId && entry.teacher._id !== teacherId && section.homeroomTeacher?._id !== teacherId) {
      fail(403, 'You can only take attendance for your own lessons');
    }
    const index = studentIndex(db);
    const stored = findStored(db, academicYear, sectionId, date, periodId);
    const saved = stored ? expand(stored, index) : null;
    const hints: Record<string, MarkHint[]> = {};
    const hint = (id: string, h: MarkHint) => (hints[id] ??= []).push(h);

    const order = periodOrder(db);
    const earlier = db.registers.
    filter((r) => r.academicYear === academicYear && r.section._id === sectionId && r.date === date && (order.get(r.periodId) ?? 0) < (order.get(periodId) ?? 0)).
    sort((a, b) => (order.get(b.periodId) ?? 0) - (order.get(a.periodId) ?? 0));
    const scans = db.gateScans.filter((g) => g.date === date);
    const gateInUse = scans.length > 0;
    const sentHome = db.clinicVisits.filter((v) => v.date === date && v.action === 'sent_home' && toMinutes(v.time) <= toMinutes(period.start));

    const marks: AttendanceMark[] = section.students.map((student) => {
      const previous = saved?.marks.find((m) => m.student._id === student._id);
      if (previous) {
        hint(student._id, { kind: 'saved', text: `Saved ${previous.status}` });
        return { ...previous, student };
      }
      if (saved) hint(student._id, { kind: 'saved', text: 'Joined the section after this register was taken' });
      const visit = sentHome.find((v) => v.student._id === student._id);
      if (visit) {
        hint(student._id, { kind: 'clinic', text: `Sent home by the clinic at ${visit.time}` });
        return { student, status: 'excused', reason: 'Sent home by the clinic' };
      }
      for (const r of earlier) {
        const ex = r.exceptions.find((e) => e.studentId === student._id);
        if (ex && (ex.status === 'absent' || ex.status === 'excused')) {
          const label = db.schoolDay.periods.find((p) => p._id === r.periodId)?.label ?? 'an earlier period';
          hint(student._id, { kind: 'earlier-period', text: `${ex.status === 'absent' ? 'Absent' : 'Excused'} in ${label}` });
          return { student, status: ex.status, reason: ex.reason };
        }
        if (r.roster.includes(student._id)) break; // was there in the latest earlier period
      }
      if (gateInUse) {
        const scan = scans.find((g) => g.student._id === student._id);
        if (!scan) {
          hint(student._id, { kind: 'no-gate', text: 'No gate check-in today' });
          return { student, status: 'absent' };
        }
        const late = minutesAfter(scan.time, period.start);
        // arrived after this lesson ended: missed it; during it: late
        if (toMinutes(scan.time) >= toMinutes(period.end)) {
          hint(student._id, { kind: 'no-gate', text: `Arrived ${scan.time}, after this period` });
          return { student, status: 'absent' };
        }
        hint(student._id, { kind: 'gate', text: `Arrived ${scan.time}` });
        if (late > 0) return { student, status: 'late', minutesLate: Math.min(late, 240) };
      }
      return { student, status: 'present' };
    });
    // students marked earlier but no longer in the section stay on the saved register
    saved?.marks.forEach((m) => {
      if (!marks.some((x) => x.student._id === m.student._id)) {
        marks.push(m);
        hint(m.student._id, { kind: 'saved', text: 'No longer in this section' });
      }
    });

    return {
      register: saved,
      date,
      section: { _id: section._id, name: sectionLabel(section) },
      periodId,
      periodLabel: period.label,
      periodStart: period.start,
      subject: entry.subject,
      teacher: entry.teacher,
      marks,
      hints,
      locked: role === 'teacher' && daysBetween(date, todayKey()) > db.attendanceSettings.lockDays
    };
  });
}

function validateMarks(section: Section, marks: AttendanceMark[]) {
  const ids = new Set<string>();
  marks.forEach((m) => {
    if (!m.student?._id) fail(400, 'Every mark needs a student');
    if (ids.has(m.student._id)) fail(400, `${m.student.name} is marked twice`);
    ids.add(m.student._id);
    if (!STATUSES.includes(m.status)) fail(400, `Invalid status for ${m.student.name}`);
    if (m.status === 'late' && (!Number.isInteger(m.minutesLate) || (m.minutesLate as number) < 1 || (m.minutesLate as number) > 240)) {
      fail(400, `${m.student.name}: minutes late must be between 1 and 240`);
    }
    if ((m.reason?.length ?? 0) > 120) fail(400, `${m.student.name}: the reason is too long (120 characters max)`);
    if ((m.note?.length ?? 0) > 200) fail(400, `${m.student.name}: the note is too long (200 characters max)`);
  });
  const missing = section.students.filter((s) => !ids.has(s._id));
  if (missing.length) fail(400, `Mark every student (${missing.map((s) => s.name).slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''} missing)`);
}

/** Creates or replaces the register of one lesson. */
export async function saveRegister(academicYear: string, payload: RegisterPayload, teacherId?: string): Promise<AttendanceRegister> {
  const actor = sessionActor();
  if (actor.role === 'admin') requirePermission(MANAGE);else
  if (actor.role !== 'teacher') fail(403, 'You do not have permission to perform this action');
  return write((db) => {
    const lesson = resolveLesson(db, academicYear, payload.sectionId, payload.date, payload.periodId);
    if (actor.role === 'teacher') assertTeacherMay(db, lesson, payload.date, teacherId);
    validateMarks(lesson.section, payload.marks);
    const clean = payload.marks.map((m) => ({
      student: m.student,
      status: m.status,
      ...(m.status === 'late' ? { minutesLate: m.minutesLate } : {}),
      ...(m.status === 'absent' || m.status === 'excused') && m.reason?.trim() ? { reason: m.reason.trim() } : {},
      ...(m.note?.trim() ? { note: m.note.trim() } : {})
    }));
    const existing = findStored(db, academicYear, payload.sectionId, payload.date, payload.periodId);
    const takenBy = actor.role === 'teacher' ? lesson.entry.teacher : actor.ref;
    const stored: StoredRegister = {
      _id: existing?._id ?? newId(),
      academicYear,
      date: payload.date,
      section: { _id: lesson.section._id, name: sectionLabel(lesson.section) },
      periodId: payload.periodId,
      subject: lesson.entry.subject,
      teacher: lesson.entry.teacher,
      takenBy,
      ...compactMarks(clean),
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };
    if (existing) Object.assign(existing, stored);else
    db.registers.push(stored);
    return expand(stored, studentIndex(db));
  });
}

/* --------------------------------- overview -------------------------------- */

export interface SectionDay {
  section: Ref;
  homeroomTeacher: Ref | null;
  students: number;
  expected: number;
  taken: number;
  tally: Tally;
}

export interface DailyOverview {
  date: string;
  isSchoolDay: boolean;
  sections: SectionDay[];
  expected: number;
  taken: number;
  tally: Tally;
  /** students not simply present for the day */
  students: Array<{student: StudentRef;section: Ref;status: DayStatus;tally: Tally;reasons: string[];}>;
  /** lessons already started without a register */
  missing: Array<{section: Ref;periodId: string;periodLabel: string;start: string;subject: Ref;teacher: Ref;}>;
  gate: {scans: number;late: number;};
}

/** One school day across all sections (admin "Attendance" page). */
export async function getDailyOverview(academicYear: string, date: string): Promise<DailyOverview> {
  requirePermission(READ);
  return read((db) => {
    if (!isDateKey(date)) fail(400, 'Use a valid date');
    const isSchoolDay = isSchoolDate(db.schoolDay, date);
    const day = weekDayOf(dateFromKey(date));
    const index = studentIndex(db);
    const sections = db.sections.filter((s) => s.academicYear === academicYear);
    const registers = db.registers.filter((r) => r.academicYear === academicYear && r.date === date);
    const now = date === todayKey() ? toMinutes(nowTime()) : date < todayKey() ? Infinity : -1;
    const periods = new Map(db.schoolDay.periods.map((p) => [p._id, p]));
    const total = emptyTally();
    const perStudent = new Map<string, {tally: Tally;section: Ref;reasons: Set<string>;}>();
    const missing: DailyOverview['missing'] = [];

    const rows: SectionDay[] = sections.map((section) => {
      const ref = { _id: section._id, name: sectionLabel(section) };
      const lessons = isSchoolDay ? db.entries.filter((e) => e.academicYear === academicYear && e.section._id === section._id && e.day === day) : [];
      const mine = registers.filter((r) => r.section._id === section._id);
      const tally = emptyTally();
      mine.forEach((r) => {
        const ex = new Map(r.exceptions.map((e) => [e.studentId, e]));
        r.roster.forEach((id) => {
          const status: AttendanceStatus = ex.get(id)?.status ?? 'present';
          addMark(tally, status);
          addMark(total, status);
          const entry = perStudent.get(id) ?? { tally: emptyTally(), section: ref, reasons: new Set<string>() };
          addMark(entry.tally, status);
          const reason = ex.get(id)?.reason;
          if (reason) entry.reasons.add(reason);
          perStudent.set(id, entry);
        });
      });
      lessons.forEach((lesson) => {
        const period = periods.get(lesson.periodId);
        if (!period || mine.some((r) => r.periodId === lesson.periodId)) return;
        if (toMinutes(period.start) <= now) {
          missing.push({ section: ref, periodId: period._id, periodLabel: period.label, start: period.start, subject: lesson.subject, teacher: lesson.teacher });
        }
      });
      return { section: ref, homeroomTeacher: section.homeroomTeacher, students: section.students.length, expected: lessons.length, taken: mine.length, tally };
    });

    const students = [...perStudent.entries()].
    map(([id, v]) => ({ student: index.get(id) ?? { _id: id, name: 'Former student' }, section: v.section, status: dayStatusOf(v.tally) as DayStatus, tally: v.tally, reasons: [...v.reasons] })).
    filter((s) => s.status !== 'present').
    sort((a, b) => ['absent', 'excused', 'partial', 'late'].indexOf(a.status) - ['absent', 'excused', 'partial', 'late'].indexOf(b.status) || a.student.name.localeCompare(b.student.name));
    const order = periodOrder(db);
    missing.sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0) || a.section.name.localeCompare(b.section.name, undefined, { numeric: true }));
    const scans = db.gateScans.filter((g) => g.date === date);

    return {
      date,
      isSchoolDay,
      sections: rows.sort((a, b) => a.section.name.localeCompare(b.section.name, undefined, { numeric: true })),
      expected: rows.reduce((s, r) => s + r.expected, 0),
      taken: rows.reduce((s, r) => s + r.taken, 0),
      tally: total,
      students,
      missing,
      gate: { scans: scans.length, late: scans.filter((g) => g.late).length }
    };
  });
}

export interface AttendanceStats {
  from: string;
  to: string;
  tally: Tally;
  byDate: Array<{date: string;tally: Tally;}>;
  bySection: Array<{section: Ref;tally: Tally;}>;
  byPeriod: Array<{label: string;tally: Tally;}>;
  byWeekday: Array<{day: string;tally: Tally;}>;
  students: Array<{student: StudentRef;section: Ref;tally: Tally;daysAbsent: number;streak: number;}>;
  staff: {records: number;present: number;late: number;absent: number;leave: number;};
}

/** Aggregates for Reports and the dashboard (never ships individual marks). */
export async function getAttendanceStats(academicYear: string, from: string, to: string): Promise<AttendanceStats> {
  requirePermission(READ);
  return read((db) => {
    const index = studentIndex(db);
    const sectionOf = new Map<string, Ref>();
    db.sections.filter((s) => s.academicYear === academicYear).forEach((s) => s.students.forEach((st) => sectionOf.set(st._id, { _id: s._id, name: sectionLabel(s) })));
    const registers = db.registers.filter((r) => r.academicYear === academicYear && r.date >= from && r.date <= to);
    const tally = emptyTally();
    const byDate = new Map<string, Tally>();
    const bySection = new Map<string, {section: Ref;tally: Tally;}>();
    const byPeriod = new Map<string, Tally>();
    const byWeekday = new Map<string, Tally>();
    const perStudentDay = new Map<string, Map<string, Tally>>();
    const perStudent = new Map<string, Tally>();
    registers.forEach((r) => {
      const ex = new Map(r.exceptions.map((e) => [e.studentId, e.status]));
      r.roster.forEach((id) => {
        const status = ex.get(id) ?? 'present';
        addMark(tally, status);
        addMark(byDate.get(r.date) ?? byDate.set(r.date, emptyTally()).get(r.date) as Tally, status);
        const sec = bySection.get(r.section._id) ?? bySection.set(r.section._id, { section: r.section, tally: emptyTally() }).get(r.section._id)!;
        addMark(sec.tally, status);
        addMark(byPeriod.get(r.periodId) ?? byPeriod.set(r.periodId, emptyTally()).get(r.periodId) as Tally, status);
        const wd = weekDayOf(dateFromKey(r.date));
        addMark(byWeekday.get(wd) ?? byWeekday.set(wd, emptyTally()).get(wd) as Tally, status);
        addMark(perStudent.get(id) ?? perStudent.set(id, emptyTally()).get(id) as Tally, status);
        const days = perStudentDay.get(id) ?? perStudentDay.set(id, new Map()).get(id)!;
        addMark(days.get(r.date) ?? days.set(r.date, emptyTally()).get(r.date) as Tally, status);
      });
    });
    const order = periodOrder(db);
    const staff = db.staffAttendance.filter((s) => s.date >= from && s.date <= to);
    return {
      from,
      to,
      tally,
      byDate: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, t]) => ({ date, tally: t })),
      bySection: [...bySection.values()].sort((a, b) => a.section.name.localeCompare(b.section.name, undefined, { numeric: true })),
      byPeriod: [...byPeriod.entries()].
      sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0)).
      map(([id, t]) => ({ label: db.schoolDay.periods.find((p) => p._id === id)?.label ?? id, tally: t })),
      byWeekday: db.schoolDay.days.filter((d) => byWeekday.has(d)).map((d) => ({ day: DAY_LABEL[d], tally: byWeekday.get(d)! })),
      students: [...perStudent.entries()].map(([id, t]) => {
        const days = [...(perStudentDay.get(id)?.entries() ?? [])].sort(([a], [b]) => b.localeCompare(a));
        let streak = 0;
        for (const [, d] of days) {
          const s = dayStatusOf(d);
          if (s === 'absent' || s === 'excused') streak += 1;else
          break;
        }
        return {
          student: index.get(id) ?? { _id: id, name: 'Former student' },
          section: sectionOf.get(id) ?? { _id: '', name: '—' },
          tally: t,
          daysAbsent: days.filter(([, d]) => ['absent', 'excused'].includes(dayStatusOf(d) ?? '')).length,
          streak
        };
      }),
      staff: {
        records: staff.length,
        present: staff.filter((s) => s.status === 'present').length,
        late: staff.filter((s) => s.status === 'late').length,
        absent: staff.filter((s) => s.status === 'absent').length,
        leave: staff.filter((s) => s.status === 'leave').length
      }
    };
  });
}

/* ----------------------------------- gate ---------------------------------- */

export async function listGateScans(date: string): Promise<GateScan[]> {
  requirePermission(READ);
  return read((db) => db.gateScans.filter((g) => g.date === date).sort((a, b) => b.time.localeCompare(a.time) || b.createdAt.localeCompare(a.createdAt)));
}

/** Checks a student in at the gate by school code (QR / barcode) or id. */
export async function checkIn(academicYear: string, code: string, method: GateScan['method']): Promise<GateScan> {
  requirePermission(MANAGE);
  return write((db) => {
    const value = code.trim();
    if (!value) fail(400, 'Scan or type a student code');
    const date = todayKey();
    if (!isSchoolDate(db.schoolDay, date)) fail(400, 'Today is not a school day');
    const section = db.sections.find((s) => s.academicYear === academicYear && s.students.some((st) => st._id === value || st.studentId?.toLowerCase() === value.toLowerCase()));
    const student = section?.students.find((st) => st._id === value || st.studentId?.toLowerCase() === value.toLowerCase());
    if (!section || !student) fail(404, `No student with the code "${value}" in this year's sections`);
    const already = db.gateScans.find((g) => g.date === date && g.student._id === student._id);
    if (already) fail(409, `${student.name} already checked in at ${already.time}`);
    const time = nowTime();
    const scan: GateScan = {
      _id: newId(),
      date,
      time,
      student,
      section: { _id: section._id, name: sectionLabel(section) },
      method,
      late: minutesAfter(time, firstTeachingStart(db.schoolDay)) > 0,
      createdAt: nowIso()
    };
    db.gateScans.push(scan);
    return scan;
  });
}

export async function deleteGateScan(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!db.gateScans.some((g) => g._id === id)) fail(404, 'Check-in not found');
    db.gateScans = db.gateScans.filter((g) => g._id !== id);
  });
}

/* ---------------------------------- staff ---------------------------------- */

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  sessionActor();
  return read((db) => db.attendanceSettings);
}

export async function updateAttendanceSettings(next: AttendanceSettings): Promise<AttendanceSettings> {
  requirePermission(STAFF);
  return write((db) => {
    if (Number.isNaN(toMinutes(next.staffStart))) fail(400, 'Use a start time like 07:45');
    if (!Number.isInteger(next.graceMinutes) || next.graceMinutes < 0 || next.graceMinutes > 60) fail(400, 'Grace must be 0–60 minutes');
    if (!Number.isInteger(next.lockDays) || next.lockDays < 0 || next.lockDays > 30) fail(400, 'Lock after 0–30 days');
    db.attendanceSettings = { staffStart: next.staffStart, graceMinutes: next.graceMinutes, lockDays: next.lockDays };
    return db.attendanceSettings;
  });
}

export async function listStaffAttendance(from: string, to = from): Promise<StaffAttendanceRecord[]> {
  requirePermission(STAFF);
  return read((db) => db.staffAttendance.filter((r) => r.date >= from && r.date <= to).sort((a, b) => b.date.localeCompare(a.date) || a.staff.name.localeCompare(b.staff.name)));
}

/** present / late follow the check-in time; absent and leave carry no times. */
function staffStatus(db: MockDb, status: StaffAttendancePayload['status'], checkIn?: string) {
  if (status === 'absent' || status === 'leave' || !checkIn) return status;
  return minutesAfter(checkIn, db.attendanceSettings.staffStart) > db.attendanceSettings.graceMinutes ? 'late' : 'present';
}

function upsertStaff(db: MockDb, payload: StaffAttendancePayload, source: StaffAttendanceRecord['source']) {
  const existing = db.staffAttendance.find((r) => r.date === payload.date && r.staff._id === payload.staff._id);
  const away = payload.status === 'absent' || payload.status === 'leave';
  const record: StaffAttendanceRecord = {
    _id: existing?._id ?? newId(),
    date: payload.date,
    staff: payload.staff,
    status: staffStatus(db, payload.status, payload.checkIn),
    ...(away ? {} : { checkIn: payload.checkIn, checkOut: payload.checkOut }),
    source,
    ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso()
  };
  if (existing) {
    Object.keys(existing).forEach((k) => delete (existing as unknown as Record<string, unknown>)[k]);
    Object.assign(existing, record);
  } else db.staffAttendance.push(record);
  return { record, created: !existing };
}

export async function saveStaffAttendance(payload: StaffAttendancePayload): Promise<StaffAttendanceRecord> {
  requirePermission(STAFF);
  return write((db) => {
    if (!isDateKey(payload.date)) fail(400, 'Use a valid date');
    if (payload.date > todayKey()) fail(400, 'Attendance can not be recorded for a future day');
    if (!payload.staff?._id) fail(400, 'Choose a person');
    const away = payload.status === 'absent' || payload.status === 'leave';
    if (!away) {
      if (!payload.checkIn || Number.isNaN(toMinutes(payload.checkIn))) fail(400, 'Enter the check-in time (e.g. 07:40)');
      if (payload.checkOut && Number.isNaN(toMinutes(payload.checkOut))) fail(400, 'Use a check-out time like 15:10');
      if (payload.checkOut && toMinutes(payload.checkOut) <= toMinutes(payload.checkIn)) fail(400, 'Check-out must be after check-in');
      if (payload.date === todayKey() && toMinutes(payload.checkIn) > toMinutes(nowTime())) fail(400, 'The check-in time is in the future');
    }
    if ((payload.note?.length ?? 0) > 200) fail(400, 'The note is too long (200 characters max)');
    return upsertStaff(db, payload, 'manual').record;
  });
}

/** Everyone without a record that day becomes absent (end-of-day close). */
export async function markMissingStaffAbsent(date: string, people: StaffRef[]): Promise<{marked: number;}> {
  requirePermission(STAFF);
  return write((db) => {
    if (!isDateKey(date) || date > todayKey()) fail(400, 'Choose today or a past day');
    let marked = 0;
    people.forEach((person) => {
      if (db.staffAttendance.some((r) => r.date === date && r.staff._id === person._id)) return;
      upsertStaff(db, { date, staff: person, status: 'absent' }, 'manual');
      marked += 1;
    });
    return { marked };
  });
}

/**
 * Imports a fingerprint / card device export (CSV). Accepted lines:
 *   email,date,time            e.g. t1@school.test,2026-11-22,07:41
 *   email,date time            e.g. t1@school.test,2026-11-22 07:41
 * The first punch of a day is the check-in, the last one (if later) the check-out.
 */
export async function importDeviceFile(text: string, people: StaffRef[]): Promise<DeviceImportResult> {
  requirePermission(STAFF);
  return write((db) => {
    const byEmail = new Map(people.filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p]));
    const problems: string[] = [];
    const punches = new Map<string, {person: StaffRef;date: string;times: string[];}>();
    const lines = text.split(/\r?\n/);
    if (lines.length > 20_000) fail(400, 'The file is too large (20,000 lines max)');
    lines.forEach((raw, i) => {
      const line = raw.trim();
      if (!line) return;
      const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      if (i === 0 && !/@/.test(cells[0] ?? '')) return; // header row
      const [who, first, second] = cells;
      const [date, time] = second ? [first, second] : (first ?? '').split(/[ T]/);
      const person = byEmail.get((who ?? '').toLowerCase());
      if (!person) return void problems.push(`Line ${i + 1}: unknown person "${who ?? ''}"`);
      if (!date || !isDateKey(date)) return void problems.push(`Line ${i + 1}: invalid date "${date ?? ''}"`);
      if (date > todayKey()) return void problems.push(`Line ${i + 1}: ${date} is in the future`);
      const hhmm = (time ?? '').slice(0, 5);
      if (Number.isNaN(toMinutes(hhmm))) return void problems.push(`Line ${i + 1}: invalid time "${time ?? ''}"`);
      const key = `${person._id}|${date}`;
      const entry = punches.get(key) ?? { person, date, times: [] };
      entry.times.push(hhmm);
      punches.set(key, entry);
    });
    if (!punches.size && !problems.length) fail(400, 'No punches found in the file');
    let imported = 0;
    let updated = 0;
    punches.forEach(({ person, date, times }) => {
      const existing = db.staffAttendance.find((r) => r.date === date && r.staff._id === person._id);
      if (existing?.status === 'leave') return void problems.push(`${person.name} is on leave on ${date}: punches ignored`);
      times.sort();
      const checkIn = times[0];
      const checkOut = times.length > 1 && times[times.length - 1] !== checkIn ? times[times.length - 1] : existing?.checkOut;
      const { created } = upsertStaff(db, { date, staff: person, status: 'present', checkIn, checkOut, note: existing?.note }, 'device');
      if (created) imported += 1;else
      updated += 1;
    });
    return { imported, updated, problems: problems.slice(0, 50) };
  });
}

/* ------------------------------- sample data ------------------------------- */

/** Small deterministic random generator so the sample looks the same each time. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6d2b79f5 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Fills the last `days` school days (before today) with realistic registers,
 * gate check-ins and staff attendance, plus health profiles and clinic visits.
 * Days that already have registers are left alone.
 */
export async function generateAttendanceSample(academicYear: string, days: number, people: StaffRef[]): Promise<{registers: number;days: number;profiles: number;visits: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    const sections = db.sections.filter((s) => s.academicYear === academicYear);
    if (!sections.length || !db.entries.some((e) => e.academicYear === academicYear)) {
      fail(400, 'Create sections and a timetable first (Academics → Sections → Generate demo)');
    }
    const rand = seeded(20261123);
    // keep the browser store well under its ~5 MB limit: fewer days for big schools
    const BUDGET = 2_500_000;
    const perDay = (date: string) => {
      const day = weekDayOf(dateFromKey(date));
      return sections.reduce((sum, s) => sum + db.entries.filter((e) => e.academicYear === academicYear && e.section._id === s._id && e.day === day).length * (650 + 30 * s.students.length) + s.students.length * 260, 0);
    };
    let used = JSON.stringify(db).length;
    let full = false;
    const dates = recentSchoolDays(db.schoolDay, addDays(todayKey(), -1), days).
    filter((date) => {
      // newest days first; stop at the first one that does not fit (no gaps)
      if (full || used + perDay(date) > BUDGET) return !(full = true);
      used += perDay(date);
      return true;
    }).
    reverse();
    if (!dates.length) fail(400, 'Not enough browser storage for sample data. Reset the demo data first.');
    const firstStart = toMinutes(firstTeachingStart(db.schoolDay));
    const order = periodOrder(db);
    const students = sections.flatMap((s) => s.students);
    // a few students are often away, most rarely
    const risk = new Map(students.map((st, i) => [st._id, i % 9 === 4 ? 0.14 : i % 13 === 7 ? 0.08 : 0.025]));
    let created = 0;
    let filledDays = 0;

    dates.forEach((date) => {
      if (db.registers.some((r) => r.academicYear === academicYear && r.date === date)) return;
      filledDays += 1;
      const day = weekDayOf(dateFromKey(date));
      // who is away all day / arrives late / leaves early
      const away = new Map<string, 'absent' | 'excused'>();
      const late = new Map<string, number>();
      const leavesAfter = new Map<string, number>();
      students.forEach((st) => {
        const r = rand();
        if (r < risk.get(st._id)!) away.set(st._id, rand() < 0.35 ? 'excused' : 'absent');else
        if (r < risk.get(st._id)! + 0.05) late.set(st._id, 3 + Math.floor(rand() * 25));else
        if (r < risk.get(st._id)! + 0.06) leavesAfter.set(st._id, 3 + Math.floor(rand() * 3));
      });
      // gate check-ins for everyone who came
      students.forEach((st) => {
        if (away.has(st._id)) return;
        const section = sections.find((s) => s.students.some((x) => x._id === st._id))!;
        const minutes = late.has(st._id) ? firstStart + late.get(st._id)! : firstStart - 5 - Math.floor(rand() * 35);
        db.gateScans.push({ _id: newId(), date, time: hhmm(minutes), student: st, section: { _id: section._id, name: sectionLabel(section) }, method: rand() < 0.8 ? 'scanner' : 'camera', late: minutes > firstStart, createdAt: nowIso() });
      });
      sections.forEach((section) => {
        const lessons = db.entries.
        filter((e) => e.academicYear === academicYear && e.section._id === section._id && e.day === day).
        sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0));
        lessons.forEach((lesson, index) => {
          const marks: AttendanceMark[] = section.students.map((student) => {
            const absence = away.get(student._id);
            if (absence) return { student, status: absence, ...(absence === 'excused' ? { reason: rand() < 0.7 ? 'Sick' : 'Family reason' } : {}) };
            const leftAt = leavesAfter.get(student._id);
            if (leftAt !== undefined && index >= leftAt) return { student, status: 'excused', reason: 'Sent home by the clinic' };
            if (index === 0 && late.has(student._id)) return { student, status: 'late', minutesLate: late.get(student._id) };
            return { student, status: 'present' };
          });
          db.registers.push({
            _id: newId(),
            academicYear,
            date,
            section: { _id: section._id, name: sectionLabel(section) },
            periodId: lesson.periodId,
            subject: lesson.subject,
            teacher: lesson.teacher,
            takenBy: lesson.teacher,
            ...compactMarks(marks),
            createdAt: nowIso(),
            updatedAt: nowIso()
          });
          created += 1;
        });
      });
      // staff: device punches; a few late, rare absences
      const start = toMinutes(db.attendanceSettings.staffStart);
      people.forEach((person) => {
        if (db.staffAttendance.some((r) => r.date === date && r.staff._id === person._id)) return;
        const r = rand();
        if (r < 0.03) return void upsertStaff(db, { date, staff: person, status: r < 0.015 ? 'leave' : 'absent' }, 'manual');
        const inAt = r < 0.1 ? start + db.attendanceSettings.graceMinutes + 1 + Math.floor(rand() * 20) : start - 20 + Math.floor(rand() * 25);
        const outAt = toMinutes('14:15') + Math.floor(rand() * 60);
        upsertStaff(db, { date, staff: person, status: 'present', checkIn: hhmm(inAt), checkOut: hhmm(outAt) }, 'device');
      });
      // clinic visits behind the "sent home" marks
      leavesAfter.forEach((after, id) => {
        const st = students.find((x) => x._id === id)!;
        const section = sections.find((s) => s.students.some((x) => x._id === id))!;
        const lessons = db.entries.filter((e) => e.section._id === section._id && e.day === day).sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0));
        const nextPeriod = db.schoolDay.periods.find((p) => p._id === lessons[after]?.periodId);
        if (!nextPeriod) return;
        db.clinicVisits.push({
          _id: newId(), date, time: hhmm(toMinutes(nextPeriod.start) - 10), student: st,
          complaint: ['Headache', 'Stomach ache', 'Fever', 'Nausea'][Math.floor(rand() * 4)], temperature: Math.round((37.6 + rand() * 1.4) * 10) / 10,
          action: 'sent_home', notes: 'Parent called and collected the student.', seenBy: { _id: '', name: 'School nurse' }, createdAt: nowIso(), updatedAt: nowIso()
        });
      });
    });
    const health = seedHealth(db, students, rand, dates);
    return { registers: created, days: filledDays, profiles: health.profiles, visits: health.visits };
  });
}
