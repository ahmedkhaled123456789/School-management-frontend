/**
 * Sections, rooms, school day and timetable — MOCK implementation.
 * Signatures and error behaviour match what the backend endpoints will be:
 *   GET/POST/PUT/DELETE /sections, /rooms, /timetable, GET/PUT /school-day
 * so the pages and hooks will not change when the real API arrives.
 */
import { fail, newId, nowIso, read, requirePermission, write, type MockDb } from './mock/db';
import type {
  Ref,
  Room,
  RoomPayload,
  SchoolDay,
  Section,
  SectionPayload,
  SlotConflict,
  StudentRef,
  TimetableEntry,
  TimetableEntryPayload,
  WeekDay } from
'../types/sections';
import { findConflicts, sectionLabel, validateSchoolDay } from '../utils/timetable';

const MANAGE = 'academics.manage';
const ROOM_TYPES = ['classroom', 'lab', 'hall', 'gym', 'other'];

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const byLabel = (a: Section, b: Section) =>
a.classLevel.name.localeCompare(b.classLevel.name, undefined, { numeric: true }) || a.name.localeCompare(b.name);

function findSection(db: MockDb, id: string): Section {
  const section = db.sections.find((s) => s._id === id);
  if (!section) fail(404, 'Section not found');
  return section;
}

/** Keeps the section snapshot stored on timetable entries in sync with the section. */
function refreshSectionRefs(db: MockDb, section: Section) {
  const ref = { _id: section._id, name: sectionLabel(section) };
  db.entries.forEach((entry) => {if (entry.section._id === section._id) entry.section = ref;});
}

/* ================================== rooms ================================= */

function validateRoom(payload: RoomPayload) {
  if (!payload.name?.trim()) fail(400, 'Room name is required');
  if (!ROOM_TYPES.includes(payload.type)) fail(400, 'Invalid room type');
  if (!Number.isInteger(payload.capacity) || payload.capacity < 1 || payload.capacity > 500) {
    fail(400, 'Capacity must be a whole number between 1 and 500');
  }
}

export const listRooms = () => read((db) => [...db.rooms].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));

export function createRoom(payload: RoomPayload): Promise<Room> {
  requirePermission(MANAGE);
  return write((db) => {
    validateRoom(payload);
    if (db.rooms.some((r) => sameText(r.name, payload.name))) fail(409, `A room named "${payload.name.trim()}" already exists`);
    const room: Room = { _id: newId(), ...payload, name: payload.name.trim(), createdAt: nowIso(), updatedAt: nowIso() };
    db.rooms.push(room);
    return room;
  });
}

export function updateRoom(id: string, payload: RoomPayload): Promise<Room> {
  requirePermission(MANAGE);
  return write((db) => {
    validateRoom(payload);
    const room = db.rooms.find((r) => r._id === id);
    if (!room) fail(404, 'Room not found');
    if (db.rooms.some((r) => r._id !== id && sameText(r.name, payload.name))) fail(409, `A room named "${payload.name.trim()}" already exists`);
    Object.assign(room, payload, { name: payload.name.trim(), updatedAt: nowIso() });
    // renamed => update the snapshots that show it
    const ref = { _id: room._id, name: room.name };
    db.sections.forEach((s) => {if (s.room?._id === id) s.room = ref;});
    db.entries.forEach((e) => {if (e.room?._id === id) e.room = ref;});
    return room;
  });
}

export function deleteRoom(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!db.rooms.some((r) => r._id === id)) fail(404, 'Room not found');
    const periods = db.entries.filter((e) => e.room?._id === id).length;
    if (periods) fail(409, `This room is used by ${periods} timetable period(s). Change them first.`);
    db.sections.forEach((s) => {if (s.room?._id === id) s.room = null;});
    db.rooms = db.rooms.filter((r) => r._id !== id);
  });
}

/* ================================ sections ================================ */

function validateSection(payload: SectionPayload) {
  if (!/^[\p{L}\p{N} -]{1,12}$/u.test(payload.name?.trim() ?? '')) fail(400, 'Section name: 1–12 letters or digits (e.g. A, B, 1)');
  if (!payload.classLevel?._id) fail(400, 'Choose a class level');
  if (!Number.isInteger(payload.capacity) || payload.capacity < 1 || payload.capacity > 100) {
    fail(400, 'Capacity must be a whole number between 1 and 100');
  }
}

