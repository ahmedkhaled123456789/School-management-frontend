import type { BadgeTone } from '../components/ui/Badge';
import type { ClinicAction, HealthProfile, Severity, Vaccination, VaccinationStatus } from '../types/health';
import { daysBetween, todayKey } from './attendance';

export const SEVERITY_META: Record<Severity, {label: string;tone: BadgeTone;}> = {
  mild: { label: 'Mild', tone: 'neutral' },
  moderate: { label: 'Moderate', tone: 'warn' },
  severe: { label: 'Severe', tone: 'danger' }
};

export const CLINIC_ACTION_META: Record<ClinicAction, {label: string;tone: BadgeTone;}> = {
  returned: { label: 'Back to class', tone: 'success' },
  rested: { label: 'Rested at the clinic', tone: 'info' },
  sent_home: { label: 'Sent home', tone: 'warn' },
  referred: { label: 'Referred to a doctor', tone: 'danger' }
};

export const VACCINATION_META: Record<VaccinationStatus, {label: string;tone: BadgeTone;}> = {
  done: { label: 'Done', tone: 'success' },
  due: { label: 'Due soon', tone: 'warn' },
  overdue: { label: 'Overdue', tone: 'danger' }
};

/** Overdue when the due date passed; due when it is within 30 days (or only a due date is known). */
export function vaccinationStatus(v: Vaccination, today = todayKey()): VaccinationStatus {
  if (v.dueDate && v.dueDate < today) return 'overdue';
  if (v.dueDate && daysBetween(today, v.dueDate) <= 30) return 'due';
  return v.date ? 'done' : 'due';
}

export const hasSevereAllergy = (p?: Pick<HealthProfile, 'allergies'>) => Boolean(p?.allergies.some((a) => a.severity === 'severe'));
export const overdueVaccinations = (p?: Pick<HealthProfile, 'vaccinations'>) => (p?.vaccinations ?? []).filter((v) => vaccinationStatus(v) === 'overdue');
export const isEmptyProfile = (p?: HealthProfile) => !p || !p._id;
