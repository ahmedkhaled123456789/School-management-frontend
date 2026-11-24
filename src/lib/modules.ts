/**
 * The school-wide modules that are planned but not built yet. One list drives
 * the sidebar entries (marked "Soon"), their routes and the placeholder page
 * that explains what each module will do and what it connects to.
 *
 * Modules are delivered two at a time, in `round` order.
 */
import type { LucideIcon } from 'lucide-react';
import {
  BedDoubleIcon,
  BusIcon,
  CalendarCheckIcon,
  HeartPulseIcon,
  IdCardIcon,
  LibraryBigIcon,
  MessagesSquareIcon,
  PartyPopperIcon,
  UserPlusIcon,
  UsersIcon,
  VideoIcon,
  WandSparklesIcon } from
'lucide-react';
import type { Role } from '../types/common';

export type ModuleId =
'attendance' |
'health' |
'communication' |
'events' |
'admissions' |
'certificates' |
'library' |
'transport' |
'hr' |
'hostel-canteen' |
'auto-timetable' |
'online-classes';

export interface ModuleLink {
  label: string;
  /** admin-portal page of an existing feature it builds on */
  to?: string;
}

export interface ModuleInfo {
  id: ModuleId;
  title: string;
  icon: LucideIcon;
  /** delivery round; two modules per round */
  round: number;
  summary: string;
  features: string[];
  /** existing parts of the system this module uses or feeds */
  connects: ModuleLink[];
  /** honest limits of the frontend-only phase */
  notes?: string[];
  /** what each portal will get */
  portals: Partial<Record<Role, string>>;
  /** built: the admin page that replaced the placeholder */
  live?: string;
}