export const listSections = (academicYear: string, classLevelId?: string) =>
read((db) =>
db.sections.
filter((s) => s.academicYear === academicYear && (!classLevelId || s.classLevel._id === classLevelId)).
sort(byLabel)
);

export const getSection = (id: string) => read((db) => findSection(db, id));

/** The section a student sits in this year (or null). */
export const findStudentSection = (academicYear: string, studentId: string) =>
read((db) => db.sections.find((s) => s.academicYear === academicYear && s.students.some((st) => st._id === studentId)) ?? null);

export function createSection(academicYear: string, payload: SectionPayload): Promise<Section> {
  requirePermission(MANAGE);
  return write((db) => {
    validateSection(payload);
    if (!academicYear) fail(400, 'Set the current academic year in School Settings first');
    if (db.sections.some((s) => s.academicYear === academicYear && s.classLevel._id === payload.classLevel._id && sameText(s.name, payload.name))) {
      fail(409, `${payload.classLevel.name} already has a section "${payload.name.trim()}"`);
    }
    const section: Section = {
      _id: newId(),
      name: payload.name.trim().toUpperCase(),
      academicYear,
      classLevel: payload.classLevel,
      homeroomTeacher: payload.homeroomTeacher ?? null,
      room: payload.room ?? null,
      capacity: payload.capacity,
      students: [],
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    db.sections.push(section);
    return section;
  });
}

export function updateSection(id: string, payload: SectionPayload): Promise<Section> {
  requirePermission(MANAGE);
  return write((db) => {
    validateSection(payload);
    const section = findSection(db, id);
    if (payload.classLevel._id !== section.classLevel._id && section.students.length) {
      fail(400, 'Move the students out before changing the class level of a section');
    }
    if (payload.capacity < section.students.length) {
      fail(400, `Capacity can not be below the ${section.students.length} students already in the section`);
    }
    if (db.sections.some((s) => s._id !== id && s.academicYear === section.academicYear && s.classLevel._id === payload.classLevel._id && sameText(s.name, payload.name))) {
      fail(409, `${payload.classLevel.name} already has a section "${payload.name.trim()}"`);
    }
    Object.assign(section, {
      name: payload.name.trim().toUpperCase(),
      classLevel: payload.classLevel,
      homeroomTeacher: payload.homeroomTeacher ?? null,
      room: payload.room ?? null,
      capacity: payload.capacity,
      updatedAt: nowIso()
    });
    refreshSectionRefs(db, section);
    return section;
  });
}

/** Deletes the section and its timetable periods (the UI confirms the count first). */
export function deleteSection(id: string): Promise<{removedPeriods: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    findSection(db, id);
    const removedPeriods = db.entries.filter((e) => e.section._id === id).length;
    db.entries = db.entries.filter((e) => e.section._id !== id);
    db.sections = db.sections.filter((s) => s._id !== id);
    return { removedPeriods };
  });
}

/** Students the caller already filtered to the section's class level. */
export function addStudents(sectionId: string, students: StudentRef[]): Promise<Section> {
  requirePermission(MANAGE);
  return write((db) => {
    const section = findSection(db, sectionId);
    const incoming = students.filter((st) => !section.students.some((existing) => existing._id === st._id));
    incoming.forEach((student) => {
      const other = db.sections.find((s) => s._id !== sectionId && s.academicYear === section.academicYear && s.students.some((st) => st._id === student._id));
      if (other) fail(409, `${student.name} is already in ${sectionLabel(other)}. Move the student instead.`);
    });
    if (section.students.length + incoming.length > section.capacity) {
      fail(400, `Only ${section.capacity - section.students.length} seat(s) left in ${sectionLabel(section)}`);
    }
    section.students.push(...incoming);
    section.students.sort((a, b) => a.name.localeCompare(b.name));
    section.updatedAt = nowIso();
    return section;
  });
}

export function removeStudent(sectionId: string, studentId: string): Promise<Section> {
  requirePermission(MANAGE);
  return write((db) => {
    const section = findSection(db, sectionId);
    if (!section.students.some((st) => st._id === studentId)) fail(404, 'The student is not in this section');
    section.students = section.students.filter((st) => st._id !== studentId);
    section.updatedAt = nowIso();
    return section;
  });
}

