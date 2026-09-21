import type { ListParams } from '../types/common';

/** Single source of truth for every React Query key used in the app. */
export const queryKeys = {
  admins: ['admins'] as const,
  adminProfile: ['adminProfile'] as const,

  students: (params: ListParams) => ['students', params] as const,
  studentsRoot: ['students'] as const,
  student: (studentID: string) => ['student', studentID] as const,
  studentProfile: ['studentProfile'] as const,

  teachers: (params: ListParams) => ['teachers', params] as const,
  teachersRoot: ['teachers'] as const,
  teacher: (teacherID: string) => ['teacher', teacherID] as const,
  teacherProfile: ['teacherProfile'] as const,

  programs: ['programs'] as const,
  program: (id: string) => ['program', id] as const,

  subjects: ['subjects'] as const,
  subject: (id: string) => ['subject', id] as const,

  classLevels: ['classLevels'] as const,
  classLevel: (id: string) => ['classLevel', id] as const,

  academicYears: ['academicYears'] as const,
  academicYear: (id: string) => ['academicYear', id] as const,

  academicTerms: ['academicTerms'] as const,
  academicTerm: (id: string) => ['academicTerm', id] as const,

  yearGroups: ['yearGroups'] as const,
  yearGroup: (id: string) => ['yearGroup', id] as const,

  exams: ['exams'] as const,
  exam: (id: string) => ['exam', id] as const,

  questions: (examID: string) => ['questions', examID] as const,
  questionsRoot: ['questions'] as const,
  question: (id: string) => ['question', id] as const,

  examResults: ['examResults'] as const,
  examResult: (id: string) => ['examResult', id] as const,

  parents: ['parents'] as const,
  parent: (id: string) => ['parent', id] as const,
  feesGroups: ['feesGroups'] as const,
  feesGroup: (id: string) => ['feesGroup', id] as const,
  expenses: ['expenses'] as const,
  expense: (id: string) => ['expense', id] as const
};