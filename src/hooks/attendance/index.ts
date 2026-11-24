import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../api/attendance';
import type { AttendanceSettings, RegisterPayload, StaffAttendancePayload, StaffRef } from '../../types/attendance';
import { summarizeStudent } from '../../utils/attendance';
import { ROOT, useCurrentAcademicYear, useMockMutation, useSchoolDay } from '../sections';
import { useStaff } from '../staff';
import { useTeachers } from '../teachers';

const keys = {
  registers: (q: api.RegisterQuery) => [...ROOT, 'attendance', 'registers', q] as const,
  draft: (...parts: Array<string | undefined>) => [...ROOT, 'attendance', 'draft', ...parts] as const,
  overview: (year: string, date: string) => [...ROOT, 'attendance', 'overview', year, date] as const,
  stats: (year: string, from: string, to: string) => [...ROOT, 'attendance', 'stats', year, from, to] as const,
  gate: (date: string) => [...ROOT, 'attendance', 'gate', date] as const,
  settings: [...ROOT, 'attendance', 'settings'] as const,
  staff: (from: string, to: string) => [...ROOT, 'attendance', 'staff', from, to] as const
};

/* -------------------------------- registers -------------------------------- */

export const useRegisters = (q: api.RegisterQuery, enabled = true) =>
useQuery({ queryKey: keys.registers(q), queryFn: () => api.listRegisters(q), enabled: enabled && Boolean(q.academicYear) });

export const useRegisterDraft = (year: string, sectionId?: string, date?: string, periodId?: string, teacherId?: string, enabled = true) =>
useQuery({
  queryKey: keys.draft(year, sectionId, date, periodId, teacherId),
  queryFn: () => api.getRegisterDraft(year, sectionId as string, date as string, periodId as string, teacherId),
  enabled: enabled && Boolean(year && sectionId && date && periodId),
  retry: false
});

export const useSaveRegister = (year: string, teacherId?: string) =>
useMockMutation((payload: RegisterPayload) => api.saveRegister(year, payload, teacherId), (r) => `Attendance saved for ${r.section.name}.`);

/* --------------------------------- overview -------------------------------- */

export const useDailyOverview = (year: string, date: string, enabled = true) =>
useQuery({ queryKey: keys.overview(year, date), queryFn: () => api.getDailyOverview(year, date), enabled: enabled && Boolean(year && date) });

export const useAttendanceStats = (year: string, from: string, to: string, enabled = true) =>
useQuery({ queryKey: keys.stats(year, from, to), queryFn: () => api.getAttendanceStats(year, from, to), enabled: enabled && Boolean(year && from && to) });

/** One student's registers this year, summarised (student / parent / admin pages). */
export function useStudentAttendance(studentId?: string) {
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const registers = useRegisters({ academicYear: year.id, studentId }, Boolean(studentId));
  const summary = useMemo(() => {
    if (!registers.data || !studentId) return null;
    const label = (id: string) => schoolDay.data?.periods.find((p) => p._id === id)?.label ?? 'Period';
    return summarizeStudent(registers.data, studentId, label);
  }, [registers.data, schoolDay.data, studentId]);
  return {
    year,
    schoolDay: schoolDay.data,
    registers: registers.data,
    summary,
    isLoading: year.isLoading || schoolDay.isLoading || Boolean(studentId) && registers.isLoading,
    error: schoolDay.error ?? registers.error
  };
}

/* ----------------------------------- gate ---------------------------------- */

export const useGateScans = (date: string) => useQuery({ queryKey: keys.gate(date), queryFn: () => api.listGateScans(date), enabled: Boolean(date) });
export const useCheckIn = (year: string) =>
useMockMutation(({ code, method }: {code: string;method: 'camera' | 'scanner' | 'manual';}) => api.checkIn(year, code, method), null);
export const useDeleteGateScan = () => useMockMutation((id: string) => api.deleteGateScan(id), 'Check-in removed.');

/* ---------------------------------- staff ---------------------------------- */

export const useAttendanceSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.getAttendanceSettings });
export const useUpdateAttendanceSettings = () =>
useMockMutation((s: AttendanceSettings) => api.updateAttendanceSettings(s), 'Attendance rules saved.');

export const useStaffAttendance = (from: string, to = from) =>
useQuery({ queryKey: keys.staff(from, to), queryFn: () => api.listStaffAttendance(from, to), enabled: Boolean(from) });
export const useSaveStaffAttendance = () =>
useMockMutation((p: StaffAttendancePayload) => api.saveStaffAttendance(p), (r) => `${r.staff.name}: ${r.status === 'leave' ? 'on leave' : r.status}.`);
export const useMarkMissingStaffAbsent = () =>
useMockMutation(({ date, people }: {date: string;people: StaffRef[];}) => api.markMissingStaffAbsent(date, people), (r) => r.marked ? `${r.marked} marked absent.` : 'Everyone already has a record.');
export const useImportDeviceFile = () =>
useMockMutation(({ text, people }: {text: string;people: StaffRef[];}) => api.importDeviceFile(text, people), null);

/** Teachers and office staff (real records) as attendance references. */
export function useStaffDirectory(enabled = true) {
  const teachers = useTeachers({ limit: 500 }, enabled);
  const staff = useStaff(enabled);
  const people = useMemo<StaffRef[]>(() => [
  ...(teachers.data?.items ?? []).filter((t) => !t.isWithdrawn).map((t) => ({ _id: t._id, name: t.name, email: t.email, kind: 'teacher' as const })),
  ...(staff.data?.items ?? []).filter((s) => s.isActive).map((s) => ({ _id: s._id, name: s.name, email: s.email, kind: 'staff' as const }))].
  sort((a, b) => a.name.localeCompare(b.name)), [teachers.data, staff.data]);
  return {
    people,
    isLoading: teachers.isLoading || staff.isLoading,
    // office staff are optional (HR may not list them): only teachers are required
    error: teachers.error
  };
}

/* ------------------------------- sample data ------------------------------- */

export const useGenerateAttendanceSample = (year: string) =>
useMockMutation(
  ({ days, people }: {days: number;people: StaffRef[];}) => api.generateAttendanceSample(year, days, people),
  (r) => `Sample ready: ${r.registers} registers over ${r.days} school days, ${r.profiles} health profiles, ${r.visits} clinic visits.`
);
