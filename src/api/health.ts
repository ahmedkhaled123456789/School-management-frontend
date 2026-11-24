/**
 * Health records & clinic — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET /health, GET/PUT /health/:studentId, GET /health/alerts?section=
 *   GET/POST /clinic/visits, DELETE /clinic/visits/:id
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type {
  Allergy,
  BloodType,
  ClinicVisit,
  ClinicVisitPayload,
  HealthProfile,
  HealthProfilePayload,
  Severity,
  Vaccination } from
'../types/health';
import type { StudentRef } from '../types/sections';
import { addDays, isDateKey, nowTime, todayKey } from '../utils/attendance';
import { toMinutes } from '../utils/timetable';

const READ = 'students.read';
const MANAGE = 'students.manage';

export const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];
const ACTIONS = ['returned', 'rested', 'sent_home', 'referred'];

/** Admins with the permission; parents / students only for their own record. */
function assertReader(studentId: string) {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);
  if (!studentId) fail(400, 'Choose a student');
}

const emptyProfile = (student: StudentRef): HealthProfile => ({ _id: '', student, allergies: [], conditions: [], vaccinations: [] });

export async function listHealthProfiles(): Promise<HealthProfile[]> {
  requirePermission(READ);
  return read((db) => [...db.healthProfiles].sort((a, b) => a.student.name.localeCompare(b.student.name)));
}

/** A student's profile (an empty one when nothing was recorded yet). */
export async function getHealthProfile(student: StudentRef): Promise<HealthProfile> {
  assertReader(student._id);
  return read((db) => db.healthProfiles.find((p) => p.student._id === student._id) ?? emptyProfile(student));
}

export interface HealthAlert {
  allergies: Allergy[];
  conditions: string[];
}

/**
 * What a teacher needs to know about a section: allergies and conditions only
 * (no vaccinations, contacts or notes).
 */
export async function getSectionHealthAlerts(studentIds: string[]): Promise<Record<string, HealthAlert>> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if (role !== 'teacher') fail(403, 'You do not have permission to perform this action');
  return read((db) => {
    const out: Record<string, HealthAlert> = {};
    db.healthProfiles.forEach((p) => {
      if (!studentIds.includes(p.student._id)) return;
      if (!p.allergies.length && !p.conditions.length) return;
      out[p.student._id] = { allergies: p.allergies, conditions: p.conditions.map((c) => c.name) };
    });
    return out;
  });
}

const PHONE = /^\+?[\d\s-]{7,20}$/;

function validateProfile(payload: HealthProfilePayload) {
  if (payload.bloodType && !BLOOD_TYPES.includes(payload.bloodType)) fail(400, 'Invalid blood type');
  const check = (items: Array<{name: string;}>, what: string) => {
    const names = new Set<string>();
    items.forEach((item) => {
      const name = item.name?.trim().toLowerCase();
      if (!name) fail(400, `Every ${what} needs a name`);
      if (name.length > 60) fail(400, `${what} names are limited to 60 characters`);
      if (names.has(name)) fail(400, `"${item.name.trim()}" is listed twice`);
      names.add(name);
    });
  };
  check(payload.allergies, 'allergy');
  check(payload.conditions, 'condition');
  check(payload.vaccinations, 'vaccination');
  payload.allergies.forEach((a) => {
    if (!SEVERITIES.includes(a.severity)) fail(400, `Choose the severity of ${a.name}`);
    if ((a.reaction?.length ?? 0) > 160) fail(400, `${a.name}: keep the reaction under 160 characters`);
  });
  payload.vaccinations.forEach((v) => {
    if (v.date && (!isDateKey(v.date) || v.date > todayKey())) fail(400, `${v.name}: the date given must be a valid past date`);
    if (v.dueDate && !isDateKey(v.dueDate)) fail(400, `${v.name}: invalid due date`);
    if (!v.date && !v.dueDate) fail(400, `${v.name}: enter the date given or the due date`);
  });
  const contact = payload.emergencyContact;
  if (contact && (contact.name || contact.phone || contact.relation)) {
    if (!contact.name.trim() || !contact.relation.trim()) fail(400, 'The emergency contact needs a name and a relation');
    if (!PHONE.test(contact.phone.trim())) fail(400, 'Enter a valid emergency phone number');
  }
  if ((payload.medications?.length ?? 0) > 300) fail(400, 'Medications: 300 characters max');
  if ((payload.notes?.length ?? 0) > 500) fail(400, 'Notes: 500 characters max');
}

