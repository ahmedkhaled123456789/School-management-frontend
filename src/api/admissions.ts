/**
 * Admissions — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET /admissions/public, POST /admissions/apply, GET /admissions/status
 *   GET/POST /admissions, GET /admissions/seats, PATCH /admissions/:id/{test,score,decision,withdraw,enrol}
 *
 * Enrolment creates the REAL student with the existing students endpoint
 * (the page does that first), then records it here and seats the student.
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type { AdmissionSettings, Application, ApplicationPayload, ApplicationStatus, EntranceTest, LevelSeats } from '../types/admissions';
import type { Ref } from '../types/sections';
import { addDays, daysBetween, isDateKey, todayKey } from '../utils/attendance';
import { sectionLabel, toMinutes } from '../utils/timetable';
import { queueOutbox } from './communication';

const READ = 'students.read';
const MANAGE = 'students.manage';
const SEATING = 'academics.manage';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s-]{7,20}$/;

/** The newest academic year that has sections (the public form has no session). */
function currentYear(db: MockDb): string {
  return [...db.sections].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]?.academicYear ?? '';
}

function levelsOf(db: MockDb, year: string): Ref[] {
  const map = new Map<string, Ref>();
  db.sections.filter((s) => s.academicYear === year).forEach((s) => map.set(s.classLevel._id, s.classLevel));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function seats(db: MockDb, year: string, levelId: string, ignoreId?: string): LevelSeats {
  const sections = db.sections.filter((s) => s.academicYear === year && s.classLevel._id === levelId);
  const apps = db.applications.filter((a) => a.academicYear === year && a.classLevel._id === levelId && a._id !== ignoreId);
  const capacity = sections.reduce((n, s) => n + s.capacity, 0);
  const seated = sections.reduce((n, s) => n + s.students.length, 0);
  const promised = apps.filter((a) => a.status === 'accepted').length;
  return {
    level: sections[0]?.classLevel ?? { _id: levelId, name: '' },
    capacity,
    seated,
    promised,
    free: Math.max(capacity - seated - promised, 0),
    waitlist: apps.filter((a) => a.status === 'waitlisted').length
  };
}

const STATUS_TEXT: Record<ApplicationStatus, string> = {
  new: 'received',
  test_scheduled: 'invited to the entrance test',
  tested: 'tested',
  accepted: 'accepted',
  waitlisted: 'placed on the waiting list',
  rejected: 'not accepted this time',
  enrolled: 'enrolled',
  withdrawn: 'withdrawn'
};

function email(db: MockDb, app: Application, extra = '') {
  queueOutbox(db, {
    channel: 'email',
    to: `${app.guardian.name} <${app.guardian.email}>`,
    subject: `Application ${app.reference}: ${STATUS_TEXT[app.status]}`,
    body: `Dear ${app.guardian.name},\nThe application of ${app.applicant.name} for ${app.classLevel.name} (${app.reference}) was ${STATUS_TEXT[app.status]}.${extra ? `\n${extra}` : ''}`,
    kind: 'admission'
  });
}

function log(app: Application, by: string, action: string, note?: string) {
  app.history.push({ at: nowIso(), by, action, ...(note?.trim() ? { note: note.trim().slice(0, 300) } : {}) });
  app.updatedAt = nowIso();
}

const find = (db: MockDb, id: string) => {
  const app = db.applications.find((a) => a._id === id);
  if (!app) fail(404, 'Application not found');
  return app;
};

function validate(db: MockDb, p: ApplicationPayload, year: string) {
  const name = p.applicant?.name?.trim() ?? '';
  if (name.length < 3 || name.length > 80) fail(400, "Enter the child's full name");
  if (!isDateKey(p.applicant.dateOfBirth ?? '')) fail(400, 'Enter the date of birth');
  const age = daysBetween(p.applicant.dateOfBirth, todayKey()) / 365.25;
  if (age < 3 || age > 20) fail(400, 'The date of birth does not look right (age 3–20)');
  if (!['Male', 'Female'].includes(p.applicant.gender)) fail(400, 'Choose the gender');
  if ((p.applicant.previousSchool?.length ?? 0) > 100) fail(400, 'Previous school: 100 characters max');
  if (!p.classLevel?._id || !levelsOf(db, year).some((l) => l._id === p.classLevel._id)) fail(400, 'Choose the class level');
  if ((p.guardian?.name?.trim().length ?? 0) < 3) fail(400, "Enter the parent's or guardian's name");
  if (!p.guardian.relation?.trim()) fail(400, 'Enter the relation to the child');
  if (!PHONE.test(p.guardian.phone?.trim() ?? '')) fail(400, 'Enter a valid phone number');
  if (!EMAIL.test(p.guardian.email?.trim() ?? '')) fail(400, 'Enter a valid email address');
  const dup = db.applications.find((a) => a.academicYear === year && a.applicant.name.trim().toLowerCase() === name.toLowerCase() &&
  a.applicant.dateOfBirth === p.applicant.dateOfBirth && !['rejected', 'withdrawn'].includes(a.status));
  if (dup) fail(409, `An application for ${name} already exists (${dup.reference})`);
}

function create(db: MockDb, p: ApplicationPayload, source: Application['source'], by: string): Application {
  const year = currentYear(db);
  if (!year) fail(400, 'Admissions open once the school has sections for the year');
  validate(db, p, year);
  const seq = db.applications.filter((a) => a.academicYear === year).length + 1;
  const app: Application = {
    _id: newId(),
    reference: `APP-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`,
    academicYear: year,
    classLevel: p.classLevel,
    applicant: { name: p.applicant.name.trim(), dateOfBirth: p.applicant.dateOfBirth, gender: p.applicant.gender, ...(p.applicant.previousSchool?.trim() ? { previousSchool: p.applicant.previousSchool.trim() } : {}) },
    guardian: { name: p.guardian.name.trim(), relation: p.guardian.relation.trim(), phone: p.guardian.phone.trim(), email: p.guardian.email.trim().toLowerCase() },
    status: 'new',
    source,
    history: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  log(app, by, source === 'online' ? 'Applied online' : 'Application entered by the office');
  db.applications.push(app);
  email(db, app, `Keep your reference ${app.reference} to follow the application.`);
  return app;
}

/* --------------------------------- public ---------------------------------- */

export interface PublicAdmissionInfo {
  open: boolean;
  levels: Ref[];
}

/** What the public form needs (no sign-in). */
export const getPublicAdmissionInfo = (): Promise<PublicAdmissionInfo> =>
read((db) => ({ open: db.admissionSettings.open, levels: levelsOf(db, currentYear(db)) }));

export function applyOnline(payload: ApplicationPayload): Promise<Pick<Application, 'reference' | 'applicant' | 'classLevel'>> {
  return write((db) => {
    if (!db.admissionSettings.open) fail(409, 'Applications are closed at the moment');
    const app = create(db, payload, 'online', payload.guardian?.name?.trim() || 'Family');
    return { reference: app.reference, applicant: app.applicant, classLevel: app.classLevel };
  });
}

/** Families follow their application with the reference + their email. */
export function checkApplicationStatus(reference: string, guardianEmail: string): Promise<{reference: string;status: ApplicationStatus;applicant: string;classLevel: string;test?: EntranceTest;updatedAt: string;}> {
  return read((db) => {
    const app = db.applications.find((a) => a.reference.toLowerCase() === reference.trim().toLowerCase() && a.guardian.email === guardianEmail.trim().toLowerCase());
    // same answer for "wrong reference" and "wrong email": nothing leaks
    if (!app) fail(404, 'No application matches this reference and email');
    return { reference: app.reference, status: app.status, applicant: app.applicant.name, classLevel: app.classLevel.name, ...(app.test ? { test: app.test } : {}), updatedAt: app.updatedAt };
  });
}

/* ---------------------------------- office --------------------------------- */

export async function listApplications(academicYear: string): Promise<Application[]> {
  requirePermission(READ);
  return read((db) => db.applications.filter((a) => a.academicYear === academicYear).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getApplication(id: string): Promise<Application & {seats: LevelSeats;waitlistRank?: number;}> {
  requirePermission(READ);
  return read((db) => {
    const app = find(db, id);
    const rank = app.status === 'waitlisted' ? waitlistOf(db, app.academicYear, app.classLevel._id).findIndex((a) => a._id === id) + 1 : undefined;
    return { ...app, seats: seats(db, app.academicYear, app.classLevel._id), ...(rank ? { waitlistRank: rank } : {}) };
  });
}

/** Waiting list order: best test score first, then who applied first. */
function waitlistOf(db: MockDb, year: string, levelId: string) {
  return db.applications.
  filter((a) => a.academicYear === year && a.classLevel._id === levelId && a.status === 'waitlisted').
  sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.createdAt.localeCompare(b.createdAt));
}

export async function listSeats(academicYear: string): Promise<LevelSeats[]> {
  requirePermission(READ);
  return read((db) => levelsOf(db, academicYear).map((l) => seats(db, academicYear, l._id)));
}

export async function addApplication(payload: ApplicationPayload): Promise<Application> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => create(db, payload, 'office', actor.ref.name));
}

export async function scheduleTest(id: string, test: EntranceTest): Promise<Application> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const app = find(db, id);
    if (!['new', 'test_scheduled'].includes(app.status)) fail(409, 'The test can only be scheduled before it is taken');
    if (!isDateKey(test.date) || test.date < todayKey()) fail(400, 'Choose today or a later date');
    if (Number.isNaN(toMinutes(test.time))) fail(400, 'Use a time like 10:00');
    if ((test.room?.length ?? 0) > 40) fail(400, 'Room: 40 characters max');
    const again = app.status === 'test_scheduled';
    app.test = { date: test.date, time: test.time, ...(test.room?.trim() ? { room: test.room.trim() } : {}) };
    app.status = 'test_scheduled';
    log(app, actor.ref.name, again ? 'Test rescheduled' : 'Entrance test scheduled', `${test.date} ${test.time}${test.room ? ` · ${test.room}` : ''}`);
    email(db, app, `Entrance test: ${test.date} at ${test.time}${test.room ? `, ${test.room}` : ''}.`);
    return app;
  });
}

