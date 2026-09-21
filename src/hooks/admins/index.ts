import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { getAdminProfile, listAdmins, updateAdmin } from '../../api/admins';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminUpdatePayload } from '../../types/admin';

export function useAdmins() {
  return useQuery({
    queryKey: queryKeys.admins,
    queryFn: ({ signal }) => listAdmins(signal)
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: queryKeys.adminProfile,
    queryFn: ({ signal }) => getAdminProfile(signal)
  });
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: AdminUpdatePayload;}) =>
    updateAdmin(id, payload),
    onSuccess: () => {
      toast.success('Profile updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.adminProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.admins });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}