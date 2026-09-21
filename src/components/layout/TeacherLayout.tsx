import React from 'react';
import { DashboardShell } from './DashboardShell';
import { TEACHER_NAV } from './navigation';

export function TeacherLayout() {
  return <DashboardShell role="teacher" navItems={TEACHER_NAV} />;
}