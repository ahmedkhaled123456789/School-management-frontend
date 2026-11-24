import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlusIcon, StarIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/States';
import { Textarea } from '../../components/ui/Textarea';
import { Kpi } from '../../components/reports/charts';
import { LeaveForm } from '../admin/hr/HrPages';
import { contractStatus, LEAVE_LABEL } from '../../api/hr';
import { useViewer } from '../../hooks/communication';
import { useAcknowledgeReview, useBalances, useCancelLeave, useLeave, useMyContract, useMyCovers, useReviews } from '../../hooks/hr';
import { useTeacherProfile } from '../../hooks/teachers';
import type { Review } from '../../types/hr';
import { formatDay } from '../../utils/attendance';
import { cn } from '../../utils/cn';

const TONE = { pending: 'warn', approved: 'success', rejected: 'danger', cancelled: 'neutral' } as const;

export function TeacherLeave() {
  const { viewer, ready } = useViewer();
  const profile = useTeacherProfile();
  const me = profile.data ? { _id: profile.data._id, name: profile.data.name, email: profile.data.email, kind: 'teacher' as const } : undefined;
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'reviews' ? 'reviews' : params.get('tab') === 'contract' ? 'contract' : 'leave';
  const leave = useLeave(viewer, ready);
  const balances = useBalances(me?._id, viewer);
  const covers = useMyCovers(viewer, ready);
  const reviews = useReviews(viewer, ready);
  const contract = useMyContract(viewer, ready);
  const cancel = useCancelLeave(viewer);
  const [requesting, setRequesting] = useState(false);
  const [reading, setReading] = useState<Review | null>(null);

  return (
    <>
      <PageHeader title="Leave & HR" description="Your leave balance and requests, lessons you cover for colleagues, reviews and your contract."
      breadcrumbs={[{ label: 'Teacher', to: '/teacher' }, { label: 'Leave & HR' }]}
      actions={tab === 'leave' && me ? <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setRequesting(true)}>Request leave</Button> : undefined} />
      <div role="tablist" aria-label="View" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {([['leave', 'Leave'], ['reviews', 'Reviews'], ['contract', 'Contract']] as const).map(([id, label]) =>
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'leave' ? {} : { tab: id })}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
            {label}{id === 'reviews' && (reviews.data ?? []).some((r) => r.status === 'shared') ? ' •' : ''}
          </button>
        )}
      </div>

      {tab === 'leave' &&
      <div className="space-y-5">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(balances.data ?? []).map((b) => <Kpi key={b.type} label={`${LEAVE_LABEL[b.type]} leave`} value={b.left === null ? '—' : String(b.left)} sub={b.allowance === null ? `${b.used} day(s) taken (no limit)` : `left of ${b.allowance}${b.pending ? ` · ${b.pending} pending` : ''}`} />)}
          </section>
          {(covers.data?.length ?? 0) > 0 &&
        <Card>
              <CardHeader title="Lessons you cover" description="For colleagues on leave. You can take these registers." />
              <ul className="divide-y divide-ink-100">
                {covers.data!.map((c) =>
            <li key={`${c.date}-${c.periodId}-${c.section._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
                    <span className="w-40 font-semibold text-ink-800">{formatDay(c.date)} · {c.periodLabel}</span>
                    <span className="min-w-0 flex-1 text-ink-600">{c.section.name} · {c.subject.name} · for {c.absent}</span>
                    <Link to={`/teacher/attendance/register?section=${c.section._id}&date=${c.date}&period=${c.periodId}`} className="font-semibold text-primary-600 hover:underline">Register</Link>
                  </li>
            )}
              </ul>
            </Card>
        }
          <Card>
            <CardHeader title="My requests" />
            {!leave.data ? <CardBody><SkeletonText lines={3} /></CardBody> : !leave.data.length ? <EmptyState title="No requests yet" /> :
          <ul className="divide-y divide-ink-100">
                {leave.data.map((l) =>
            <li key={l._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{LEAVE_LABEL[l.type]} · {formatDay(l.from)} → {formatDay(l.to)} ({l.days} day(s))</p>
                      <p className="text-[12px] text-ink-500">{l.reason}{l.decisionNote ? ` · HR: ${l.decisionNote}` : ''}</p>
                    </div>
                    <Badge tone={TONE[l.status]}>{l.status}</Badge>
                    {l.status === 'pending' && <Button size="sm" variant="ghost" isLoading={cancel.isPending} onClick={() => cancel.mutate(l._id)}>Cancel</Button>}
                  </li>
            )}
              </ul>
          }
          </Card>
        </div>
      }

      {tab === 'reviews' &&
      <Card>
          {!reviews.data ? <CardBody><SkeletonText lines={3} /></CardBody> : !reviews.data.length ? <EmptyState title="No reviews shared with you yet" /> :
        <ul className="divide-y divide-ink-100">
              {reviews.data.map((r) =>
          <li key={r._id}>
                  <button type="button" onClick={() => setReading(r)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-start text-[13px] hover:bg-ink-50">
                    <span className="min-w-0 flex-1 font-semibold text-ink-900">{r.period} · by {r.reviewer.name}</span>
                    <span className="flex items-center gap-1 font-mono font-bold"><StarIcon className="h-4 w-4 fill-accent-300 text-accent-300" aria-hidden="true" />{r.overall}/5</span>
                    <Badge tone={r.status === 'acknowledged' ? 'success' : 'warn'}>{r.status === 'acknowledged' ? 'Acknowledged' : 'To read'}</Badge>
                  </button>
                </li>
          )}
            </ul>
        }
        </Card>
      }

      {tab === 'contract' &&
      <Card>
          <CardBody className="text-[13.5px]">
            {contract.isLoading ? <SkeletonText lines={3} /> : !contract.data ? <p className="text-ink-500">No contract on file. Ask HR.</p> :
          <dl className="grid gap-3 sm:grid-cols-2">
                {[['Position', contract.data.jobTitle], ['Type', contract.data.type.replace('_', ' ')], ['From', formatDay(contract.data.startOn, { day: 'numeric', month: 'long', year: 'numeric' })],
            ['Until', contract.data.endOn ? formatDay(contract.data.endOn, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Open-ended'], ['Hours', `${contract.data.hoursPerWeek} a week`], ['Status', contractStatus(contract.data)]].
            map(([k, v]) => <div key={k}><dt className="text-[12px] font-bold uppercase tracking-wide text-ink-500">{k}</dt><dd className="capitalize text-ink-900">{v}</dd></div>)}
              </dl>
          }
          </CardBody>
        </Card>
      }

      {requesting && me && <LeaveForm people={[]} self={me} onClose={() => setRequesting(false)} />}
      {reading && <ReviewReader review={reading} onClose={() => setReading(null)} />}
    </>);

}

function ReviewReader({ review, onClose }: {review: Review;onClose: () => void;}) {
  const { viewer } = useViewer();
  const ack = useAcknowledgeReview(viewer);
  const [comment, setComment] = useState('');
  return (
    <Modal open onClose={onClose} title={`Review · ${review.period}`} description={`By ${review.reviewer.name} · overall ${review.overall}/5`} size="md"
    footer={review.status === 'shared' ? <><Button variant="secondary" onClick={onClose}>Later</Button><Button isLoading={ack.isPending} onClick={() => ack.mutate({ id: review._id, comment }, { onSuccess: onClose })}>Acknowledge</Button></> : <Button onClick={onClose}>Close</Button>}>
      <div className="space-y-3 text-[13.5px]">
        <ul className="space-y-1.5">{review.scores.map((s) => <li key={s.criterion} className="flex justify-between gap-2"><span>{s.criterion}</span><span className="font-mono font-bold">{s.score}/5</span></li>)}</ul>
        {review.strengths && <p><strong>Strengths:</strong> {review.strengths}</p>}
        {review.improvements && <p><strong>To improve:</strong> {review.improvements}</p>}
        {review.status === 'shared' ? <Textarea id="ack-comment" label="Your comment (optional)" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} /> : review.staffComment && <p className="text-ink-600">Your comment: “{review.staffComment}”</p>}
      </div>
    </Modal>);

}
