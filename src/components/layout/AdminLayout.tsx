import { DashboardShell } from './DashboardShell';
import { ADMIN_NAV } from './navigation';
import { usePermissionSync } from '../../hooks/permissions';

export function AdminLayout() {
  // admins and staff share this portal; keep their permissions fresh
  usePermissionSync();
  return <DashboardShell role="admin" navItems={ADMIN_NAV} />;
}
