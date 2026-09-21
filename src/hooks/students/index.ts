import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  adminUpdateStudent,
  createStudent,
  deleteStudent,
  getStudent,
  getStudentProfile,
  listStudents,
  updateStudentProfile,
  writeExam } from
'../../api/students';
import { queryKeys } from '../../lib/queryKeys';
import type { ListParams } from '../../types/common';
import type {
  AdminUpdateStudentPayload,
  CreateStudentPayload,
  StudentSelfUpdatePayload } from
'../../types/student';

export function useStudents(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.students(params),
    queryFn: ({ signal }) => listStudents(params, signal),
    placeholderData: keepPreviousData
  });
}

export function useStudent(studentID?: string) {
  return useQuery({
    queryKey: queryKeys.student(studentID ?? ''),
    queryFn: ({ signal }) => getStudent(studentID as string, signal),
    enabled: Boolean(studentID)
  });
}

export function useStudentProfile() {
  return useQuery({
    queryKey: queryKeys.studentProfile,
    queryFn: ({ signal }) => getStudentProfile(signal)
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudentPayload) => createStudent(payload),
    onSuccess: () => {
      toast.success('Student account created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.studentsRoot });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateStudent(studentID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateStudentPayload) => adminUpdateStudent(studentID, payload),
    onSuccess: () => {
      toast.success('Student record updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.studentsRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.student(studentID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StudentSelfUpdatePayload) => updateStudentProfile(payload),
    onSuccess: () => {
      toast.success('Profile updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.studentProfile });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (studentID: string) => deleteStudent(studentID),
    onSuccess: (_data, studentID) => {
      toast.success('Student deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.studentsRoot });
      queryClient.removeQueries({ queryKey: queryKeys.student(studentID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useWriteExam(examID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: string[]) => writeExam(examID, { answers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.examResults });
    }
  });
}