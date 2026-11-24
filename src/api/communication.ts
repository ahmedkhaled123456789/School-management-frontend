/**
 * Communication — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST/PUT/DELETE /announcements, POST /announcements/:id/read
 *   GET/POST /threads, POST /threads/:id/messages, PATCH /threads/:id
 *   GET /notifications, POST /notifications/read
 *   GET /outbox, GET/PUT /communication/settings
 *
 * The real backend derives "who am I" from the token. The mock can not look
 * up a teacher's id or a parent's children, so pages pass a Viewer context.
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type {
  Announcement,
  AnnouncementPayload,
  AppNotification,
  Audience,
  Channel,
  CommSettings,
  NotificationKind,
  OutboxItem,
  Thread } from
'../types/communication';
import type { Role } from '../types/common';
import type { Ref, Section, StudentRef } from '../types/sections';
import { isDateKey, todayKey } from '../utils/attendance';
import { sectionLabel } from '../utils/timetable';

const READ = 'students.read';
const MANAGE = 'students.manage';
const SETTINGS = 'settings.manage';

/** Who is looking: a teacher's id, or the student(s) a student / parent account covers. */
export interface Viewer {
  teacherId?: string;
  studentIds?: string[];
}

/* ------------------------------ audience keys ------------------------------ */

/** The newest section a student sits in (any year). */
function sectionOf(db: MockDb, studentId: string): Section | undefined {
  return db.sections.
  filter((s) => s.students.some((st) => st._id === studentId)).
  sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
}

/** Every audience key the current user belongs to. */
export function viewerKeys(db: MockDb, role: string, viewer: Viewer = {}): string[] {
  const keys = ['all'];
  if (role === 'admin') keys.push('staff', 'admin');
  if (role === 'teacher') {
    keys.push('staff', 'teachers');
    if (viewer.teacherId) keys.push(`teacher:${viewer.teacherId}`);
  }
  (viewer.studentIds ?? []).forEach((id) => {
    const section = sectionOf(db, id);
    if (role === 'student') {
      keys.push('students', `student:${id}`);
      if (section) keys.push(`section:${section._id}`, `level:${section.classLevel._id}`);
    }
    if (role === 'parent') {
      keys.push('parents', `parent-of:${id}`);
      if (section) keys.push(`section-parents:${section._id}`, `level-parents:${section.classLevel._id}`);
    }
  });
  return [...new Set(keys)];
}

export function audienceKeys(audience: Audience): string[] {
  switch (audience.kind) {
    case 'everyone':return ['all'];
    case 'staff':return ['staff'];
    case 'teachers':return ['teachers'];
    case 'parents':return ['parents'];
    case 'students':return ['students'];
    case 'levels':
    case 'sections':{
        const prefix = audience.kind === 'levels' ? 'level' : 'section';
        return (audience.targets ?? []).flatMap((t) => [`${prefix}:${t._id}`, ...(audience.parents ? [`${prefix}-parents:${t._id}`] : [])]);
      }
  }
}

export function audienceLabel(audience: Audience): string {
  const names = (audience.targets ?? []).map((t) => t.name);
  switch (audience.kind) {
    case 'everyone':return 'Everyone';
    case 'staff':return 'All staff';
    case 'teachers':return 'Teachers';
    case 'parents':return 'All parents';
    case 'students':return 'All students';
    default:{
        const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
        return `${list}${audience.parents ? ' (students & parents)' : ' (students)'}`;
      }
  }
}

const reachesFamilies = (a: Audience) => a.kind === 'everyone' || a.kind === 'parents' || a.kind === 'students' || (a.kind === 'levels' || a.kind === 'sections') && a.parents;

function validateAudience(a: Audience) {
  const kinds = ['everyone', 'staff', 'teachers', 'parents', 'students', 'levels', 'sections'];
  if (!a || !kinds.includes(a.kind)) fail(400, 'Choose who it is for');
  if ((a.kind === 'levels' || a.kind === 'sections') && !a.targets?.length) fail(400, `Choose at least one ${a.kind === 'levels' ? 'class level' : 'section'}`);
}

