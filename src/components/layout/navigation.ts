import type { LucideIcon } from 'lucide-react';
import {
  AwardIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  FileQuestionIcon,
  GraduationCapIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  PlusSquareIcon,
  UserCogIcon,
  UsersIcon,
  WalletCardsIcon,
  ReceiptTextIcon } from
'lucide-react';
import type { Role } from '../../types/common';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export const ADMIN_NAV: NavItem[] = [
{ label: 'Dashboard', to: '/admin', icon: LayoutDashboardIcon, end: true },
{ label: 'Students', to: '/admin/students', icon: GraduationCapIcon },
{ label: 'Teachers', to: '/admin/teachers', icon: UsersIcon },
{ label: 'Programs', to: '/admin/programs', icon: LayersIcon },
{ label: 'Subjects', to: '/admin/subjects', icon: BookOpenIcon },
{ label: 'Class Levels', to: '/admin/classes', icon: ListChecksIcon },
{ label: 'Academic Years', to: '/admin/academic-years', icon: CalendarRangeIcon },
{ label: 'Academic Terms', to: '/admin/academic-terms', icon: ClipboardListIcon },
{ label: 'Year Groups', to: '/admin/year-groups', icon: UsersIcon },
{ label: 'Exam Results', to: '/admin/exam-results', icon: AwardIcon },
{ label: 'Parents', to: '/admin/parents', icon: UsersIcon },
{ label: 'Fees Groups', to: '/admin/fees-groups', icon: WalletCardsIcon },
{ label: 'Expenses', to: '/admin/expenses', icon: ReceiptTextIcon },
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


export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administration',
  teacher: 'Teaching Staff',
  student: 'Student Portal'
};