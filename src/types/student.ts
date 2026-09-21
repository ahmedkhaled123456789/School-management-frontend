import type { Timestamped } from './common';

export interface Student extends Timestamped {
  _id: string;
  name: string;
  email: string;
  studentId: string;
  role?: string;
  program?: string;
  currentClassLevel?: string;
  academicYear?: string;
  dateAdmitted?: string;
  isPromotedToLevel200?: boolean;
  isPromotedToLevel300?: boolean;
  isPromotedToLevel400?: boolean;
  isGraduated?: boolean;
  isWithdrawn?: boolean;
  isSuspended?: boolean;
  prefectName?: string;
  classLevels?: string[];
  examResults?: string[];
  phone?: string;
  address?: string;
  gender?: 'Male' | 'Female';
  fatherOccupation?: string;
  dateOfBirth?: string;
  motherName?: string;
  fatherName?: string;
  religion?: string;
  status?: boolean;
  fatherEmail?: string;
}

export interface CreateStudentPayload {
  name: string;
  email: string;
  password: string;
  admissionDate?: string;
  phone?: string;
  address?: string;
  gender?: 'Male' | 'Female';
  fatherOccupation?: string;
  dateOfBirth?: string;
  motherName?: string;
  fatherName?: string;
  religion?: string;
  status?: boolean;
  classLevels?: string[];
  fatherEmail?: string;
}

export interface AdminUpdateStudentPayload {
  name?: string;
  email?: string;
  academicYear?: string;
  program?: string;
  prefectName?: string;
  password?: string;
  admissionDate?: string;
  phone?: string;
  address?: string;
  gender?: 'Male' | 'Female';
  fatherOccupation?: string;
  dateOfBirth?: string;
  motherName?: string;
  fatherName?: string;
  religion?: string;
  status?: boolean;
  classLevels?: string[];
  fatherEmail?: string;
}

export interface StudentSelfUpdatePayload {
  email?: string;
  password?: string;
}

export interface WriteExamPayload {
  answers: string[];
}