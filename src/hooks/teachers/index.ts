import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  assignTeacher,
  adminUpdateTeacher,
  createTeacher,
  deleteTeacher,
  getTeacher,
  getTeacherProfile,
  listTeachers,
  updateTeacherProfile } from
'../../api/teachers';
import { queryKeys } from '../../lib/queryKeys';
import type { ListParams } from '../../types/common';
import type {
  AssignTeacherPayload,
  AdminUpdateTeacherPayload,
  CreateTeacherPayload,
  TeacherSelfUpdatePayload } from
'../../types/teacher';

export function useTeachers(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.teachers(params),
    queryFn: ({ signal }) => listTeachers(params, signal),
    placeholderData: keepPreviousData
  });
}

export function useTeacher(teacherID?: string) {
  return useQuery({
    queryKey: queryKeys.teacher(teacherID ?? ''),
    queryFn: ({ signal }) => getTeacher(teacherID as string, signal),
    enabled: Boolean(teacherID)
  });
}

export function useTeacherProfile() {
  return useQuery({
    queryKey: queryKeys.teacherProfile,
    queryFn: ({ signal }) => getTeacherProfile(signal)
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeacherPayload) => createTeacher(payload),
    onSuccess: () => {
      toast.success('Teacher account created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.teachersRoot });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useAssignTeacher(teacherID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignTeacherPayload) => assignTeacher(teacherID, payload),
    onSuccess: () => {
      toast.success('Teacher assignment saved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.teachersRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.teacher(teacherID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateTeacher(teacherID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUpdateTeacherPayload) => adminUpdateTeacher(teacherID, payload),
    onSuccess: () => {
      toast.success('Teacher updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.teachersRoot });
      queryClient.invalidateQueries({ queryKey: queryKeys.teacher(teacherID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teacherID: string) => deleteTeacher(teacherID),
    onSuccess: (_data, teacherID) => {
      toast.success('Teacher deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.teachersRoot });
      queryClient.removeQueries({ queryKey: queryKeys.teacher(teacherID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateTeacherProfile(teacherID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TeacherSelfUpdatePayload) => updateTeacherProfile(teacherID, payload),
    onSuccess: () => {
      toast.success('Profile updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherProfile });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}