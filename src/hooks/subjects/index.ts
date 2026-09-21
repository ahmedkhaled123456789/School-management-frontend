import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createSubject,
  deleteSubject,
  getSubject,
  listSubjects,
  updateSubject } from
'../../api/subjects';
import { queryKeys } from '../../lib/queryKeys';
import type { SubjectPayload } from '../../types/subject';

export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects,
    queryFn: ({ signal }) => listSubjects(signal)
  });
}

export function useSubject(id?: string) {
  return useQuery({
    queryKey: queryKeys.subject(id ?? ''),
    queryFn: ({ signal }) => getSubject(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubjectPayload) => createSubject(payload),
    onSuccess: () => {
      toast.success('Subject created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: SubjectPayload;}) =>
    updateSubject(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Subject updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
      queryClient.invalidateQueries({ queryKey: queryKeys.subject(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      toast.success('Subject deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}