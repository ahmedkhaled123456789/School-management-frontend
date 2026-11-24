import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DownloadIcon, FingerprintIcon, LogInIcon, LogOutIcon, PencilIcon, SettingsIcon, UserXIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { DateNav } from '../../../components/attendance/DateNav';
import {
  useAttendanceSettings,
  useImportDeviceFile,
  useMarkMissingStaffAbsent,
  useSaveStaffAttendance,
  useStaffAttendance,
  useStaffDirectory,
  useUpdateAttendanceSettings } from
'../../../hooks/attendance';
import { useSchoolDay } from '../../../hooks/sections';
import type { DeviceImportResult, StaffAttendanceRecord, StaffAttendanceStatus, StaffRef } from '../../../types/attendance';
import { isDateKey, isSchoolDate, nowTime, STAFF_STATUS_META, todayKey } from '../../../utils/attendance';
import { downloadCsv } from '../../../utils/reports';
import { cn } from '../../../utils/cn';
import { formatTime } from '../../../utils/timetable';

type Filter = 'all' | 'missing' | StaffAttendanceStatus;

export function AdminStaffAttendance() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const date = isDateKey(params.get('date') ?? '') && (params.get('date') as string) <= today ? params.get('date') as string : today;
  const schoolDay = useSchoolDay();
  const directory = useStaffDirectory();
  const records = useStaffAttendance(date);
  const settings = useAttendanceSettings();
  const save = useSaveStaffAttendance();
  const closeDay = useMarkMissingStaffAbsent();
  const importer = useImportDeviceFile();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<StaffRef | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importResult, setImportResult] = useState<DeviceImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const byPerson = useMemo(() => new Map((records.data ?? []).map((r) => [r.staff._id, r])), [records.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return directory.people.
    map((person) => ({ person, record: byPerson.get(person._id) })).
    filter(({ person, record }) =>
    (!q || person.name.toLowerCase().includes(q) || person.email?.toLowerCase().includes(q)) && (
    filter === 'all' || (filter === 'missing' ? !record : record?.status === filter))
    );
  }, [directory.people, byPerson, query, filter]);

  const count = (s: StaffAttendanceStatus) => (records.data ?? []).filter((r) => r.status === s && directory.people.some((p) => p._id === r.staff._id)).length;
  const missingCount = directory.people.filter((p) => !byPerson.has(p._id)).length;
  const offDay = schoolDay.data && !isSchoolDate(schoolDay.data, date);

  const quick = (person: StaffRef, action: 'in' | 'out') => {
    const record = byPerson.get(person._id);
    if (action === 'in') save.mutate({ date, staff: person, status: 'present', checkIn: nowTime(), checkOut: record?.checkOut, note: record?.note });else
    if (record?.checkIn) save.mutate({ date, staff: person, status: record.status, checkIn: record.checkIn, checkOut: nowTime(), note: record.note });
  };

  const onFile = async (file: File) => {
    if (file.size > 2_000_000) {
      setImportResult({ imported: 0, updated: 0, problems: ['The file is larger than 2 MB. Export one month at a time.'] });
      return;
    }
    const text = await file.text();
    importer.mutate({ text, people: directory.people }, { onSuccess: setImportResult });
  };

  const sampleFile = () => {
    const people = directory.people.slice(0, 3);
    downloadCsv('device-export-sample', ['email', 'date', 'time'], people.flatMap((p, i) => [[p.email ?? '', date, `07:${String(30 + i * 7).padStart(2, '0')}`], [p.email ?? '', date, `14:${String(20 + i * 9).padStart(2, '0')}`]]));
  };

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Staff & HR' }, { label: 'Attendance' }];
  const s = settings.data;

  return (
    <>
      <PageHeader
        title="Staff attendance"
        description={s ? `Teachers and office staff. The day starts at ${formatTime(s.staffStart)}; check-ins more than ${s.graceMinutes} min later count as late.` : 'Teachers and office staff.'}
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => {const f = e.target.files?.[0];e.target.value = '';if (f) onFile(f);}} />
            <Button variant="secondary" isLoading={importer.isPending} icon={<FingerprintIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => fileRef.current?.click()}>Import device file</Button>
            <Button variant="ghost" icon={<SettingsIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setSettingsOpen(true)}>Rules</Button>
          </>
        } />

      <DateNav value={date} onChange={(d) => setParams(d === today ? {} : { date: d }, { replace: true })} schoolDay={schoolDay.data} className="mb-4" />

      <section aria-label="Totals" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Present" value={String(count('present'))} />
        <Kpi label="Late" value={String(count('late'))} />
        <Kpi label="Absent" value={String(count('absent'))} />
        <Kpi label="On leave" value={String(count('leave'))} />
        <Kpi label="No record" value={String(missingCount)} sub={offDay ? 'No school this day' : undefined} />
      </section>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
          <div className="w-60"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Search name or email…" /></div>
          <div role="radiogroup" aria-label="Show" className="scrollbar-thin flex gap-1 overflow-x-auto rounded-lg bg-ink-100 p-1">
            {(['all', 'missing', 'present', 'late', 'absent', 'leave'] as Filter[]).map((f) =>
            <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
            className={cn('shrink-0 rounded-md px-2.5 py-1 text-[12.5px] font-semibold', filter === f ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                {f === 'all' ? 'Everyone' : f === 'missing' ? 'No record' : STAFF_STATUS_META[f].label}
              </button>
            )}
          </div>
          <Button className="ms-auto" variant="secondary" size="sm" disabled={!missingCount || offDay} icon={<UserXIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setConfirmClose(true)}>
            Mark the rest absent
          </Button>
        </div>
        {directory.error || records.isError ?
        <ErrorState error={directory.error ?? records.error} /> :
        directory.isLoading || records.isLoading ?
        <CardBody><SkeletonText lines={8} /></CardBody> :

        <div className="scrollbar-thin relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="border-b border-ink-200 bg-ink-50/70 text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  <th scope="col" className="px-5 py-2 text-start">Person</th>
                  <th scope="col" className="px-3 py-2 text-start">Status</th>
                  <th scope="col" className="px-3 py-2 text-start">In</th>
                  <th scope="col" className="px-3 py-2 text-start">Out</th>
                  <th scope="col" className="px-3 py-2 text-start">Source</th>
                  <th scope="col" className="px-5 py-2 text-end"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map(({ person, record }) =>
              <tr key={person._id}>
                    <td className="px-5 py-2.5">
                      <p dir="auto" className="font-semibold text-ink-900">{person.name}</p>
                      <p className="text-[12px] text-ink-500">{person.kind === 'teacher' ? 'Teacher' : 'Office staff'} · {person.email}</p>
                    </td>
                    <td className="px-3 py-2.5">{record ? <Badge tone={STAFF_STATUS_META[record.status].tone}>{STAFF_STATUS_META[record.status].label}</Badge> : <span className="text-ink-400">—</span>}</td>
                    <td className="px-3 py-2.5 font-mono">{record?.checkIn ? formatTime(record.checkIn) : '—'}</td>
                    <td className="px-3 py-2.5 font-mono">{record?.checkOut ? formatTime(record.checkOut) : '—'}</td>
                    <td className="px-3 py-2.5 text-ink-600">{record ? record.source === 'device' ? 'Device' : 'Manual' : '—'}{record?.note && <span className="block max-w-[180px] truncate text-[12px] text-ink-500" title={record.note}>{record.note}</span>}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        {date === today && !record &&
                    <Button size="sm" variant="secondary" icon={<LogInIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => quick(person, 'in')}>In</Button>
                    }
                        {date === today && record?.checkIn && !record.checkOut &&
                    <Button size="sm" variant="secondary" icon={<LogOutIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => quick(person, 'out')}>Out</Button>
                    }
                        <Button size="sm" variant="ghost" aria-label={`Edit ${person.name}`} icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEditing(person)} />
                      </div>
                    </td>
                  </tr>
              )}
                {!rows.length &&
              <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-500">{directory.people.length ? 'Nobody matches these filters.' : 'No teachers or staff accounts yet.'}</td></tr>
              }
              </tbody>
            </table>
          </div>
        }
      </Card>

      {editing &&
      <StaffRecordModal person={editing} date={date} record={byPerson.get(editing._id)} isSaving={save.isPending}
      onClose={() => setEditing(null)}
      onSave={(payload) => save.mutate({ date, staff: editing, ...payload }, { onSuccess: () => setEditing(null) })} />
      }

      <ConfirmDialog
        open={confirmClose}
        title="Mark the rest absent?"
        message={`${missingCount} person(s) have no record on ${date}. They will be marked absent; you can still edit each one afterwards.`}
        confirmLabel="Mark absent"
        isLoading={closeDay.isPending}
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => closeDay.mutate({ date, people: directory.people }, { onSettled: () => setConfirmClose(false) })} />

      {settingsOpen && s && <RulesModal initial={s} onClose={() => setSettingsOpen(false)} />}

      <Modal open={Boolean(importResult)} onClose={() => setImportResult(null)} title="Device import" size="md"
      footer={<Button onClick={() => setImportResult(null)}>Done</Button>}>
        {importResult &&
        <div className="space-y-3 text-[13.5px]">
            <p><strong>{importResult.imported}</strong> new record(s), <strong>{importResult.updated}</strong> updated.</p>
            {importResult.problems.length > 0 &&
          <div>
                <p className="mb-1 font-semibold text-danger-600">{importResult.problems.length} line(s) skipped</p>
                <ul className="scrollbar-thin max-h-48 list-disc space-y-0.5 overflow-y-auto ps-5 text-[12.5px] text-ink-700">
                  {importResult.problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
          }
            <p className="text-[12.5px] text-ink-500">Expected format: <code className="rounded bg-ink-100 px-1">email,date,time</code> — one punch per line. <button type="button" className="font-semibold text-primary-600 hover:underline" onClick={sampleFile}><DownloadIcon className="me-0.5 inline h-3.5 w-3.5" aria-hidden="true" />Sample file</button></p>
          </div>
        }
      </Modal>
    </>);

}

