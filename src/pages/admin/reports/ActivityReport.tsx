import { useMemo } from 'react';
import { BarList, ChartCard, ColumnChart, Kpi, StackedBar } from '../../../components/reports/charts';
import { STATUS } from '../../../lib/vizColors';
import { useAuditLogs } from '../../../hooks/staff';
import { STAFF_ROLE_LABEL, type StaffRole } from '../../../lib/permissions';
import { PERIOD_LABEL, bucketKey, countBy, dayKey, periodStart, timeBuckets, type Period } from '../../../utils/reports';

// the audit log endpoint is paginated: one big page is enough for a school
const LIMIT = 2000;

export function ActivityReport({ period }: {period: Period;}) {
  const start = periodStart(period);
  const logs = useAuditLogs({ limit: LIMIT, from: start ? dayKey(start) : undefined });
  const list = useMemo(() => logs.data?.items ?? [], [logs.data]);
  const truncated = (logs.data?.total ?? 0) > list.length;

  const overTime = useMemo(() => {
    const buckets = timeBuckets(period, list.map((l) => l.createdAt));
    const counts = countBy(list, (l) => bucketKey(period, l.createdAt));
    return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
  }, [list, period]);

  const actions = useMemo(() => {
    const counts = countBy(list, (l) => l.action);
    return [
    { label: 'Created', value: counts.get('create') ?? 0, color: STATUS.good },
    { label: 'Updated', value: counts.get('update') ?? 0, color: 'var(--viz-series-1)' },
    { label: 'Deleted', value: counts.get('delete') ?? 0, color: STATUS.critical }];

  }, [list]);

  const bySection = useMemo(() => [...countBy(list, (l) => l.entity).entries()].map(([label, value]) => ({ label, value })), [list]);
  const { byPerson, peopleCount } = useMemo(() => {
    const map = new Map<string, {name: string;role?: string;count: number;}>();
    list.forEach((l) => {
      const key = l.actor?.id ?? l.actor?.email ?? 'unknown';
      const row = map.get(key) ?? { name: l.actor?.name ?? 'Unknown', role: l.actor?.role, count: 0 };
      row.count += 1;
      map.set(key, row);
    });
    // count everyone BEFORE keeping the top 10 for the chart
    return { byPerson: [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10), peopleCount: map.size };
  }, [list]);
  const deletes = actions[2].value;

  return (
    <div className="space-y-5">
      <section aria-label="Key figures" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Changes · ${PERIOD_LABEL[period].toLowerCase()}`} value={String(logs.data?.total ?? 0)} sub={truncated ? `charts use the latest ${LIMIT}` : undefined} />
        <Kpi label="People active" value={String(peopleCount)} />
        <Kpi label="Deletions" value={String(deletes)} tone={deletes ? 'warning' : 'good'} sub={deletes ? 'Review them in the Audit Log' : 'Nothing deleted'} />
        <Kpi label="Busiest section" value={[...bySection].sort((a, b) => b.value - a.value)[0]?.label ?? '—'} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Changes over time"
          csvName="activity-over-time"
          isLoading={logs.isLoading}
          empty={!list.length}
          table={{ columns: ['Period', 'Changes'], rows: overTime.map((d) => [d.label, d.value]) }}>

          <ColumnChart data={overTime} />
        </ChartCard>

        <ChartCard
          title="Kind of change"
          csvName="activity-by-action"
          isLoading={logs.isLoading}
          empty={!list.length}
          table={{ columns: ['Action', 'Changes'], rows: actions.map((d) => [d.label, d.value]) }}>

          <StackedBar data={actions} />
        </ChartCard>

        <ChartCard
          title="By section of the system"
          csvName="activity-by-section"
          isLoading={logs.isLoading}
          empty={!list.length}
          table={{ columns: ['Section', 'Changes'], rows: bySection.map((d) => [d.label, d.value]) }}>

          <BarList data={bySection} />
        </ChartCard>

        <ChartCard
          title="Most active people"
          description="Top 10."
          csvName="activity-by-person"
          isLoading={logs.isLoading}
          empty={!list.length}
          table={{ columns: ['Person', 'Role', 'Changes'], rows: byPerson.map((p) => [p.name, STAFF_ROLE_LABEL[p.role as StaffRole] ?? p.role ?? '', p.count]) }}>

          <BarList data={byPerson.map((p) => ({ label: p.name, value: p.count, hint: STAFF_ROLE_LABEL[p.role as StaffRole] ?? p.role }))} />
        </ChartCard>
      </div>
    </div>);

}
