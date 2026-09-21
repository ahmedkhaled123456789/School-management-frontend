import type { Timestamped } from './common';

export interface AcademicYear extends Timestamped {
  _id: string;
  name: string;
  fromYear?: string;
  toYear?: string;
  isCurrent?: boolean;
  createdBy?: string;
  students?: string[];
  teachers?: string[];
}

export interface AcademicYearPayload {
  name: string;
  fromYear?: string;
  toYear?: string;
}