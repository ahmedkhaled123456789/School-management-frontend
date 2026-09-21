import React from 'react';
import { DashboardShell } from './DashboardShell';
import { ADMIN_NAV } from './navigation';

export function AdminLayout() {
  return <DashboardShell role="admin" navItems={ADMIN_NAV} />;
}