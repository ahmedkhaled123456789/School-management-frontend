/**
 * School events — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST/PUT/DELETE /events, POST /events/:id/publish | /cancel
 *   GET /events/family, POST /events/:id/responses
 *   POST/DELETE /events/:id/payments, PUT /events/:id/results
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type { Audience } from '../types/communication';
import type { ConsentResponse, EventPayload, EventResult, EventType, FamilyEvent, SchoolEvent } from '../types/events';
import type { StudentRef } from '../types/sections';
import { isDateKey, todayKey } from '../utils/attendance';
import { toMinutes } from '../utils/timetable';
import { audienceLabel, notify, queueOutbox, type Viewer } from './communication';

const READ = 'students.read';
const MANAGE = 'students.manage';
const TYPES: EventType[] = ['trip', 'competition', 'celebration', 'sports', 'meeting', 'other'];

/* -------------------------------- helpers --------------------------------- */

/** Students the event is for (this year's sections in its audience). */
export function eligibleStudents(db: MockDb, event: Pick<SchoolEvent, 'academicYear' | 'audience'>): Array<StudentRef & {section: string;}> {
  const ids = new Set((event.audience.targets ?? []).map((t) => t._id));
  return db.sections.
  filter((s) => s.academicYear === event.academicYear && (
  event.audience.kind === 'everyone' || event.audience.kind === 'students' || event.audience.kind === 'parents' ||
  event.audience.kind === 'levels' && ids.has(s.classLevel._id) ||
  event.audience.kind === 'sections' && ids.has(s._id))).
  flatMap((s) => s.students.map((st) => ({ ...st, section: `${s.classLevel.name} / ${s.name}` }))).
  sort((a, b) => a.name.localeCompare(b.name));
}

const familyKeys = (a: Audience) =>
a.kind === 'levels' || a.kind === 'sections' ?
(a.targets ?? []).flatMap((t) => [`${a.kind === 'levels' ? 'level' : 'section'}:${t._id}`, `${a.kind === 'levels' ? 'level' : 'section'}-parents:${t._id}`]) :
['parents', 'students'];

const confirmed = (e: SchoolEvent) => e.responses.filter((r) => r.decision === 'approved' && !r.waitlisted);
const deadlineOf = (e: SchoolEvent) => e.consentDeadline ?? e.date;
const findEvent = (db: MockDb, id: string) => {
  const event = db.events.find((e) => e._id === id);
  if (!event) fail(404, 'Event not found');
  return event;
};

const HREF = (id: string) => ({ admin: `/admin/events/${id}`, parent: `/parent/events?event=${id}`, student: '/student/announcements?tab=events' });

function validate(p: EventPayload, isNew: boolean) {
  if (!p.title?.trim() || p.title.trim().length < 3) fail(400, 'The title needs at least 3 characters');
  if (p.title.length > 100) fail(400, 'Title: 100 characters max');
  if (!TYPES.includes(p.type)) fail(400, 'Choose the event type');
  if (!isDateKey(p.date)) fail(400, 'Choose the date');
  if (isNew && p.date < todayKey()) fail(400, 'The event date can not be in the past');
  if (p.endDate && (!isDateKey(p.endDate) || p.endDate < p.date)) fail(400, 'The end date must be on or after the start date');
  if (Number.isNaN(toMinutes(p.startTime)) || Number.isNaN(toMinutes(p.endTime))) fail(400, 'Use times like 09:00');
  if (!p.endDate && toMinutes(p.endTime) <= toMinutes(p.startTime)) fail(400, 'The end time must be after the start time');
  if (!p.location?.trim()) fail(400, 'Where does it take place?');
  if (p.location.length > 120) fail(400, 'Location: 120 characters max');
  if ((p.description?.length ?? 0) > 2000) fail(400, 'Description: 2,000 characters max');
  if (!['everyone', 'levels', 'sections'].includes(p.audience?.kind)) fail(400, 'Choose who the event is for');
  if (p.audience.kind !== 'everyone' && !p.audience.targets?.length) fail(400, 'Choose at least one class level or section');
  if (!Number.isInteger(p.fee) || p.fee < 0 || p.fee > 100_000_000) fail(400, 'Enter a valid fee (0 for free)');
  if (!Number.isInteger(p.capacity) || p.capacity < 0 || p.capacity > 5000) fail(400, 'Places: a whole number (0 = unlimited)');
  if (p.consentDeadline && (!isDateKey(p.consentDeadline) || p.consentDeadline > p.date)) fail(400, 'The consent deadline must be on or before the event date');
  if (p.fee > 0 && !p.requiresConsent) fail(400, 'Paid events need parent approval');
}

