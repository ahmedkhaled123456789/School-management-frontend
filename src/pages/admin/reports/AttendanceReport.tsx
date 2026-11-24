import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarList, ChartCard, ColumnChart, Kpi, StackedBar } from '../../../components/reports/charts';
import { useAttendanceStats } from '../../../hooks/attendance';
import { useCurrentAcademicYear } from '../../../hooks/sections';
import { STATUS } from '../../../lib/vizColors';
import { formatDay, LOW_RATE, rateOf, STREAK_ALERT, todayKey } from '../../../utils/attendance';
import { dayKey, periodStart, type Period } from '../../../utils/reports';

const pct = (n: number) => `${n}%`;

/** Student attendance (period registers) and staff attendance for the chosen period. */
export function AttendanceReport({ period }: {period: Period;}) {
  const year = useCurrentAcademicYear();
  const start = periodStart(period);
  const from = start ? dayKey(start) : '2000-01-01';
  const to = todayKey();
  const stats = useAttendanceStats(year.id, from, to);
  const s = stats.data;
  const loading = stats.isLoading;

  const daily = useMemo(() => (s?.byDate ?? []).map((d) => ({ label: formatDay(d.date, { day: 'numeric', month: 'short' }), value: rateOf(d.tally), hint: `${d.tally.absent + d.tally.excused} away · ${d.tally.late} late` })), [s]);
  const sections = useMemo(() => (s?.bySection ?? []).map((x) => ({ label: x.section.name, value: rateOf(x.tally), hint: `${x.tally.total} period marks`, color: rateOf(x.tally) < LOW_RATE ? STATUS.critical : undefined })), [s]);
  const periods = useMemo(() => (s?.byPeriod ?? []).map((x) => ({ label: x.label, value: x.tally.total ? Math.round(x.tally.late / x.tally.total * 1000) / 10 : 0, hint: `${x.tally.late} late of ${x.tally.total}` })), [s]);
  const weekdays = useMemo(() => (s?.byWeekday ?? []).map((x) => ({ label: x.day, value: x.tally.total ? Math.round((x.tally.absent + x.tally.excused) / x.tally.total * 1000) / 10 : 0, hint: `${x.tally.absent + x.tally.excused} of ${x.tally.total} periods missed` })), [s]);
  const lowest = useMemo(() => [...(s?.students ?? [])].sort((a, b) => rateOf(a.tally) - rateOf(b.tally) || b.daysAbsent - a.daysAbsent).slice(0, 10), [s]);
  const mix = s ? [
  { label: 'Present', value: s.tally.present, color: STATUS.good },
  { label: 'Late', value: s.tally.late, color: STATUS.warning },
  { label: 'Absent', value: s.tally.absent, color: STATUS.critical },
  { label: 'Excused', value: s.tally.excused, color: '#8496a9' }] :
  [];

  if (!year.isLoading && !year.id) {
    return <p className="rounded-xl border border-ink-200 bg-white px-5 py-8 text-center text-[13.5px] text-ink-500">Set the current academic year in School Settings to report on attendance.</p>;
  }
  // no data yet (loading) or nothing recorded: the KPIs show dashes, charts their own state
  const empty = !s || s.tally.total === 0;
  const rate = s ? rateOf(s.tally) : 0;
  const flagged = (s?.students ?? []).filter((x) => rateOf(x.tally) < LOW_RATE || x.streak >= STREAK_ALERT).length;
  const staffSeen = s ? s.staff.present + s.staff.late : 0;

  return (
    <div className="space-y-5">
      <p className="text-[12.5px] text-accent-500">Preview data: registers are stored in this browser. <Link to="/admin/attendance" className="font-semibold underline">Open attendance</Link></p>
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Attendance rate" value={empty ? '—' : pct(rate)} sub={empty ? 'No registers in this period' : `${s!.tally.total.toLocaleString()} period marks`} tone={empty ? undefined : rate >= 95 ? 'good' : rate >= LOW_RATE ? 'warning' : 'critical'} />
        <Kpi label="Late arrivals" value={empty ? '—' : String(s!.tally.late)} sub={empty ? undefined : `${Math.round(s!.tally.late / s!.tally.total * 1000) / 10}% of periods`} />
        <Kpi label="Students to follow up" value={empty ? '—' : String(flagged)} sub={`under ${LOW_RATE}% or ${STREAK_ALERT}+ days away in a row`} tone={empty ? undefined : flagged ? 'warning' : 'good'} />
        <Kpi label="Staff on time" value={s?.staff.records ? pct(Math.round(s.staff.present / Math.max(staffSeen, 1) * 1000) / 10) : '—'} sub={s?.staff.records ? `${s.staff.late} late · ${s.staff.absent} absent · ${s.staff.leave} on leave` : 'No staff records'} />
      </section>

      <ChartCard title="Daily attendance" description="Share of period marks present or late, per school day." csvName="attendance-daily" isLoading={loading} empty={empty}
      table={{ columns: ['Day', 'Rate %', 'Present', 'Late', 'Absent', 'Excused'], rows: (s?.byDate ?? []).map((d) => [d.date, rateOf(d.tally), d.tally.present, d.tally.late, d.tally.absent, d.tally.excused]) }}>
        <ColumnChart data={daily} format={pct} />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Marks" description="All period marks in the period." csvName="attendance-mix" isLoading={loading} empty={empty}
        table={{ columns: ['Status', 'Marks'], rows: mix.map((m) => [m.label, m.value]) }}>
          <StackedBar data={mix} />
        </ChartCard>
        <ChartCard title="By section" description={`Attendance rate; under ${LOW_RATE}% in red.`} csvName="attendance-sections" isLoading={loading} empty={empty}
        table={{ columns: ['Section', 'Rate %', 'Marks'], rows: (s?.bySection ?? []).map((x) => [x.section.name, rateOf(x.tally), x.tally.total]) }}>
          <BarList data={sections} format={pct} max={100} />
        </ChartCard>
        <ChartCard title="Late by period" description="Share of marks that were late, per period of the day." csvName="attendance-late-periods" isLoading={loading} empty={empty}
        table={{ columns: ['Period', 'Late %', 'Late', 'Marks'], rows: (s?.byPeriod ?? []).map((x) => [x.label, x.tally.total ? Math.round(x.tally.late / x.tally.total * 1000) / 10 : 0, x.tally.late, x.tally.total]) }}>
          <BarList data={periods} format={pct} sort={false} />
        </ChartCard>
        <ChartCard title="Absence by weekday" description="Share of periods missed on each school day." csvName="attendance-weekdays" isLoading={loading} empty={empty}
        table={{ columns: ['Day', 'Missed %', 'Missed', 'Marks'], rows: (s?.byWeekday ?? []).map((x) => [x.day, x.tally.total ? Math.round((x.tally.absent + x.tally.excused) / x.tally.total * 1000) / 10 : 0, x.tally.absent + x.tally.excused, x.tally.total]) }}>
          <BarList data={weekdays} format={pct} sort={false} />
        </ChartCard>
      </div>

      <ChartCard title="Lowest attendance" description="The 10 students with the lowest rate in the period." csvName="attendance-students" isLoading={loading} empty={empty}
      table={{ columns: ['Student', 'Section', 'Rate %', 'Days away', 'Current streak'], rows: [...(s?.students ?? [])].sort((a, b) => rateOf(a.tally) - rateOf(b.tally)).map((x) => [x.student.name, x.section.name, rateOf(x.tally), x.daysAbsent, x.streak]) }}>
        <BarList
          data={lowest.map((x) => ({ label: x.student.name, value: rateOf(x.tally), hint: `${x.section.name} · ${x.daysAbsent} day(s) away${x.streak >= STREAK_ALERT ? ` · ${x.streak} in a row` : ''}`, color: rateOf(x.tally) < LOW_RATE ? STATUS.critical : undefined }))}
          format={pct}
          max={100}
          sort={false} />
      </ChartCard>
    </div>);

}
