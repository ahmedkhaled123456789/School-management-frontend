import type { Audience, Author } from './communication';
import type { Ref, StudentRef } from './sections';

/** School events: trips, competitions, celebrations. MOCK API for now. */

export type EventType = 'trip' | 'competition' | 'celebration' | 'sports' | 'meeting' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled';

export interface ConsentResponse {
  student: StudentRef;
  decision: 'approved' | 'declined';
  /** approved beyond capacity: waiting for a free place */
  waitlisted: boolean;
  by: Ref;
  note?: string;
  at: string;
}

export interface EventPayment {
  studentId: string;
  /** minor units (piasters), like Finance */
  amount: number;
  method: 'cash' | 'card' | 'transfer';
  by: Ref;
  at: string;
}

export interface EventResult {
  place: number;
  student: StudentRef;
  note?: string;
}

export interface SchoolEvent {
  _id: string;
  academicYear: string;
  title: string;
  type: EventType;
  description: string;
  date: string;
  /** multi-day events */
  endDate?: string;
  startTime: string;
  endTime: string;
  location: string;
  /** everyone / levels / sections (students and their parents) */
  audience: Audience;
  requiresConsent: boolean;
  consentDeadline?: string;
  /** minor units; 0 = free */
  fee: number;
  /** places; 0 = unlimited */
  capacity: number;
  status: EventStatus;
  cancelReason?: string;
  responses: ConsentResponse[];
  payments: EventPayment[];
  results: EventResult[];
  createdBy: Author;
  createdAt: string;
  updatedAt: string;
}

export type EventPayload = Pick<SchoolEvent,
'title' | 'type' | 'description' | 'date' | 'endDate' | 'startTime' | 'endTime' | 'location' | 'audience' | 'requiresConsent' | 'consentDeadline' | 'fee' | 'capacity'>;

/** An event as one family sees it (parent / student portals). */
export interface FamilyEvent {
  event: SchoolEvent;
  /** the children (or the student) the event is for */
  students: Array<{student: StudentRef;response?: ConsentResponse;paid: boolean;}>;
}
