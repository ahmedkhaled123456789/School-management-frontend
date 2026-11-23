import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  getMyChild,
  getParentProfile,
  listMyChildResults,
  listMyChildren,
  updateParentProfile } from
'../../api/parentPortal';
import { queryKeys } from '../../lib/queryKeys';
import type { ListParams } from '../../types/common';
import type { ParentSelfUpdatePayload } from '../../types/parentPortal';
import { useAuth } from '../auth';

export function useMyChildren(params: ListParams = {}) {
  return useQuery({
    queryKey: queryKeys.myChildren(params),
    queryFn: ({ signal }) => listMyChildren(params, signal),
    placeholderData: keepPreviousData
  });
}

export function useMyChild(studentId?: string) {
  return useQuery({
    queryKey: queryKeys.myChild(studentId ?? ''),
    queryFn: ({ signal }) => getMyChild(studentId as string, signal),
    enabled: Boolean(studentId),
    // 403 / 404 will not fix themselves by retrying
    retry: false
  });
}

export function useMyChildResults(studentId: string | undefined, params: ListParams) {
  return useQuery({
    queryKey: queryKeys.myChildResults(studentId ?? '', params),
    queryFn: ({ signal }) => listMyChildResults(studentId as string, params, signal),
    enabled: Boolean(studentId),
    placeholderData: keepPreviousData,
    retry: false
  });
}

export function useParentProfile() {
  return useQuery({
    queryKey: queryKeys.parentProfile,
    queryFn: ({ signal }) => getParentProfile(signal)
  });
}

/** Updates the parent's own profile and keeps the header name/email in sync. */
export function useUpdateParentProfile() {
  const queryClient = useQueryClient();
  const { session, signIn } = useAuth();
  return useMutation({
    mutationFn: (payload: ParentSelfUpdatePayload) => updateParentProfile(payload),
    onSuccess: (parent) => {
      toast.success('Profile updated.');
      if (session) {
        signIn({
          ...session,
          user: { ...session.user, name: parent.name ?? session.user.name, email: parent.email ?? session.user.email }
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.parentProfile });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}
