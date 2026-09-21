import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createAcademicYear,
  deleteAcademicYear,
  getAcademicYear,
  listAcademicYears,
  updateAcademicYear } from
'../../api/academicYears';
import { queryKeys } from '../../lib/queryKeys';
import type { AcademicYearPayload } from '../../types/academicYear';

export function useAcademicYears() {
  return useQuery({
    queryKey: queryKeys.academicYears,
    queryFn: ({ signal }) => listAcademicYears(signal)
  });
}

export function useAcademicYear(id?: string) {
  return useQuery({
    queryKey: queryKeys.academicYear(id ?? ''),
    queryFn: ({ signal }) => getAcademicYear(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AcademicYearPayload) => createAcademicYear(payload),
    onSuccess: () => {
      toast.success('Academic year created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: AcademicYearPayload;}) =>
    updateAcademicYear(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Academic year updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYear(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAcademicYear(id),
    onSuccess: () => {
      toast.success('Academic year deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}