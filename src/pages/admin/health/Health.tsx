import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusIcon, StethoscopeIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { NoAcademicYear } from '../../../components/sections/Notices';
import { DateNav } from '../../../components/attendance/DateNav';
import { ClinicVisitModal } from '../../../components/health/ClinicVisitModal';
import { useClinicVisits, useDeleteClinicVisit, useHealthProfiles } from '../../../hooks/health';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSchoolDay, useSections } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import type { ClinicVisit } from '../../../types/health';
import { formatDay, isDateKey, todayKey } from '../../../utils/attendance';
import { CLINIC_ACTION_META, SEVERITY_META, hasSevereAllergy, overdueVaccinations, vaccinationStatus } from '../../../utils/health';
import { cn } from '../../../utils/cn';
import { formatTime, sectionLabel } from '../../../utils/timetable';

type Filter = 'all' | 'allergies' | 'severe' | 'conditions' | 'overdue' | 'none';
const FILTERS: Array<{id: Filter;label: string;}> = [
{ id: 'all', label: 'Everyone' },
{ id: 'allergies', label: 'Allergies' },
{ id: 'severe', label: 'Severe allergies' },
{ id: 'conditions', label: 'Conditions' },
{ id: 'overdue', label: 'Vaccines overdue' },
{ id: 'none', label: 'No record' }];


