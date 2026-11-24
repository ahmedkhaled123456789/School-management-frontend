import type { Timestamped } from './common';
import type { Ref, StudentRef } from './sections';

/** Health records. Served by the MOCK API (src/api/mock) until the backend ships them. */

export type Severity = 'mild' | 'moderate' | 'severe';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Allergy {
  _id: string;
  name: string;
  severity: Severity;
  /** what happens / what to do */
  reaction?: string;
}

export interface Condition {
  _id: string;
  name: string;
  notes?: string;
}

export interface Vaccination {
  _id: string;
  name: string;
  /** given on (YYYY-MM-DD) */
  date?: string;
  /** next dose due (YYYY-MM-DD) */
  dueDate?: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface HealthProfile extends Timestamped {
  _id: string;
  student: StudentRef;
  bloodType?: BloodType;
  allergies: Allergy[];
  conditions: Condition[];
  medications?: string;
  vaccinations: Vaccination[];
  emergencyContact?: EmergencyContact;
  notes?: string;
  updatedBy?: Ref;
}

export type HealthProfilePayload = Omit<HealthProfile, '_id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'student'>;

export type ClinicAction = 'returned' | 'rested' | 'sent_home' | 'referred';

export interface ClinicVisit extends Timestamped {
  _id: string;
  date: string;
  time: string;
  student: StudentRef;
  complaint: string;
  temperature?: number;
  action: ClinicAction;
  notes?: string;
  seenBy: Ref;
}

export interface ClinicVisitPayload {
  student: StudentRef;
  date: string;
  time: string;
  complaint: string;
  temperature?: number;
  action: ClinicAction;
  notes?: string;
}

export type VaccinationStatus = 'done' | 'due' | 'overdue';
