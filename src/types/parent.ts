import type { Timestamped } from './common';

export interface Parent extends Timestamped {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  occupation?: string;
  religion?: string;
  student?: Array<string | { _id?: string; name?: string; studentId?: string }>;
  [key: string]: unknown;
}

export interface CreateParentPayload {
  name: string;
  email: string;
  password: string;
  student: string[];
  phone?: string;
  address?: string;
  occupation?: string;
  religion?: string;
}

export interface UpdateParentPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  occupation?: string;
}