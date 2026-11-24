import type { Timestamped } from './common';
import type { ResultRemarks, ResultStatus } from './examResult';

interface NamedRef {
  _id: string;
  name?: string;
}

/** A published exam result as returned to a parent (exam + subject populated). */
export interface ChildResult extends Timestamped {
  _id: string;
  studentID?: string;
  exam?: (NamedRef & {
    examType?: string;
    examDate?: string;
    totalMark?: number;
    passMark?: number;
    subject?: { _id?: string; name?: string } | null;
  }) | null;
  grade?: number;
  score?: number;
  passMark?: number;
  status?: ResultStatus;
  remarks?: ResultRemarks;
  classLevel?: NamedRef | null;
  isPublished?: boolean;
}

/** GET /parents/me/children item. */
export interface ParentChild extends Timestamped {
  _id: string;
  name: string;
  studentId: string;
  email?: string;
  image?: string;
  gender?: string;
  classLevels?: Array<NamedRef & { amount?: number }>;
  currentClassLevel?: string;
  program?: (NamedRef & { code?: string }) | null;
  academicYear?: NamedRef | null;
  isSuspended?: boolean;
  isWithdrawn?: boolean;
  isGraduated?: boolean;
  dateAdmitted?: string;
  latestPublishedResult?: ChildResult | null;
}

/** GET /parents/me/children/:studentId */
export interface ChildProfile extends Omit<ParentChild, 'latestPublishedResult'> {
  phone?: string;
  address?: string;
  religion?: string;
  dateOfBirth?: string;
  admissionDate?: string;
  fatherName?: string;
  motherName?: string;
  fatherEmail?: string;
  fatherOccupation?: string;
  prefectName?: string;
  yearGraduated?: string;
}

/** PUT /parents/me */
export interface ParentSelfUpdatePayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  religion?: string;
}
