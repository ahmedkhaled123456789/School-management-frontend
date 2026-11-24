import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AwardIcon, DownloadIcon, PrinterIcon, SettingsIcon, SparklesIcon, TrophyIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { NoAcademicYear } from '../../../components/sections/Notices';
import { CanvasImage, printImages } from '../../../components/certificates/CanvasImage';
import { useCertificateSettings, useCertificates, useIssueCertificates, useRevokeCertificate, useUpdateCertificateSettings } from '../../../hooks/admissions';
import { useAttendanceStats } from '../../../hooks/attendance';
import { useEvents } from '../../../hooks/events';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSections } from '../../../hooks/sections';
import { useStaff } from '../../../hooks/staff';
import { useStudents } from '../../../hooks/students';
import { useTeachers } from '../../../hooks/teachers';
import { CERTIFICATE_HEADING, downloadCanvas, drawIssued, renderCertificate, renderIdCard, verifyUrl } from '../../../lib/cards';
import { PERMISSIONS } from '../../../lib/permissions';
import type { Certificate, CertificateType } from '../../../types/certificates';
import type { StudentRef } from '../../../types/sections';
import { addDays, formatDay, rateOf, todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { sectionLabel } from '../../../utils/timetable';

type Tab = 'cards' | 'issue' | 'issued';

export function AdminCertificates() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'issue' ? 'issue' : params.get('tab') === 'issued' ? 'issued' : 'cards';
  const year = useCurrentAcademicYear();
  const settings = useCertificateSettings();
  const { can } = usePermissions();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Students', to: '/admin/students' }, { label: 'Certificates & ID cards' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Certificates & ID cards" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  return (
    <>
      <PageHeader
        title="Certificates & ID cards"
        description="Printable ID cards with the gate QR code, and certificates with a verification code. Both use your Branding."
        breadcrumbs={breadcrumbs}
        actions={can(PERMISSIONS.STUDENTS_MANAGE) ? <Button variant="ghost" icon={<SettingsIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setSettingsOpen(true)}>Settings</Button> : undefined} />
      <div role="tablist" aria-label="View" className="mb-5 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {([['cards', 'ID cards'], ['issue', 'Issue certificates'], ['issued', 'Issued']] as const).map(([id, label]) =>
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'cards' ? {} : { tab: id })}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{label}</button>
        )}
      </div>
      {tab === 'cards' && <IdCardsTab year={year.id} validUntil={settings.data?.cardsValidUntil ?? ''} />}
      {tab === 'issue' && <IssueTab year={year.id} />}
      {tab === 'issued' && <IssuedTab />}
      {settingsOpen && settings.data && <SettingsModal initial={settings.data} onClose={() => setSettingsOpen(false)} />}
    </>);

}

/* --------------------------------- ID cards -------------------------------- */