export async function recordScore(id: string, score: number, notes?: string): Promise<Application> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const app = find(db, id);
    if (app.status !== 'test_scheduled' && app.status !== 'tested') fail(409, 'Schedule the test first');
    if (app.test && app.test.date > todayKey()) fail(400, `The test is on ${app.test.date}: record the score after it`);
    if (!Number.isInteger(score) || score < 0 || score > 100) fail(400, 'The score is a whole number from 0 to 100');
    app.score = score;
    app.testNotes = notes?.trim() ? notes.trim().slice(0, 500) : undefined;
    app.status = 'tested';
    log(app, actor.ref.name, `Score recorded: ${score}/100`, notes);
    return app;
  });
}

export async function decide(id: string, decision: 'accepted' | 'waitlisted' | 'rejected', note?: string): Promise<Application> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const app = find(db, id);
    const allowed: Record<typeof decision, ApplicationStatus[]> = {
      accepted: ['tested', 'waitlisted'],
      waitlisted: ['tested'],
      rejected: ['new', 'test_scheduled', 'tested', 'waitlisted']
    };
    if (!allowed[decision].includes(app.status)) fail(409, `An application that is ${STATUS_TEXT[app.status]} can not be ${decision === 'accepted' ? 'accepted' : decision === 'waitlisted' ? 'waitlisted' : 'rejected'}`);
    if (decision === 'accepted') {
      const s = seats(db, app.academicYear, app.classLevel._id, app._id);
      if (s.free < 1) fail(409, `No free seats in ${app.classLevel.name}. Put the applicant on the waiting list or add a section.`);
      const first = waitlistOf(db, app.academicYear, app.classLevel._id)[0];
      if (app.status === 'waitlisted' && first && first._id !== app._id && !note?.trim()) {
        fail(409, `${first.applicant.name} is ahead on the waiting list. Add a note explaining why to accept this applicant first.`);
      }
    }
    if (decision === 'rejected' && !note?.trim()) fail(400, 'Add a short reason (kept on file)');
    app.status = decision;
    app.decisionNote = note?.trim() ? note.trim().slice(0, 300) : undefined;
    log(app, actor.ref.name, decision === 'accepted' ? 'Accepted' : decision === 'waitlisted' ? 'Put on the waiting list' : 'Not accepted', note);
    email(db, app, decision === 'accepted' ? 'Please visit the school office within 7 days to complete the enrolment.' : '');
    return app;
  });
}

