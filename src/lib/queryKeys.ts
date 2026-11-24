import type { ListParams } from '../types/common';

/** Single source of truth for every React Query key used in the app. */
export const queryKeys = {
  me: ['me'] as const,
  admins: ['admins'] as const,
  staff: ['staff'] as const,
  settings: ['settings'] as const,
  auditLogs: (params: ListParams) => ['auditLogs', params] as const,
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

  // parent portal (signed-in parent)
  parentProfile: ['parentProfile'] as const,
  myChildrenRoot: ['myChildren'] as const,
  myChildren: (params: ListParams) => ['myChildren', params] as const,
  myChild: (studentId: string) => ['myChild', studentId] as const,
  myChildResults: (studentId: string, params: ListParams) =>
  ['myChildResults', studentId, params] as const,

  // finance: everything below starts with 'finance' so one invalidation refreshes it all
  financeRoot: ['finance'] as const,
  feeItems: ['finance', 'feeItems'] as const,
  feeStructures: (params: ListParams) => ['finance', 'feeStructures', params] as const,
  discounts: ['finance', 'discounts'] as const,
  invoices: (params: ListParams) => ['finance', 'invoices', params] as const,
  invoice: (id: string) => ['finance', 'invoice', id] as const,
  payments: (params: ListParams) => ['finance', 'payments', params] as const,
  payment: (id: string) => ['finance', 'payment', id] as const,
  outstanding: (params: ListParams) => ['finance', 'outstanding', params] as const,
  collections: (params: ListParams) => ['finance', 'collections', params] as const,
  childInvoices: (studentId: string) => ['finance', 'childInvoices', studentId] as const,
  expenses: ['expenses'] as const,
  expense: (id: string) => ['expense', id] as const
};