/* --------------------- notifications (used by other modules) -------------------- */

/** Adds a notification for the given audience keys (call inside write()). */
export function notify(db: MockDb, n: {to: string[];kind: NotificationKind;title: string;body: string;href: Partial<Record<Role, string>>;}, senderKey?: string) {
  // the sender never gets their own notification as unread
  db.notifications.push({ _id: newId(), ...n, readBy: senderKey ? [senderKey] : [], createdAt: nowIso() });
  // keep the store small: the newest 400 are plenty for a preview
  if (db.notifications.length > 400) db.notifications = db.notifications.slice(-400);
}

/**
 * Records what SMS / email would be sent. Real sending needs a provider on
 * the server; here every message lands in the outbox with its status.
 */
export function queueOutbox(db: MockDb, item: {channel: Channel;to: string;subject?: string;body: string;kind: NotificationKind;}) {
  const enabled =
  item.kind === 'absence' ? db.commSettings.smsAbsence :
  item.kind === 'clinic' ? db.commSettings.smsClinic :
  item.kind === 'announcement' ? db.commSettings.emailAnnouncements :
  item.kind === 'event' ? db.commSettings.emailEvents :
  true;
  const entry: OutboxItem = {
    _id: newId(),
    ...item,
    body: item.channel === 'sms' ? item.body.slice(0, 160) : item.body,
    status: enabled ? 'sent' : 'skipped',
    ...(enabled ? {} : { reason: 'Turned off in communication settings' }),
    createdAt: nowIso()
  };
  db.outbox.push(entry);
  if (db.outbox.length > 500) db.outbox = db.outbox.slice(-500);
}

/** "A student was absent": once per student per day, to the parents (+ SMS). */
export function notifyAbsence(db: MockDb, student: StudentRef, date: string, detail: string) {
  const key = `parent-of:${student._id}`;
  const already = db.notifications.some((n) => n.kind === 'absence' && n.to.includes(key) && n.body.includes(date));
  if (already) return;
  notify(db, {
    to: [key],
    kind: 'absence',
    title: `${student.name} was marked absent`,
    body: `${detail} · ${date}`,
    href: { parent: `/parent/attendance?child=${student._id}` }
  });
  queueOutbox(db, { channel: 'sms', to: `Parents of ${student.name}`, kind: 'absence', body: `${student.name} was marked absent today (${detail}). Please contact the school if this is unexpected.` });
}

/* ------------------------------- announcements ------------------------------ */

export interface AnnouncementView extends Omit<Announcement, 'readBy'> {
  isRead: boolean;
  /** admins only */
  readCount?: number;
  audienceLabel: string;
}

const HREF: Partial<Record<Role, string>> = {
  admin: '/admin/communication/announcements',
  teacher: '/teacher/messages?tab=announcements',
  student: '/student/announcements',
  parent: '/parent/messages?tab=announcements'
};

/** Admins: every announcement. Others: the live ones meant for them. Pinned first. */
export async function listAnnouncements(viewer: Viewer = {}): Promise<AnnouncementView[]> {
  const actor = sessionActor();
  if (actor.role === 'admin') requirePermission(READ);
  return read((db) => {
    const keys = viewerKeys(db, actor.role, viewer);
    const today = todayKey();
    return db.announcements.
    filter((a) => actor.role === 'admin' || (!a.expiresOn || a.expiresOn >= today) && audienceKeys(a.audience).some((k) => keys.includes(k))).
    sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)).
    map(({ readBy, ...a }) => ({
      ...a,
      isRead: readBy.includes(actor.userKey),
      ...(actor.role === 'admin' ? { readCount: readBy.length } : {}),
      audienceLabel: audienceLabel(a.audience)
    }));
  });
}