export async function withdrawApplication(id: string, note: string): Promise<Application> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const app = find(db, id);
    if (['enrolled', 'withdrawn', 'rejected'].includes(app.status)) fail(409, 'This application is already closed');
    app.status = 'withdrawn';
    log(app, actor.ref.name, 'Withdrawn', note);
    return app;
  });
}

/**
 * Records the enrolment after the real student was created. When a section
 * is given, the student is seated in it (needs the academics permission).
 */
export async function markEnrolled(id: string, student: Ref & {studentId?: string;}, sectionId?: string): Promise<{application: Application;section?: string;}> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  if (sectionId) requirePermission(SEATING);
  return write((db) => {
    const app = find(db, id);
    if (app.status !== 'accepted') fail(409, 'Only accepted applicants can be enrolled');
    let sectionName: string | undefined;
    if (sectionId) {
      const section = db.sections.find((s) => s._id === sectionId);
      if (!section || section.classLevel._id !== app.classLevel._id || section.academicYear !== app.academicYear) fail(400, `Choose a ${app.classLevel.name} section`);
      if (section.students.length >= section.capacity) fail(409, `${sectionLabel(section)} is full`);
      section.students = [...section.students, { _id: student._id, name: student.name, studentId: student.studentId }].sort((a, b) => a.name.localeCompare(b.name));
      section.updatedAt = nowIso();
      sectionName = sectionLabel(section);
    }
    app.status = 'enrolled';
    app.student = { _id: student._id, name: student.name, ...(student.studentId ? { studentId: student.studentId } : {}) };
    log(app, actor.ref.name, 'Enrolled', [student.studentId && `Student code ${student.studentId}`, sectionName && `seated in ${sectionName}`].filter(Boolean).join(' · '));
    email(db, app, `Welcome to the school! Student code: ${student.studentId ?? '—'}${sectionName ? `, section ${sectionName}` : ''}.`);
    return { application: app, section: sectionName };
  });
}

