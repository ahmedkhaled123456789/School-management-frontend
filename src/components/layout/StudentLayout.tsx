import React from 'react';
import { DashboardShell } from './DashboardShell';
import { STUDENT_NAV } from './navigation';

export function StudentLayout() {
  return <DashboardShell role="student" navItems={STUDENT_NAV} />;
}