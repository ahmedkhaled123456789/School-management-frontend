import type { Timestamped } from './common';

export type ExamStatus = 'pending' | 'live';

export interface Exam extends Timestamped {
  _id: string;
  name: string;
  description?: string;
  subject?: string;
  program?: string;
  academicTerm?: string;
  academicYear?: string;
  classLevel?: string;
  duration?: string;
  examDate?: string;
  examTime?: string;
  examType?: string;
  examStatus?: ExamStatus;
  createdBy?: string;
  questions?: string[];
}

export interface ExamPayload {
  name: string;
  description?: string;
  subject?: string;
  program?: string;
  academicTerm?: string;
  academicYear?: string;
  classLevel?: string;
  duration?: string;
  examDate?: string;
  examTime?: string;
  examType?: string;
}