export async function getAdmissionSettings(): Promise<AdmissionSettings> {
  requirePermission(READ);
  return read((db) => db.admissionSettings);
}

export async function updateAdmissionSettings(next: AdmissionSettings): Promise<AdmissionSettings> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!Number.isInteger(next.passMark) || next.passMark < 0 || next.passMark > 100) fail(400, 'Pass mark: 0–100');
    db.admissionSettings = { passMark: next.passMark, open: Boolean(next.open) };
    return db.admissionSettings;
  });
}

/* ------------------------------- sample data ------------------------------- */

const FIRST = ['Omar', 'Laila', 'Youssef', 'Mariam', 'Adam', 'Salma', 'Karim', 'Nour', 'Ali', 'Farida'];
const LAST = ['Hassan', 'Mostafa', 'Ibrahim', 'Saleh', 'Fathy', 'Kamal', 'Nabil', 'Samir'];

/** Ten applications spread over the pipeline, so every step can be tried. */
export async function generateAdmissionSample(): Promise<{created: number;}> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const year = currentYear(db);
    const levels = levelsOf(db, year);
    if (!levels.length) fail(400, 'Create sections first (Academics → Sections)');
    const plan: Array<ApplicationStatus> = ['new', 'new', 'test_scheduled', 'test_scheduled', 'tested', 'tested', 'waitlisted', 'waitlisted', 'rejected', 'accepted'];
    let created = 0;
    plan.forEach((status, i) => {
      const name = `${FIRST[i]} ${LAST[i % LAST.length]}`;
      if (db.applications.some((a) => a.applicant.name === name)) return;
      // waiting list / accepted samples share one level so the order can be tried
      const level = ['waitlisted', 'accepted'].includes(status) ? levels[0] : levels[i % levels.length];
      const app = create(db, {
        classLevel: level,
        applicant: { name, dateOfBirth: addDays(todayKey(), -Math.round((6 + i % 8) * 365.25)), gender: i % 2 ? 'Female' : 'Male', previousSchool: i % 3 ? 'Nile Kids Academy' : undefined },
        guardian: { name: `${['Ahmed', 'Mona', 'Tarek', 'Heba'][i % 4]} ${LAST[i % LAST.length]}`, relation: i % 2 ? 'Mother' : 'Father', phone: `+20 10 ${String(2000 + i * 37)} ${String(4000 + i * 91)}`, email: `family${i + 1}@example.com` }
      }, i % 2 ? 'online' : 'office', actor.ref.name);
      if (status !== 'new') {
        app.test = { date: status === 'test_scheduled' ? addDays(todayKey(), 3 + i) : addDays(todayKey(), -7 - i), time: '10:00', room: 'Main Hall' };
        app.status = 'test_scheduled';
        log(app, actor.ref.name, 'Entrance test scheduled', `${app.test.date} 10:00 · Main Hall`);
      }
      if (['tested', 'waitlisted', 'rejected', 'accepted'].includes(status)) {
        app.score = [72, 48, 81, 66, 35, 90][i % 6];
        app.status = 'tested';
        log(app, actor.ref.name, `Score recorded: ${app.score}/100`);
      }
      if (status === 'waitlisted' || status === 'accepted' || status === 'rejected') {
        app.status = status;
        if (status === 'rejected') app.decisionNote = 'Below the pass mark';
        log(app, actor.ref.name, status === 'accepted' ? 'Accepted' : status === 'waitlisted' ? 'Put on the waiting list' : 'Not accepted', app.decisionNote);
      }
      created += 1;
    });
    return { created };
  });
}
