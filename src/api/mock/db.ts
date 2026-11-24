/**
 * MOCK DATABASE for features the backend does not serve yet (sections,
 * rooms, timetable). It behaves like a small server:
 *  - async calls with a short random latency,
 *  - validation / not-found / conflict errors as ApiError (400/404/409),
 *  - permission checks mirroring the backend (403),
 *  - data persisted per browser in localStorage and shared between tabs.
 *
 * Swapping to the real backend later means replacing the functions in
 * src/api/sections.ts with request() calls of the same shape.
 */
import { ApiError, kindForStatus } from '../../lib/apiError';
import type { AuthUser } from '../../types/auth';
import type { Ref, Room, SchoolDay, Section, TimetableEntry } from '../../types/sections';
import type { AttendanceSettings, GateScan, StaffAttendanceRecord, StoredRegister } from '../../types/attendance';
import type { ClinicVisit, HealthProfile } from '../../types/health';

const STORAGE_KEY = 'sms.mock.v1';
const SESSION_USER_KEY = 'sms.user';
const SESSION_ROLE_KEY = 'sms.role';

export interface MockDb {
  version: 1;
  rooms: Room[];
  sections: Section[];
  entries: TimetableEntry[];
  schoolDay: SchoolDay;
  // attendance & health (added later: older stored data gets empty lists)
  registers: StoredRegister[];
  gateScans: GateScan[];
  staffAttendance: StaffAttendanceRecord[];
  attendanceSettings: AttendanceSettings;
  healthProfiles: HealthProfile[];
  clinicVisits: ClinicVisit[];
}

/** Sun–Thu, 7 periods of 45 min with a break after the third (Egyptian school day). */
export function defaultSchoolDay(): SchoolDay {
  return {
    days: ['sun', 'mon', 'tue', 'wed', 'thu'],
    periods: [
    { _id: 'p1', label: 'Period 1', start: '08:00', end: '08:45', isBreak: false },
    { _id: 'p2', label: 'Period 2', start: '08:50', end: '09:35', isBreak: false },
    { _id: 'p3', label: 'Period 3', start: '09:40', end: '10:25', isBreak: false },
    { _id: 'brk', label: 'Break', start: '10:25', end: '10:50', isBreak: true },
    { _id: 'p4', label: 'Period 4', start: '10:50', end: '11:35', isBreak: false },
    { _id: 'p5', label: 'Period 5', start: '11:40', end: '12:25', isBreak: false },
    { _id: 'p6', label: 'Period 6', start: '12:30', end: '13:15', isBreak: false },
    { _id: 'p7', label: 'Period 7', start: '13:20', end: '14:05', isBreak: false }]

  };
}

export const defaultAttendanceSettings = (): AttendanceSettings => ({ staffStart: '07:45', graceMinutes: 10, lockDays: 3 });

const emptyDb = (): MockDb => ({
  version: 1,
  rooms: [],
  sections: [],
  entries: [],
  schoolDay: defaultSchoolDay(),
  registers: [],
  gateScans: [],
  staffAttendance: [],
  attendanceSettings: defaultAttendanceSettings(),
  healthProfiles: [],
  clinicVisits: []
});

/** Adds collections introduced after the data was first stored. */
function upgrade(db: MockDb): MockDb {
  return {
    ...db,
    registers: Array.isArray(db.registers) ? db.registers : [],
    gateScans: Array.isArray(db.gateScans) ? db.gateScans : [],
    staffAttendance: Array.isArray(db.staffAttendance) ? db.staffAttendance : [],
    attendanceSettings: { ...defaultAttendanceSettings(), ...(db.attendanceSettings ?? {}) },
    healthProfiles: Array.isArray(db.healthProfiles) ? db.healthProfiles : [],
    clinicVisits: Array.isArray(db.clinicVisits) ? db.clinicVisits : []
  };
}

let memory: MockDb | null = null;
const listeners = new Set<() => void>();

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function isMockDb(value: unknown): value is MockDb {
  const db = value as MockDb;
  return Boolean(db) && db.version === 1 && Array.isArray(db.rooms) && Array.isArray(db.sections) &&
  Array.isArray(db.entries) && Boolean(db.schoolDay) && Array.isArray(db.schoolDay.periods);
}

function load(): MockDb {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    memory = isMockDb(parsed) ? upgrade(parsed) : emptyDb();
  } catch {
    // storage blocked or corrupted: keep working in memory
    memory = emptyDb();
  }
  return memory;
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {

    // quota / private mode: data lives until the tab closes
  }}

// another tab changed the data => reload and tell the UI
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    memory = null;
    listeners.forEach((listener) => listener());
  });
}

/** Subscribe to changes made in other tabs (used to refresh queries). */
export function onMockDbChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Simulated network latency so loading states are visible and realistic. */
export const latency = () => new Promise<void>((resolve) => window.setTimeout(resolve, 150 + Math.random() * 250));

/** Read-only snapshot (a copy: callers can not corrupt the store). */
export async function read<T>(select: (db: MockDb) => T): Promise<T> {
  await latency();
  return clone(select(load()));
}

/**
 * Runs a write against a draft copy; the change is only kept when `apply`
 * finishes without throwing, so a failed validation never leaves half-written data.
 */
export async function write<T>(apply: (db: MockDb) => T): Promise<T> {
  await latency();
  const draft = clone(load());
  const result = apply(draft);
  memory = draft;
  persist();
  return clone(result);
}

/** Clears everything (sections, timetable, attendance, health). */
export function resetMockDb() {
  memory = emptyDb();
  persist();
  listeners.forEach((listener) => listener());
}

/** 24-hex id like a Mongo ObjectId, so it passes the same id checks. */
export function newId(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);else
  bytes.forEach((_, i) => {bytes[i] = Math.floor(Math.random() * 256);});
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const nowIso = () => new Date().toISOString();

export function fail(status: number, message: string): never {
  throw new ApiError(message, status, kindForStatus(status));
}

/**
 * Mirrors the backend permission check. Sessions created before roles
 * existed carry no permission list: admins stay allowed (the real backend
 * still has the final word for real endpoints).
 */
export function requirePermission(permission: string) {
  let user: AuthUser | null = null;
  let role: string | null = null;
  try {
    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    user = raw ? JSON.parse(raw) as AuthUser : null;
    role = window.localStorage.getItem(SESSION_ROLE_KEY);
  } catch {
    user = null;
  }
  if (!user || !role) fail(401, 'Your session has expired. Please sign in again.');
  if (role === 'admin' && !user.permissions) return;
  if (!user.permissions?.includes(permission)) {
    fail(403, 'You do not have permission to perform this action');
  }
}

/** The signed-in user as a mock server sees the token: role + a display reference. */
export function sessionActor(): {role: string;ref: Ref;user: AuthUser;} {
  let user: AuthUser | null = null;
  let role: string | null = null;
  try {
    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    user = raw ? JSON.parse(raw) as AuthUser : null;
    role = window.localStorage.getItem(SESSION_ROLE_KEY);
  } catch {
    user = null;
  }
  if (!user || !role) fail(401, 'Your session has expired. Please sign in again.');
  return { role, user, ref: { _id: user._id ?? '', name: user.name || user.email || role } };
}

/** Admin-portal users need the permission; other portals must match `roles`. */
export function requireRoleOr(permission: string, roles: string[]) {
  const { role } = sessionActor();
  if (role === 'admin') return requirePermission(permission);
  if (!roles.includes(role)) fail(403, 'You do not have permission to perform this action');
}
