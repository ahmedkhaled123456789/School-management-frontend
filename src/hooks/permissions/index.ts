import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../../api/auth';
import { queryKeys } from '../../lib/queryKeys';
import type { Permission, StaffRole } from '../../lib/permissions';
import { useAuth } from '../auth';

/** Permission checks for the signed-in admin-portal user. */
export function usePermissions() {
  const { session } = useAuth();
  const permissions = session?.user.permissions;
  const staffRole = session?.user.staffRole as StaffRole | undefined;

  const can = useCallback(
    (permission: Permission) => {
      // sessions created before roles existed have no list yet: stay permissive
      // until PermissionSync refreshes it (the backend still enforces access).
      if (!permissions) return session?.role === 'admin';
      return permissions.includes(permission);
    },
    [permissions, session?.role]
  );

  return {
    can,
    staffRole,
    isSuperAdmin: staffRole === 'super_admin',
    /** admin or super admin (not accountant / registrar / hr) */
    isAdministrator: staffRole === 'super_admin' || staffRole === 'admin' || (!staffRole && session?.role === 'admin')
  };
}

/**
 * Keeps role + permissions in the session in sync with the backend, so a role
 * change by a super admin shows up without signing out. Mounted by AdminLayout.
 */
export function usePermissionSync() {
  const { session, signIn } = useAuth();
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => fetchMe(signal),
    enabled: session?.role === 'admin',
    staleTime: 60_000,
    refetchOnWindowFocus: true
  });

  useEffect(() => {
    if (!me.data || !session) return;
    const { role, permissions, data } = me.data;
    const current = session.user;
    const changed =
    current.staffRole !== role ||
    (current.permissions ?? []).join() !== permissions.join() ||
    current.name !== data.name ||
    current.image !== data.image;
    if (changed) {
      signIn({
        ...session,
        user: { ...current, staffRole: role, permissions, name: data.name, image: data.image }
      });
    }
  }, [me.data, session, signIn]);
}
