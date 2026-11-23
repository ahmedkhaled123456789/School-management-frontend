import { DashboardShell } from './DashboardShell';
import { PARENT_NAV } from './navigation';

export function ParentLayout() {
  return <DashboardShell role="parent" navItems={PARENT_NAV} />;
}