/** Moves a student to another section of the same class level and year. */
export function moveStudent(fromSectionId: string, studentId: string, toSectionId: string): Promise<Section> {
  requirePermission(MANAGE);
  return write((db) => {
    const from = findSection(db, fromSectionId);
    const to = findSection(db, toSectionId);
    const student = from.students.find((st) => st._id === studentId);
    if (!student) fail(404, 'The student is not in this section');
    if (from._id === to._id) fail(400, 'Choose a different section');
    if (to.classLevel._id !== from.classLevel._id || to.academicYear !== from.academicYear) {
      fail(400, 'Students can only move between sections of the same class level');
    }
    if (to.students.length >= to.capacity) fail(400, `${sectionLabel(to)} is full`);
    from.students = from.students.filter((st) => st._id !== studentId);
    to.students = [...to.students, student].sort((a, b) => a.name.localeCompare(b.name));
    from.updatedAt = nowIso();
    to.updatedAt = nowIso();
    return to;
  });
}

/**
 * Seats the given (unassigned) students of one class level across its
 * sections, always filling the emptiest section first and respecting capacity.
 */
export function distributeStudents(academicYear: string, classLevelId: string, students: StudentRef[]): Promise<{assigned: number;left: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    const sections = db.sections.filter((s) => s.academicYear === academicYear && s.classLevel._id === classLevelId);
    if (!sections.length) fail(400, 'Create at least one section for this class level first');
    const seated = new Set(db.sections.filter((s) => s.academicYear === academicYear).flatMap((s) => s.students.map((st) => st._id)));
    const waiting = students.filter((st) => !seated.has(st._id)).sort((a, b) => a.name.localeCompare(b.name));
    let assigned = 0;
    for (const student of waiting) {
      const target = sections.
      filter((s) => s.students.length < s.capacity).
      sort((a, b) => a.students.length / a.capacity - b.students.length / b.capacity || a.name.localeCompare(b.name))[0];
      if (!target) break;
      target.students.push(student);
      assigned += 1;
    }
    sections.forEach((s) => {
      s.students.sort((a, b) => a.name.localeCompare(b.name));
      s.updatedAt = nowIso();
    });
    return { assigned, left: waiting.length - assigned };
  });
}

/* ================================ school day ============================== */

export const getSchoolDay = () => read((db) => db.schoolDay);

/** Entries a new school day would orphan (removed days / periods / now-breaks). */
const orphanedBy = (db: MockDb, next: SchoolDay) =>
db.entries.filter((e) => {
  const period = next.periods.find((p) => p._id === e.periodId);
  return !next.days.includes(e.day) || !period || period.isBreak;
});

/** How many timetable periods a change would remove — asked before saving. */
export const previewSchoolDayChange = (next: SchoolDay) => read((db) => orphanedBy(db, next).length);

export function updateSchoolDay(next: SchoolDay, { removeOrphans = false } = {}): Promise<SchoolDay> {
  requirePermission(MANAGE);
  return write((db) => {
    const problems = validateSchoolDay(next);
    if (problems.length) fail(400, problems[0]);
    const orphans = orphanedBy(db, next);
    if (orphans.length && !removeOrphans) {
      fail(409, `${orphans.length} timetable period(s) use the days or periods you removed`);
    }
    const ids = new Set(orphans.map((e) => e._id));
    db.entries = db.entries.filter((e) => !ids.has(e._id));
    db.schoolDay = {
      days: next.days,
      periods: next.periods.map((p) => ({ ...p, _id: p._id || newId(), label: p.label.trim() }))
    };
    return db.schoolDay;
  });
}

/* ================================ timetable =============================== */

export interface TimetableQuery {
  academicYear: string;
  section?: string;
  teacher?: string;
  room?: string;
}

export const listTimetable = (query: TimetableQuery) =>
read((db) =>
db.entries.filter((e) =>
e.academicYear === query.academicYear && (
!query.section || e.section._id === query.section) && (
!query.teacher || e.teacher._id === query.teacher) && (
!query.room || e.room?._id === query.room)
)
);

/** Live check used by the editor before saving. */
export const checkSlot = (academicYear: string, draft: TimetableEntryPayload, ignoreId?: string): Promise<SlotConflict[]> =>
read((db) => findConflicts({ ...draft, room: draft.room ?? null }, db.entries.filter((e) => e.academicYear === academicYear), db.schoolDay, ignoreId));