function StaffRecordModal({ person, date, record, isSaving, onClose, onSave }: {
  person: StaffRef;date: string;record?: StaffAttendanceRecord;isSaving: boolean;
  onClose: () => void;onSave: (p: {status: StaffAttendanceStatus;checkIn?: string;checkOut?: string;note?: string;}) => void;
}) {
  const [status, setStatus] = useState<StaffAttendanceStatus>(record?.status ?? 'present');
  const [checkIn, setCheckIn] = useState(record?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(record?.checkOut ?? '');
  const [note, setNote] = useState(record?.note ?? '');
  const away = status === 'absent' || status === 'leave';
  const error = !away && !checkIn ? 'Enter the check-in time' : !away && checkOut && checkOut <= checkIn ? 'Check-out must be after check-in' : null;
  return (
    <Modal open onClose={onClose} title={person.name} description={`${date} · ${person.kind === 'teacher' ? 'Teacher' : 'Office staff'}`} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={isSaving} disabled={Boolean(error)} onClick={() => onSave({ status, checkIn: away ? undefined : checkIn, checkOut: away ? undefined : checkOut || undefined, note })}>Save</Button></>}>
      <div className="space-y-3">
        <Select id="staff-status" label="Status" value={status === 'late' ? 'present' : status} onChange={(e) => setStatus(e.target.value as StaffAttendanceStatus)}
        options={[{ value: 'present', label: 'Came in (late is worked out from the time)' }, { value: 'absent', label: 'Absent' }, { value: 'leave', label: 'On leave' }]} />
        {!away &&
        <div className="grid grid-cols-2 gap-3">
            <Input id="staff-in" label="Check-in" type="time" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            <Input id="staff-out" label="Check-out" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        }
        <Input id="staff-note" label="Note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        {error && <p role="alert" className="text-[12.5px] text-danger-600">{error}</p>}
      </div>
    </Modal>);

}

