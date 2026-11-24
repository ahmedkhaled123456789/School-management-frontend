import { useMemo, useState } from 'react';
import { CheckIcon, FileSignatureIcon, PlaneIcon, PlusIcon, StarIcon, TrendingUpIcon, XIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Textarea } from '../../../components/ui/Textarea';
import { Kpi } from '../../../components/reports/charts';
import { contractStatus, LEAVE_ALLOWANCE, LEAVE_LABEL, REVIEW_CRITERIA } from '../../../api/hr';
import { useStaffDirectory } from '../../../hooks/attendance';
import {
  useBalances,
  useContracts,
  useDecideLeave,
  useCancelLeave,
  useGenerateHrSample,
  useLeave,
  useRenewContract,
  useRequestLeave,
  useReviews,
  useSaveContract,
  useSaveReview,
  useSetCover,
  useShareReview,
  useStaffFacts,
  useTerminateContract } from
'../../../hooks/hr';
import type { StaffRef } from '../../../types/attendance';
import type { Contract, ContractType, LeaveRequest, LeaveType, Review } from '../../../types/hr';
import { addDays, formatDay, todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { formatMoney, parseAmount } from '../../../utils/money';

const TYPE_LABEL: Record<ContractType, string> = { permanent: 'Permanent', fixed: 'Fixed term', part_time: 'Part time', probation: 'Probation' };
const STATUS_TONE = { active: 'success', expiring: 'warn', expired: 'danger', terminated: 'neutral' } as const;
const LEAVE_TONE = { pending: 'warn', approved: 'success', rejected: 'danger', cancelled: 'neutral' } as const;
const bc = (label: string) => [{ label: 'Admin', to: '/admin' }, { label: 'Staff & HR' }, { label }];

/* --------------------------------- contracts -------------------------------- */

export function AdminContracts() {
  const contracts = useContracts();
  const dir = useStaffDirectory();
  const sample = useGenerateHrSample();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Contract | 'new' | null>(null);
  const [renewing, setRenewing] = useState<Contract | null>(null);
  const [terminating, setTerminating] = useState<Contract | null>(null);
  const list = (contracts.data ?? []).filter((c) => !query.trim() || c.staff.name.toLowerCase().includes(query.trim().toLowerCase()) || c.jobTitle.toLowerCase().includes(query.trim().toLowerCase()));
  const count = (s: string) => (contracts.data ?? []).filter((c) => contractStatus(c) === s).length;
  const without = dir.people.filter((p) => !(contracts.data ?? []).some((c) => c.staff._id === p._id && !c.terminated && contractStatus(c) !== 'expired'));

  return (
    <>
      <PageHeader title="Contracts" description="Employment contracts for teachers and office staff. Contracts ending within 60 days are flagged for renewal." breadcrumbs={bc('Contracts')}
      actions={<Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing('new')}>New contract</Button>} />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Active" value={String(count('active') + count('expiring'))} />
        <Kpi label="Ending in 60 days" value={String(count('expiring'))} tone={count('expiring') ? 'warning' : undefined} />
        <Kpi label="Expired" value={String(count('expired'))} tone={count('expired') ? 'critical' : undefined} />
        <Kpi label="Without a contract" value={String(without.length)} sub={without.slice(0, 2).map((p) => p.name).join(', ')} />
      </section>
      {contracts.data?.length === 0 &&
      <Card className="mb-5"><EmptyState icon={<FileSignatureIcon className="h-5 w-5" aria-hidden="true" />} title="No contracts yet" description="Add them one by one, or create sample contracts for everyone." action={<Button isLoading={sample.isPending} disabled={!dir.people.length} onClick={() => sample.mutate(dir.people)}>Add sample contracts</Button>} /></Card>
      }
      <Card>
        <div className="border-b border-ink-100 px-5 py-3"><div className="w-64"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Name or job title…" /></div></div>
        {contracts.isError ? <ErrorState error={contracts.error} /> : contracts.isLoading ? <div className="p-5"><SkeletonText lines={5} /></div> :
        <ul className="divide-y divide-ink-100">
            {list.map((c) => {
            const st = contractStatus(c);
            return (
              <li key={c._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{c.staff.name} · {c.jobTitle}</p>
                    <p className="text-[12px] text-ink-500">{TYPE_LABEL[c.type]} · {formatDay(c.startOn, { day: 'numeric', month: 'short', year: 'numeric' })} → {c.endOn ? formatDay(c.endOn, { day: 'numeric', month: 'short', year: 'numeric' }) : 'open-ended'} · {formatMoney(c.salary / 100)}/month · {c.hoursPerWeek} h/week</p>
                  </div>
                  <Badge tone={STATUS_TONE[st]}>{st === 'expiring' ? `Ends in ${Math.max(0, Math.round((new Date(c.endOn!).getTime() - Date.now()) / 86400000))} days` : st}</Badge>
                  {st !== 'terminated' &&
                <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                      {c.endOn && <Button size="sm" variant="secondary" onClick={() => setRenewing(c)}>Renew</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setTerminating(c)}>End</Button>
                    </>
                }
                </li>);

          })}
          </ul>
        }
      </Card>
      {editing && <ContractModal initial={editing === 'new' ? undefined : editing} people={dir.people} onClose={() => setEditing(null)} />}
      {renewing && <RenewModal contract={renewing} onClose={() => setRenewing(null)} />}
      {terminating && <TerminateModal contract={terminating} onClose={() => setTerminating(null)} />}
    </>);

}

function ContractModal({ initial, people, onClose }: {initial?: Contract;people: StaffRef[];onClose: () => void;}) {
  const save = useSaveContract();
  const [staffId, setStaffId] = useState(initial?.staff._id ?? '');
  const [type, setType] = useState<ContractType>(initial?.type ?? 'fixed');
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? 'Teacher');
  const [startOn, setStartOn] = useState(initial?.startOn ?? todayKey());
  const [endOn, setEndOn] = useState(initial?.endOn ?? addDays(todayKey(), 365));
  const [salary, setSalary] = useState(initial ? String(initial.salary / 100) : '');
  const [hours, setHours] = useState(String(initial?.hoursPerWeek ?? 40));
  const staff = initial?.staff ?? people.find((p) => p._id === staffId);
  const sal = parseAmount(salary);
  const valid = staff && jobTitle.trim() && sal !== null && /^\d+$/.test(hours) && (type === 'permanent' || endOn > startOn);
  return (
    <Modal open onClose={onClose} title={initial ? `Contract · ${initial.staff.name}` : 'New contract'} size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={save.isPending}
    onClick={() => staff && save.mutate({ id: initial?._id, payload: { staff, type, jobTitle, startOn, endOn: type === 'permanent' ? undefined : endOn, salary: Math.round((sal ?? 0) * 100), hoursPerWeek: Number(hours) } }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!initial && <div className="sm:col-span-2"><Select id="ct-staff" label="Staff member" value={staffId} placeholder="Choose" onChange={(e) => setStaffId(e.target.value)} options={people.map((p) => ({ value: p._id, label: `${p.name} · ${p.kind === 'teacher' ? 'Teacher' : 'Office'}` }))} /></div>}
        <Select id="ct-type" label="Type" value={type} onChange={(e) => setType(e.target.value as ContractType)} options={(Object.keys(TYPE_LABEL) as ContractType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
        <Input id="ct-title" label="Job title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        <Input id="ct-start" label="Start" type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} />
        {type !== 'permanent' && <Input id="ct-end" label="End" type="date" min={startOn} value={endOn} onChange={(e) => setEndOn(e.target.value)} />}
        <Input id="ct-salary" label="Monthly salary (EGP)" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} error={salary && sal === null ? 'e.g. 12000' : undefined} />
        <Input id="ct-hours" label="Hours per week" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
      </div>
    </Modal>);

}

function RenewModal({ contract, onClose }: {contract: Contract;onClose: () => void;}) {
  const renew = useRenewContract();
  const [endOn, setEndOn] = useState(addDays(contract.endOn ?? todayKey(), 365));
  return (
    <Modal open onClose={onClose} title={`Renew · ${contract.staff.name}`} description={`Currently ends ${contract.endOn}. A probation contract becomes fixed term.`} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={renew.isPending} onClick={() => renew.mutate({ id: contract._id, endOn }, { onSuccess: onClose })}>Renew</Button></>}>
      <Input id="renew-end" label="New end date" type="date" min={contract.endOn} value={endOn} onChange={(e) => setEndOn(e.target.value)} />
    </Modal>);

}

function TerminateModal({ contract, onClose }: {contract: Contract;onClose: () => void;}) {
  const end = useTerminateContract();
  const [on, setOn] = useState(todayKey());
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} title={`End contract · ${contract.staff.name}`} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!reason.trim()} isLoading={end.isPending} onClick={() => end.mutate({ id: contract._id, on, reason }, { onSuccess: onClose })}>End contract</Button></>}>
      <div className="space-y-3">
        <Input id="term-on" label="Last day" type="date" value={on} onChange={(e) => setOn(e.target.value)} />
        <Input id="term-reason" label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>);

}

