import type { Timestamped } from './common';

/**
 * Sections & timetable. Served by the MOCK API (src/api/mock) until the
 * backend ships these endpoints. References to real records (class levels,
 * students, teachers, subjects) are stored as {_id, name} snapshots, the same
 * shape a populated backend response would have, so portals that may not
 * list those records (teacher / student / parent) can still show names.
 */

export interface Ref {
  _id: string;
  name: string;
}

export interface StudentRef extends Ref {
  /** School code, e.g. STU12345AB */
  studentId?: string;
}

export interface Room extends Timestamped {
  _id: string;
  name: string;
  type: RoomType;
  capacity: number;
  notes?: string;
}

export type RoomType = 'classroom' | 'lab' | 'hall' | 'gym' | 'other';

export interface RoomPayload {
  name: string;
  type: RoomType;
  capacity: number;
  notes?: string;
}

export interface Section extends Timestamped {
  _id: string;
  /** "A", "B"… shown as "<level> / <name>" */
  name: string;
  academicYear: string;
  classLevel: Ref;
  homeroomTeacher: Ref | null;
  /** default room for the section's periods */
  room: Ref | null;
  capacity: number;
  students: StudentRef[];
}

export interface SectionPayload {
  name: string;
  classLevel: Ref;
  homeroomTeacher?: Ref | null;
  room?: Ref | null;
  capacity: number;
}

export type WeekDay = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export interface Period {
  _id: string;
  label: string;
  /** "08:00" (24h) */
  start: string;
  end: string;
  isBreak: boolean;
}

/** The school day: which weekdays are taught and the bell schedule. */
export interface SchoolDay {
  days: WeekDay[];
  periods: Period[];
}

export interface TimetableEntry extends Timestamped {
  _id: string;
  academicYear: string;
  section: Ref;
  day: WeekDay;
  periodId: string;
  subject: Ref;
  teacher: Ref;
  room: Ref | null;
}

export interface TimetableEntryPayload {
  section: Ref;
  day: WeekDay;
  periodId: string;
  subject: Ref;
  teacher: Ref;
  room?: Ref | null;
}

/** Why a slot can not take an entry (teacher / room / section already busy). */
export interface SlotConflict {
  kind: 'section' | 'teacher' | 'room' | 'break' | 'closed';
  message: string;
  entry?: TimetableEntry;
}
