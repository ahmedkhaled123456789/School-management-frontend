import type { LucideIcon } from 'lucide-react';
import {
  AwardIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  FileQuestionIcon,
  GraduationCapIcon,
  HistoryIcon,
  LayersIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  ListChecksIcon,
  PlusSquareIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
  UsersRoundIcon,
  WalletCardsIcon,
  WalletIcon,
  ReceiptTextIcon,
  CogIcon } from
'lucide-react';
import type { Role } from '../../types/common';
import { PERMISSIONS, type Permission } from '../../lib/permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  /** Hidden from admin-portal users without this permission. */
  permission?: Permission;
}

/** A collapsible sidebar section holding related pages. */
export interface NavGroup {
  /** Stable key, used to remember which sections are open. */
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export const isNavGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

/** Drops items the user may not open, and sections left empty. */
export function filterNav(entries: NavEntry[], can: (permission: Permission) => boolean): NavEntry[] {
  const allowed = (item: NavItem) => !item.permission || can(item.permission);
  return entries.flatMap<NavEntry>((entry) => {
    if (!isNavGroup(entry)) return allowed(entry) ? [entry] : [];
    const children = entry.children.filter(allowed);
    return children.length ? [{ ...entry, children }] : [];
  });
}

/** Every page link, sections flattened. */
export function flattenNav(entries: NavEntry[]): NavItem[] {
  return entries.flatMap((entry) => isNavGroup(entry) ? entry.children : [entry]);
}

const P = PERMISSIONS;

export const ADMIN_NAV: NavEntry[] = [
{ label: 'Dashboard', to: '/admin', icon: LayoutDashboardIcon, end: true },
{
  id: 'students',
  label: 'Students',
  icon: GraduationCapIcon,
  children: [
  { label: 'All Students', to: '/admin/students', icon: GraduationCapIcon, permission: P.STUDENTS_READ },
  { label: 'Parents', to: '/admin/parents', icon: UsersRoundIcon, permission: P.STUDENTS_READ }]

},
{
  id: 'academics',
  label: 'Academics',
  icon: LibraryIcon,
  children: [
  { label: 'Programs', to: '/admin/programs', icon: LayersIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Subjects', to: '/admin/subjects', icon: BookOpenIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Class Levels', to: '/admin/classes', icon: ListChecksIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Academic Years', to: '/admin/academic-years', icon: CalendarRangeIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Academic Terms', to: '/admin/academic-terms', icon: ClipboardListIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Year Groups', to: '/admin/year-groups', icon: UsersIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Exam Results', to: '/admin/exam-results', icon: AwardIcon, permission: P.ACADEMICS_MANAGE }]

},
{
  id: 'hr',
  label: 'Staff & HR',
  icon: BriefcaseIcon,
  children: [
  { label: 'Teachers', to: '/admin/teachers', icon: UsersIcon, permission: P.TEACHERS_MANAGE },
  { label: 'Staff Accounts', to: '/admin/staff', icon: BriefcaseIcon, permission: P.STAFF_MANAGE }]

},
{
  id: 'finance',
  label: 'Finance',
  icon: WalletIcon,
  children: [
  { label: 'Fees Groups', to: '/admin/fees-groups', icon: WalletCardsIcon, permission: P.FINANCE_MANAGE },
  { label: 'Expenses', to: '/admin/expenses', icon: ReceiptTextIcon, permission: P.FINANCE_MANAGE }]

},
{
  id: 'system',
  label: 'System',
  icon: CogIcon,
  children: [
  { label: 'Administrators', to: '/admin/administrators', icon: ShieldCheckIcon, permission: P.ADMINS_MANAGE },
  { label: 'Audit Log', to: '/admin/audit-log', icon: HistoryIcon, permission: P.AUDIT_READ },
  { label: 'School Settings', to: '/admin/settings', icon: SettingsIcon, permission: P.SETTINGS_MANAGE }]

},
{ label: 'Profile', to: '/admin/profile', icon: UserCogIcon }];


export const TEACHER_NAV: NavItem[] = [
{ label: 'Dashboard', to: '/teacher', icon: LayoutDashboardIcon, end: true },
{ label: 'My Exams', to: '/teacher/exams', icon: ClipboardListIcon },
{ label: 'Create Exam', to: '/teacher/exams/new', icon: PlusSquareIcon },
{ label: 'Questions', to: '/teacher/questions', icon: FileQuestionIcon },
{ label: 'Profile', to: '/teacher/profile', icon: UserCogIcon }];


export const STUDENT_NAV: NavItem[] = [
{ label: 'Dashboard', to: '/student', icon: LayoutDashboardIcon, end: true },
{ label: 'My Profile', to: '/student/profile', icon: UserCogIcon },
{ label: 'My Exams', to: '/student/exams', icon: ClipboardListIcon },
{ label: 'Exam Results', to: '/student/results', icon: AwardIcon }];


export const PARENT_NAV: NavItem[] = [
{ label: 'My Children', to: '/parent', icon: LayoutDashboardIcon, end: true },
{ label: 'My Profile', to: '/parent/profile', icon: UserCogIcon }];


export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administration',
  teacher: 'Teaching Staff',
  student: 'Student Portal',
  parent: 'Parent Portal'
};
