import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createParent,
  getParent,
  linkStudentToParent,
  listParents,
  unlinkStudentFromParent,
  updateParent } from
'../../api/parents';
import { queryKeys } from '../../lib/queryKeys';
import type { CreateParentPayload, UpdateParentPayload } from '../../types/parent';

export function useParents(enabled = true) {
  return useQuery({ queryKey: queryKeys.parents, queryFn: ({ signal }) => listParents(signal), enabled });
}

export function useParent(id?: string) {
  return useQuery({ queryKey: queryKeys.parent(id ?? ''), queryFn: ({ signal }) => getParent(id as string, signal), enabled: Boolean(id) });
}

export function useCreateParent() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (payload: CreateParentPayload) => createParent(payload), onSuccess: () => { toast.success('Parent created.'); queryClient.invalidateQueries({ queryKey: queryKeys.parents }); }, onError: (error) => toast.error(errorMessage(error)) });
}

interface LinkVariables {
  parentId: string;
  studentId: string;
}

/** Link / unlink change both documents, so refresh both sides of the relation. */
function useParentStudentLinkMutation(action: 'link' | 'unlink') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parentId, studentId }: LinkVariables) =>
    action === 'link' ?
    linkStudentToParent(parentId, studentId) :
    unlinkStudentFromParent(parentId, studentId),
    onSuccess: (_data, { parentId, studentId }) => {
      toast.success(action === 'link' ? 'Student linked to parent.' : 'Student unlinked from parent.');
      queryClient.invalidateQueries({ queryKey: queryKeys.parents });
      queryClient.invalidateQueries({ queryKey: queryKeys.parent(parentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.student(studentId) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useLinkStudentToParent() {
  return useParentStudentLinkMutation('link');
}

export function useUnlinkStudentFromParent() {
  return useParentStudentLinkMutation('unlink');
}

export function useUpdateParent() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateParentPayload }) => updateParent(id, payload), onSuccess: (_data, variables) => { toast.success('Parent updated.'); queryClient.invalidateQueries({ queryKey: queryKeys.parents }); queryClient.invalidateQueries({ queryKey: queryKeys.parent(variables.id) }); }, onError: (error) => toast.error(errorMessage(error)) });
}