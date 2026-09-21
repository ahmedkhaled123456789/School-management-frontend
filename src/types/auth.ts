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