/**
 * Mirrors config/permissions.js in the backend. The backend is the real gate;
 * the UI only hides what the signed-in user can not use.
 */
export const PERMISSIONS = {
  ADMINS_MANAGE: 'admins.manage',
  STAFF_MANAGE: 'staff.manage',
  SETTINGS_MANAGE: 'settings.manage',
  STUDENTS_READ: 'students.read',
  STUDENTS_MANAGE: 'students.manage',
  TEACHERS_MANAGE: 'teachers.manage',
  ACADEMICS_READ: 'academics.read',
  ACADEMICS_MANAGE: 'academics.manage',
  FINANCE_MANAGE: 'finance.manage',
  AUDIT_READ: 'audit.read'
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Effective role returned by the backend for admin-portal users. */
export type StaffRole = 'super_admin' | 'admin' | 'accountant' | 'registrar' | 'hr';

export const STAFF_ROLE_OPTIONS: Array<{value: Exclude<StaffRole, 'super_admin' | 'admin'>;label: string;}> = [
{ value: 'accountant', label: 'Accountant' },
{ value: 'registrar', label: 'Registrar' },
{ value: 'hr', label: 'HR' }];


export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  accountant: 'Accountant',
  registrar: 'Registrar',
  hr: 'HR'
};