/** Keeps the waitlist moving: fills free places in order of response. */
function promoteWaitlist(db: MockDb, event: SchoolEvent) {
  if (!event.capacity) {
    event.responses.forEach((r) => {r.waitlisted = false;});
    return;
  }
  let free = event.capacity - confirmed(event).length;
  event.responses.
  filter((r) => r.decision === 'approved' && r.waitlisted).
  sort((a, b) => a.at.localeCompare(b.at)).
  forEach((r) => {
    if (free <= 0) return;
    r.waitlisted = false;
    free -= 1;
    notify(db, { to: [`parent-of:${r.student._id}`], kind: 'event', title: `A place opened: ${event.title}`, body: `${r.student.name} moved from the waiting list to confirmed.`, href: HREF(event._id) });
  });
}

/* ---------------------------------- admin ---------------------------------- */

export interface EventSummary extends SchoolEvent {
  audienceLabel: string;
  eligible: number;
  approved: number;
  waitlisted: number;
  declined: number;
  paid: number;
}

const summarize = (db: MockDb, e: SchoolEvent): EventSummary => ({
  ...e,
  audienceLabel: audienceLabel(e.audience),
  eligible: eligibleStudents(db, e).length,
  approved: confirmed(e).length,
  waitlisted: e.responses.filter((r) => r.decision === 'approved' && r.waitlisted).length,
  declined: e.responses.filter((r) => r.decision === 'declined').length,
  paid: e.payments.length
});

export async function listEvents(academicYear: string): Promise<EventSummary[]> {
  requirePermission(READ);
  return read((db) => db.events.filter((e) => e.academicYear === academicYear).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map((e) => summarize(db, e)));
}

export async function getEvent(id: string): Promise<EventSummary & {students: Array<StudentRef & {section: string;}>;}> {
  requirePermission(READ);
  return read((db) => {
    const e = findEvent(db, id);
    return { ...summarize(db, e), students: eligibleStudents(db, e) };
  });
}

export async function saveEvent(academicYear: string, payload: EventPayload, id?: string): Promise<SchoolEvent> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    if (!academicYear) fail(400, 'Set the current academic year in School Settings first');
    validate(payload, !id);
    const clean: EventPayload = {
      title: payload.title.trim(),
      type: payload.type,
      description: payload.description?.trim() ?? '',
      date: payload.date,
      ...(payload.endDate && payload.endDate !== payload.date ? { endDate: payload.endDate } : {}),
      startTime: payload.startTime,
      endTime: payload.endTime,
      location: payload.location.trim(),
      audience: { kind: payload.audience.kind, ...(payload.audience.kind === 'everyone' ? {} : { targets: payload.audience.targets, parents: true }) },
      requiresConsent: payload.requiresConsent,
      ...(payload.requiresConsent && payload.consentDeadline ? { consentDeadline: payload.consentDeadline } : {}),
      fee: payload.fee,
      capacity: payload.capacity
    };
    if (id) {
      const event = findEvent(db, id);
      if (event.status === 'cancelled') fail(409, 'A cancelled event can not be edited');
      if (event.status === 'published' && clean.capacity && clean.capacity < confirmed(event).length) {
        fail(409, `${confirmed(event).length} students are already confirmed: places can not go below that`);
      }
      if (event.payments.length && clean.fee !== event.fee) fail(409, 'Fees were already collected: the fee can not change');
      delete event.endDate;
      delete event.consentDeadline;
      Object.assign(event, clean, { updatedAt: nowIso() });
      promoteWaitlist(db, event);
      return event;
    }
    const event: SchoolEvent = {
      _id: newId(), academicYear, ...clean, status: 'draft', responses: [], payments: [], results: [],
      createdBy: { ...actor.ref, role: 'admin' }, createdAt: nowIso(), updatedAt: nowIso()
    };
    db.events.push(event);
    return event;
  });
}

