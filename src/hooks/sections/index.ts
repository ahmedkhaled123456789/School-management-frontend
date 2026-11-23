import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useClassLevels } from '../classes';
import { useStudents } from '../students';
import { useSubjects } from '../subjects';
import { useTeachers } from '../teachers';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import * as api from '../../api/sections';
import { onMockDbChange, resetMockDb } from '../../api/mock/db';
import type { Ref, RoomPayload, SchoolDay, SectionPayload, StudentRef, TimetableEntryPayload } from '../../types/sections';
import { useSettings } from '../staff';

/** Everything served by the mock API lives under this key. */
const ROOT = ['mock'] as const;
const keys = {
  rooms: [...ROOT, 'rooms'] as const,
  sections: (year: string, level?: string) => [...ROOT, 'sections', year, level ?? 'all'] as const,
  section: (id: string) => [...ROOT, 'section', id] as const,
  studentSection: (year: string, student: string) => [...ROOT, 'studentSection', year, student] as const,
  schoolDay: [...ROOT, 'schoolDay'] as const,
  timetable: (query: api.TimetableQuery) => [...ROOT, 'timetable', query] as const
};

/** The current academic year from School Settings (sections are per year). */
export function useCurrentAcademicYear() {
  const settings = useSettings();
  const year = settings.data?.currentAcademicYear;
  return {
    id: typeof year === 'object' && year ? year._id : year ?? '',
    name: typeof year === 'object' && year ? year.name ?? '' : '',
    isLoading: settings.isLoading,
    isError: settings.isError,
    error: settings.error
  };
}

/** Refresh every mock query when another tab edits the data. Mount once (App). */
export function useMockDbSync() {
  const queryClient = useQueryClient();
  useEffect(() => onMockDbChange(() => queryClient.invalidateQueries({ queryKey: ROOT })), [queryClient]);
}

/** Mutation + toast + refresh of all mock data (sections, rooms and timetable depend on each other). */
function useMockMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, message: string | ((result: TResult) => string) | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (message) toast.success(typeof message === 'function' ? message(result) : message);
      queryClient.invalidateQueries({ queryKey: ROOT });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/* --------------------------------- rooms ---------------------------------- */

export const useRooms = () => useQuery({ queryKey: keys.rooms, queryFn: api.listRooms });
export const useCreateRoom = () => useMockMutation((p: RoomPayload) => api.createRoom(p), 'Room added.');
export const useUpdateRoom = () => useMockMutation(({ id, payload }: {id: string;payload: RoomPayload;}) => api.updateRoom(id, payload), 'Room updated.');
export const useDeleteRoom = () => useMockMutation((id: string) => api.deleteRoom(id), 'Room deleted.');

/* -------------------------------- sections -------------------------------- */

export const useSections = (academicYear: string, classLevelId?: string) =>
useQuery({ queryKey: keys.sections(academicYear, classLevelId), queryFn: () => api.listSections(academicYear, classLevelId), enabled: Boolean(academicYear) });

export const useSection = (id?: string) =>
useQuery({ queryKey: keys.section(id ?? ''), queryFn: () => api.getSection(id as string), enabled: Boolean(id), retry: false });

export const useStudentSection = (academicYear: string, studentId?: string) =>
useQuery({ queryKey: keys.studentSection(academicYear, studentId ?? ''), queryFn: () => api.findStudentSection(academicYear, studentId as string), enabled: Boolean(academicYear && studentId) });

export const useCreateSection = (academicYear: string) =>
useMockMutation((p: SectionPayload) => api.createSection(academicYear, p), (s) => `Section ${s.classLevel.name} / ${s.name} created.`);
export const useUpdateSection = () =>
useMockMutation(({ id, payload }: {id: string;payload: SectionPayload;}) => api.updateSection(id, payload), 'Section updated.');
export const useDeleteSection = () =>
useMockMutation((id: string) => api.deleteSection(id), (r) => r.removedPeriods ? `Section deleted with ${r.removedPeriods} timetable period(s).` : 'Section deleted.');
export const useAddStudents = () =>
useMockMutation(({ sectionId, students }: {sectionId: string;students: StudentRef[];}) => api.addStudents(sectionId, students), null);
export const useRemoveStudent = () =>
useMockMutation(({ sectionId, studentId }: {sectionId: string;studentId: string;}) => api.removeStudent(sectionId, studentId), 'Student removed from the section.');
export const useMoveStudent = () =>
useMockMutation(({ from, studentId, to }: {from: string;studentId: string;to: string;}) => api.moveStudent(from, studentId, to), (s) => `Moved to ${s.classLevel.name} / ${s.name}.`);
export const useDistributeStudents = (academicYear: string) =>
useMockMutation(
  ({ classLevelId, students }: {classLevelId: string;students: StudentRef[];}) => api.distributeStudents(academicYear, classLevelId, students),
  (r) => r.left ? `${r.assigned} student(s) seated, ${r.left} left without a seat (sections are full).` : `${r.assigned} student(s) seated.`
);

/* ------------------------------- school day -------------------------------- */

export const useSchoolDay = () => useQuery({ queryKey: keys.schoolDay, queryFn: api.getSchoolDay });
export const useUpdateSchoolDay = () =>
useMockMutation(({ schoolDay, removeOrphans }: {schoolDay: SchoolDay;removeOrphans?: boolean;}) => api.updateSchoolDay(schoolDay, { removeOrphans }), 'School day saved.');

/* -------------------------------- timetable -------------------------------- */

