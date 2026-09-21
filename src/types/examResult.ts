import type { Timestamped } from './common';

export type ResultStatus = 'Pass' | 'Fail';
export type ResultRemarks = 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Poor';

export interface ExamResult extends Timestamped {
  _id: string;
  studentID?: string;
  exam?: string | {_id: string;name?: string;};
  grade?: number;
  score?: number;
  passMark?: number;
  status?: ResultStatus;
  remarks?: ResultRemarks;
  position?: number;
  subject?: string;
  classLevel?: string;
  academicTerm?: string;
  academicYear?: string;
  answeredQuestions?: Array<{
    question?: string;
    correctAnswer?: string;
    isCorrect?: boolean;
  }>;
  isPublished?: boolean;
}

export interface TogglePublishPayload {
  publish: boolean;
}