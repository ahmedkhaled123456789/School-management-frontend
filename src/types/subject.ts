import type { Timestamped } from './common';

export interface Subject extends Timestamped {
  _id: string;
  name: string;
  description?: string;
  /** Weekday the subject is taught, e.g. "Monday". */
  day?: string;
  /** Room / class the subject is held in, e.g. "Room 101". */
  classes?: string;
  teacher?: string;
  academicTerm?: string;
  duration?: string;
  createdBy?: string;
}

/** Matches POST /subjects and PUT /subjects/:id exactly. */
export interface SubjectPayload {
  name: string;
  day?: string;
  classes?: string;
  teacher?: string;
  academicTerm?: string;
}