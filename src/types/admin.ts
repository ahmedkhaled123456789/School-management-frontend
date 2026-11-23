import type { Timestamped } from './common';

export interface Admin extends Timestamped {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  address?: string;
  schoolName?: string;
  city?: string;
  /** Spelled `lauguage` by the backend model — kept verbatim so payloads match. */
  lauguage?: string;
  image?: string;
  isSuperAdmin?: boolean;
  academicYears?: unknown[];
  academicTerms?: unknown[];
  classLevels?: unknown[];
  teachers?: unknown[];
  students?: unknown[];
  programs?: unknown[];
  yearGroups?: unknown[];
}

export interface AdminUpdatePayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  schoolName?: string;
  city?: string;
  lauguage?: string;
  /** Super admin only, never on yourself. */
  isSuperAdmin?: boolean;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
  isSuperAdmin?: boolean;
}