/** Creates (no id) or updates an entry; rejects clashes with 409. */
export function saveEntry(academicYear: string, payload: TimetableEntryPayload, id?: string): Promise<TimetableEntry> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!payload.subject?._id) fail(400, 'Choose a subject');
    if (!payload.teacher?._id) fail(400, 'Choose a teacher');
    const section = findSection(db, payload.section._id);
    const draft = { ...payload, section: { _id: section._id, name: sectionLabel(section) }, room: payload.room ?? section.room ?? null };
    const conflicts = findConflicts(draft, db.entries.filter((e) => e.academicYear === academicYear), db.schoolDay, id);
    if (conflicts.length) fail(409, conflicts[0].message);
    if (id) {
      const entry = db.entries.find((e) => e._id === id);
      if (!entry) fail(404, 'Timetable period not found');
      Object.assign(entry, draft, { updatedAt: nowIso() });
      return entry;
    }
    const entry: TimetableEntry = { _id: newId(), academicYear, ...draft, createdAt: nowIso(), updatedAt: nowIso() };
    db.entries.push(entry);
    return entry;
  });
}

export function deleteEntry(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!db.entries.some((e) => e._id === id)) fail(404, 'Timetable period not found');
    db.entries = db.entries.filter((e) => e._id !== id);
  });
}

/** Empties one section's week (the UI confirms first). */
export function clearSectionTimetable(sectionId: string): Promise<{removed: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    const removed = db.entries.filter((e) => e.section._id === sectionId).length;
    db.entries = db.entries.filter((e) => e.section._id !== sectionId);
    return { removed };
  });
}

/**
 * Copies another section's week onto `targetId` (same subjects and teachers),
 * skipping every period that would clash. Returns what was copied/skipped.
 */
export function copyTimetable(academicYear: string, sourceId: string, targetId: string): Promise<{copied: number;skipped: string[];}> {
  requirePermission(MANAGE);
  return write((db) => {
    const source = findSection(db, sourceId);
    const target = findSection(db, targetId);
    if (source._id === target._id) fail(400, 'Choose a different section to copy from');
    const targetRef = { _id: target._id, name: sectionLabel(target) };
    const skipped: string[] = [];
    let copied = 0;
    db.entries.
    filter((e) => e.section._id === source._id).
    forEach((e) => {
      const draft = { day: e.day as WeekDay, periodId: e.periodId, section: targetRef, subject: e.subject, teacher: e.teacher, room: target.room ?? null };
      const conflicts = findConflicts(draft, db.entries.filter((x) => x.academicYear === academicYear), db.schoolDay);
      if (conflicts.length) {
        skipped.push(conflicts[0].message);
        return;
      }
      db.entries.push({ _id: newId(), academicYear, ...draft, createdAt: nowIso(), updatedAt: nowIso() });
      copied += 1;
    });
    return { copied, skipped };
  });
}

/* ============================== demo generator ============================ */

export interface DemoInput {
  academicYear: string;
  classLevels: Ref[];
  /** real students, grouped by their current class level id */
  studentsByLevel: Record<string, StudentRef[]>;
  /** real teachers; `subjectName` (if any) is matched to subjects by name */
  teachers: Array<Ref & {subjectName?: string;}>;
  subjects: Ref[];
}

/**
 * Builds sections, rooms and a clash-free timetable from the REAL class
 * levels, students, teachers and subjects — only when the year is still empty.
 */
