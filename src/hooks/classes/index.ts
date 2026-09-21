import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createClassLevel,
  deleteClassLevel,
  getClassLevel,
  listClassLevels,
  updateClassLevel } from
'../../api/classes';
import { queryKeys } from '../../lib/queryKeys';
import type { ClassLevelPayload } from '../../types/classLevel';

export function useClassLevels() {
  return useQuery({
    queryKey: queryKeys.classLevels,
    queryFn: ({ signal }) => listClassLevels(signal)
  });
}

export function useClassLevel(id?: string) {
  return useQuery({
    queryKey: queryKeys.classLevel(id ?? ''),
    queryFn: ({ signal }) => getClassLevel(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateClassLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClassLevelPayload) => createClassLevel(payload),
    onSuccess: () => {
      toast.success('Class level created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.classLevels });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateClassLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: ClassLevelPayload;}) =>
    updateClassLevel(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Class level updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.classLevels });
      queryClient.invalidateQueries({ queryKey: queryKeys.classLevel(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteClassLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClassLevel(id),
    onSuccess: () => {
      toast.success('Class level deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.classLevels });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}