/* ----------------------------------- leave ---------------------------------- */

export function AdminLeave() {
  const leave = useLeave({});
  const dir = useStaffDirectory();
  const [tab, setTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [open, setOpen] = useState<LeaveRequest | null>(null);
  const [adding, setAdding] = useState(false);
  const list = (leave.data ?? []).filter((l) => tab === 'all' || l.status === tab);
  const current = open ? leave.data?.find((l) => l._id === open._id) ?? null : null;
  const today = todayKey();
  const awayToday = (leave.data ?? []).filter((l) => l.status === 'approved' && l.from <= today && l.to >= today);
  const uncovered = (leave.data ?? []).filter((l) => l.status === 'approved').flatMap((l) => l.covers.filter((c) => !c.substitute && c.date >= today));

  return (
    <>
      <PageHeader title="Leave" description="Requests from teachers and staff. Approving one marks the days in staff attendance and plans a substitute for every lesson." breadcrumbs={bc('Leave')}
      actions={<Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setAdding(true)}>Record leave</Button>} />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi label="Waiting for a decision" value={String((leave.data ?? []).filter((l) => l.status === 'pending').length)} />
        <Kpi label="Away today" value={String(awayToday.length)} sub={awayToday.map((l) => l.staff.name).join(', ')} />
        <Kpi label="Lessons without cover" value={String(uncovered.length)} tone={uncovered.length ? 'critical' : 'good'} />
      </section>
      <Card>
        <div className="border-b border-ink-100 px-5 py-3">
          <div role="radiogroup" aria-label="Show" className="inline-flex gap-1 rounded-lg bg-ink-100 p-1">
            {(['pending', 'approved', 'all'] as const).map((t) => <button key={t} type="button" role="radio" aria-checked={tab === t} onClick={() => setTab(t)} className={cn('rounded-md px-2.5 py-1 text-[12.5px] font-semibold capitalize', tab === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500')}>{t}</button>)}
          </div>
        </div>
        {leave.isError ? <ErrorState error={leave.error} /> : !list.length ? <EmptyState icon={<PlaneIcon className="h-5 w-5" aria-hidden="true" />} title="Nothing here" /> :
        <ul className="divide-y divide-ink-100">
            {list.map((l) =>
          <li key={l._id}>
                <button type="button" onClick={() => setOpen(l)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-start text-[13px] hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{l.staff.name} · {LEAVE_LABEL[l.type]} leave</p>
                    <p className="text-[12px] text-ink-500">{formatDay(l.from)} → {formatDay(l.to)} · {l.days} school day(s) · {l.reason}</p>
                  </div>
                  {l.status === 'approved' && l.covers.length > 0 && <span className="text-[12px] text-ink-500">{l.covers.filter((c) => c.substitute).length}/{l.covers.length} covered</span>}
                  <Badge tone={LEAVE_TONE[l.status]}>{l.status}</Badge>
                </button>
              </li>
          )}
          </ul>
        }
      </Card>
      {current && <LeaveDetail leave={current} people={dir.people} onClose={() => setOpen(null)} />}
      {adding && <LeaveForm people={dir.people} onClose={() => setAdding(false)} />}
    </>);

}

function LeaveDetail({ leave, people, onClose }: {leave: LeaveRequest;people: StaffRef[];onClose: () => void;}) {
  const decide = useDecideLeave();
  const setCover = useSetCover();
  const cancel = useCancelLeave();
  const balances = useBalances(leave.staff._id);
  const [note, setNote] = useState('');
  const bal = balances.data?.find((b) => b.type === leave.type);
  const teachers = people.filter((p) => p.kind === 'teacher' && p._id !== leave.staff._id);
  return (
    <Modal open onClose={onClose} title={`${leave.staff.name} · ${LEAVE_LABEL[leave.type]} leave`} description={`${formatDay(leave.from)} → ${formatDay(leave.to)} · ${leave.days} school day(s)`} size="lg"
    footer={leave.status === 'pending' ?
    <>
          <Button variant="danger" icon={<XIcon className="h-4 w-4" aria-hidden="true" />} disabled={!note.trim()} isLoading={decide.isPending && decide.variables?.decision === 'rejected'} onClick={() => decide.mutate({ id: leave._id, decision: 'rejected', note, people })}>Reject</Button>
          <Button icon={<CheckIcon className="h-4 w-4" aria-hidden="true" />} isLoading={decide.isPending && decide.variables?.decision === 'approved'} onClick={() => decide.mutate({ id: leave._id, decision: 'approved', note, people })}>Approve</Button>
        </> :
    leave.status === 'approved' ? <><Button variant="ghost" isLoading={cancel.isPending} onClick={() => cancel.mutate(leave._id, { onSuccess: onClose })}>Withdraw approval</Button><Button onClick={onClose}>Close</Button></> : <Button onClick={onClose}>Close</Button>}>
      <div className="space-y-4 text-[13.5px]">
        <p className="rounded-lg bg-ink-50 px-3 py-2 text-ink-700">“{leave.reason}”</p>
        {bal && <p className="text-ink-600">{LEAVE_LABEL[leave.type]} days this year: {bal.allowance === null ? 'unpaid (no limit)' : `${bal.used} used, ${bal.pending} pending, ${bal.left} left of ${bal.allowance}`}</p>}
        {leave.decisionNote && <p className="text-ink-600">Note: {leave.decisionNote}</p>}
        {leave.status === 'pending' && <Textarea id="leave-note" label="Note (required to reject)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
        {leave.status === 'approved' &&
        <div>
            <h3 className="mb-2 text-[13px] font-bold text-ink-900">Cover plan ({leave.covers.length} lesson(s))</h3>
            {!leave.covers.length ? <p className="text-ink-500">No lessons to cover.</p> :
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200">
                {leave.covers.map((c, i) =>
            <li key={`${c.date}-${c.periodId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="w-36 shrink-0 text-[12.5px] font-semibold text-ink-800">{formatDay(c.date)} · {c.periodLabel}</span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-ink-600">{c.section.name} · {c.subject.name}</span>
                    <select aria-label={`Substitute for ${c.section.name} ${c.periodLabel} on ${c.date}`} value={c.substitute?._id ?? ''}
              onChange={(e) => {const t = teachers.find((x) => x._id === e.target.value);setCover.mutate({ id: leave._id, index: i, substitute: t ? { _id: t._id, name: t.name } : null });}}
              className={cn('h-8 rounded-lg border bg-white px-2 text-[12.5px]', c.substitute ? 'border-ink-200' : 'border-danger-500 text-danger-600')}>
                      <option value="">No substitute</option>
                      {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </li>
            )}
              </ul>
          }
          </div>
        }
      </div>
    </Modal>);

}

/** HR records leave for someone (also used by teachers for themselves, with `self`). */
export function LeaveForm({ people, self, onClose }: {people: StaffRef[];self?: StaffRef;onClose: () => void;}) {
  const request = useRequestLeave(self ? { teacherId: self._id } : {});
  const [staffId, setStaffId] = useState(self?._id ?? '');
  const [type, setType] = useState<LeaveType>('annual');
  const [from, setFrom] = useState(addDays(todayKey(), 1));
  const [to, setTo] = useState(addDays(todayKey(), 1));
  const [reason, setReason] = useState('');
  const staff = self ?? people.find((p) => p._id === staffId);
  const balances = useBalances(staff?._id, self ? { teacherId: self._id } : {});
  const bal = balances.data?.find((b) => b.type === type);
  return (
    <Modal open onClose={onClose} title={self ? 'Request leave' : 'Record leave'} size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!staff || !reason.trim() || to < from} isLoading={request.isPending} onClick={() => staff && request.mutate({ staff, type, from, to, reason }, { onSuccess: onClose })}>{self ? 'Send request' : 'Save'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!self && <div className="sm:col-span-2"><Select id="lv-staff" label="Staff member" value={staffId} placeholder="Choose" onChange={(e) => setStaffId(e.target.value)} options={people.map((p) => ({ value: p._id, label: p.name }))} /></div>}
        <Select id="lv-type" label="Type" value={type} onChange={(e) => setType(e.target.value as LeaveType)} options={(Object.keys(LEAVE_ALLOWANCE) as LeaveType[]).map((t) => ({ value: t, label: LEAVE_LABEL[t] }))}
        hint={bal ? bal.allowance === null ? 'No limit (unpaid)' : `${bal.left} of ${bal.allowance} days left${bal.pending ? ` (${bal.pending} pending)` : ''}` : undefined} />
        <span className="hidden sm:block" />
        <Input id="lv-from" label="From" type="date" value={from} onChange={(e) => {setFrom(e.target.value);if (to < e.target.value) setTo(e.target.value);}} hint={type === 'sick' ? 'Sick leave can be recorded up to 7 days back' : undefined} />
        <Input id="lv-to" label="To" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        <div className="sm:col-span-2"><Textarea id="lv-reason" label="Reason" required rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      </div>
    </Modal>);

}

/* -------------------------------- performance ------------------------------- */

export function AdminPerformance() {
  const reviews = useReviews({});
  const dir = useStaffDirectory();
  const share = useShareReview();
  const [editing, setEditing] = useState<Review | 'new' | null>(null);
  return (
    <>
      <PageHeader title="Performance" description="Reviews with scores per criterion, next to facts from attendance, leave and registers. Shared reviews are acknowledged by the staff member."
      breadcrumbs={bc('Performance')} actions={<Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing('new')}>New review</Button>} />
      <Card>
        {reviews.isError ? <ErrorState error={reviews.error} /> : !reviews.data?.length ? <EmptyState icon={<TrendingUpIcon className="h-5 w-5" aria-hidden="true" />} title="No reviews yet" /> :
        <ul className="divide-y divide-ink-100">
            {reviews.data.map((r) =>
          <li key={r._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{r.staff.name} · {r.period}</p>
                  <p className="text-[12px] text-ink-500">by {r.reviewer.name}{r.staffComment ? ` · “${r.staffComment}”` : ''}</p>
                </div>
                <span className="flex items-center gap-1 font-mono font-bold text-ink-900"><StarIcon className="h-4 w-4 fill-accent-300 text-accent-300" aria-hidden="true" />{r.overall}/5</span>
                <Badge tone={r.status === 'acknowledged' ? 'success' : r.status === 'shared' ? 'info' : 'neutral'}>{r.status}</Badge>
                {r.status !== 'acknowledged' && <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>}
                {r.status === 'draft' && <Button size="sm" variant="secondary" isLoading={share.isPending} onClick={() => share.mutate(r._id)}>Share</Button>}
              </li>
          )}
          </ul>
        }
      </Card>
      {editing && <ReviewModal initial={editing === 'new' ? undefined : editing} people={dir.people} onClose={() => setEditing(null)} />}
    </>);

}

function ReviewModal({ initial, people, onClose }: {initial?: Review;people: StaffRef[];onClose: () => void;}) {
  const save = useSaveReview();
  const [staffId, setStaffId] = useState(initial?.staff._id ?? '');
  const [period, setPeriod] = useState(initial?.period ?? `${new Date().getFullYear()} · Term ${new Date().getMonth() < 6 ? 2 : 1}`);
  const [scores, setScores] = useState(initial?.scores ?? REVIEW_CRITERIA.map((c) => ({ criterion: c, score: 3, comment: '' })));
  const [strengths, setStrengths] = useState(initial?.strengths ?? '');
  const [improvements, setImprovements] = useState(initial?.improvements ?? '');
  const staff = initial?.staff ?? people.find((p) => p._id === staffId);
  const facts = useStaffFacts(staff?._id);
  const overall = useMemo(() => Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length * 10) / 10, [scores]);
  const f = facts.data;
  return (
    <Modal open onClose={onClose} title={initial ? `Review · ${initial.staff.name}` : 'New review'} size="lg"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!staff || !period.trim()} isLoading={save.isPending} onClick={() => staff && save.mutate({ id: initial?._id, payload: { staff, period, scores, strengths, improvements } }, { onSuccess: onClose })}>Save draft</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {!initial && <Select id="rv-staff" label="Staff member" value={staffId} placeholder="Choose" onChange={(e) => setStaffId(e.target.value)} options={people.map((p) => ({ value: p._id, label: p.name }))} />}
          <Input id="rv-period" label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        {staff &&
        <div className="rounded-xl bg-ink-50 p-3 text-[12.5px] text-ink-700">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-500">Facts · last 90 days</p>
            {!f ? <SkeletonText lines={2} /> :
          <p>{f.daysRecorded} days recorded · <strong>{f.late}</strong> late · <strong>{f.absent}</strong> absent · {f.leaveDays} leave day(s)
                {f.lessonsPerWeek ? <> · {f.lessonsPerWeek} lessons a week · registers <strong>{f.registersTaken}/{f.registersExpected}</strong> taken (30 days)</> : null}</p>
          }
          </div>
        }
        <ul className="space-y-2">
          {scores.map((s, i) =>
          <li key={s.criterion} className="grid items-center gap-2 sm:grid-cols-[1fr_auto]">
              <span className="text-[13.5px] font-semibold text-ink-800">{s.criterion}</span>
              <div role="radiogroup" aria-label={s.criterion} className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) =>
              <button key={n} type="button" role="radio" aria-checked={s.score === n} aria-label={`${n} of 5`} onClick={() => setScores(scores.map((x, j) => j === i ? { ...x, score: n } : x))}
              className={cn('h-8 w-8 rounded-lg border text-[13px] font-bold', s.score === n ? 'border-primary-600 bg-primary-600 text-white' : 'border-ink-200 text-ink-600 hover:bg-ink-50')}>{n}</button>
              )}
              </div>
            </li>
          )}
        </ul>
        <p className="text-[13.5px]">Overall <strong className="font-mono">{overall}/5</strong></p>
        <Textarea id="rv-strengths" label="Strengths" rows={2} maxLength={1000} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        <Textarea id="rv-improve" label="To improve" rows={2} maxLength={1000} value={improvements} onChange={(e) => setImprovements(e.target.value)} />
      </div>
    </Modal>);

}