export function AdminHealth() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'clinic' ? 'clinic' : 'students';
  const today = todayKey();
  const date = isDateKey(params.get('date') ?? '') && (params.get('date') as string) <= today ? params.get('date') as string : today;
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const sections = useSections(year.id);
  const profiles = useHealthProfiles();
  const visits = useClinicVisits({ date });
  const remove = useDeleteClinicVisit();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [logOpen, setLogOpen] = useState(false);
  const [deleting, setDeleting] = useState<ClinicVisit | null>(null);

  const students = useMemo(() => (sections.data ?? []).flatMap((s) => s.students.map((st) => ({ ...st, section: sectionLabel(s) }))).sort((a, b) => a.name.localeCompare(b.name)), [sections.data]);
  const byStudent = useMemo(() => new Map((profiles.data ?? []).map((p) => [p.student._id, p])), [profiles.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const p = byStudent.get(s._id);
      if (q && !s.name.toLowerCase().includes(q) && !s.studentId?.toLowerCase().includes(q) && !p?.allergies.some((a) => a.name.toLowerCase().includes(q))) return false;
      switch (filter) {
        case 'allergies':return Boolean(p?.allergies.length);
        case 'severe':return hasSevereAllergy(p);
        case 'conditions':return Boolean(p?.conditions.length);
        case 'overdue':return overdueVaccinations(p).length > 0;
        case 'none':return !p;
        default:return true;
      }
    });
  }, [students, byStudent, query, filter]);

  const count = (f: Filter) => students.filter((s) => {
    const p = byStudent.get(s._id);
    return f === 'severe' ? hasSevereAllergy(p) : f === 'conditions' ? Boolean(p?.conditions.length) : f === 'overdue' ? overdueVaccinations(p).length > 0 : f === 'none' ? !p : true;
  }).length;

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Students', to: '/admin/students' }, { label: 'Health' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Health records" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;
  const setTab = (t: 'students' | 'clinic') => setParams(t === 'clinic' ? { tab: 'clinic', ...(date !== today ? { date } : {}) } : {}, { replace: true });

  return (
    <>
      <PageHeader
        title="Health records"
        description="Allergies, conditions, vaccinations and the clinic log. Teachers see allergies and conditions in their registers."
        breadcrumbs={breadcrumbs}
        actions={canManage ? <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setLogOpen(true)}>Log clinic visit</Button> : undefined} />

      <section aria-label="Totals" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Records" value={`${students.length - count('none')} / ${students.length}`} sub="students with a health record" />
        <Kpi label="Severe allergies" value={String(count('severe'))} tone={count('severe') ? 'critical' : undefined} sub={count('severe') ? 'shown in every register' : undefined} />
        <Kpi label="Conditions" value={String(count('conditions'))} />
        <Kpi label="Vaccines overdue" value={String(count('overdue'))} tone={count('overdue') ? 'warning' : undefined} sub={count('overdue') ? 'remind the parents' : undefined} />
        <Kpi label="Clinic visits" value={String(visits.data?.length ?? 0)} sub={date === today ? 'today' : formatDay(date)} />
      </section>

      <div role="tablist" aria-label="View" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {(['students', 'clinic'] as const).map((t) =>
        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
            {t === 'students' ? 'Students' : 'Clinic log'}
          </button>
        )}
      </div>

      {tab === 'students' ?
      <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
            <div className="w-64"><SearchInput value={query} onChange={setQuery} placeholder="Name, code or allergy…" /></div>
            <div role="radiogroup" aria-label="Filter" className="scrollbar-thin flex gap-1 overflow-x-auto rounded-lg bg-ink-100 p-1">
              {FILTERS.map((f) =>
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} onClick={() => setFilter(f.id)}
            className={cn('shrink-0 rounded-md px-2.5 py-1 text-[12.5px] font-semibold', filter === f.id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                  {f.label}
                </button>
            )}
            </div>
          </div>
          {sections.isError || profiles.isError ?
        <ErrorState error={sections.error ?? profiles.error} /> :
        sections.isLoading || profiles.isLoading ?
        <CardBody><SkeletonText lines={8} /></CardBody> :
        rows.length === 0 ?
        <EmptyState title={students.length ? 'No student matches' : 'No students in sections yet'} description={students.length ? 'Try another filter.' : 'Health records follow the students placed in this year’s sections.'} /> :

        <ul className="divide-y divide-ink-100">
              {rows.map((s) => {
            const p = byStudent.get(s._id);
            const overdue = overdueVaccinations(p);
            const due = (p?.vaccinations ?? []).filter((v) => vaccinationStatus(v) === 'due');
            return (
              <li key={s._id}>
                    <Link to={`/admin/health/${s._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 hover:bg-ink-50">
                      <div className="w-56 min-w-0">
                        <p dir="auto" className="truncate text-[13.5px] font-semibold text-ink-900">{s.name}</p>
                        <p dir="auto" className="truncate text-[12px] text-ink-500">{s.section} · {s.studentId}</p>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {!p && <span className="text-[12.5px] text-ink-400">No record</span>}
                        {p?.allergies.map((a) => <Badge key={a._id} tone={SEVERITY_META[a.severity].tone}>{a.name}</Badge>)}
                        {p?.conditions.map((c) => <Badge key={c._id} tone="info">{c.name}</Badge>)}
                        {p && !p.allergies.length && !p.conditions.length && <span className="text-[12.5px] text-ink-500">No allergies or conditions</span>}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {overdue.length > 0 && <Badge tone="danger">{overdue.length} vaccine overdue</Badge>}
                        {due.length > 0 && <Badge tone="warn">{due.length} due soon</Badge>}
                        {p?.bloodType && <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-ink-700">{p.bloodType}</span>}
                      </div>
                    </Link>
                  </li>);

          })}
            </ul>
        }
        </Card> :

      <Card>
          <div className="border-b border-ink-100 px-5 py-3">
            <DateNav value={date} onChange={(d) => setParams({ tab: 'clinic', ...(d !== today ? { date: d } : {}) }, { replace: true })} schoolDay={schoolDay.data} />
          </div>
          {visits.isError ?
        <ErrorState error={visits.error} /> :
        visits.isLoading ?
        <CardBody><SkeletonText lines={4} /></CardBody> :
        !visits.data?.length ?
        <EmptyState icon={<StethoscopeIcon className="h-5 w-5" aria-hidden="true" />} title="No clinic visits" description="Visits logged for this day appear here." /> :

        <ul className="divide-y divide-ink-100">
              {visits.data.map((v) =>
          <li key={v._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <span className="w-16 shrink-0 font-mono text-[13px] font-semibold text-ink-800">{formatTime(v.time)}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/health/${v.student._id}`} dir="auto" className="text-[13.5px] font-semibold text-ink-900 hover:underline">{v.student.name}</Link>
                    <p className="text-[12.5px] text-ink-600">{v.complaint}{v.temperature ? ` · ${v.temperature} °C` : ''}{v.notes ? ` · ${v.notes}` : ''}</p>
                    <p className="text-[11.5px] text-ink-400">Seen by {v.seenBy.name}</p>
                  </div>
                  <Badge tone={CLINIC_ACTION_META[v.action].tone}>{CLINIC_ACTION_META[v.action].label}</Badge>
                  {canManage &&
            <button type="button" aria-label={`Delete visit of ${v.student.name}`} onClick={() => setDeleting(v)} className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
            }
                </li>
          )}
            </ul>
        }
        </Card>
      }

      {logOpen && <ClinicVisitModal open onClose={() => setLogOpen(false)} students={students} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this visit?"
        message="Only the clinic log entry is removed. Registers already marked excused stay as they are."
        confirmLabel="Delete"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting._id, { onSettled: () => setDeleting(null) })} />
    </>);

}
