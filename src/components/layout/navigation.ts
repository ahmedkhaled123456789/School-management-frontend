import type { LucideIcon } from 'lucide-react';
import {
  AwardIcon,
  ChartPieIcon,
  PaletteIcon,
  BanknoteIcon,
  BookOpenIcon,
  ChartColumnIcon,
  FileTextIcon,
  PercentIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ClockIcon,
  DoorOpenIcon,
  LayoutGridIcon,
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
  CogIcon,
  BedDoubleIcon,
  BusIcon,
  CalendarCheckIcon,
  FileSignatureIcon,
  HeartPulseIcon,
  IdCardIcon,
  LibraryBigIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PartyPopperIcon,
  PlaneIcon,
  SendIcon,
  StoreIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UserPlusIcon,
  VideoIcon,
  WandSparklesIcon } from
'lucide-react';
import type { Role } from '../../types/common';
import { PERMISSIONS, type Permission } from '../../lib/permissions';
import type { ModuleId } from '../../lib/modules';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  /** Hidden from admin-portal users without this permission. */
  permission?: Permission;
  /** Planned module not built yet: shown as "Soon" and routed to its placeholder page. */
  module?: ModuleId;
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
{ label: 'Reports', to: '/admin/reports', icon: ChartPieIcon },
{
  id: 'students',
  label: 'Students',
  icon: GraduationCapIcon,
  children: [
  { label: 'All Students', to: '/admin/students', icon: GraduationCapIcon, permission: P.STUDENTS_READ },
  { label: 'Parents', to: '/admin/parents', icon: UsersRoundIcon, permission: P.STUDENTS_READ },
  { label: 'Admissions', to: '/admin/admissions', icon: UserPlusIcon, permission: P.STUDENTS_READ },
  { label: 'Attendance', to: '/admin/attendance', icon: CalendarCheckIcon, permission: P.STUDENTS_READ },
  { label: 'Health', to: '/admin/health', icon: HeartPulseIcon, permission: P.STUDENTS_READ },
  { label: 'Certificates', to: '/admin/certificates', icon: IdCardIcon, permission: P.STUDENTS_READ }]

},
{
  id: 'academics',
  label: 'Academics',
  icon: LibraryIcon,
  children: [
  { label: 'Programs', to: '/admin/programs', icon: LayersIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Subjects', to: '/admin/subjects', icon: BookOpenIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Class Levels', to: '/admin/classes', icon: ListChecksIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Sections', to: '/admin/academics/sections', icon: LayoutGridIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Timetable', to: '/admin/academics/timetable', icon: CalendarDaysIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'Scheduler', to: '/admin/academics/auto-scheduler', icon: WandSparklesIcon, permission: P.ACADEMICS_MANAGE, module: 'auto-timetable' },
  { label: 'Online Classes', to: '/admin/academics/online-classes', icon: VideoIcon, permission: P.ACADEMICS_MANAGE, module: 'online-classes' },
  { label: 'Rooms', to: '/admin/academics/rooms', icon: DoorOpenIcon, permission: P.ACADEMICS_MANAGE },
  { label: 'School Day', to: '/admin/academics/school-day', icon: ClockIcon, permission: P.ACADEMICS_MANAGE },
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
  { label: 'Staff Accounts', to: '/admin/staff', icon: BriefcaseIcon, permission: P.STAFF_MANAGE },
  { label: 'Attendance', to: '/admin/hr/attendance', icon: UserCheckIcon, permission: P.STAFF_MANAGE },
  { label: 'Contracts', to: '/admin/hr/contracts', icon: FileSignatureIcon, permission: P.STAFF_MANAGE },
  { label: 'Leave', to: '/admin/hr/leave', icon: PlaneIcon, permission: P.STAFF_MANAGE },
  { label: 'Performance', to: '/admin/hr/performance', icon: TrendingUpIcon, permission: P.STAFF_MANAGE }]

},
{
  id: 'finance',
  label: 'Finance',
  icon: WalletIcon,
  children: [
  { label: 'Invoices', to: '/admin/finance/invoices', icon: FileTextIcon, permission: P.FINANCE_MANAGE },
  { label: 'Payments', to: '/admin/finance/payments', icon: BanknoteIcon, permission: P.FINANCE_MANAGE },
  { label: 'Reports', to: '/admin/finance/reports', icon: ChartColumnIcon, permission: P.FINANCE_MANAGE },
  { label: 'Fee Structures', to: '/admin/finance/fee-structures', icon: LayersIcon, permission: P.FINANCE_MANAGE },
  { label: 'Fee Items', to: '/admin/finance/fee-items', icon: WalletCardsIcon, permission: P.FINANCE_MANAGE },
  { label: 'Discounts', to: '/admin/finance/discounts', icon: PercentIcon, permission: P.FINANCE_MANAGE },
  { label: 'Expenses', to: '/admin/expenses', icon: ReceiptTextIcon, permission: P.FINANCE_MANAGE }]

},
{
  id: 'communication',
  label: 'Communication',
  icon: MessagesSquareIcon,
  children: [
  { label: 'Notices', to: '/admin/communication/announcements', icon: MegaphoneIcon, permission: P.STUDENTS_READ },
  { label: 'Messages', to: '/admin/communication/messages', icon: MessagesSquareIcon, permission: P.STUDENTS_READ },
  { label: 'SMS & Email', to: '/admin/communication/outbox', icon: SendIcon, permission: P.STUDENTS_READ },
  { label: 'Events', to: '/admin/events', icon: PartyPopperIcon, permission: P.STUDENTS_READ }]

},
{
  id: 'services',
  label: 'Services',
  icon: StoreIcon,
  children: [
  { label: 'Library', to: '/admin/library', icon: LibraryBigIcon, permission: P.STUDENTS_READ },
  { label: 'Transport', to: '/admin/transport', icon: BusIcon, permission: P.STUDENTS_READ },
  { label: 'Canteen', to: '/admin/canteen', icon: StoreIcon, permission: P.STUDENTS_READ },
  { label: 'Hostel', to: '/admin/hostel', icon: BedDoubleIcon, permission: P.STUDENTS_READ }]

},
{
  id: 'system',
  label: 'System',
  icon: CogIcon,
  children: [
  { label: 'Administrators', to: '/admin/administrators', icon: ShieldCheckIcon, permission: P.ADMINS_MANAGE },
  { label: 'Audit Log', to: '/admin/audit-log', icon: HistoryIcon, permission: P.AUDIT_READ },
  { label: 'School Settings', to: '/admin/settings', icon: SettingsIcon, permission: P.SETTINGS_MANAGE },
  { label: 'Branding', to: '/admin/branding', icon: PaletteIcon, permission: P.SETTINGS_MANAGE }]

},
{ label: 'Profile', to: '/admin/profile', icon: UserCogIcon }];


