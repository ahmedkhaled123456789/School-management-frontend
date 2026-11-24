import type { Timestamped } from './common';
import type { Ref, StudentRef } from './sections';

/**
 * Attendance. Served by the MOCK API (src/api/mock) until the backend ships
 * these endpoints. Dates are local calendar days "YYYY-MM-DD"; times "HH:MM".
 */

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface AttendanceMark {
  student: StudentRef;
  status: AttendanceStatus;
  /** late only */
  minutesLate?: number;
  /** excused / absent: why (sick, family, clinic…) */
  reason?: string;
  note?: string;
}

/** One period's register for one section (taken from a timetable period). */
export interface AttendanceRegister extends Timestamped {
  _id: string;
  academicYear: string;
  date: string;
  section: Ref;
  periodId: string;
  subject: Ref;
  teacher: Ref;
  takenBy: Ref;
  marks: AttendanceMark[];
}

export interface RegisterPayload {
  date: string;
  sectionId: string;
  periodId: string;
  marks: AttendanceMark[];
}

/** Arrival at the school gate (QR / barcode scan or typed code). */
export interface GateScan {
  _id: string;
  date: string;
  time: string;
  student: StudentRef;
  section: Ref | null;
  method: 'camera' | 'scanner' | 'manual';
  late: boolean;
  createdAt: string;
}

/** Why a register is suggested a certain way before the teacher saves. */
export interface MarkHint {
  kind: 'gate' | 'no-gate' | 'clinic' | 'earlier-period' | 'saved';
  text: string;
}

/** A register ready to edit: the saved one, or a suggestion. */
export interface RegisterDraft {
  register: AttendanceRegister | null;
  date: string;
  section: Ref;
  periodId: string;
  periodLabel: string;
  periodStart: string;
  subject: Ref;
  teacher: Ref;
  marks: AttendanceMark[];
  hints: Record<string, MarkHint[]>;
  /** teachers can no longer change it (admins can) */
  locked: boolean;
}

/* --------------------------------- staff ---------------------------------- */

export type StaffKind = 'teacher' | 'staff';
export type StaffAttendanceStatus = 'present' | 'late' | 'absent' | 'leave';

export interface StaffRef extends Ref {
  kind: StaffKind;
  /** email: how a fingerprint / card device identifies the person in exports */
  email?: string;
}

export interface StaffAttendanceRecord extends Timestamped {
  _id: string;
  date: string;
  staff: StaffRef;
  status: StaffAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  source: 'manual' | 'device';
  note?: string;
}

export interface StaffAttendancePayload {
  date: string;
  staff: StaffRef;
  status: StaffAttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  note?: string;
}

export interface AttendanceSettings {
  /** staff are late after start + grace */
  staffStart: string;
  graceMinutes: number;
  /** teachers may change a register for this many days; admins always */
  lockDays: number;
}

export interface DeviceImportResult {
  imported: number;
  updated: number;
  /** "line 4: unknown person x@y" */
  problems: string[];
}

/**
 * How a register is kept in the mock store: the roster ids plus only the
 * students who were NOT simply present. Browser storage is small (~5 MB) and
 * a school takes thousands of registers a month.
 */
export interface StoredRegister extends Omit<AttendanceRegister, 'marks'> {
  roster: string[];
  exceptions: Array<Omit<AttendanceMark, 'student'> & {studentId: string;name: string;code?: string;}>;
}
