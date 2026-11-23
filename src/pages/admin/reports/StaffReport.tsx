import { useMemo } from 'react';
import { BarList, ChartCard, Kpi, StackedBar } from '../../../components/reports/charts';
import { STATUS, SERIES } from '../../../lib/vizColors';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSchoolDay, useTimetable } from '../../../hooks/sections';
import { useStaff } from '../../../hooks/staff';
import { useTeachers } from '../../../hooks/teachers';
import { PERMISSIONS, STAFF_ROLE_LABEL } from '../../../lib/permissions';
import type { Teacher } from '../../../types/teacher';
import { countBy, percent } from '../../../utils/reports';

// NOTE: the backend field is spelled "isWitdrawn"
const isWithdrawn = (t: Teacher) => Boolean((t as {isWitdrawn?: boolean;}).isWitdrawn ?? t.isWithdrawn);
const subjectOf = (t: Teacher) => {
  const s = t.subject as unknown;
  return typeof s === 'object' && s ? (s as {name?: string;}).name : typeof s === 'string' && s.length !== 24 ? s : undefined;
};

export function StaffReport() {
  const teachers = useTeachers({});
  const { can } = usePermissions();
  const canStaff = can(PERMISSIONS.STAFF_MANAGE);
  // only super admins may list staff accounts: do not even ask otherwise
  const staff = useStaff(canStaff);
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const timetable = useTimetable({ academicYear: year.id });

  const all = useMemo(() => teachers.data?.items ?? [], [teachers.data]);
  const active = all.filter((t) => !isWithdrawn(t));
  const suspended = active.filter((t) => t.isSuspended).length;
  const withdrawn = all.length - active.length;
  const pending = all.filter((t) => t.applicationStatus === 'pending').length;

  const status = [
  { label: 'Active', value: active.length - suspended, color: STATUS.good },
  { label: 'Suspended', value: suspended, color: STATUS.warning },
  { label: 'Withdrawn', value: withdrawn, color: STATUS.critical }];


  const applications = useMemo(() => {
    const counts = countBy(all, (t) => t.applicationStatus ?? 'pending');
    return [
    { label: 'Approved', value: counts.get('approved') ?? 0, color: STATUS.good },
    { label: 'Pending', value: counts.get('pending') ?? 0, color: STATUS.warning },
    { label: 'Rejected', value: counts.get('rejected') ?? 0, color: STATUS.critical }];

  }, [all]);

  const bySubject = useMemo(
    () => [...countBy(active, (t) => subjectOf(t) ?? 'No subject assigned').entries()].map(([label, value]) => ({ label, value })),
    [active]
  );

  // timetable load (preview data): periods a week per teacher
  const slots = (schoolDay.data?.days.length ?? 0) * (schoolDay.data?.periods.filter((p) => !p.isBreak).length ?? 0);
  const load = useMemo(() => {
    const counts = countBy(timetable.data ?? [], (e) => e.teacher._id);
    return active.map((t) => ({ label: t.name, value: counts.get(t._id) ?? 0 }));
  }, [timetable.data, active]);
  const hasTimetable = (timetable.data ?? []).length > 0;
  const idle = load.filter((l) => l.value === 0).length;
  const avgLoad = load.length ? Math.round(load.reduce((s, l) => s + l.value, 0) / load.length * 10) / 10 : 0;

  const byRole = useMemo(() => {
    const counts = countBy((staff.data?.items ?? []).filter((s) => s.isActive), (s) => s.role);
    return (['accountant', 'registrar', 'hr'] as const).map((role, i) => ({ label: STAFF_ROLE_LABEL[role], value: counts.get(role) ?? 0, color: SERIES[i] }));
  }, [staff.data]);

  return (
    <div className="space-y-5">
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Teachers" value={String(active.length)} sub={withdrawn ? `${withdrawn} withdrawn` : 'None withdrawn'} />
        <Kpi label="Suspended" value={String(suspended)} sub="Can sign in, read only" tone={suspended ? 'warning' : 'good'} />
        <Kpi label="Pending applications" value={String(pending)} tone={pending ? 'warning' : 'good'} sub={pending ? 'Waiting for a decision' : 'None waiting'} />
        <Kpi
          label="Average weekly load"
          value={hasTimetable ? `${avgLoad}` : '—'}
          sub={hasTimetable ? `periods of ${slots} · ${idle} without periods` : 'Timetable not planned yet'}
          tone={hasTimetable ? idle ? 'warning' : 'good' : undefined} />

      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Teacher status"
          csvName="teacher-status"
          isLoading={teachers.isLoading}
          empty={!all.length}
          table={{ columns: ['Status', 'Teachers'], rows: status.map((d) => [d.label, d.value]) }}>

          <StackedBar data={status} />
        </ChartCard>

        <ChartCard
          title="Applications"
          csvName="teacher-applications"
          isLoading={teachers.isLoading}
          empty={!all.length}
          table={{ columns: ['Application', 'Teachers'], rows: applications.map((d) => [d.label, d.value]) }}>

          <StackedBar data={applications} />
        </ChartCard>

        <ChartCard
          title="Teachers by subject"
          description="Main subject of active teachers."
          csvName="teachers-by-subject"
          isLoading={teachers.isLoading}
          empty={!bySubject.length}
          table={{ columns: ['Subject', 'Teachers'], rows: bySubject.map((d) => [d.label, d.value]) }}>

          <BarList data={bySubject} />
        </ChartCard>

        <ChartCard
          title="Weekly teaching load"
          description={`Periods a week from the timetable (preview data) · ${year.name || 'current year'}`}
          csvName="teaching-load"
          isLoading={teachers.isLoading || timetable.isLoading}
          empty={!hasTimetable}
          emptyText="No timetable planned yet (Academics → Timetable)."
          table={{ columns: ['Teacher', 'Periods / week'], rows: load.map((d) => [d.label, d.value]) }}>

          <BarList data={load.map((d) => ({ ...d, hint: `${percent(d.value, slots)}% of the week` }))} max={slots || undefined} />
        </ChartCard>

        {canStaff &&
        <ChartCard
          title="Staff accounts"
          description="Active non-teaching staff by role."
          csvName="staff-by-role"
          isLoading={staff.isLoading}
          empty={!(staff.data?.items ?? []).length}
          table={{ columns: ['Role', 'Accounts'], rows: byRole.map((d) => [d.label, d.value]) }}>

            <StackedBar data={byRole} />
          </ChartCard>
        }
      </div>
    </div>);

}
