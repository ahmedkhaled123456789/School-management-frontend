import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangleIcon, ChartPieIcon, ClipboardCheckIcon, FlaskConicalIcon, ScanLineIcon, StethoscopeIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { NoAcademicYear } from '../../../components/sections/Notices';
import { DateNav } from '../../../components/attendance/DateNav';
import { StatusBadge } from '../../../components/attendance/StatusBadge';
import { useAttendanceStats, useDailyOverview, useGenerateAttendanceSample, useStaffDirectory } from '../../../hooks/attendance';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSchoolDay } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import { addDays, isDateKey, LOW_RATE, rateOf, STREAK_ALERT, todayKey } from '../../../utils/attendance';
import { percent } from '../../../utils/reports';
import { formatTime } from '../../../utils/timetable';

export function AdminAttendance() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const date = isDateKey(params.get('date') ?? '') && (params.get('date') as string) <= today ? params.get('date') as string : today;
  const setDate = (d: string) => setParams(d === today ? {} : { date: d }, { replace: true });

  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const overview = useDailyOverview(year.id, date);
  const from30 = addDays(today, -30);
  const stats = useAttendanceStats(year.id, from30, today);
  const staffDir = useStaffDirectory(can(PERMISSIONS.TEACHERS_MANAGE));
  const sample = useGenerateAttendanceSample(year.id);

  const watch = useMemo(() =>
  (stats.data?.students ?? []).
  filter((s) => s.streak >= STREAK_ALERT || rateOf(s.tally) < LOW_RATE).
  sort((a, b) => b.streak - a.streak || rateOf(a.tally) - rateOf(b.tally)).
  slice(0, 8),
  [stats.data]);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Attendance' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Attendance" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  const o = overview.data;
  const empty30 = stats.data && stats.data.tally.total === 0;
  const dayAway = o?.students.filter((s) => s.status === 'absent' || s.status === 'excused').length ?? 0;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Period registers taken by teachers, gate check-ins and who is away. Pick a day to review or correct it."
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <Link to="/admin/attendance/gate"><Button variant="secondary" icon={<ScanLineIcon className="h-4 w-4" aria-hidden="true" />}>Gate check-in</Button></Link>
            <Link to="/admin/reports?tab=attendance"><Button variant="secondary" icon={<ChartPieIcon className="h-4 w-4" aria-hidden="true" />}>Reports</Button></Link>
          </>
        } />

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent-100 bg-accent-50 px-4 py-2.5 text-[13px] text-accent-500">
        <FlaskConicalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1"><strong>Preview feature.</strong> Registers, check-ins and health records are stored in this browser until the backend endpoints are ready.</p>
      </div>

      {empty30 && canManage &&
      <Card className="mb-5">
          <EmptyState
          icon={<ClipboardCheckIcon className="h-5 w-5" aria-hidden="true" />}
          title="No attendance recorded yet"
          description="Teachers take registers from their timetable. To explore the reports now, fill the last 15 school days with realistic sample registers, gate check-ins, staff punches and health records."
          action={<Button isLoading={sample.isPending} onClick={() => sample.mutate({ days: 15, people: staffDir.people })}>Generate sample data</Button>} />
        </Card>
      }

      <DateNav value={date} onChange={setDate} schoolDay={schoolDay.data} className="mb-4" />

      {overview.isError ?
      <Card><ErrorState error={overview.error} onRetry={() => overview.refetch()} /></Card> :
      !o ?
      <Card><CardBody><SkeletonText lines={8} /></CardBody></Card> :
      !o.isSchoolDay ?
      <Card><EmptyState title="No school on this day" description="Pick a school day to see its registers." /></Card> :

      <div className="space-y-5">
          <section aria-label="This day" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Attendance" value={o.tally.total ? `${rateOf(o.tally)}%` : '—'} sub={o.tally.total ? `${o.tally.present + o.tally.late} of ${o.tally.total} period marks` : 'No registers yet'} tone={o.tally.total ? rateOf(o.tally) >= 95 ? 'good' : rateOf(o.tally) >= LOW_RATE ? 'warning' : 'critical' : undefined} />
            <Kpi label="Registers taken" value={`${o.taken} / ${o.expected}`} sub={o.expected ? `${percent(o.taken, o.expected)}% of lessons` : 'No lessons planned'} tone={o.missing.length ? 'warning' : o.expected ? 'good' : undefined} />
            <Kpi label="Away all day" value={String(dayAway)} sub={`${o.students.filter((s) => s.status === 'excused').length} excused`} />
            <Kpi label="Late periods" value={String(o.tally.late)} sub={`${o.students.filter((s) => s.status === 'partial').length} left early / missed periods`} />
            <Kpi label="Gate check-ins" value={String(o.gate.scans)} sub={`${o.gate.late} after the bell`} />
          </section>

          {o.missing.length > 0 &&
        <Card>
              <CardHeader
            title={<span className="flex items-center gap-2"><AlertTriangleIcon className="h-4 w-4 text-warn-500" aria-hidden="true" />Registers not taken</span>}
            description="Lessons that already started without a register." />
              <ul className="divide-y divide-ink-100">
                {o.missing.slice(0, 12).map((m) =>
            <li key={`${m.section._id}-${m.periodId}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
                    <span className="w-28 shrink-0 font-semibold text-ink-800">{m.periodLabel} · {formatTime(m.start)}</span>
                    <span dir="auto" className="min-w-0 flex-1 text-ink-700">{m.section.name} · {m.subject.name} · {m.teacher.name}</span>
                    <Link to={`/admin/attendance/register?section=${m.section._id}&date=${date}&period=${m.periodId}`} className="font-semibold text-primary-600 hover:underline">
                      {canManage ? 'Take now' : 'Open'}
                    </Link>
                  </li>
            )}
              </ul>
              {o.missing.length > 12 && <p className="border-t border-ink-100 px-5 py-2 text-[12.5px] text-ink-500">+{o.missing.length - 12} more</p>}
            </Card>
        }

          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Sections" description="Registers taken and marks for the day." />
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead className="border-b border-ink-200 bg-ink-50/70 text-[11px] uppercase tracking-wider text-ink-500">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-start">Section</th>
                      <th scope="col" className="px-2 py-2 text-end">Registers</th>
                      <th scope="col" className="px-2 py-2 text-end">Absent</th>
                      <th scope="col" className="px-2 py-2 text-end">Late</th>
                      <th scope="col" className="px-4 py-2 text-end">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {o.sections.map((s) => {
                    const first = s.expected ? `/admin/attendance/register?section=${s.section._id}&date=${date}` : null;
                    return (
                      <tr key={s.section._id}>
                          <td className="px-4 py-2">
                            <p dir="auto" className="font-semibold text-ink-900">{s.section.name}</p>
                            <p dir="auto" className="text-[12px] text-ink-500">{s.students} students{s.homeroomTeacher ? ` · ${s.homeroomTeacher.name}` : ''}</p>
                          </td>
                          <td className="px-2 py-2 text-end font-mono">
                            {first ? <SectionRegistersLink to={first} taken={s.taken} expected={s.expected} /> : <span className="text-ink-400">no lessons</span>}
                          </td>
                          <td className="px-2 py-2 text-end font-mono">{s.tally.absent + s.tally.excused}</td>
                          <td className="px-2 py-2 text-end font-mono">{s.tally.late}</td>
                          <td className="px-4 py-2 text-end font-mono font-semibold">{s.tally.total ? `${rateOf(s.tally)}%` : '—'}</td>
                        </tr>);

                  })}
                    {!o.sections.length &&
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No sections this year. <Link to="/admin/academics/sections" className="font-semibold text-primary-600 hover:underline">Create sections</Link></td></tr>
                  }
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Not in class" description="Students who missed periods this day." />
              {o.students.length === 0 ?
            <p className="px-5 py-6 text-[13px] text-ink-500">{o.taken ? 'Everyone attended every period so far.' : 'No registers taken yet.'}</p> :

            <ul className="scrollbar-thin max-h-[420px] divide-y divide-ink-100 overflow-y-auto">
                  {o.students.map((s) =>
              <li key={s.student._id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link to={`/admin/students/${s.student._id}`} dir="auto" className="block truncate text-[13.5px] font-semibold text-ink-900 hover:text-primary-700 hover:underline">{s.student.name}</Link>
                        <p dir="auto" className="truncate text-[12px] text-ink-500">
                          {s.section.name} · {s.tally.absent + s.tally.excused} of {s.tally.total} periods missed{s.tally.late ? ` · ${s.tally.late} late` : ''}
                          {s.reasons.length ? ` · ${s.reasons.join(', ')}` : ''}
                        </p>
                      </div>
                      {s.reasons.includes('Sent home by the clinic') && <StethoscopeIcon className="h-4 w-4 shrink-0 text-ink-400" aria-label="Sent home by the clinic" />}
                      <StatusBadge status={s.status} />
                    </li>
              )}
                </ul>
            }
            </Card>
          </div>

          <Card>
            <CardHeader title="Needs attention" description={`Last 30 days: ${STREAK_ALERT}+ school days away in a row, or attendance under ${LOW_RATE}%.`} />
            {stats.isLoading ?
          <CardBody><SkeletonText lines={3} /></CardBody> :
          watch.length === 0 ?
          <p className="px-5 py-6 text-[13px] text-ink-500">No student needs follow-up.</p> :

          <ul className="grid divide-y divide-ink-100 sm:grid-cols-2 sm:divide-y-0">
                {watch.map((s) =>
            <li key={s.student._id} className="flex items-center gap-3 border-ink-100 px-5 py-2.5 sm:border-b">
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/students/${s.student._id}`} dir="auto" className="block truncate text-[13.5px] font-semibold text-ink-900 hover:underline">{s.student.name}</Link>
                      <p dir="auto" className="truncate text-[12px] text-ink-500">{s.section.name} · {s.daysAbsent} day(s) away</p>
                    </div>
                    {s.streak >= STREAK_ALERT && <span className="rounded-full bg-danger-50 px-2 py-0.5 text-[11.5px] font-bold text-danger-600">{s.streak} days in a row</span>}
                    <span className="w-14 text-end font-mono text-[13px] font-semibold text-ink-800">{rateOf(s.tally)}%</span>
                  </li>
            )}
              </ul>
          }
          </Card>
        </div>
      }
    </>);

}

function SectionRegistersLink({ to, taken, expected }: {to: string;taken: number;expected: number;}) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold text-primary-600 hover:underline">
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-ink-100 sm:inline-block" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary-500" style={{ width: `${percent(taken, expected)}%` }} />
      </span>
      {taken}/{expected}
    </Link>);

}