export const useTimetable = (query: api.TimetableQuery, enabled = true) =>
useQuery({ queryKey: keys.timetable(query), queryFn: () => api.listTimetable(query), enabled: enabled && Boolean(query.academicYear) });

export const useSaveEntry = (academicYear: string) =>
useMockMutation(({ payload, id }: {payload: TimetableEntryPayload;id?: string;}) => api.saveEntry(academicYear, payload, id), (e) => `${e.subject.name} saved.`);
export const useDeleteEntry = () => useMockMutation((id: string) => api.deleteEntry(id), 'Period cleared.');
export const useClearSectionTimetable = () =>
useMockMutation((sectionId: string) => api.clearSectionTimetable(sectionId), (r) => `${r.removed} period(s) removed.`);
export const useCopyTimetable = (academicYear: string) =>
useMockMutation(
  ({ from, to }: {from: string;to: string;}) => api.copyTimetable(academicYear, from, to),
  (r) => r.skipped.length ? `${r.copied} period(s) copied, ${r.skipped.length} skipped because of clashes.` : `${r.copied} period(s) copied.`
);

/* ------------------------------ portal helpers ----------------------------- */

/** A teacher's week: periods taught + sections taught or led (homeroom). */
export function useTeacherWeek(teacherId?: string) {
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const entries = useTimetable({ academicYear: year.id, teacher: teacherId }, Boolean(teacherId));
  const sections = useSections(year.id);
  const mySections = useMemo(() => {
    // no id yet => nothing (undefined === undefined would match sections without a homeroom teacher)
    if (!teacherId) return [];
    const taught = new Set((entries.data ?? []).map((e) => e.section._id));
    return (sections.data ?? []).filter((s) => taught.has(s._id) || s.homeroomTeacher?._id === teacherId);
  }, [entries.data, sections.data, teacherId]);
  return {
    year,
    schoolDay: schoolDay.data,
    entries: entries.data,
    sections: mySections,
    isLoading: year.isLoading || schoolDay.isLoading || entries.isLoading || sections.isLoading,
    error: schoolDay.error ?? entries.error ?? sections.error
  };
}

/** A student's section and its week (also used by parents for a child). */
export function useStudentWeek(studentId?: string) {
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const section = useStudentSection(year.id, studentId);
  const sectionId = section.data?._id;
  const entries = useTimetable({ academicYear: year.id, section: sectionId }, Boolean(sectionId));
  return {
    year,
    schoolDay: schoolDay.data,
    section: section.data ?? null,
    entries: sectionId ? entries.data : [],
    isLoading: year.isLoading || schoolDay.isLoading || section.isLoading || Boolean(sectionId) && entries.isLoading,
    error: schoolDay.error ?? section.error ?? entries.error
  };
}

/* ------------------------- real records as references ---------------------- */

const nameOf = (value: unknown): string | undefined =>
typeof value === 'object' && value && 'name' in value ? String((value as {name: unknown;}).name) : undefined;
const idOf = (value: unknown): string | undefined =>
typeof value === 'string' ? value : typeof value === 'object' && value && '_id' in value ? String((value as {_id: unknown;})._id) : undefined;

/**
 * Real class levels, students, teachers and subjects from the backend,
 * shaped as the {_id, name} references the mock features store.
 * Admin-portal only (these lists need admin permissions).
 */
export function useSchoolDirectory() {
  const levels = useClassLevels();
  const students = useStudents({});
  const teachers = useTeachers({});
  const subjects = useSubjects();

  const data = useMemo(() => {
    const classLevels: Ref[] = (levels.data?.items ?? []).
    map((l) => ({ _id: l._id, name: l.name })).
    sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    // a student's current level is the last of his class levels (populated by the backend)
    const studentsByLevel: Record<string, StudentRef[]> = {};
    const levelOfStudent: Record<string, string> = {};
    (students.data?.items ?? []).forEach((s) => {
      if (s.isWithdrawn) return;
      const levelsOfStudent = (s.classLevels ?? []) as unknown[];
      const current = idOf(levelsOfStudent[levelsOfStudent.length - 1]);
      if (!current) return;
      levelOfStudent[s._id] = current;
      (studentsByLevel[current] ??= []).push({ _id: s._id, name: s.name, studentId: s.studentId });
    });
    const teacherRefs = (teachers.data?.items ?? []).
    filter((t) => !t.isWithdrawn).
    map((t) => ({ _id: t._id, name: t.name, subjectName: nameOf(t.subject) ?? (typeof t.subject === 'string' ? t.subject : undefined) })).
    sort((a, b) => a.name.localeCompare(b.name));
    const subjectRefs: Ref[] = (subjects.data?.items ?? []).map((s) => ({ _id: s._id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name));
    return { classLevels, studentsByLevel, levelOfStudent, teachers: teacherRefs, subjects: subjectRefs };
  }, [levels.data, students.data, teachers.data, subjects.data]);

  const queries = [levels, students, teachers, subjects];
  return {
    ...data,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.isError)?.error,
    refetch: () => queries.forEach((q) => q.refetch())
  };
}

/* ---------------------------------- demo ----------------------------------- */

export const useGenerateDemo = () =>
useMockMutation(api.generateDemo, (r) => `Demo ready: ${r.sections} sections, ${r.students} students seated, ${r.rooms} rooms, ${r.periods} periods.`);

export function useResetMockData() {
  const queryClient = useQueryClient();
  return () => {
    resetMockDb();
    queryClient.invalidateQueries({ queryKey: ROOT });
    toast.success('Demo data cleared.');
  };
}
