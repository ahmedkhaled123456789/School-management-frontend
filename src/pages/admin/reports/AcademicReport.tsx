import { useMemo } from 'react';
import { BarList, ChartCard, Kpi, StackedBar } from '../../../components/reports/charts';
import { STATUS, SERIES } from '../../../lib/vizColors';
import { useClassLevels } from '../../../hooks/classes';
import { useExamResults } from '../../../hooks/examResults';
import { useExams } from '../../../hooks/exams';
import type { ExamResult } from '../../../types/examResult';
import { inPeriod, percent, periodStart, PERIOD_LABEL, type Period } from '../../../utils/reports';

const REMARKS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'] as const;
const nameOf = (value: unknown) => typeof value === 'object' && value ? (value as {name?: string;}).name : undefined;
const idOf = (value: unknown) => typeof value === 'string' ? value : (value as {_id?: string;} | null)?._id;
const avg = (values: number[]) => values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length * 10) / 10 : 0;

export function AcademicReport({ period }: {period: Period;}) {
  const exams = useExams();
  const results = useExamResults();
  const levels = useClassLevels();
  const start = periodStart(period);

  const inRange = useMemo(
    () => (results.data?.items ?? []).filter((r) => inPeriod(r.createdAt, start)),
    [results.data, start]
  );
  const loading = results.isLoading || exams.isLoading;

  const passed = inRange.filter((r) => r.status === 'Pass').length;
  const unpublished = inRange.filter((r) => !r.isPublished).length;
  const allExams = exams.data?.items ?? [];
  const live = allExams.filter((e) => e.examStatus === 'live').length;

  // per exam: pass rate and average grade
  const byExam = useMemo(() => {
    const map = new Map<string, {name: string;results: ExamResult[];}>();
    inRange.forEach((r) => {
      const id = idOf(r.exam) ?? 'unknown';
      const row = map.get(id) ?? { name: nameOf(r.exam) ?? 'Exam', results: [] };
      row.results.push(r);
      map.set(id, row);
    });
    return [...map.values()].map((row) => ({
      label: row.name,
      count: row.results.length,
      passRate: percent(row.results.filter((r) => r.status === 'Pass').length, row.results.length),
      average: avg(row.results.map((r) => r.grade ?? 0))
    }));
  }, [inRange]);

  const byLevel = useMemo(() => {
    const names = new Map((levels.data?.items ?? []).map((l) => [l._id, l.name]));
    const map = new Map<string, number[]>();
    inRange.forEach((r) => {
      const id = idOf(r.classLevel);
      if (!id) return;
      map.set(id, [...(map.get(id) ?? []), r.grade ?? 0]);
    });
    return [...map.entries()].
    map(([id, grades]) => ({ label: names.get(id) ?? 'Unknown level', value: avg(grades), count: grades.length })).
    sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [inRange, levels.data]);

  // ordinal grade bands, best first, one hue (blue) for magnitude
  const remarks = useMemo(
    () => REMARKS.map((label) => ({ label, value: inRange.filter((r) => r.remarks === label).length })),
    [inRange]
  );

  const examsByStatus = [
  { label: 'Live', value: live, color: STATUS.good },
  { label: 'Pending', value: allExams.length - live, color: SERIES[0] }];


  return (
    <div className="space-y-5">
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Results · ${PERIOD_LABEL[period].toLowerCase()}`} value={String(inRange.length)} sub={`${allExams.length} exams in total`} />
        <Kpi label="Pass rate" value={`${percent(passed, inRange.length)}%`} sub={`${passed} passed of ${inRange.length}`} tone={inRange.length ? percent(passed, inRange.length) >= 50 ? 'good' : 'critical' : undefined} />
        <Kpi label="Average grade" value={`${avg(inRange.map((r) => r.grade ?? 0))}%`} />
        <Kpi label="Not published yet" value={String(unpublished)} sub={unpublished ? 'Students and parents can not see them' : 'Everything is published'} tone={unpublished ? 'warning' : 'good'} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Pass rate by exam"
          description="Share of results marked Pass."
          csvName="pass-rate-by-exam"
          isLoading={loading}
          empty={!byExam.length}
          table={{ columns: ['Exam', 'Results', 'Pass rate %', 'Average grade %'], rows: byExam.map((r) => [r.label, r.count, r.passRate, r.average]) }}>

          <BarList data={byExam.map((r) => ({ label: r.label, value: r.passRate, hint: `${r.count} result(s) · average ${r.average}%` }))} max={100} format={(n) => `${n}%`} />
        </ChartCard>

        <ChartCard
          title="Average grade by class level"
          csvName="grade-by-level"
          isLoading={loading || levels.isLoading}
          empty={!byLevel.length}
          table={{ columns: ['Class level', 'Results', 'Average grade %'], rows: byLevel.map((r) => [r.label, r.count, r.value]) }}>

          <BarList data={byLevel.map((r) => ({ label: r.label, value: r.value, hint: `${r.count} result(s)` }))} max={100} format={(n) => `${n}%`} sort={false} />
        </ChartCard>

        <ChartCard
          title="Grade bands"
          description="How results are spread from Excellent to Poor."
          csvName="grade-bands"
          isLoading={loading}
          empty={!inRange.length}
          table={{ columns: ['Remark', 'Results'], rows: remarks.map((d) => [d.label, d.value]) }}>

          <BarList data={remarks} sort={false} />
        </ChartCard>

        <ChartCard
          title="Exams"
          description="Live exams can be taken by students now."
          csvName="exams-by-status"
          isLoading={exams.isLoading}
          empty={!allExams.length}
          table={{ columns: ['Status', 'Exams'], rows: examsByStatus.map((d) => [d.label, d.value]) }}>

          <StackedBar data={examsByStatus} />
        </ChartCard>
      </div>
    </div>);

}
