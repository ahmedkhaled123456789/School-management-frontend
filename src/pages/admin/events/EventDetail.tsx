import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BanIcon, CheckIcon, MapPinIcon, PencilIcon, PlusIcon, SendIcon, Trash2Icon, TrophyIcon, Undo2Icon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { EventForm } from '../../../components/events/EventForm';
import { useCancelEvent, useDeleteEvent, useEvent, usePublishEvent, useRecordEventPayment, useSaveEventResults, useUndoEventPayment } from '../../../hooks/events';
import { usePermissions } from '../../../hooks/permissions';
import { PERMISSIONS } from '../../../lib/permissions';
import type { EventResult } from '../../../types/events';
import type { StudentRef } from '../../../types/sections';
import { todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { downloadCsv } from '../../../utils/reports';
import { EVENT_STATUS_META, EVENT_TYPE_META, eventWhen, feeLabel } from '../../../utils/events';

type Filter = 'all' | 'approved' | 'waitlisted' | 'declined' | 'pending' | 'unpaid';

export function AdminEventDetail() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const query = useEvent(eventId);
  const publish = usePublishEvent();
  const cancel = useCancelEvent();
  const remove = useDeleteEvent();
  const pay = useRecordEventPayment();
  const undoPay = useUndoEventPayment();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  const e = query.data;
  const rows = useMemo(() => {
    if (!e) return [];
    const q = search.trim().toLowerCase();
    return e.students.map((s) => {
      const r = e.responses.find((x) => x.student._id === s._id);
      const state = !e.requiresConsent ? 'approved' : !r ? 'pending' : r.decision === 'declined' ? 'declined' : r.waitlisted ? 'waitlisted' : 'approved';
      const paid = e.payments.some((p) => p.studentId === s._id);
      return { student: s, response: r, state, paid };
    }).filter((row) =>
    (!q || row.student.name.toLowerCase().includes(q) || row.student.section.toLowerCase().includes(q)) && (
    filter === 'all' || (filter === 'unpaid' ? row.state === 'approved' && e.fee > 0 && !row.paid : row.state === filter))
    );
  }, [e, filter, search]);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Events', to: '/admin/events' }, { label: e?.title ?? 'Event' }];
  if (query.isError) return <><PageHeader title="Event" breadcrumbs={breadcrumbs} /><Card><ErrorState error={query.error} /></Card></>;
  if (!e) return <><PageHeader title="Loading…" breadcrumbs={breadcrumbs} /><Card className="p-5"><SkeletonText lines={8} /></Card></>;

  const Icon = EVENT_TYPE_META[e.type].icon;
  const pending = e.requiresConsent ? e.eligible - e.approved - e.waitlisted - e.declined : 0;
  const collected = e.payments.reduce((s, p) => s + p.amount, 0);
  const withResults = (e.type === 'competition' || e.type === 'sports') && e.status === 'published' && e.date <= todayKey();
  const STATE_BADGE: Record<string, {label: string;tone: 'success' | 'warn' | 'danger' | 'neutral';}> = {
    approved: { label: e.requiresConsent ? 'Approved' : 'Going', tone: 'success' },
    waitlisted: { label: 'Waiting list', tone: 'warn' },
    declined: { label: 'Declined', tone: 'danger' },
    pending: { label: 'No reply', tone: 'neutral' }
  };

  return (
    <>
      <PageHeader
        title={e.title}
        description={`${EVENT_TYPE_META[e.type].label} · ${eventWhen(e)}`}
        breadcrumbs={breadcrumbs}
        actions={canManage &&
        <>
            {e.status === 'draft' && <Button icon={<SendIcon className="h-4 w-4" aria-hidden="true" />} isLoading={publish.isPending} onClick={() => publish.mutate(e._id)}>Publish</Button>}
            {e.status !== 'cancelled' && <Button variant="secondary" icon={<PencilIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing(true)}>Edit</Button>}
            {e.status === 'published' && <Button variant="ghost" icon={<BanIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setCancelling(true)}>Cancel event</Button>}
            {e.status !== 'published' && <Button variant="ghost" icon={<Trash2Icon className="h-4 w-4" aria-hidden="true" />} onClick={() => setDeleting(true)}>Delete</Button>}
          </>
        } />

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <div className="min-w-0 space-y-1.5 text-[13.5px]">
              <p className="flex flex-wrap items-center gap-2"><Badge tone={EVENT_STATUS_META[e.status].tone}>{EVENT_STATUS_META[e.status].label}</Badge><span className="text-ink-600">{e.audienceLabel}</span></p>
              <p className="flex items-center gap-1.5 text-ink-700"><MapPinIcon className="h-4 w-4 text-ink-400" aria-hidden="true" />{e.location}</p>
              {e.description && <p dir="auto" className="whitespace-pre-line text-ink-700">{e.description}</p>}
              <p className="text-ink-600">
                {feeLabel(e.fee)}{e.capacity ? ` · ${e.capacity} places` : ' · unlimited places'}
                {e.requiresConsent ? ` · parents reply by ${e.consentDeadline ?? e.date}` : ' · no approval needed'}
              </p>
              {e.status === 'cancelled' && <p className="rounded-lg bg-danger-50 px-3 py-2 text-danger-600">Cancelled: {e.cancelReason}</p>}
              {e.status === 'draft' && <p className="rounded-lg bg-ink-50 px-3 py-2 text-ink-600">Draft: families do not see it until you publish.</p>}
            </div>
          </CardBody>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Kpi label={e.requiresConsent ? 'Approved' : 'Going'} value={`${e.requiresConsent ? e.approved : e.eligible}${e.capacity ? `/${e.capacity}` : ''}`} sub={`of ${e.eligible} invited`} />
          <Kpi label="No reply" value={String(pending)} sub={e.requiresConsent ? `${e.declined} declined` : '—'} />
          <Kpi label="Waiting list" value={String(e.waitlisted)} />
          <Kpi label="Collected" value={e.fee ? (collected / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'} sub={e.fee ? `EGP · ${e.paid} of ${e.approved} paid` : 'Free event'} />
        </div>
      </div>

      {(e.results.length > 0 || withResults) &&
      <Card className="mb-5">
          <CardHeader title={<span className="flex items-center gap-2"><TrophyIcon className="h-4 w-4 text-accent-500" aria-hidden="true" />Results</span>}
        action={canManage ?
        <div className="flex gap-2">
              {e.results.length > 0 && <Link to={`/admin/certificates?tab=issue&event=${e._id}`}><Button size="sm" variant="ghost">Certificates for winners</Button></Link>}
              {withResults && <Button size="sm" variant="secondary" onClick={() => setResultsOpen(true)}>{e.results.length ? 'Edit results' : 'Enter results'}</Button>}
            </div> : undefined} />
          <CardBody>
            {e.results.length ?
          <ol className="space-y-1.5 text-[13.5px]">{e.results.map((r) => <li key={r.student._id} className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-accent-100 text-[12px] font-bold text-ink-900">{r.place}</span><span className="font-semibold text-ink-900">{r.student.name}</span>{r.note && <span className="text-ink-500">· {r.note}</span>}</li>)}</ol> :
          <p className="text-[13px] text-ink-500">No results yet.</p>}
          </CardBody>
        </Card>
      }

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
          <h2 className="text-[15px] font-bold text-ink-900">Participants</h2>
          <div className="w-56"><SearchInput className="sm:w-full" value={search} onChange={setSearch} placeholder="Name or section…" /></div>
          <div role="radiogroup" aria-label="Show" className="scrollbar-thin flex gap-1 overflow-x-auto rounded-lg bg-ink-100 p-1">
            {(['all', 'approved', 'waitlisted', 'pending', 'declined', ...e.fee ? ['unpaid'] : []] as Filter[]).map((f) =>
            <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
            className={cn('shrink-0 rounded-md px-2.5 py-1 text-[12.5px] font-semibold capitalize', filter === f ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                {f === 'pending' ? 'No reply' : f === 'waitlisted' ? 'Waiting list' : f}
              </button>
            )}
          </div>
          <div className="ms-auto flex items-center gap-2">
            {e.fee > 0 && canManage &&
            <label className="flex items-center gap-1.5 text-[12.5px] text-ink-600">Paid by
                <select value={method} onChange={(ev) => setMethod(ev.target.value as typeof method)} className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[13px]">
                  <option value="cash">Cash</option><option value="card">Card</option><option value="transfer">Transfer</option>
                </select>
              </label>
            }
            <Button size="sm" variant="ghost" onClick={() => downloadCsv(`event-${e.title}`, ['Student', 'Code', 'Section', 'Reply', 'By', 'Note', 'Paid'], rows.map((r) => [r.student.name, r.student.studentId ?? '', r.student.section, STATE_BADGE[r.state].label, r.response?.by.name ?? '', r.response?.note ?? '', e.fee ? r.paid ? 'yes' : 'no' : '']))}>CSV</Button>
          </div>
        </div>
        <ul className="divide-y divide-ink-100">
          {rows.map((r) =>
          <li key={r.student._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
              <div className="min-w-0 flex-1">
                <p dir="auto" className="font-semibold text-ink-900">{r.student.name}</p>
                <p className="text-[12px] text-ink-500">{r.student.section}{r.response ? ` · by ${r.response.by.name}` : ''}{r.response?.note ? ` · “${r.response.note}”` : ''}</p>
              </div>
              <Badge tone={STATE_BADGE[r.state].tone}>{STATE_BADGE[r.state].label}</Badge>
              {e.fee > 0 && r.state === 'approved' && (
            r.paid ?
            <span className="flex items-center gap-1">
                    <Badge tone="success" icon={<CheckIcon className="h-3 w-3" aria-hidden="true" />}>Paid</Badge>
                    {canManage && <button type="button" aria-label={`Undo payment of ${r.student.name}`} onClick={() => undoPay.mutate({ id: e._id, studentId: r.student._id })} className="rounded p-1 text-ink-400 hover:text-ink-700"><Undo2Icon className="h-3.5 w-3.5" aria-hidden="true" /></button>}
                  </span> :
            canManage && e.status !== 'cancelled' ?
            <Button size="sm" variant="secondary" isLoading={pay.isPending && pay.variables?.studentId === r.student._id} onClick={() => pay.mutate({ id: e._id, studentId: r.student._id, method })}>Mark paid</Button> :
            <Badge tone="warn">Unpaid</Badge>)
            }
            </li>
          )}
          {!rows.length && <li className="px-5 py-8 text-center text-[13px] text-ink-500">Nobody matches.</li>}
        </ul>
      </Card>

      {editing && <EventForm initial={e} onClose={() => setEditing(false)} />}
      {resultsOpen && <ResultsModal eventId={e._id} students={e.students} initial={e.results} onClose={() => setResultsOpen(false)} />}
      <Modal open={cancelling} onClose={() => setCancelling(false)} title="Cancel this event?" description="Every invited family is notified with your reason." size="sm"
      footer={<><Button variant="secondary" onClick={() => setCancelling(false)}>Keep it</Button><Button variant="danger" disabled={!reason.trim()} isLoading={cancel.isPending} onClick={() => cancel.mutate({ id: e._id, reason }, { onSuccess: () => setCancelling(false) })}>Cancel event</Button></>}>
        <Input id="cancel-reason" label="Reason" required maxLength={200} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="e.g. Bad weather forecast" />
        {e.payments.length > 0 && <p className="mt-2 text-[12.5px] text-warn-500">{e.payments.length} fee(s) were collected: families are told the office will refund them.</p>}
      </Modal>
      <ConfirmDialog open={deleting} title="Delete this event?" message="It is removed for good." confirmLabel="Delete" tone="danger" isLoading={remove.isPending}
      onCancel={() => setDeleting(false)} onConfirm={() => remove.mutate(e._id, { onSuccess: () => navigate('/admin/events') })} />
    </>);

}

function ResultsModal({ eventId, students, initial, onClose }: {eventId: string;students: Array<StudentRef & {section: string;}>;initial: EventResult[];onClose: () => void;}) {
  const save = useSaveEventResults();
  const [rows, setRows] = useState<Array<{studentId: string;note: string;}>>(initial.length ? initial.map((r) => ({ studentId: r.student._id, note: r.note ?? '' })) : [{ studentId: '', note: '' }]);
  const used = new Set(rows.map((r) => r.studentId));
  const valid = rows.every((r) => r.studentId) && used.size === rows.length;
  return (
    <Modal open onClose={onClose} title="Results" description="Places in order. The top three families get a congratulations notification." size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={save.isPending}
    onClick={() => save.mutate({ id: eventId, results: rows.map((r, i) => ({ place: i + 1, student: students.find((s) => s._id === r.studentId)!, note: r.note })) }, { onSuccess: onClose })}>Save results</Button></>}>
      <ol className="space-y-2">
        {rows.map((r, i) =>
        <li key={i} className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-100 text-[12.5px] font-bold">{i + 1}</span>
            <select aria-label={`Place ${i + 1}`} value={r.studentId} onChange={(ev) => setRows(rows.map((x, j) => j === i ? { ...x, studentId: ev.target.value } : x))} className="h-9 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 text-[13px]">
              <option value="">Choose a student…</option>
              {students.map((s) => <option key={s._id} value={s._id} disabled={used.has(s._id) && s._id !== r.studentId}>{s.name} · {s.section}</option>)}
            </select>
            <input aria-label={`Note for place ${i + 1}`} value={r.note} maxLength={80} onChange={(ev) => setRows(rows.map((x, j) => j === i ? { ...x, note: ev.target.value } : x))} placeholder="Note" className="h-9 w-32 rounded-lg border border-ink-200 px-2 text-[13px]" />
            <button type="button" aria-label={`Remove place ${i + 1}`} onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded p-1.5 text-ink-400 hover:text-danger-600"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
          </li>
        )}
      </ol>
      <Button className="mt-3" size="sm" variant="ghost" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setRows([...rows, { studentId: '', note: '' }])}>Add place</Button>
    </Modal>);

}