export const MODULES: Record<ModuleId, ModuleInfo> = {
  attendance: {
    id: 'attendance',
    title: 'Attendance',
    icon: CalendarCheckIcon,
    round: 1,
    live: '/admin/attendance',
    summary: 'Daily and per-period attendance for students and staff, taken from the timetable, with QR check-in and reports.',
    features: [
    'Teachers take attendance for each period straight from their timetable',
    'Present / absent / late / excused, with a reason and a note',
    'QR check-in at the gate using the student ID card',
    'Staff clock-in / clock-out and import from a fingerprint device (CSV)',
    'Daily register per section, absence streak alerts',
    'Attendance rate on dashboards and in Reports'],

    connects: [
    { label: 'Timetable', to: '/admin/academics/timetable' },
    { label: 'Sections', to: '/admin/academics/sections' },
    { label: 'Reports', to: '/admin/reports' },
    { label: 'Health Records' },
    { label: 'Communication' }],

    notes: ['A fingerprint device needs a backend connection; for now records are imported from the device as a CSV file.'],
    portals: {
      admin: 'School-wide registers, corrections and reports',
      teacher: 'Take attendance for your periods',
      student: 'Your attendance record and rate',
      parent: "Your child's attendance and absence alerts"
    }
  },
  health: {
    id: 'health',
    title: 'Health Records',
    icon: HeartPulseIcon,
    round: 1,
    live: '/admin/health',
    summary: "Each student's medical profile: allergies, conditions, vaccinations and clinic visits.",
    features: [
    'Allergies and chronic conditions, highlighted wherever the student appears',
    'Vaccination schedule with due / overdue status',
    'Clinic visit log: complaint, action taken, sent home',
    'A clinic visit that sends the student home marks the absence as excused',
    'Emergency contacts and blood type on the student profile'],

    connects: [
    { label: 'Students', to: '/admin/students' },
    { label: 'Attendance' },
    { label: 'Certificates & ID Cards' }],

    portals: {
      admin: 'Medical profiles and the clinic log',
      parent: "Update your child's allergies and vaccinations"
    }
  },
  communication: {
    id: 'communication',
    title: 'Communication',
    icon: MessagesSquareIcon,
    round: 2,
    summary: 'Announcements, teacher–parent messages and notifications that every other module can send.',
    features: [
    'Announcements to the whole school, a year group, a section or staff',
    'One-to-one messages between teachers and parents',
    'Notification bell in the top bar for every portal',
    'Automatic notices: absence, unpaid invoice, published results, event approvals',
    'SMS / email outbox with delivery status'],

    connects: [
    { label: 'Attendance' },
    { label: 'Invoices', to: '/admin/finance/invoices' },
    { label: 'Exam Results', to: '/admin/exam-results' },
    { label: 'Events' }],

    notes: ['Real SMS, email and push sending needs a provider on the server; until then messages land in an outbox you can inspect.'],
    portals: {
      admin: 'Announcements, outbox and message moderation',
      teacher: 'Message parents of your sections',
      student: 'School announcements',
      parent: 'Messages from teachers and school notices'
    }
  },
  events: {
    id: 'events',
    title: 'Events',
    icon: PartyPopperIcon,
    round: 2,
    summary: 'Trips, competitions and school events with parent consent and optional fees.',
    features: [
    'Events calendar for the school, a year group or a section',
    'Parent consent forms, approved from the parent portal',
    'Event fees become invoices in Finance',
    'Participant lists, capacity and waiting list',
    'Competition results and winners'],

    connects: [
    { label: 'Invoices', to: '/admin/finance/invoices' },
    { label: 'Communication' },
    { label: 'Sections', to: '/admin/academics/sections' }],

    portals: {
      admin: 'Create events and track consent and payments',
      teacher: 'Events for your sections',
      student: 'Upcoming events',
      parent: 'Approve trips and pay event fees'
    }
  },
  admissions: {
    id: 'admissions',
    title: 'Admissions',
    icon: UserPlusIcon,
    round: 3,
    summary: 'From application to enrolment: applications, entrance tests, decisions and waiting lists.',
    features: [
    'Application pipeline: new → test scheduled → accepted / waitlisted / rejected',
    'Entrance test slots and scores',
    'Seat capacity per year group and an ordered waiting list',
    'Convert an accepted applicant into a real student in one step',
    'Admission fee invoice on enrolment'],

    connects: [
    { label: 'Students', to: '/admin/students' },
    { label: 'Year Groups', to: '/admin/year-groups' },
    { label: 'Sections', to: '/admin/academics/sections' },
    { label: 'Invoices', to: '/admin/finance/invoices' }],

    portals: { admin: 'The admissions pipeline' }
  },
  certificates: {
    id: 'certificates',
    title: 'Certificates & ID Cards',
    icon: IdCardIcon,
    round: 3,
    summary: 'Printable certificates and student / staff ID cards drawn on canvas with your branding.',
    features: [
    'ID cards with photo, name, section and an attendance QR code',
    'Certificate templates: achievement, completion, attendance, conduct',
    'Uses the logo, colors and school name from Branding',
    'Batch print a whole section; download as PNG or PDF',
    'Verification code on every certificate'],

    connects: [
    { label: 'Branding', to: '/admin/branding' },
    { label: 'Students', to: '/admin/students' },
    { label: 'Exam Results', to: '/admin/exam-results' },
    { label: 'Attendance' }],

    portals: {
      admin: 'Design, issue and print',
      student: 'Download your certificates'
    }
  },
  library: {
    id: 'library',
    title: 'Library',
    icon: LibraryBigIcon,
    round: 4,
    summary: 'Book catalogue, borrowing and returns, with overdue fines charged through Finance.',
    features: [
    'Catalogue with copies, ISBN, shelf location and availability',
    'Borrow and return by scanning the ID card QR',
    'Due dates, renewals and overdue list',
    'Overdue fines become invoice lines in Finance',
    'Reading reports per student and section'],

    connects: [
    { label: 'Students', to: '/admin/students' },
    { label: 'Invoices', to: '/admin/finance/invoices' },
    { label: 'Certificates & ID Cards' }],

    portals: {
      admin: 'Catalogue, loans and fines',
      student: 'Search books and see your loans',
      parent: "Your child's loans and fines"
    }
  },
  transport: {
    id: 'transport',
    title: 'Transport',
    icon: BusIcon,
    round: 4,
    summary: 'Buses, routes, stops, drivers and student subscriptions billed through Finance.',
    features: [
    'Buses with capacity, drivers and supervisors',
    'Routes with ordered stops and pickup times',
    'Assign students to a stop; seat usage per bus',
    'Transport subscription fees become invoices',
    'Boarding check by QR and a parent notice when the bus leaves'],

    connects: [
    { label: 'Students', to: '/admin/students' },
    { label: 'Invoices', to: '/admin/finance/invoices' },
    { label: 'Staff Accounts', to: '/admin/staff' },
    { label: 'Communication' }],

    portals: {
      admin: 'Fleet, routes and subscriptions',
      student: 'Your bus and pickup time',
      parent: "Your child's route, stop and pickup time"
    }
  },
  hr: {
    id: 'hr',
    title: 'HR',
    icon: UsersIcon,
    round: 5,
    summary: 'Contracts, leave and performance reviews for teachers and staff.',
    features: [
    'Employment contracts with type, start / end dates and renewal reminders',
    'Leave requests and balances, approved by HR',
    'Approved leave shows on staff attendance and frees the timetable',
    'Performance reviews with criteria and scores',
    'Staff documents and history'],

    connects: [
    { label: 'Teachers', to: '/admin/teachers' },
    { label: 'Staff Accounts', to: '/admin/staff' },
    { label: 'Attendance' },
    { label: 'Timetable', to: '/admin/academics/timetable' }],

    portals: {
      admin: 'Contracts, leave approvals and reviews',
      teacher: 'Request leave and see your balance'
    }
  },
  'hostel-canteen': {
    id: 'hostel-canteen',
    title: 'Hostel & Canteen',
    icon: BedDoubleIcon,
    round: 5,
    summary: 'Boarding rooms and beds, and a canteen with meal plans and a student wallet.',
    features: [
    'Hostel blocks, rooms and beds; assign boarders',
    'Hostel fees become invoices',
    'Canteen menu and weekly meal plans',
    'Prepaid student wallet with purchases by ID card',
    'Allergy warnings from Health Records at the canteen till'],

    connects: [
    { label: 'Students', to: '/admin/students' },
    { label: 'Invoices', to: '/admin/finance/invoices' },
    { label: 'Health Records' }],

    portals: {
      admin: 'Rooms, menus and wallets',
      parent: "Top up your child's wallet and see purchases"
    }
  },
  'auto-timetable': {
    id: 'auto-timetable',
    title: 'Auto Scheduler',
    icon: WandSparklesIcon,
    round: 6,
    summary: 'Generates a full, conflict-free timetable from sections, subjects, teachers and rooms.',
    features: [
    'Weekly periods per subject for each section',
    'Teacher availability and maximum load',
    'Room types (lab, gym) and capacities',
    'No teacher, room or section double-booking',
    'Preview, compare and publish to the live timetable'],

    connects: [
    { label: 'Timetable', to: '/admin/academics/timetable' },
    { label: 'Sections', to: '/admin/academics/sections' },
    { label: 'Rooms', to: '/admin/academics/rooms' },
    { label: 'School Day', to: '/admin/academics/school-day' },
    { label: 'HR' }],

    portals: { admin: 'Generate and publish timetables' }
  },
  'online-classes': {
    id: 'online-classes',
    title: 'Online Classes',
    icon: VideoIcon,
    round: 6,
    summary: 'Zoom or Google Meet links on timetable periods, with a Join button for teachers and students.',
    features: [
    'Attach a meeting link to a period or a whole section',
    'Join button appears when the period starts',
    'Recurring links follow the timetable',
    'Joining an online period counts towards attendance',
    'Recording links after the class'],

    connects: [
    { label: 'Timetable', to: '/admin/academics/timetable' },
    { label: 'Attendance' }],

    notes: ['Creating meetings automatically in Zoom / Meet needs a server-side account connection; until then links are pasted in.'],
    portals: {
      admin: 'Meeting links per section',
      teacher: 'Start your online periods',
      student: 'Join your online periods'
    }
  }
};

export const MODULE_LIST = Object.values(MODULES).sort((a, b) => a.round - b.round);

/** The other module delivered in the same round. */
export const roundPartner = (id: ModuleId) =>
MODULE_LIST.find((m) => m.round === MODULES[id].round && m.id !== id);