export async function publishEvent(id: string): Promise<SchoolEvent> {
  requirePermission(MANAGE);
  return write((db) => {
    const event = findEvent(db, id);
    if (event.status !== 'draft') fail(409, 'Only drafts can be published');
    if (event.date < todayKey()) fail(400, 'This event date has passed');
    if (!eligibleStudents(db, event).length) fail(400, 'No student is in the chosen audience');
    event.status = 'published';
    event.updatedAt = nowIso();
    const ask = event.requiresConsent ? ` Please reply by ${deadlineOf(event)}.` : '';
    notify(db, { to: familyKeys(event.audience), kind: 'event', title: `${event.requiresConsent ? 'Approval needed: ' : ''}${event.title}`, body: `${event.date} · ${event.location}.${ask}`, href: HREF(event._id) });
    queueOutbox(db, { channel: 'email', to: `${audienceLabel(event.audience)} — families`, subject: event.title, body: `${event.description || event.title}\n${event.date} ${event.startTime}–${event.endTime}, ${event.location}.${ask}`, kind: 'event' });
    return event;
  });
}

export async function cancelEvent(id: string, reason: string): Promise<SchoolEvent> {
  requirePermission(MANAGE);
  return write((db) => {
    const event = findEvent(db, id);
    if (event.status !== 'published') fail(409, 'Only published events can be cancelled');
    if (!reason?.trim()) fail(400, 'Tell families why it is cancelled');
    event.status = 'cancelled';
    event.cancelReason = reason.trim().slice(0, 200);
    event.updatedAt = nowIso();
    notify(db, { to: familyKeys(event.audience), kind: 'event', title: `Cancelled: ${event.title}`, body: event.cancelReason + (event.payments.length ? ' Fees paid will be refunded by the school office.' : ''), href: HREF(event._id) });
    queueOutbox(db, { channel: 'email', to: `${audienceLabel(event.audience)} — families`, subject: `Cancelled: ${event.title}`, body: event.cancelReason, kind: 'event' });
    return event;
  });
}

export async function deleteEvent(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    const event = findEvent(db, id);
    if (event.status === 'published') fail(409, 'Cancel a published event instead of deleting it');
    db.events = db.events.filter((e) => e._id !== id);
  });
}

export async function recordEventPayment(id: string, studentId: string, method: 'cash' | 'card' | 'transfer'): Promise<SchoolEvent> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const event = findEvent(db, id);
    if (!event.fee) fail(400, 'This event is free');
    if (event.status === 'cancelled') fail(409, 'The event is cancelled');
    if (!confirmed(event).some((r) => r.student._id === studentId)) fail(400, 'Only confirmed participants pay');
    if (event.payments.some((p) => p.studentId === studentId)) fail(409, 'Already paid');
    event.payments.push({ studentId, amount: event.fee, method, by: actor.ref, at: nowIso() });
    return event;
  });
}

export async function undoEventPayment(id: string, studentId: string): Promise<SchoolEvent> {
  requirePermission(MANAGE);
  return write((db) => {
    const event = findEvent(db, id);
    if (!event.payments.some((p) => p.studentId === studentId)) fail(404, 'No payment recorded');
    event.payments = event.payments.filter((p) => p.studentId !== studentId);
    return event;
  });
}