function validateAnnouncement(p: AnnouncementPayload) {
  if (!p.title?.trim() || p.title.trim().length < 3) fail(400, 'The title needs at least 3 characters');
  if (p.title.length > 120) fail(400, 'Title: 120 characters max');
  if (!p.body?.trim()) fail(400, 'Write the announcement');
  if (p.body.length > 4000) fail(400, 'The text is too long (4,000 characters max)');
  validateAudience(p.audience);
  if (p.expiresOn && (!isDateKey(p.expiresOn) || p.expiresOn < todayKey())) fail(400, 'The end date must be today or later');
}

export async function saveAnnouncement(payload: AnnouncementPayload, id?: string): Promise<Announcement> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    validateAnnouncement(payload);
    const clean = {
      title: payload.title.trim(),
      body: payload.body.trim(),
      audience: { kind: payload.audience.kind, ...(payload.audience.targets?.length ? { targets: payload.audience.targets } : {}), ...(payload.audience.parents ? { parents: true } : {}) },
      pinned: Boolean(payload.pinned),
      ...(payload.expiresOn ? { expiresOn: payload.expiresOn } : {})
    };
    if (id) {
      const existing = db.announcements.find((a) => a._id === id);
      if (!existing) fail(404, 'Announcement not found');
      Object.keys(existing).forEach((k) => {if (k === 'expiresOn') delete existing.expiresOn;});
      Object.assign(existing, clean, { updatedAt: nowIso() });
      return existing;
    }
    const announcement: Announcement = { _id: newId(), ...clean, author: { ...actor.ref, role: 'admin' }, readBy: [actor.userKey], createdAt: nowIso(), updatedAt: nowIso() };
    db.announcements.push(announcement);
    notify(db, { to: audienceKeys(clean.audience), kind: 'announcement', title: clean.title, body: clean.body.slice(0, 140), href: HREF }, actor.userKey);
    if (reachesFamilies(clean.audience)) {
      queueOutbox(db, { channel: 'email', to: audienceLabel(clean.audience), subject: clean.title, body: clean.body, kind: 'announcement' });
    }
    return announcement;
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!db.announcements.some((a) => a._id === id)) fail(404, 'Announcement not found');
    db.announcements = db.announcements.filter((a) => a._id !== id);
  });
}

export async function markAnnouncementRead(id: string): Promise<void> {
  const actor = sessionActor();
  return write((db) => {
    const a = db.announcements.find((x) => x._id === id);
    if (a && !a.readBy.includes(actor.userKey)) a.readBy.push(actor.userKey);
    // the matching notification is read too
    db.notifications.forEach((n) => {if (n.kind === 'announcement' && n.title === a?.title && !n.readBy.includes(actor.userKey)) n.readBy.push(actor.userKey);});
  });
}

/* --------------------------------- threads --------------------------------- */

/** Which of the caller's threads to show. */
function threadVisible(thread: Thread, role: string, viewer: Viewer) {
  if (role === 'admin') return true;
  if (role === 'teacher') return Boolean(viewer.teacherId) && thread.teacher._id === viewer.teacherId;
  if (role === 'parent') return (viewer.studentIds ?? []).includes(thread.student._id);
  return false;
}

export async function listThreads(viewer: Viewer = {}): Promise<Thread[]> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if (role !== 'teacher' && role !== 'parent') fail(403, 'You do not have permission to perform this action');
  return read((db) => db.threads.filter((t) => threadVisible(t, role, viewer)).sort((a, b) => b.lastAt.localeCompare(a.lastAt)));
}

