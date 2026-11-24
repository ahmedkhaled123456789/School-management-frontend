import type { Role } from './common';
import type { Ref, StudentRef } from './sections';

/**
 * Announcements, teacher–parent messages, notifications and the SMS / email
 * outbox. Served by the MOCK API (src/api/mock) until the backend ships them.
 */

/**
 * Who something is for. Levels and sections reach their students, and their
 * parents when `parents` is set.
 */
export type AudienceKind = 'everyone' | 'staff' | 'teachers' | 'parents' | 'students' | 'levels' | 'sections';

export interface Audience {
  kind: AudienceKind;
  /** levels / sections */
  targets?: Ref[];
  /** levels / sections: also their parents */
  parents?: boolean;
}

export interface Author extends Ref {
  role: Role;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  audience: Audience;
  pinned: boolean;
  /** hidden from readers after this day (YYYY-MM-DD) */
  expiresOn?: string;
  author: Author;
  /** user keys that opened it */
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  audience: Audience;
  pinned: boolean;
  expiresOn?: string;
}

export type MessageSender = 'teacher' | 'parent' | 'office';

export interface ThreadMessage {
  _id: string;
  from: MessageSender;
  name: string;
  body: string;
  at: string;
}

/** A conversation between a teacher and the parents of one student. */
export interface Thread {
  _id: string;
  student: StudentRef;
  teacher: Ref;
  subject: string;
  status: 'open' | 'closed';
  messages: ThreadMessage[];
  lastAt: string;
  /** unread messages for each side */
  unread: {teacher: number;parent: number;};
  createdAt: string;
}

export type NotificationKind = 'announcement' | 'message' | 'absence' | 'clinic' | 'event' | 'admission' | 'certificate' | 'library' | 'transport' | 'hr' | 'canteen';

export interface AppNotification {
  _id: string;
  /** audience keys, e.g. "parent-of:<studentId>", "teacher:<id>", "all" */
  to: string[];
  kind: NotificationKind;
  title: string;
  body: string;
  /** where to open it, per portal */
  href: Partial<Record<Role, string>>;
  readBy: string[];
  createdAt: string;
}

export type Channel = 'sms' | 'email';

export interface OutboxItem {
  _id: string;
  channel: Channel;
  /** human label: "Parents of Student 1", "Level 100 / A parents" */
  to: string;
  subject?: string;
  body: string;
  kind: NotificationKind;
  status: 'sent' | 'skipped';
  reason?: string;
  createdAt: string;
}

export interface CommSettings {
  smsAbsence: boolean;
  smsClinic: boolean;
  emailAnnouncements: boolean;
  emailEvents: boolean;
}
