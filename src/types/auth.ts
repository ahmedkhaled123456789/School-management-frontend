import type { Role } from './common';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  _id: string;
  name?: string;
  email?: string;
  role: Role;
  image?: string;
  /** Admin portal only: super_admin | admin | accountant | registrar | hr. */
  staffRole?: string;
  /** Admin portal only: what this user may do (see lib/permissions.ts). */
  permissions?: string[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface Session {
  token: string;
  role: Role;
  user: AuthUser;
}