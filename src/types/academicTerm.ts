import type { Timestamped } from './common';

export interface AcademicTerm extends Timestamped {
  _id: string;
  name: string;
  description?: string;
  duration?: string;
  createdBy?: string;
}

export interface AcademicTermPayload {
  name: string;
  description?: string;
  duration?: string;
}