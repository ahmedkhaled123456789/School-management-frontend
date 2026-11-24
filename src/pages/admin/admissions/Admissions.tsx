import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLinkIcon, PlusIcon, SettingsIcon, UserPlusIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { NoAcademicYear } from '../../../components/sections/Notices';
import { ApplicationFields } from '../../../components/admissions/ApplicationFields';
import {
  useAddApplication,
  useAdmissionSettings,
  useApplications,
  useGenerateAdmissionSample,
  useSeats,
  useUpdateAdmissionSettings } from
'../../../hooks/admissions';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import type { ApplicationStatus } from '../../../types/admissions';
import { APPLICATION_STATUS, applicationErrors, emptyApplication } from '../../../utils/admissions';
import { cn } from '../../../utils/cn';
import { formatDay } from '../../../utils/attendance';

type Tab = 'open' | ApplicationStatus | 'closed' | 'all';
const TABS: Array<{id: Tab;label: string;}> = [
{ id: 'open', label: 'In progress' },
{ id: 'new', label: 'New' },
{ id: 'test_scheduled', label: 'Test scheduled' },
{ id: 'tested', label: 'Tested' },
{ id: 'waitlisted', label: 'Waiting list' },
{ id: 'accepted', label: 'Accepted' },
{ id: 'enrolled', label: 'Enrolled' },
{ id: 'closed', label: 'Closed' },
{ id: 'all', label: 'All' }];

const OPEN: ApplicationStatus[] = ['new', 'test_scheduled', 'tested', 'waitlisted', 'accepted'];
const matches = (tab: Tab, s: ApplicationStatus) => tab === 'all' || (tab === 'open' ? OPEN.includes(s) : tab === 'closed' ? s === 'rejected' || s === 'withdrawn' : s === tab);