function RulesModal({ initial, onClose }: {initial: {staffStart: string;graceMinutes: number;lockDays: number;};onClose: () => void;}) {
  const update = useUpdateAttendanceSettings();
  const [start, setStart] = useState(initial.staffStart);
  const [grace, setGrace] = useState(String(initial.graceMinutes));
  const [lock, setLock] = useState(String(initial.lockDays));
  const valid = /^\d{2}:\d{2}$/.test(start) && /^\d+$/.test(grace) && Number(grace) <= 60 && /^\d+$/.test(lock) && Number(lock) <= 30;
  return (
    <Modal open onClose={onClose} title="Attendance rules" size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={update.isPending} onClick={() => update.mutate({ staffStart: start, graceMinutes: Number(grace), lockDays: Number(lock) }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="space-y-3">
        <Input id="rule-start" label="Staff day starts" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input id="rule-grace" label="Grace (minutes)" type="number" min={0} max={60} value={grace} onChange={(e) => setGrace(e.target.value)} hint="Check-ins later than start + grace count as late." />
        <Input id="rule-lock" label="Teachers can edit registers for (days)" type="number" min={0} max={30} value={lock} onChange={(e) => setLock(e.target.value)} hint="After that only the school office can change a register." />
      </div>
    </Modal>);

}