/** Teachers who teach (or lead) the student's section: who a parent may write to. */
export function teachersOf(db: MockDb, studentId: string): Ref[] {
  const section = sectionOf(db, studentId);
  if (!section) return [];
  const map = new Map<string, Ref>();
  if (section.homeroomTeacher) map.set(section.homeroomTeacher._id, section.homeroomTeacher);
  db.entries.filter((e) => e.section._id === section._id).forEach((e) => map.set(e.teacher._id, e.teacher));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function listStudentTeachers(studentId: string): Promise<Array<Ref & {subjects: string[];homeroom: boolean;}>> {
  sessionActor();
  return read((db) => {
    const section = sectionOf(db, studentId);
    return teachersOf(db, studentId).map((t) => ({
      ...t,
      subjects: [...new Set(db.entries.filter((e) => e.section._id === section?._id && e.teacher._id === t._id).map((e) => e.subject.name))],
      homeroom: section?.homeroomTeacher?._id === t._id
    }));
  });
}

const cleanBody = (body: string) => {
  const text = body?.trim() ?? '';
  if (!text) fail(400, 'Write a message');
  if (text.length > 2000) fail(400, 'Messages are limited to 2,000 characters');
  return text;
};

export interface StartThreadPayload {
  student: StudentRef;
  teacher: Ref;
  subject: string;
  body: string;
}

export async function startThread(payload: StartThreadPayload, viewer: Viewer = {}): Promise<Thread> {
  const actor = sessionActor();
  if (actor.role !== 'teacher' && actor.role !== 'parent') fail(403, 'Only teachers and parents start conversations');
  return write((db) => {
    const subject = payload.subject?.trim();
    if (!subject || subject.length < 3) fail(400, 'Add a subject (3 characters or more)');
    if (subject.length > 120) fail(400, 'Subject: 120 characters max');
    const body = cleanBody(payload.body);
    if (!payload.student?._id || !payload.teacher?._id) fail(400, 'Choose the student and the teacher');
    const allowed = teachersOf(db, payload.student._id).some((t) => t._id === payload.teacher._id);
    if (actor.role === 'teacher' && (payload.teacher._id !== viewer.teacherId || !allowed)) fail(403, 'You can only write to parents of students you teach');
    if (actor.role === 'parent' && (!viewer.studentIds?.includes(payload.student._id) || !allowed)) fail(403, "You can only write to your child's teachers");
    const from = actor.role as 'teacher' | 'parent';
    const now = nowIso();
    const thread: Thread = {
      _id: newId(),
      student: payload.student,
      teacher: payload.teacher,
      subject,
      status: 'open',
      messages: [{ _id: newId(), from, name: from === 'teacher' ? payload.teacher.name : actor.ref.name, body, at: now }],
      lastAt: now,
      unread: { teacher: from === 'parent' ? 1 : 0, parent: from === 'teacher' ? 1 : 0 },
      createdAt: now
    };
    db.threads.push(thread);
    notifyThread(db, thread, from, body);
    return thread;
  });
}

function notifyThread(db: MockDb, thread: Thread, from: 'teacher' | 'parent' | 'office', body: string) {
  const toParents = from !== 'parent';
  notify(db, {
    to: toParents ? [`parent-of:${thread.student._id}`] : [`teacher:${thread.teacher._id}`],
    kind: 'message',
    title: toParents ? `${from === 'office' ? 'School office' : thread.teacher.name} · ${thread.subject}` : `Parent of ${thread.student.name} · ${thread.subject}`,
    body: body.slice(0, 140),
    href: { parent: `/parent/messages?thread=${thread._id}`, teacher: `/teacher/messages?thread=${thread._id}`, admin: `/admin/communication/messages?thread=${thread._id}` }
  });
}

export async function replyThread(id: string, body: string, viewer: Viewer = {}): Promise<Thread> {
  const actor = sessionActor();
  if (actor.role === 'admin') requirePermission(MANAGE);
  return write((db) => {
    const thread = db.threads.find((t) => t._id === id);
    if (!thread || !threadVisible(thread, actor.role, viewer)) fail(404, 'Conversation not found');
    if (thread.status === 'closed') fail(409, 'This conversation is closed');
    const text = cleanBody(body);
    const from = actor.role === 'admin' ? 'office' : actor.role as 'teacher' | 'parent';
    const now = nowIso();
    thread.messages.push({ _id: newId(), from, name: from === 'teacher' ? thread.teacher.name : from === 'office' ? `${actor.ref.name} (school office)` : actor.ref.name, body: text, at: now });
    thread.lastAt = now;
    if (from !== 'teacher') thread.unread.teacher += 1;
    if (from !== 'parent') thread.unread.parent += 1;
    notifyThread(db, thread, from, text);
    return thread;
  });
}

export async function markThreadRead(id: string, viewer: Viewer = {}): Promise<void> {
  const actor = sessionActor();
  return write((db) => {
    const thread = db.threads.find((t) => t._id === id);
    if (!thread || !threadVisible(thread, actor.role, viewer)) return;
    if (actor.role === 'teacher') thread.unread.teacher = 0;
    if (actor.role === 'parent') thread.unread.parent = 0;
    db.notifications.forEach((n) => {
      if (n.kind === 'message' && Object.values(n.href).some((h) => h?.endsWith(`thread=${id}`)) && !n.readBy.includes(actor.userKey)) n.readBy.push(actor.userKey);
    });
  });
}

export async function setThreadStatus(id: string, status: 'open' | 'closed', viewer: Viewer = {}): Promise<Thread> {
  const actor = sessionActor();
  if (actor.role === 'admin') requirePermission(MANAGE);else
  if (actor.role !== 'teacher') fail(403, 'Only the teacher or the school office can close a conversation');
  return write((db) => {
    const thread = db.threads.find((t) => t._id === id);
    if (!thread || !threadVisible(thread, actor.role, viewer)) fail(404, 'Conversation not found');
    thread.status = status;
    return thread;
  });
}

/* ------------------------------- notifications ------------------------------ */

export interface NotificationView extends Omit<AppNotification, 'readBy' | 'to'> {
  isRead: boolean;
}

export async function listNotifications(viewer: Viewer = {}): Promise<NotificationView[]> {
  const actor = sessionActor();
  return read((db) => {
    const keys = viewerKeys(db, actor.role, viewer);
    return db.notifications.
    filter((n) => n.to.some((k) => keys.includes(k)) && n.href[actor.role as Role]).
    sort((a, b) => b.createdAt.localeCompare(a.createdAt)).
    slice(0, 40).
    map(({ readBy, to: _to, ...n }) => ({ ...n, isRead: readBy.includes(actor.userKey) }));
  });
}

export async function markNotificationsRead(ids: string[] | 'all', viewer: Viewer = {}): Promise<void> {
  const actor = sessionActor();
  return write((db) => {
    const keys = viewerKeys(db, actor.role, viewer);
    db.notifications.forEach((n) => {
      if (!n.to.some((k) => keys.includes(k))) return;
      if ((ids === 'all' || ids.includes(n._id)) && !n.readBy.includes(actor.userKey)) n.readBy.push(actor.userKey);
    });
  });
}

/* ---------------------------------- outbox --------------------------------- */

export async function listOutbox(): Promise<OutboxItem[]> {
  requirePermission(READ);
  return read((db) => [...db.outbox].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getCommSettings(): Promise<CommSettings> {
  requirePermission(READ);
  return read((db) => db.commSettings);
}

export async function updateCommSettings(next: CommSettings): Promise<CommSettings> {
  requirePermission(SETTINGS);
  return write((db) => {
    db.commSettings = { smsAbsence: Boolean(next.smsAbsence), smsClinic: Boolean(next.smsClinic), emailAnnouncements: Boolean(next.emailAnnouncements), emailEvents: Boolean(next.emailEvents) };
    return db.commSettings;
  });
}

/** Sections and levels of this year, as audience targets. */
export async function listAudienceTargets(academicYear: string): Promise<{levels: Ref[];sections: Ref[];}> {
  sessionActor();
  return read((db) => {
    const sections = db.sections.filter((s) => s.academicYear === academicYear);
    const levels = new Map<string, Ref>();
    sections.forEach((s) => levels.set(s.classLevel._id, s.classLevel));
    return {
      levels: [...levels.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
      sections: sections.map((s) => ({ _id: s._id, name: sectionLabel(s) })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    };
  });
}
