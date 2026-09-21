import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createAcademicTerm,
  deleteAcademicTerm,
  getAcademicTerm,
  listAcademicTerms,
  updateAcademicTerm } from
'../../api/academicTerms';
import { queryKeys } from '../../lib/queryKeys';
import type { AcademicTermPayload } from '../../types/academicTerm';

export function useAcademicTerms() {
  return useQuery({
    queryKey: queryKeys.academicTerms,
    queryFn: ({ signal }) => listAcademicTerms(signal)
  });
}

export function useAcademicTerm(id?: string) {
  return useQuery({
    queryKey: queryKeys.academicTerm(id ?? ''),
    queryFn: ({ signal }) => getAcademicTerm(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateAcademicTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AcademicTermPayload) => createAcademicTerm(payload),
    onSuccess: () => {
      toast.success('Academic term created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.academicTerms });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateAcademicTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: AcademicTermPayload;}) =>
    updateAcademicTerm(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Academic term updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.academicTerms });
      queryClient.invalidateQueries({ queryKey: queryKeys.academicTerm(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteAcademicTerm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAcademicTerm(id),
    onSuccess: () => {
      toast.success('Academic term deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.academicTerms });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}