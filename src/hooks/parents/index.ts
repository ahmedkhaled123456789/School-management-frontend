import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { createParent, getParent, listParents, updateParent } from '../../api/parents';
import { queryKeys } from '../../lib/queryKeys';
import type { CreateParentPayload, UpdateParentPayload } from '../../types/parent';

export function useParents() {
  return useQuery({ queryKey: queryKeys.parents, queryFn: ({ signal }) => listParents(signal) });
}

export function useParent(id?: string) {
  return useQuery({ queryKey: queryKeys.parent(id ?? ''), queryFn: ({ signal }) => getParent(id as string, signal), enabled: Boolean(id) });
}

export function useCreateParent() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: CreateParentPayload) => createParent(payload), onSuccess: () => { toast.success('Parent created.'); queryClient.invalidateQueries({ queryKey: queryKeys.parents }); }, onError: (error) => toast.error(errorMessage(error)) });
}

export function useUpdateParent() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateParentPayload }) => updateParent(id, payload), onSuccess: (_data, variables) => { toast.success('Parent updated.'); queryClient.invalidateQueries({ queryKey: queryKeys.parents }); queryClient.invalidateQueries({ queryKey: queryKeys.parent(variables.id) }); }, onError: (error) => toast.error(errorMessage(error)) });
}