function IdCardsTab({ year, validUntil }: {year: string;validUntil: string;}) {
  const sections = useSections(year);
  const students = useStudents({ limit: 500 });
  const teachers = useTeachers({ limit: 500 });
  const staff = useStaff();
  const [group, setGroup] = useState('');
  const images = useRef(new Map<string, string>());
  const [ready, setReady] = useState(0);

  const photos = useMemo(() => new Map([
  ...(students.data?.items ?? []).map((s) => [s._id, s.image] as const),
  ...(teachers.data?.items ?? []).map((t) => [t._id, (t as {image?: string;}).image] as const),
  ...(staff.data?.items ?? []).map((s) => [s._id, s.image] as const)]
  ), [students.data, teachers.data, staff.data]);

  const people = useMemo(() => {
    if (group === 'staff') {
      return [
      ...(teachers.data?.items ?? []).filter((t) => !t.isWithdrawn).map((t) => ({ _id: t._id, name: t.name, code: t.teacherId || t.email, role: 'Teacher' as const, line: typeof t.subject === 'object' && t.subject ? (t.subject as {name?: string;}).name : undefined })),
      ...(staff.data?.items ?? []).filter((s) => s.isActive).map((s) => ({ _id: s._id, name: s.name, code: s.email, role: 'Staff' as const, line: s.role.charAt(0).toUpperCase() + s.role.slice(1) }))];

    }
    const section = sections.data?.find((s) => s._id === group);
    return (section?.students ?? []).map((st) => ({ _id: st._id, name: st.name, code: st.studentId ?? st._id, role: 'Student' as const, line: section ? sectionLabel(section) : undefined }));
  }, [group, sections.data, teachers.data, staff.data]);

  const choose = (g: string) => {
    images.current = new Map();
    setReady(0);
    setGroup(g);
  };
  const all = () => people.map((p) => images.current.get(p._id)).filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <div className="w-72">
            <Select id="card-group" label="Cards for" value={group} onChange={(e) => choose(e.target.value)} placeholder="Choose a section or staff"
            options={[...(sections.data ?? []).map((s) => ({ value: s._id, label: `${sectionLabel(s)} · ${s.students.length} students` })), { value: 'staff', label: 'Teachers & staff' }]} />
          </div>
          <p className="pb-2.5 text-[13px] text-ink-500">Valid until {validUntil || '—'} · the QR code is the gate code.</p>
          <Button className="ms-auto" icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />} disabled={!people.length || ready < people.length} onClick={() => printImages(all(), 'cards', 'ID cards')}>
            {people.length && ready < people.length ? `Preparing ${ready}/${people.length}…` : `Print ${people.length || ''} card${people.length === 1 ? '' : 's'}`}
          </Button>
        </CardBody>
      </Card>
      {!group ?
      <Card><EmptyState title="Choose who to print cards for" description="Cards are drawn in your browser at print quality (CR80, 300 dpi)." /></Card> :
      people.length === 0 ?
      <Card><EmptyState title="Nobody here" description="This section has no students yet." /></Card> :

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {people.map((p) =>
        <li key={p._id} className="space-y-1.5">
              <CanvasImage
            alt={`ID card of ${p.name}`}
            className="aspect-[1012/638] w-full"
            deps={[p._id, p.name, p.code, p.line, validUntil, photos.get(p._id)]}
            render={() => renderIdCard({ name: p.name, code: p.code, role: p.role, line: p.line, photo: photos.get(p._id), validUntil })}
            onReady={(url) => {images.current.set(p._id, url);setReady(images.current.size);}} />
              <button type="button" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline"
          onClick={async () => downloadCanvas(await renderIdCard({ name: p.name, code: p.code, role: p.role, line: p.line, photo: photos.get(p._id), validUntil }), `ID card ${p.name}`)}>
                <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Download PNG
              </button>
            </li>
        )}
        </ul>
      }
    </div>);

}

/* ------------------------------ issue certificates ------------------------------ */

const TYPE_LABEL: Record<CertificateType, string> = {
  achievement: 'Achievement',
  attendance: 'Attendance',
  completion: 'Completion',
  conduct: 'Good conduct',
  participation: 'Participation'
};