export function generateDemo(input: DemoInput): Promise<{sections: number;rooms: number;periods: number;students: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!input.academicYear) fail(400, 'Set the current academic year in School Settings first');
    if (db.sections.some((s) => s.academicYear === input.academicYear)) {
      fail(409, 'This academic year already has sections. Reset the demo data first.');
    }
    if (!input.classLevels.length) fail(400, 'Create class levels first');
    if (!input.teachers.length || !input.subjects.length) fail(400, 'Add teachers and subjects first');

    const SIZE = 25;
    const plan = input.classLevels.map((level) => {
      const students = [...(input.studentsByLevel[level._id] ?? [])].sort((a, b) => a.name.localeCompare(b.name));
      return { level, students, count: Math.max(1, Math.ceil(students.length / SIZE)) };
    });
    const sectionTotal = plan.reduce((sum, p) => sum + p.count, 0);

    // rooms: one classroom per section + shared lab and hall
    const now = nowIso();
    const classrooms: Room[] = Array.from({ length: sectionTotal }, (_, i) => ({
      _id: newId(), name: `Room ${101 + i}`, type: 'classroom', capacity: 30, createdAt: now, updatedAt: now
    }));
    const extra: Room[] = [
    { _id: newId(), name: 'Science Lab', type: 'lab', capacity: 24, createdAt: now, updatedAt: now },
    { _id: newId(), name: 'Computer Lab', type: 'lab', capacity: 24, createdAt: now, updatedAt: now },
    { _id: newId(), name: 'Main Hall', type: 'hall', capacity: 200, createdAt: now, updatedAt: now }];

    db.rooms.push(...classrooms, ...extra);

    let roomIndex = 0;
    let homeroomIndex = 0;
    const created: Section[] = [];
    plan.forEach(({ level, students, count }) => {
      for (let i = 0; i < count; i += 1) {
        const room = classrooms[roomIndex++];
        const teacher = input.teachers[homeroomIndex++ % input.teachers.length];
        created.push({
          _id: newId(),
          name: String.fromCharCode(65 + i),
          academicYear: input.academicYear,
          classLevel: level,
          homeroomTeacher: { _id: teacher._id, name: teacher.name },
          room: { _id: room._id, name: room.name },
          capacity: 30,
          // round-robin keeps the sections balanced
          students: students.filter((_, index) => index % count === i),
          createdAt: now,
          updatedAt: now
        });
      }
    });
    db.sections.push(...created);

    // timetable: rotate subjects; among the FREE teachers prefer the one whose
    // subject matches by name, then the least loaded; nobody is double-booked
    // and nobody teaches more than MAX_LOAD periods a week (else the slot stays free)
    const MAX_LOAD = 26;
    const teachingPeriods = db.schoolDay.periods.filter((p) => !p.isBreak);
    const load = new Map<string, number>();
    const teacherFor = (subject: Ref) =>
    input.teachers.
    filter((t) => (load.get(t._id) ?? 0) < MAX_LOAD).
    sort((a, b) =>
    Number(sameText(b.subjectName ?? '', subject.name)) - Number(sameText(a.subjectName ?? '', subject.name)) ||
    (load.get(a._id) ?? 0) - (load.get(b._id) ?? 0)
    );
    let periods = 0;
    // slot by slot across ALL sections (not section by section), so the
    // limited teacher time is shared fairly instead of filling the first
    // sections; periods are the OUTER loop so every day gets lessons and any
    // free time falls at the end of the days (not on one empty weekday)
    teachingPeriods.forEach((period, periodIndex) => {
      db.schoolDay.days.forEach((day, dayIndex) => {
        // leave the last period of the last day free (realistic, and shows empty cells)
        if (dayIndex === db.schoolDay.days.length - 1 && periodIndex === teachingPeriods.length - 1) return;
        // rotate which section picks first in each slot
        const offset = (dayIndex * teachingPeriods.length + periodIndex) % created.length;
        const order = created.map((_, i) => created[(i + offset) % created.length]);
        order.forEach((section) => {
          const sectionIndex = created.indexOf(section);
          const sectionRef = { _id: section._id, name: sectionLabel(section) };
          const subject = input.subjects[(sectionIndex + dayIndex * teachingPeriods.length + periodIndex) % input.subjects.length];
          const yearEntries = db.entries.filter((e) => e.academicYear === input.academicYear);
          const teacher = teacherFor(subject).find((t) =>
          findConflicts({ day, periodId: period._id, section: sectionRef, teacher: t, room: section.room }, yearEntries, db.schoolDay).length === 0
          );
          if (!teacher) return;
          db.entries.push({
            _id: newId(),
            academicYear: input.academicYear,
            section: sectionRef,
            day,
            periodId: period._id,
            subject: { _id: subject._id, name: subject.name },
            teacher: { _id: teacher._id, name: teacher.name },
            room: section.room,
            createdAt: now,
            updatedAt: now
          });
          load.set(teacher._id, (load.get(teacher._id) ?? 0) + 1);
          periods += 1;
        });
      });
    });

    return {
      sections: created.length,
      rooms: classrooms.length + extra.length,
      periods,
      students: created.reduce((sum, s) => sum + s.students.length, 0)
    };
  });
}