/** Saves the profile. Admin office staff, or a parent for their own child. */
export async function saveHealthProfile(student: StudentRef, payload: HealthProfilePayload): Promise<HealthProfile> {
  const actor = sessionActor();
  if (actor.role === 'admin') requirePermission(MANAGE);else
  if (actor.role !== 'parent') fail(403, 'You do not have permission to perform this action');
  return write((db) => {
    validateProfile(payload);
    const contact = payload.emergencyContact;
    const clean: HealthProfilePayload = {
      ...(payload.bloodType ? { bloodType: payload.bloodType } : {}),
      allergies: payload.allergies.map((a) => ({ _id: a._id || newId(), name: a.name.trim(), severity: a.severity, ...(a.reaction?.trim() ? { reaction: a.reaction.trim() } : {}) })),
      conditions: payload.conditions.map((c) => ({ _id: c._id || newId(), name: c.name.trim(), ...(c.notes?.trim() ? { notes: c.notes.trim() } : {}) })),
      vaccinations: payload.vaccinations.map((v) => ({ _id: v._id || newId(), name: v.name.trim(), ...(v.date ? { date: v.date } : {}), ...(v.dueDate ? { dueDate: v.dueDate } : {}) })),
      ...(payload.medications?.trim() ? { medications: payload.medications.trim() } : {}),
      ...(contact?.name?.trim() ? { emergencyContact: { name: contact.name.trim(), relation: contact.relation.trim(), phone: contact.phone.trim() } } : {}),
      ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {})
    };
    const existing = db.healthProfiles.find((p) => p.student._id === student._id);
    const profile: HealthProfile = {
      _id: existing?._id ?? newId(),
      student,
      ...clean,
      updatedBy: { ...actor.ref, name: actor.role === 'parent' ? `${actor.ref.name} (parent)` : actor.ref.name },
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };
    db.healthProfiles = [...db.healthProfiles.filter((p) => p.student._id !== student._id), profile];
    return profile;
  });
}

/* ---------------------------------- clinic --------------------------------- */

export async function listClinicVisits(q: {date?: string;from?: string;studentId?: string;}): Promise<ClinicVisit[]> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if (!q.studentId) fail(403, 'You can only see your own visits');
  return read((db) => db.clinicVisits.
  filter((v) => (!q.date || v.date === q.date) && (!q.from || v.date >= q.from) && (!q.studentId || v.student._id === q.studentId)).
  sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)));
}

/**
 * Logs a clinic visit. "Sent home" excuses the student for the rest of the
 * day: registers already taken for later periods are corrected too.
 */
export async function addClinicVisit(payload: ClinicVisitPayload): Promise<{visit: ClinicVisit;registersUpdated: number;}> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    if (!payload.student?._id) fail(400, 'Choose a student');
    if (!isDateKey(payload.date) || payload.date > todayKey()) fail(400, 'Choose today or a past date');
    if (Number.isNaN(toMinutes(payload.time))) fail(400, 'Use a time like 10:15');
    if (payload.date === todayKey() && toMinutes(payload.time) > toMinutes(nowTime())) fail(400, 'The visit time is in the future');
    if (!payload.complaint?.trim()) fail(400, 'Describe the complaint');
    if (payload.complaint.length > 120) fail(400, 'Complaint: 120 characters max');
    if (payload.temperature !== undefined && (payload.temperature < 34 || payload.temperature > 43)) fail(400, 'Temperature must be between 34 and 43 °C');
    if (!ACTIONS.includes(payload.action)) fail(400, 'Choose what happened');
    if ((payload.notes?.length ?? 0) > 300) fail(400, 'Notes: 300 characters max');
    const visit: ClinicVisit = {
      _id: newId(),
      date: payload.date,
      time: payload.time,
      student: payload.student,
      complaint: payload.complaint.trim(),
      ...(payload.temperature !== undefined ? { temperature: Math.round(payload.temperature * 10) / 10 } : {}),
      action: payload.action,
      ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
      seenBy: actor.ref,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    db.clinicVisits.push(visit);
    let registersUpdated = 0;
    if (visit.action === 'sent_home') {
      const starts = new Map(db.schoolDay.periods.map((p) => [p._id, toMinutes(p.start)]));
      db.registers.forEach((r) => {
        if (r.date !== visit.date || !r.roster.includes(visit.student._id)) return;
        if ((starts.get(r.periodId) ?? 0) < toMinutes(visit.time)) return;
        const ex = r.exceptions.find((e) => e.studentId === visit.student._id);
        if (ex && (ex.status === 'absent' || ex.status === 'excused')) return;
        r.exceptions = [
        ...r.exceptions.filter((e) => e.studentId !== visit.student._id),
        { studentId: visit.student._id, name: visit.student.name, code: visit.student.studentId, status: 'excused', reason: 'Sent home by the clinic' }];

        r.updatedAt = nowIso();
        registersUpdated += 1;
      });
    }
    return { visit, registersUpdated };
  });
}

