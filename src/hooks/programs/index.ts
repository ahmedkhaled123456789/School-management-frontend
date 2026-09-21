import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  updateProgram } from
'../../api/programs';
import { queryKeys } from '../../lib/queryKeys';
import type { ProgramPayload } from '../../types/program';

export function usePrograms() {
  return useQuery({
    queryKey: queryKeys.programs,
    queryFn: ({ signal }) => listPrograms(signal)
  });
}

export function useProgram(id?: string) {
  return useQuery({
    queryKey: queryKeys.program(id ?? ''),
    queryFn: ({ signal }) => getProgram(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProgramPayload) => createProgram(payload),
    onSuccess: () => {
      toast.success('Program created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.programs });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: ProgramPayload;}) =>
    updateProgram(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Program updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.programs });
      queryClient.invalidateQueries({ queryKey: queryKeys.program(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProgram(id),
    onSuccess: () => {
      toast.success('Program deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.programs });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}