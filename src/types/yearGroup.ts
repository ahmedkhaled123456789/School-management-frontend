import type { Timestamped } from './common';

export interface YearGroup extends Timestamped {
  _id: string;
  name: string;
  academicYear?: string;
  createdBy?: string;
}

export interface YearGroupPayload {
  name: string;
  academicYear?: string;
}