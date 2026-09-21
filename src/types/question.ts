import type { Timestamped } from './common';

export type OptionKey = 'A' | 'B' | 'C' | 'D';

/** Full question shape — teacher/admin only. `correctAnswer` must never reach a student. */
export interface Question extends Timestamped {
  _id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  createdBy?: string;
}

/** Safe projection intended for the student exam-taking interface. */
export interface StudentQuestion {
  _id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface QuestionPayload {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
}