import type { Ref } from './sections';

/** Admissions: applications → entrance test → decision → enrolment. MOCK API for now. */

export type ApplicationStatus = 'new' | 'test_scheduled' | 'tested' | 'accepted' | 'waitlisted' | 'rejected' | 'enrolled' | 'withdrawn';

export interface Applicant {
  name: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  previousSchool?: string;
}

export interface Guardian {
  name: string;
  relation: string;
  phone: string;
  email: string;
}

export interface EntranceTest {
  date: string;
  time: string;
  room?: string;
}

export interface ApplicationEvent {
  at: string;
  by: string;
  action: string;
  note?: string;
}

export interface Application {
  _id: string;
  /** "APP-2026-0007" — given to the family to follow up */
  reference: string;
  academicYear: string;
  classLevel: Ref;
  applicant: Applicant;
  guardian: Guardian;
  status: ApplicationStatus;
  source: 'online' | 'office';
  test?: EntranceTest;
  /** 0–100 */
  score?: number;
  testNotes?: string;
  decisionNote?: string;
  /** the real student created on enrolment */
  student?: Ref & {studentId?: string;};
  history: ApplicationEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationPayload {
  classLevel: Ref;
  applicant: Applicant;
  guardian: Guardian;
}

export interface AdmissionSettings {
  /** entrance test pass mark (shown as guidance on decisions) */
  passMark: number;
  /** the public form accepts applications */
  open: boolean;
}

/** Seats for one class level this year. */
export interface LevelSeats {
  level: Ref;
  capacity: number;
  seated: number;
  /** accepted but not enrolled yet: seats promised */
  promised: number;
  free: number;
  waitlist: number;
}
