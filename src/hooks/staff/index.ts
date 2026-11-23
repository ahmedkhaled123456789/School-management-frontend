import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createStaff,
  deleteStaff,
  getSettings,
  listAuditLogs,
  listStaff,
  updateMyStaffProfile,
  updateSettings,
  updateStaff } from
'../../api/staff';
import { queryKeys } from '../../lib/queryKeys';
import type { ListParams } from '../../types/common';
import type { SettingsPayload, StaffPayload } from '../../types/staff';
import { useAuth } from '../auth';

/* ------------------------------- staff ----------------------------------- */

export function useStaff() {
  return useQuery({ queryKey: queryKeys.staff, queryFn: ({ signal }) => listStaff(signal) });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffPayload) => createStaff(payload),
    onSuccess: () => {
      toast.success('Staff member created.');
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: StaffPayload;}) => updateStaff(id, payload),
    onSuccess: () => {
      toast.success('Staff member updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      toast.success('Staff member deleted.');
      queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/** A staff member edits his own profile; keeps the header name in sync. */
export function useUpdateMyStaffProfile() {
  const queryClient = useQueryClient();
  const { session, signIn } = useAuth();
  return useMutation({
    mutationFn: updateMyStaffProfile,
    onSuccess: (staff) => {
      toast.success('Profile updated.');
      if (session) signIn({ ...session, user: { ...session.user, name: staff.name, email: staff.email } });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/* ------------------------------ settings --------------------------------- */

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: ({ signal }) => getSettings(signal) });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SettingsPayload) => updateSettings(payload),
    onSuccess: (settings) => {
      toast.success('Settings saved.');
      queryClient.setQueryData(queryKeys.settings, settings);
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/* ------------------------------ audit log -------------------------------- */

export function useAuditLogs(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: ({ signal }) => listAuditLogs(params, signal),
    placeholderData: keepPreviousData
  });
}
