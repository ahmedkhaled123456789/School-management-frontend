import type { StaffRef } from './attendance';
import type { Ref } from './sections';

/** HR: contracts, leave (with lesson cover) and performance reviews. MOCK API for now. */

export type ContractType = 'permanent' | 'fixed' | 'part_time' | 'probation';
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'terminated';

export interface Contract {
  _id: string;
  staff: StaffRef;
  type: ContractType;
  jobTitle: string;
  startOn: string;
  /** none for permanent contracts */
  endOn?: string;
  /** monthly, minor units */
  salary: number;
  hoursPerWeek: number;
  notes?: string;
  terminated?: {on: string;reason: string;};
  history: Array<{at: string;by: string;action: string;}>;
  createdAt: string;
}

export type ContractPayload = Pick<Contract, 'staff' | 'type' | 'jobTitle' | 'startOn' | 'endOn' | 'salary' | 'hoursPerWeek' | 'notes'>;

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/** A lesson of the absent teacher and who covers it. */
export interface Cover {
  date: string;
  periodId: string;
  periodLabel: string;
  section: Ref;
  subject: Ref;
  substitute: Ref | null;
}

export interface LeaveRequest {
  _id: string;
  staff: StaffRef;
  type: LeaveType;
  from: string;
  to: string;
  /** school days in the range */
  days: number;
  reason: string;
  status: LeaveStatus;
  decidedBy?: string;
  decisionNote?: string;
  covers: Cover[];
  createdAt: string;
}

export interface LeavePayload {
  staff: StaffRef;
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
}

export interface LeaveBalance {
  type: LeaveType;
  allowance: number | null;
  used: number;
  pending: number;
  left: number | null;
}

export interface ReviewScore {
  criterion: string;
  /** 1–5 */
  score: number;
  comment?: string;
}

export interface Review {
  _id: string;
  staff: StaffRef;
  /** "2026 · Term 1" */
  period: string;
  reviewer: Ref;
  scores: ReviewScore[];
  overall: number;
  strengths: string;
  improvements: string;
  status: 'draft' | 'shared' | 'acknowledged';
  acknowledgedOn?: string;
  staffComment?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReviewPayload = Pick<Review, 'staff' | 'period' | 'scores' | 'strengths' | 'improvements'>;

/** Facts from other modules shown next to a review. */
export interface StaffFacts {
  daysRecorded: number;
  late: number;
  absent: number;
  leaveDays: number;
  lessonsPerWeek: number;
  registersTaken: number;
  registersExpected: number;
}
