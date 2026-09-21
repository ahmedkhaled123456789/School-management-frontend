import type { Timestamped } from './common';

export interface ClassLevel extends Timestamped {
  _id: string;
  name: string;
  description?: string;
  amount?: number;
  createdBy?: string;
  students?: string[];
  subjects?: string[];
  teachers?: string[];
}

export interface ClassLevelPayload {
  name: string;
  description?: string;
  amount?: number;
}