export function AdminAdmissions() {
  const year = useCurrentAcademicYear();
  const apps = useApplications(year.id);
  const seats = useSeats(year.id);
  const settings = useAdmissionSettings();
  const sample = useGenerateAdmissionSample();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [tab, setTab] = useState<Tab>('open');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (apps.data ?? []).filter((a) => matches(tab, a.status) && (!q || a.applicant.name.toLowerCase().includes(q) || a.reference.toLowerCase().includes(q) || a.guardian.name.toLowerCase().includes(q)));
    // the waiting list is per class level: by level, then best score, then who applied first
    return tab === 'waitlisted' ?
    [...rows].sort((a, b) => a.classLevel.name.localeCompare(b.classLevel.name, undefined, { numeric: true }) || (b.score ?? 0) - (a.score ?? 0) || a.createdAt.localeCompare(b.createdAt)) :
    rows;
  }, [apps.data, tab, query]);
  // rank within each level (shown on the waiting list)
  const rankOf = (index: number) => {
    const level = list[index].classLevel._id;
    return list.slice(0, index + 1).filter((x) => x.classLevel._id === level).length;
  };
  const count = (t: Tab) => (apps.data ?? []).filter((a) => matches(t, a.status)).length;

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Students', to: '/admin/students' }, { label: 'Admissions' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Admissions" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;
  const pass = settings.data?.passMark ?? 50;

  return (
    <>
      <PageHeader
        title="Admissions"
        description="Applications from the online form and the office, the entrance test, decisions by free seats, and enrolment."
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <a href="/apply" target="_blank" rel="noreferrer"><Button variant="secondary" icon={<ExternalLinkIcon className="h-4 w-4" aria-hidden="true" />}>Online form</Button></a>
            {canManage && <Button variant="ghost" icon={<SettingsIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setSettingsOpen(true)}>Settings</Button>}
            {canManage && <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setAdding(true)}>New application</Button>}
          </>
        } />

      {settings.data && !settings.data.open &&
      <p className="mb-4 rounded-xl border border-warn-100 bg-warn-50 px-4 py-2.5 text-[13px] text-ink-700"><strong>The online form is closed.</strong> Families can not apply until you open it in Settings.</p>
      }

      <section aria-label="Seats" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {(seats.data ?? []).map((s) =>
        <div key={s.level._id} className="rounded-xl border border-ink-200/80 bg-white px-4 py-3 shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-500">{s.level.name}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className={cn('font-mono text-[22px] font-extrabold', s.free ? 'text-ink-900' : 'text-danger-600')}>{s.free}</span>
              <span className="text-[12.5px] text-ink-500">free of {s.capacity}</span>
            </p>
            <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
              <span className="bg-primary-600" style={{ width: `${s.capacity ? s.seated / s.capacity * 100 : 0}%` }} />
              <span className="bg-[#1baf7a]" style={{ width: `${s.capacity ? s.promised / s.capacity * 100 : 0}%` }} />
            </div>
            <p className="mt-1 text-[11.5px] text-ink-500">{s.seated} seated · {s.promised} accepted{s.waitlist ? ` · ${s.waitlist} waiting` : ''}</p>
          </div>
        )}
      </section>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
          <div className="w-64"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Name, reference, parent…" /></div>
          <div role="tablist" aria-label="Status" className="scrollbar-thin flex gap-1 overflow-x-auto rounded-lg bg-ink-100 p-1">
            {TABS.map((t) =>
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-semibold', tab === t.id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                {t.label}<span className="rounded-full bg-ink-200/70 px-1.5 text-[11px] text-ink-700">{count(t.id)}</span>
              </button>
            )}
          </div>
        </div>
        {apps.isError ?
        <ErrorState error={apps.error} onRetry={() => apps.refetch()} /> :
        apps.isLoading ?
        <div className="p-5"><SkeletonText lines={6} /></div> :
        !apps.data?.length ?
        <EmptyState icon={<UserPlusIcon className="h-5 w-5" aria-hidden="true" />} title="No applications yet" description="Share the online form with families, or enter an application at the office."
        action={canManage ? <Button variant="secondary" isLoading={sample.isPending} onClick={() => sample.mutate()}>Add 10 sample applications</Button> : undefined} /> :
        list.length === 0 ?
        <EmptyState title="Nothing in this list" /> :

        <ul className="divide-y divide-ink-100">
            {list.map((a, i) =>
          <li key={a._id}>
                <Link to={`/admin/admissions/${a._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-ink-50">
                  {tab === 'waitlisted' && <span className="shrink-0 rounded-full bg-warn-50 px-2 py-1 text-[12px] font-bold text-warn-500" title={`Place on the ${a.classLevel.name} waiting list`}>#{rankOf(i)} · {a.classLevel.name}</span>}
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate text-[14px] font-semibold text-ink-900">{a.applicant.name}</p>
                    <p className="truncate text-[12px] text-ink-500">{a.reference} · {a.classLevel.name} · {a.guardian.name} ({a.guardian.relation}) · {a.source === 'online' ? 'Online' : 'Office'}</p>
                  </div>
                  {a.test && a.status === 'test_scheduled' && <span className="text-[12.5px] text-ink-600">Test {formatDay(a.test.date)} {a.test.time}</span>}
                  {a.score !== undefined && <span className={cn('rounded-md px-2 py-0.5 font-mono text-[12.5px] font-bold', a.score >= pass ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>{a.score}/100</span>}
                  <Badge tone={APPLICATION_STATUS[a.status].tone}>{APPLICATION_STATUS[a.status].label}</Badge>
                </Link>
              </li>
          )}
          </ul>
        }
      </Card>

      {adding && <NewApplicationModal onClose={() => setAdding(false)} levels={(seats.data ?? []).map((s) => s.level)} />}
      {settingsOpen && settings.data && <SettingsModal initial={settings.data} onClose={() => setSettingsOpen(false)} />}
    </>);

}

function NewApplicationModal({ onClose, levels }: {onClose: () => void;levels: Array<{_id: string;name: string;}>;}) {
  const add = useAddApplication();
  const [value, setValue] = useState(emptyApplication());
  const [touched, setTouched] = useState(false);
  const submit = () => {
    setTouched(true);
    if (Object.values(applicationErrors(value)).some(Boolean)) return;
    add.mutate(value, { onSuccess: onClose });
  };
  return (
    <Modal open onClose={onClose} title="New application" description="Entered at the office. The family gets an email with the reference." size="lg"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={add.isPending} onClick={submit}>Add application</Button></>}>
      <ApplicationFields value={value} onChange={setValue} levels={levels} showErrors={touched} />
    </Modal>);

}

function SettingsModal({ initial, onClose }: {initial: {passMark: number;open: boolean;};onClose: () => void;}) {
  const update = useUpdateAdmissionSettings();
  const [pass, setPass] = useState(String(initial.passMark));
  const [open, setOpen] = useState(initial.open);
  const valid = /^\d+$/.test(pass) && Number(pass) <= 100;
  return (
    <Modal open onClose={onClose} title="Admission settings" size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={update.isPending} onClick={() => update.mutate({ passMark: Number(pass), open }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-700">
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} className="h-4 w-4 rounded border-ink-300" />
          The online form accepts applications
        </label>
        <Input id="pass-mark" label="Entrance test pass mark" inputMode="numeric" value={pass} onChange={(e) => setPass(e.target.value)} error={valid ? undefined : '0–100'} hint="Guidance only: scores below it are shown in red." />
      </div>
    </Modal>);

}
