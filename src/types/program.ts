import type { Timestamped } from './common';

export interface Program extends Timestamped {
  _id: string;
  name: string;
  description?: string;
  duration?: string;
  code?: string;
  createdBy?: string;
  teachers?: string[];
  students?: string[];
  subjects?: string[];
}

export interface ProgramPayload {
  name: string;
  description?: string;
}