function IssueTab({ year }: {year: string;}) {
  const sections = useSections(year);
  const settings = useCertificateSettings();
  const issue = useIssueCertificates();
  const stats = useAttendanceStats(year, addDays(todayKey(), -29), todayKey());
  const events = useEvents(year);
  const [type, setType] = useState<CertificateType>('achievement');
  const [title, setTitle] = useState('Certificate of Achievement');
  const [reason, setReason] = useState('');
  const [issuedOn, setIssuedOn] = useState(todayKey());
  const [selected, setSelected] = useState<Map<string, StudentRef>>(new Map());
  const [source, setSource] = useState<{kind: 'event' | 'attendance' | 'manual';id?: string;label?: string;} | undefined>();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{issued: Certificate[];skipped: string[];} | null>(null);
  // opened from an event page: pre-fill its winners once
  const [params] = useSearchParams();
  const fromEvent = params.get('event');
  const prefilled = useRef(false);

  const everyone = useMemo(() => (sections.data ?? []).flatMap((s) => s.students.map((st) => ({ ...st, section: sectionLabel(s) }))).sort((a, b) => a.name.localeCompare(b.name)), [sections.data]);
  const visible = everyone.filter((s) => !query.trim() || s.name.toLowerCase().includes(query.trim().toLowerCase()) || s.section.toLowerCase().includes(query.trim().toLowerCase()));
  const perfect = (stats.data?.students ?? []).filter((s) => s.tally.total >= 10 && rateOf(s.tally) === 100);
  const withResults = (events.data ?? []).filter((e) => e.results.length && e.status === 'published');
  const toggle = (s: StudentRef) => setSelected((prev) => {const next = new Map(prev);if (next.has(s._id)) next.delete(s._id);else next.set(s._id, s);return next;});
  const first = [...selected.values()][0];

  const suggestPerfect = () => {
    setType('attendance');
    setTitle('Perfect Attendance');
    setReason('for attending every lesson over the last 30 days');
    setSource({ kind: 'attendance', id: `perfect-${todayKey().slice(0, 7)}`, label: 'Perfect attendance (30 days)' });
    setSelected(new Map(perfect.map((p) => [p.student._id, p.student])));
  };
  const suggestEvent = (id: string) => {
    const e = withResults.find((x) => x._id === id);
    if (!e) return;
    setType(e.type === 'competition' || e.type === 'sports' ? 'achievement' : 'participation');
    setTitle(`Winner · ${e.title}`.slice(0, 80));
    setReason(`for an outstanding place in ${e.title}`.slice(0, 160));
    setSource({ kind: 'event', id: e._id, label: e.title });
    setSelected(new Map(e.results.filter((r) => r.place <= 3).map((r) => [r.student._id, r.student])));
  };

  useEffect(() => {
    if (fromEvent && !prefilled.current && withResults.some((e) => e._id === fromEvent)) {
      prefilled.current = true;
      suggestEvent(fromEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromEvent, withResults.length]);

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><SparklesIcon className="h-4 w-4 text-accent-500" aria-hidden="true" />Suggestions</span>} description="Pre-filled from attendance and event results." />
          <CardBody className="space-y-3">
            <Button variant="secondary" fullWidth disabled={!perfect.length} onClick={suggestPerfect}>
              Perfect attendance · {stats.isLoading ? '…' : perfect.length} student(s)
            </Button>
            <Select id="suggest-event" label="Event winners" value="" placeholder={withResults.length ? 'Choose an event with results' : 'No event results yet'} disabled={!withResults.length}
            onChange={(e) => suggestEvent(e.target.value)} options={withResults.map((e) => ({ value: e._id, label: `${e.title} · ${e.results.filter((r) => r.place <= 3).length} winner(s)` }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Certificate" />
          <CardBody className="space-y-3">
            <Select id="cert-type" label="Type" value={type} onChange={(e) => {const t = e.target.value as CertificateType;setType(t);setTitle(CERTIFICATE_HEADING[t]);}} options={(Object.keys(TYPE_LABEL) as CertificateType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
            <Input id="cert-title" label="Title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input id="cert-reason" label="Citation (optional)" maxLength={160} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="for outstanding results in Mathematics" />
            <Input id="cert-date" label="Date" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
            <p className="text-[12.5px] text-ink-500">Signed by {settings.data?.signerName ?? '…'}, {settings.data?.signerTitle}</p>
            <Button fullWidth icon={<AwardIcon className="h-4 w-4" aria-hidden="true" />} disabled={!selected.size || title.trim().length < 3} isLoading={issue.isPending}
            onClick={() => issue.mutate({ type, title, reason, issuedOn, students: [...selected.values()], source: source ?? { kind: 'manual' } }, { onSuccess: (r) => {setResult(r);setSelected(new Map());setSource(undefined);} })}>
              Issue to {selected.size} student{selected.size === 1 ? '' : 's'}
            </Button>
          </CardBody>
        </Card>
      </div>
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader title="Preview" description={first ? first.name : 'Select a student to preview'} />
          <CardBody>
            <CanvasImage
              alt="Certificate preview"
              className="aspect-[2000/1414] w-full"
              deps={[type, title, reason, issuedOn, first?._id, settings.data?.signerName]}
              render={() => renderCertificate({ serial: 'PREVIEW-0000', heading: CERTIFICATE_HEADING[type], title, studentName: first?.name ?? 'Student name', reason, date: formatDay(issuedOn, { day: 'numeric', month: 'long', year: 'numeric' }), signer: { name: settings.data?.signerName ?? '', title: settings.data?.signerTitle ?? '' }, verifyUrl: verifyUrl('PREVIEW') })} />
          </CardBody>
        </Card>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
            <h2 className="text-[15px] font-bold text-ink-900">Students <span className="font-normal text-ink-500">({selected.size} selected)</span></h2>
            <div className="w-56"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Name or section…" /></div>
            {selected.size > 0 && <button type="button" onClick={() => setSelected(new Map())} className="ms-auto text-[12.5px] font-semibold text-primary-600 hover:underline">Clear</button>}
          </div>
          <ul className="scrollbar-thin max-h-80 divide-y divide-ink-100 overflow-y-auto">
            {visible.map((s) =>
            <li key={s._id}>
                <label className="flex cursor-pointer items-center gap-3 px-5 py-2 text-[13px] hover:bg-ink-50">
                  <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggle(s)} className="h-4 w-4 rounded border-ink-300" />
                  <span dir="auto" className="min-w-0 flex-1 truncate font-semibold text-ink-900">{s.name}</span>
                  <span className="text-[12px] text-ink-500">{s.section}</span>
                </label>
              </li>
            )}
          </ul>
        </Card>
      </div>
      <Modal open={Boolean(result)} onClose={() => setResult(null)} title="Certificates issued" size="sm" footer={<Button onClick={() => setResult(null)}>Done</Button>}>
        {result &&
        <div className="space-y-2 text-[13.5px]">
            <p><strong>{result.issued.length}</strong> issued. Students and parents were notified.</p>
            {result.issued.slice(0, 5).map((c) => <p key={c._id} className="font-mono text-[12.5px] text-ink-600">{c.serial} · {c.student.name}</p>)}
            {result.skipped.length > 0 && <ul className="list-disc ps-5 text-[12.5px] text-warn-500">{result.skipped.map((s) => <li key={s}>{s}</li>)}</ul>}
            <p className="text-[12.5px] text-ink-500">Download or print them from the “Issued” tab.</p>
          </div>
        }
      </Modal>
    </div>);

}

/* ---------------------------------- issued --------------------------------- */

function IssuedTab() {
  const list = useCertificates();
  const revoke = useRevokeCertificate();
  const { can } = usePermissions();
  const [query, setQuery] = useState('');
  const [revoking, setRevoking] = useState<Certificate | null>(null);
  const [reason, setReason] = useState('');
  const [printing, setPrinting] = useState(false);
  const rows = (list.data ?? []).filter((c) => !query.trim() || [c.serial, c.student.name, c.title].some((v) => v.toLowerCase().includes(query.trim().toLowerCase())));

  const printAll = async () => {
    setPrinting(true);
    const urls = [];
    for (const c of rows.filter((r) => !r.revoked).slice(0, 60)) urls.push((await drawIssued(c)).toDataURL('image/png'));
    setPrinting(false);
    printImages(urls, 'certificates', 'Certificates');
  };

  if (list.isError) return <Card><ErrorState error={list.error} /></Card>;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
        <div className="w-64"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Code, student or title…" /></div>
        <Button className="ms-auto" variant="secondary" size="sm" icon={<PrinterIcon className="h-3.5 w-3.5" aria-hidden="true" />} disabled={!rows.length} isLoading={printing} onClick={printAll}>Print {Math.min(rows.filter((r) => !r.revoked).length, 60)}</Button>
      </div>
      {list.isLoading ?
      <div className="p-5"><SkeletonText lines={5} /></div> :
      !rows.length ?
      <EmptyState icon={<TrophyIcon className="h-5 w-5" aria-hidden="true" />} title="No certificates yet" description="Issue them from the “Issue certificates” tab." /> :

      <ul className="divide-y divide-ink-100">
          {rows.map((c) =>
        <li key={c._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
              <span className="w-40 shrink-0 font-mono text-[12.5px] text-ink-700">{c.serial}</span>
              <div className="min-w-0 flex-1">
                <p dir="auto" className="font-semibold text-ink-900">{c.student.name} · {c.title}</p>
                <p className="text-[12px] text-ink-500">{formatDay(c.issuedOn)}{c.source?.label ? ` · ${c.source.label}` : ''}{c.revoked ? ` · revoked: ${c.revoked.reason}` : ''}</p>
              </div>
              {c.revoked ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Valid</Badge>}
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline" onClick={async () => downloadCanvas(await drawIssued(c), `${c.serial} ${c.student.name}`)}>
                <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />PNG
              </button>
              {!c.revoked && can(PERMISSIONS.STUDENTS_MANAGE) && <button type="button" className="font-semibold text-danger-600 hover:underline" onClick={() => {setReason('');setRevoking(c);}}>Revoke</button>}
            </li>
        )}
        </ul>
      }
      <Modal open={Boolean(revoking)} onClose={() => setRevoking(null)} title={`Revoke ${revoking?.serial ?? ''}?`} description="The verification page will show it as revoked, with your reason." size="sm"
      footer={<><Button variant="secondary" onClick={() => setRevoking(null)}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} isLoading={revoke.isPending} onClick={() => revoking && revoke.mutate({ id: revoking._id, reason }, { onSuccess: () => setRevoking(null) })}>Revoke</Button></>}>
        <Input id="revoke-reason" label="Reason" required maxLength={160} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Issued by mistake" />
      </Modal>
    </Card>);

}

function SettingsModal({ initial, onClose }: {initial: {signerName: string;signerTitle: string;cardsValidUntil: string;};onClose: () => void;}) {
  const update = useUpdateCertificateSettings();
  const [v, setV] = useState(initial);
  return (
    <Modal open onClose={onClose} title="Certificate settings" size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={update.isPending} onClick={() => update.mutate(v, { onSuccess: onClose })}>Save</Button></>}>
      <div className="space-y-3">
        <Input id="signer-name" label="Signed by" maxLength={60} value={v.signerName} onChange={(e) => setV({ ...v, signerName: e.target.value })} />
        <Input id="signer-title" label="Title" maxLength={60} value={v.signerTitle} onChange={(e) => setV({ ...v, signerTitle: e.target.value })} />
        <Input id="cards-valid" label="ID cards valid until" type="date" min={todayKey()} value={v.cardsValidUntil} onChange={(e) => setV({ ...v, cardsValidUntil: e.target.value })} />
      </div>
    </Modal>);

}
