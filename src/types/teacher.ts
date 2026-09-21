import type { Timestamped } from './common';

export interface Teacher extends Timestamped {
  _id: string;
  name: string;
  email: string;
  teacherId: string;
  role?: string;
  dateEmployed?: string;
  isWithdrawn?: boolean;
  isSuspended?: boolean;
  applicationStatus?: 'pending' | 'approved' | 'rejected';
  program?: string;
  subject?: string;
  classLevel?: string;
  academicYear?: string;
  examsCreated?: string[];
  gender?: 'Male' | 'Female';
  phone?: string;
  address?: string;
  religion?: string;
  classLevels?: string[];
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
  password: string;
  gender?: 'Male' | 'Female';
  phone?: string;
  address?: string;
  subject?: string;
  religion?: string;
  classLevels?: string[];
}

export interface AssignTeacherPayload {
  program?: string;
  classLevel?: string;
  academicYear?: string;
  subject?: string;
}

export interface TeacherSelfUpdatePayload {
  name?: string;
  email?: string;
  password?: string;
}

export interface AdminUpdateTeacherPayload {
  name?: string;
  email?: string;
  password?: string;
  gender?: 'Male' | 'Female';
  phone?: string;
  address?: string;
  subject?: string;
  religion?: string;
  classLevels?: string[];
  program?: string;
  classLevel?: string;
  academicYear?: string;
}