export const TEACHER_NAV: NavItem[] = [
{ label: 'Dashboard', to: '/teacher', icon: LayoutDashboardIcon, end: true },
{ label: 'My Timetable', to: '/teacher/timetable', icon: CalendarDaysIcon },
{ label: 'My Sections', to: '/teacher/sections', icon: LayoutGridIcon },
{ label: 'My Exams', to: '/teacher/exams', icon: ClipboardListIcon },
{ label: 'Create Exam', to: '/teacher/exams/new', icon: PlusSquareIcon },
{ label: 'Questions', to: '/teacher/questions', icon: FileQuestionIcon },
{ label: 'Attendance', to: '/teacher/attendance', icon: CalendarCheckIcon },
{ label: 'Online Classes', to: '/teacher/online-classes', icon: VideoIcon, module: 'online-classes' },
{ label: 'Messages', to: '/teacher/messages', icon: MessagesSquareIcon },
{ label: 'Leave & HR', to: '/teacher/leave', icon: PlaneIcon },
{ label: 'Profile', to: '/teacher/profile', icon: UserCogIcon }];


export const STUDENT_NAV: NavItem[] = [
{ label: 'Dashboard', to: '/student', icon: LayoutDashboardIcon, end: true },
{ label: 'My Timetable', to: '/student/timetable', icon: CalendarDaysIcon },
{ label: 'My Profile', to: '/student/profile', icon: UserCogIcon },
{ label: 'My Exams', to: '/student/exams', icon: ClipboardListIcon },
{ label: 'Exam Results', to: '/student/results', icon: AwardIcon },
{ label: 'Attendance', to: '/student/attendance', icon: CalendarCheckIcon },
{ label: 'Online Classes', to: '/student/online-classes', icon: VideoIcon, module: 'online-classes' },
{ label: 'Library', to: '/student/library', icon: LibraryBigIcon },
{ label: 'Announcements', to: '/student/announcements', icon: MegaphoneIcon },
{ label: 'Certificates', to: '/student/certificates', icon: AwardIcon }];


export const PARENT_NAV: NavItem[] = [
{ label: 'My Children', to: '/parent', icon: LayoutDashboardIcon, end: true },
{ label: 'Attendance', to: '/parent/attendance', icon: CalendarCheckIcon },
{ label: 'Messages', to: '/parent/messages', icon: MessagesSquareIcon },
{ label: 'Events', to: '/parent/events', icon: PartyPopperIcon },
{ label: 'Transport', to: '/parent/transport', icon: BusIcon },
{ label: 'Canteen', to: '/parent/canteen', icon: StoreIcon },
{ label: 'My Profile', to: '/parent/profile', icon: UserCogIcon }];


/** Placeholder routes for planned modules, relative to the portal root. */
export function plannedRoutes(entries: NavEntry[]) {
  return flattenNav(entries).
  filter((item) => item.module).
  map((item) => ({ ...item, path: item.to.split('/').slice(2).join('/') }));
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administration',
  teacher: 'Teaching Staff',
  student: 'Student Portal',
  parent: 'Parent Portal'
};
