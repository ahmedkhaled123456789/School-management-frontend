import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { createAdmin, deleteAdmin, getAdminProfile, listAdmins, updateAdmin } from '../../api/admins';
import { queryKeys } from '../../lib/queryKeys';
import type { AdminUpdatePayload, CreateAdminPayload } from '../../types/admin';

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

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminPayload) => createAdmin(payload),
    onSuccess: () => {
      toast.success('Administrator created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admins });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/** Super admin editing another administrator (details, password, role). */
export function useUpdateAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: AdminUpdatePayload;}) => updateAdmin(id, payload),
    onSuccess: () => {
      toast.success('Administrator updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admins });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAdmin(id),
    onSuccess: () => {
      toast.success('Administrator deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admins });
    },
    onError: (error) => toast.error(errorMessage(error))
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