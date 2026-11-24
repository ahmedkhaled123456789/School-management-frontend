import { useSearchParams } from 'react-router-dom';
import { BriefcaseIcon, CalendarCheckIcon, CalendarDaysIcon, GraduationCapIcon, HistoryIcon, LibraryIcon, PrinterIcon, WalletIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/States';
import { usePermissions } from '../../../hooks/permissions';
import { useSettings } from '../../../hooks/staff';
import { PERMISSIONS, type Permission } from '../../../lib/permissions';
import { cn } from '../../../utils/cn';
import { PERIOD_LABEL, type Period } from '../../../utils/reports';
import { AcademicReport } from './AcademicReport';
import { AttendanceReport } from './AttendanceReport';
import { ActivityReport } from './ActivityReport';
import { FinanceReport } from './FinanceReport';
import { StaffReport } from './StaffReport';
import { StudentsReport } from './StudentsReport';
import { TimetableReport } from './TimetableReport';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** uses the period filter */
  timed: boolean;
}

// one tab per department; each is shown only to roles that may see its data
const TABS: Tab[] = [
{ id: 'students', label: 'Students & parents', icon: GraduationCapIcon, permission: PERMISSIONS.STUDENTS_READ, timed: true },
{ id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon, permission: PERMISSIONS.STUDENTS_READ, timed: true },
{ id: 'academics', label: 'Exams & results', icon: LibraryIcon, permission: PERMISSIONS.ACADEMICS_MANAGE, timed: true },
{ id: 'staff', label: 'Teachers & staff', icon: BriefcaseIcon, permission: PERMISSIONS.TEACHERS_MANAGE, timed: false },
{ id: 'finance', label: 'Finance', icon: WalletIcon, permission: PERMISSIONS.FINANCE_MANAGE, timed: true },
{ id: 'timetable', label: 'Sections & timetable', icon: CalendarDaysIcon, permission: PERMISSIONS.ACADEMICS_MANAGE, timed: false },
{ id: 'activity', label: 'System activity', icon: HistoryIcon, permission: PERMISSIONS.AUDIT_READ, timed: true }];


const PERIODS: Period[] = ['30d', '12m', 'all'];

export function AdminReports() {
  const { can } = usePermissions();
  const settings = useSettings();
  const tabs = TABS.filter((t) => can(t.permission));
  const [params, setParams] = useSearchParams();
  const active = tabs.find((t) => t.id === params.get('tab')) ?? tabs[0];
  const period = (PERIODS.includes(params.get('period') as Period) ? params.get('period') : '12m') as Period;
  const update = (next: Record<string, string>) => setParams({ tab: active?.id ?? '', period, ...next }, { replace: true });

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Reports' }];

  if (!active) {
    return (
      <>
        <PageHeader title="Reports" breadcrumbs={breadcrumbs} />
        <Card><EmptyState title="No reports for your role" description="Reports follow your permissions. Ask a super admin if you need access." /></Card>
      </>);

  }

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Key figures for every department${settings.data?.schoolName ? ` of ${settings.data.schoolName}` : ''}. Every chart has a table view and a CSV export.`}
        breadcrumbs={breadcrumbs}
        actions={<Button variant="secondary" className="print:hidden" icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>Print</Button>} />


      {/* print header: which report and when */}
      <p className="mb-4 hidden text-[13px] text-ink-600 print:block">
        {active.label}{active.timed ? ` · ${PERIOD_LABEL[period]}` : ''} · printed {new Date().toLocaleString()}
      </p>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div role="tablist" aria-label="Department" className="scrollbar-thin flex max-w-full gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
          {tabs.map((tab) =>
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active.id}
            onClick={() => update({ tab: tab.id })}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
              tab.id === active.id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800'
            )}>

              <tab.icon className="h-4 w-4" aria-hidden="true" />{tab.label}
            </button>
          )}
        </div>
        {active.timed &&
        <div role="radiogroup" aria-label="Period" className="flex gap-1 rounded-xl bg-ink-100 p-1">
            {PERIODS.map((p) =>
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={p === period}
            onClick={() => update({ period: p })}
            className={cn('rounded-lg px-3 py-1.5 text-[12.5px] font-semibold', p === period ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>

                {PERIOD_LABEL[p]}
              </button>
          )}
          </div>
        }
      </div>

      <div role="tabpanel" aria-label={active.label}>
        {active.id === 'students' && <StudentsReport period={period} />}
        {active.id === 'attendance' && <AttendanceReport period={period} />}
        {active.id === 'academics' && <AcademicReport period={period} />}
        {active.id === 'staff' && <StaffReport />}
        {active.id === 'finance' && <FinanceReport period={period} />}
        {active.id === 'timetable' && <TimetableReport />}
        {active.id === 'activity' && <ActivityReport period={period} />}
      </div>
    </>);

}
