import { useQuery } from '@tanstack/react-query';
import * as api from '../../api/health';
import type { ClinicVisitPayload, HealthProfilePayload } from '../../types/health';
import type { StudentRef } from '../../types/sections';
import { ROOT, useMockMutation } from '../sections';

const keys = {
  profiles: [...ROOT, 'health', 'profiles'] as const,
  profile: (id: string) => [...ROOT, 'health', 'profile', id] as const,
  alerts: (ids: string[]) => [...ROOT, 'health', 'alerts', ids.join(',')] as const,
  visits: (q: object) => [...ROOT, 'health', 'visits', q] as const
};

export const useHealthProfiles = (enabled = true) => useQuery({ queryKey: keys.profiles, queryFn: api.listHealthProfiles, enabled });

export const useHealthProfile = (student?: StudentRef) =>
useQuery({ queryKey: keys.profile(student?._id ?? ''), queryFn: () => api.getHealthProfile(student as StudentRef), enabled: Boolean(student?._id) });

export const useSaveHealthProfile = () =>
useMockMutation(({ student, payload }: {student: StudentRef;payload: HealthProfilePayload;}) => api.saveHealthProfile(student, payload), 'Health record saved.');

/** Allergies / conditions for a list of students (teachers' registers). */
export const useHealthAlerts = (studentIds: string[], enabled = true) =>
useQuery({ queryKey: keys.alerts(studentIds), queryFn: () => api.getSectionHealthAlerts(studentIds), enabled: enabled && studentIds.length > 0 });

export const useClinicVisits = (q: {date?: string;from?: string;studentId?: string;}, enabled = true) =>
useQuery({ queryKey: keys.visits(q), queryFn: () => api.listClinicVisits(q), enabled });

export const useAddClinicVisit = () =>
useMockMutation(
  (p: ClinicVisitPayload) => api.addClinicVisit(p),
  (r) => r.registersUpdated ? `Visit logged. ${r.registersUpdated} later register(s) now show the student as excused.` : 'Visit logged.'
);

export const useDeleteClinicVisit = () => useMockMutation((id: string) => api.deleteClinicVisit(id), 'Visit removed.');