export async function saveEventResults(id: string, results: EventResult[]): Promise<SchoolEvent> {
  requirePermission(MANAGE);
  return write((db) => {
    const event = findEvent(db, id);
    if (event.type !== 'competition' && event.type !== 'sports') fail(400, 'Results are for competitions and sports events');
    if (event.date > todayKey()) fail(400, 'Results can be entered once the event has taken place');
    const eligible = new Set(eligibleStudents(db, event).map((s) => s._id));
    const seen = new Set<string>();
    results.forEach((r) => {
      if (!Number.isInteger(r.place) || r.place < 1 || r.place > 50) fail(400, 'Places are 1, 2, 3…');
      if (!eligible.has(r.student._id)) fail(400, `${r.student.name} is not in this event's audience`);
      if (seen.has(r.student._id)) fail(400, `${r.student.name} is listed twice`);
      seen.add(r.student._id);
    });
    event.results = [...results].sort((a, b) => a.place - b.place).map((r) => ({ place: r.place, student: r.student, ...(r.note?.trim() ? { note: r.note.trim().slice(0, 80) } : {}) }));
    event.updatedAt = nowIso();
    const winners = event.results.filter((r) => r.place <= 3);
    winners.forEach((w) => notify(db, { to: [`parent-of:${w.student._id}`, `student:${w.student._id}`], kind: 'event', title: `Congratulations! ${w.student.name} placed #${w.place}`, body: event.title, href: HREF(event._id) }));
    return event;
  });
}

/* --------------------------------- families -------------------------------- */

/** Published / cancelled events for the viewer's children (parent) or self (student). */
export async function listFamilyEvents(viewer: Viewer): Promise<FamilyEvent[]> {
  const { role } = sessionActor();
  if (role !== 'parent' && role !== 'student') fail(403, 'You do not have permission to perform this action');
  return read((db) => {
    const ids = viewer.studentIds ?? [];
    return db.events.
    filter((e) => e.status !== 'draft').
    flatMap((e) => {
      const eligible = eligibleStudents(db, e).filter((s) => ids.includes(s._id));
      if (!eligible.length) return [];
      // families only see their own children's replies
      const own = (r: ConsentResponse) => ids.includes(r.student._id);
      const event: SchoolEvent = { ...e, responses: e.responses.filter(own), payments: e.payments.filter((p) => ids.includes(p.studentId)) };
      return [{
        event,
        students: eligible.map(({ section: _s, ...student }) => ({
          student,
          response: e.responses.find((r) => r.student._id === student._id),
          paid: e.payments.some((p) => p.studentId === student._id)
        }))
      }];
    }).
    sort((a, b) => a.event.date.localeCompare(b.event.date));
  });
}

/** A parent approves or declines for one child. */
export async function respondToEvent(id: string, studentId: string, decision: 'approved' | 'declined', note: string | undefined, viewer: Viewer): Promise<ConsentResponse> {
  const actor = sessionActor();
  if (actor.role !== 'parent') fail(403, 'Only parents can give consent');
  return write((db) => {
    const event = findEvent(db, id);
    if (!viewer.studentIds?.includes(studentId)) fail(403, 'You can only answer for your own children');
    if (event.status !== 'published') fail(409, event.status === 'cancelled' ? 'This event was cancelled' : 'This event is not open yet');
    if (!event.requiresConsent) fail(400, 'This event does not need approval');
    if (todayKey() > deadlineOf(event)) fail(409, `Replies closed on ${deadlineOf(event)}`);
    const student = eligibleStudents(db, event).find((s) => s._id === studentId);
    if (!student) fail(400, 'Your child is not invited to this event');
    const previous = event.responses.find((r) => r.student._id === studentId);
    if (previous && event.payments.some((p) => p.studentId === studentId) && decision === 'declined') {
      fail(409, 'The fee is already paid: ask the school office to withdraw your child');
    }
    const full = event.capacity > 0 && confirmed(event).filter((r) => r.student._id !== studentId).length >= event.capacity;
    const response: ConsentResponse = {
      student: { _id: student._id, name: student.name, studentId: student.studentId },
      decision,
      waitlisted: decision === 'approved' && full && !(previous?.decision === 'approved' && !previous.waitlisted),
      by: actor.ref,
      ...(note?.trim() ? { note: note.trim().slice(0, 200) } : {}),
      at: previous?.decision === decision ? previous.at : nowIso()
    };
    event.responses = [...event.responses.filter((r) => r.student._id !== studentId), response];
    if (decision === 'declined') promoteWaitlist(db, event);
    event.updatedAt = nowIso();
    return response;
  });
}
