import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createYearGroup,
  deleteYearGroup,
  getYearGroup,
  listYearGroups,
  updateYearGroup } from
'../../api/yearGroups';
import { queryKeys } from '../../lib/queryKeys';
import type { YearGroupPayload } from '../../types/yearGroup';

export function useYearGroups() {
  return useQuery({
    queryKey: queryKeys.yearGroups,
    queryFn: ({ signal }) => listYearGroups(signal)
  });
}

export function useYearGroup(id?: string) {
  return useQuery({
    queryKey: queryKeys.yearGroup(id ?? ''),
    queryFn: ({ signal }) => getYearGroup(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateYearGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: YearGroupPayload) => createYearGroup(payload),
    onSuccess: () => {
      toast.success('Year group created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGroups });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateYearGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: YearGroupPayload;}) =>
    updateYearGroup(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Year group updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGroups });
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGroup(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteYearGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteYearGroup(id),
    onSuccess: () => {
      toast.success('Year group deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.yearGroups });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}