export async function deleteClinicVisit(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!db.clinicVisits.some((v) => v._id === id)) fail(404, 'Visit not found');
    db.clinicVisits = db.clinicVisits.filter((v) => v._id !== id);
  });
}

/* ------------------------------- sample data ------------------------------- */

const ALLERGIES: Array<Pick<Allergy, 'name' | 'severity' | 'reaction'>> = [
{ name: 'Peanuts', severity: 'severe', reaction: 'Anaphylaxis: give the EpiPen in the bag, then call 123.' },
{ name: 'Penicillin', severity: 'moderate', reaction: 'Rash and swelling.' },
{ name: 'Pollen', severity: 'mild', reaction: 'Sneezing in spring.' },
{ name: 'Lactose', severity: 'mild', reaction: 'Stomach ache: avoid milk at the canteen.' },
{ name: 'Bee stings', severity: 'severe', reaction: 'Swelling and breathing trouble.' },
{ name: 'Eggs', severity: 'moderate', reaction: 'Hives.' }];

const CONDITIONS = [
{ name: 'Asthma', notes: 'Inhaler in the school bag; may need it in PE.' },
{ name: 'Type 1 diabetes', notes: 'Checks glucose before lunch.' },
{ name: 'Epilepsy', notes: 'Seizure plan on file with the nurse.' },
{ name: 'ADHD' }];

const VACCINES = ['MMR', 'Polio booster', 'DTaP booster', 'Hepatitis B', 'Meningitis'];
const RELATIONS = ['Mother', 'Father', 'Uncle', 'Grandmother'];

/** Health profiles for the given students (used by the attendance sample). */
export function seedHealth(db: MockDb, students: StudentRef[], rand: () => number, dates: string[]) {
  let profiles = 0;
  const today = todayKey();
  students.forEach((student, i) => {
    if (db.healthProfiles.some((p) => p.student._id === student._id)) return;
    const allergies = rand() < 0.3 ? [ALLERGIES[i % ALLERGIES.length]] : [];
    if (allergies.length && rand() < 0.25) allergies.push(ALLERGIES[(i + 2) % ALLERGIES.length]);
    const vaccinations: Vaccination[] = VACCINES.slice(0, 3 + i % 3).map((name, v) => {
      const due = rand();
      // most done; some due soon; a few overdue
      if (due < 0.08) return { _id: newId(), name, dueDate: addDays(today, -(10 + v * 5)) };
      if (due < 0.2) return { _id: newId(), name, dueDate: addDays(today, 12 + v * 9) };
      return { _id: newId(), name, date: addDays(today, -(200 + Math.floor(rand() * 900))) };
    });
    db.healthProfiles.push({
      _id: newId(),
      student,
      bloodType: (['A+', 'O+', 'B+', 'AB+', 'O-', 'A-'] as BloodType[])[i % 6],
      allergies: allergies.map((a) => ({ _id: newId(), ...a })),
      conditions: rand() < 0.15 ? [{ _id: newId(), ...CONDITIONS[i % CONDITIONS.length] }] : [],
      vaccinations,
      emergencyContact: { name: `${RELATIONS[i % 4]} of ${student.name}`, relation: RELATIONS[i % 4], phone: `+20 10 ${String(10000000 + i * 7919).slice(0, 4)} ${String(1000 + i * 37).slice(-4)}` },
      updatedBy: { _id: '', name: 'School nurse' },
      createdAt: nowIso(),
      updatedAt: nowIso()
    });
    profiles += 1;
  });
  // visits where the student went back to class (sent-home ones come from the attendance sample)
  let visits = 0;
  dates.forEach((date) => {
    if (rand() > 0.6 || !students.length) return;
    const student = students[Math.floor(rand() * students.length)];
    db.clinicVisits.push({
      _id: newId(), date, time: `${9 + Math.floor(rand() * 4)}:${String(Math.floor(rand() * 6) * 10).padStart(2, '0')}`.padStart(5, '0'), student,
      complaint: ['Scraped knee in PE', 'Headache', 'Nosebleed', 'Feeling dizzy'][Math.floor(rand() * 4)],
      action: rand() < 0.7 ? 'returned' : 'rested', seenBy: { _id: '', name: 'School nurse' }, createdAt: nowIso(), updatedAt: nowIso()
    });
    visits += 1;
  });
  return { profiles, visits: visits + db.clinicVisits.filter((v) => v.action === 'sent_home' && dates.includes(v.date)).length };
}
