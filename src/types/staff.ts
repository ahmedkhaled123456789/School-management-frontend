import type { Timestamped } from './common';

export type StaffMemberRole = 'accountant' | 'registrar' | 'hr';

export interface StaffMember extends Timestamped {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffMemberRole;
  isActive: boolean;
  image?: string;
}

export interface StaffPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: StaffMemberRole;
  isActive?: boolean;
}

export interface SchoolSettings extends Timestamped {
  _id: string;
  schoolName: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency: string;
  invoicePrefix: string;
  receiptPrefix: string;
  currentAcademicYear?: {_id: string;name?: string;} | string | null;
  timezone?: string;
}

export type SettingsPayload = Partial<Omit<SchoolSettings, '_id' | 'currentAcademicYear' | 'createdAt' | 'updatedAt'>> & {
  currentAcademicYear?: string | null;
};

export interface AuditLogEntry {
  _id: string;
  actor?: {id?: string;role?: string;name?: string;email?: string;};
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId?: string;
  method: string;
  path: string;
  statusCode?: number;
  changes?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}
