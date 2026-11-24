import { useMemo } from 'react';
import { BarList, ChartCard, ColumnChart, Kpi, StackedBar } from '../../../components/reports/charts';
import { STATUS, SERIES } from '../../../lib/vizColors';
import { useClassLevels } from '../../../hooks/classes';
import { useParents } from '../../../hooks/parents';
import { useCurrentAcademicYear, useSections } from '../../../hooks/sections';
import { useStudents } from '../../../hooks/students';
import type { Student } from '../../../types/student';
import { PERIOD_LABEL, bucketKey, countBy, inPeriod, percent, periodStart, timeBuckets, type Period } from '../../../utils/reports';

const idOf = (value: unknown) => typeof value === 'string' ? value : (value as {_id?: string;} | null)?._id;
/** current class level = the last one (the backend populates them) */
const currentLevelId = (s: Student) => idOf((s.classLevels as unknown[] | undefined)?.slice(-1)[0]);
const statusOf = (s: Student) => s.isWithdrawn ? 'Withdrawn' : s.isGraduated ? 'Graduated' : s.isSuspended ? 'Suspended' : 'Active';
const admittedOn = (s: Student) => s.dateAdmitted ?? (s as {admissionDate?: string;}).admissionDate ?? s.createdAt;

export function StudentsReport({ period }: {period: Period;}) {
  const students = useStudents({});
  const parents = useParents();
  const levels = useClassLevels();
  const year = useCurrentAcademicYear();
  const sections = useSections(year.id);

  const all = useMemo(() => students.data?.items ?? [], [students.data]);
  const enrolled = useMemo(() => all.filter((s) => !s.isWithdrawn && !s.isGraduated), [all]);
  const loading = students.isLoading || levels.isLoading;
  const start = periodStart(period);

  const byLevel = useMemo(() => {
    const names = new Map((levels.data?.items ?? []).map((l) => [l._id, l.name]));
    const counts = countBy(enrolled, (s) => currentLevelId(s));
    const genders = new Map<string, {male: number;female: number;}>();
    enrolled.forEach((s) => {
      const id = currentLevelId(s);
      if (!id) return;
      const g = genders.get(id) ?? { male: 0, female: 0 };
      if (s.gender === 'Female') g.female += 1;else
      g.male += 1;
      genders.set(id, g);
    });
    return [...counts.entries()].
    map(([id, value]) => ({ id, label: names.get(id) ?? 'Unknown level', value, ...(genders.get(id) ?? { male: 0, female: 0 }) })).
    sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [enrolled, levels.data]);

  const status = useMemo(() => {
    const counts = countBy(all, statusOf);
    return [
    { label: 'Active', value: counts.get('Active') ?? 0, color: STATUS.good },
    { label: 'Suspended', value: counts.get('Suspended') ?? 0, color: STATUS.warning },
    { label: 'Withdrawn', value: counts.get('Withdrawn') ?? 0, color: STATUS.critical },
    { label: 'Graduated', value: counts.get('Graduated') ?? 0, color: SERIES[0] }];

  }, [all]);

  const gender = useMemo(() => {
    const female = enrolled.filter((s) => s.gender === 'Female').length;
    return [
    { label: 'Male', value: enrolled.length - female, color: SERIES[0] },
    { label: 'Female', value: female, color: SERIES[1] }];

  }, [enrolled]);

  const admissions = useMemo(() => {
    const buckets = timeBuckets(period, all.map(admittedOn));
    const counts = countBy(all.filter((s) => inPeriod(admittedOn(s), start)), (s) => bucketKey(period, admittedOn(s) as string));
    return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
  }, [all, period, start]);
  const admittedInPeriod = admissions.reduce((s, d) => s + d.value, 0);

  const seated = useMemo(() => new Set((sections.data ?? []).flatMap((s) => s.students.map((st) => st._id))), [sections.data]);
  const withoutSection = year.id && sections.data?.length ? enrolled.filter((s) => !seated.has(s._id)).length : null;
  const withoutParent = enrolled.filter((s) => !(s.parents ?? []).length).length;

  const childrenPerParent = useMemo(() => {
    const counts = countBy(parents.data?.items ?? [], (p) => {
      const n = (p.student ?? []).length;
      return n === 0 ? 'No children linked' : n === 1 ? '1 child' : n === 2 ? '2 children' : '3+ children';
    });
    return ['1 child', '2 children', '3+ children', 'No children linked'].map((label, i) => ({ label, value: counts.get(label) ?? 0, color: label === 'No children linked' ? STATUS.warning : SERIES[i] }));
  }, [parents.data]);

  return (
    <div className="space-y-5">
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Enrolled students" value={String(enrolled.length)} sub={`${all.length} on record`} />
        <Kpi label={`Admitted · ${PERIOD_LABEL[period].toLowerCase()}`} value={String(admittedInPeriod)} />
        <Kpi label="Without a parent account" value={String(withoutParent)} sub={`${percent(withoutParent, enrolled.length)}% of enrolled`} tone={withoutParent ? 'warning' : 'good'} />
        <Kpi label="Without a section" value={withoutSection === null ? '—' : String(withoutSection)} sub={withoutSection === null ? 'Sections not set up' : `${year.name}`} tone={withoutSection ? 'warning' : withoutSection === 0 ? 'good' : undefined} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Enrolment by class level"
          description="Enrolled students in their current level."
          csvName="enrolment-by-level"
          isLoading={loading}
          empty={!byLevel.length}
          table={{ columns: ['Class level', 'Students', 'Male', 'Female'], rows: byLevel.map((r) => [r.label, r.value, r.male, r.female]) }}>

          <BarList data={byLevel.map((r) => ({ label: r.label, value: r.value, hint: `${r.male} male · ${r.female} female` }))} sort={false} />
        </ChartCard>

        <ChartCard
          title={`Admissions · ${PERIOD_LABEL[period].toLowerCase()}`}
          description="Students by admission date."
          csvName="admissions"
          isLoading={loading}
          empty={!all.length}
          table={{ columns: ['Period', 'Admitted'], rows: admissions.map((d) => [d.label, d.value]) }}>

          <ColumnChart data={admissions} />
        </ChartCard>

        <ChartCard
          title="Student status"
          description="Every student on record."
          csvName="student-status"
          isLoading={loading}
          empty={!all.length}
          table={{ columns: ['Status', 'Students'], rows: status.map((d) => [d.label, d.value]) }}>

          <StackedBar data={status} />
        </ChartCard>

        <ChartCard
          title="Gender"
          description="Enrolled students."
          csvName="gender"
          isLoading={loading}
          empty={!enrolled.length}
          table={{ columns: ['Gender', 'Students'], rows: gender.map((d) => [d.label, d.value]) }}>

          <StackedBar data={gender} />
        </ChartCard>

        <ChartCard
          title="Parent accounts"
          description="How many children each parent account is linked to."
          csvName="parents"
          isLoading={parents.isLoading}
          empty={!(parents.data?.items ?? []).length}
          table={{ columns: ['Children per parent', 'Parents'], rows: childrenPerParent.map((d) => [d.label, d.value]) }}>

          <StackedBar data={childrenPerParent} />
        </ChartCard>
      </div>
    </div>);

}
