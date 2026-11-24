import { useEffect, useState } from 'react';
import { CheckIcon, ClockIcon, MapPinIcon, PartyPopperIcon, TrophyIcon, XIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { EmptyState, ErrorState } from '../ui/States';
import { useViewer } from '../../hooks/communication';
import { useFamilyEvents, useRespondToEvent } from '../../hooks/events';
import type { FamilyEvent } from '../../types/events';
import { cn } from '../../utils/cn';
import { consentOpen, EVENT_TYPE_META, eventWhen, feeLabel, isPast } from '../../utils/events';

/** Events for the family: parents approve / decline per child; students see their status. */
export function FamilyEventList({ highlight }: {highlight?: string | null;}) {
  const { role, viewer, ready } = useViewer();
  const events = useFamilyEvents(viewer, ready);
  const [show, setShow] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (highlight && events.data) document.getElementById(`event-${highlight}`)?.scrollIntoView({ block: 'center' });
  }, [highlight, events.data]);

  if (events.isError) return <Card><ErrorState error={events.error} onRetry={() => events.refetch()} /></Card>;
  if (!ready || events.isLoading) return <Card className="p-5"><SkeletonText lines={5} /></Card>;
  const list = (events.data ?? []).filter((f) => show === 'past' ? isPast(f.event) : !isPast(f.event));

  return (
    <div>
      <div role="radiogroup" aria-label="Show" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {(['upcoming', 'past'] as const).map((s) =>
        <button key={s} type="button" role="radio" aria-checked={show === s} onClick={() => setShow(s)}
        className={cn('rounded-lg px-3 py-1.5 text-[13px] font-semibold capitalize', show === s ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{s}</button>
        )}
      </div>
      {list.length === 0 ?
      <Card><EmptyState icon={<PartyPopperIcon className="h-5 w-5" aria-hidden="true" />} title={show === 'upcoming' ? 'No upcoming events' : 'No past events'} description="Trips, competitions and celebrations for your class appear here." /></Card> :
      <ul className="space-y-4">{list.map((f) => <EventItem key={f.event._id} family={f} parent={role === 'parent'} highlighted={highlight === f.event._id} />)}</ul>}
    </div>);

}

function EventItem({ family, parent, highlighted }: {family: FamilyEvent;parent: boolean;highlighted: boolean;}) {
  const { viewer } = useViewer();
  const respond = useRespondToEvent(viewer);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const e = family.event;
  const Icon = EVENT_TYPE_META[e.type].icon;
  const open = consentOpen(e);
  return (
    <li id={`event-${e._id}`}>
      <Card className={cn('overflow-hidden', highlighted && 'ring-2 ring-primary-400', e.status === 'cancelled' && 'opacity-80')}>
        <div className="flex gap-4 px-5 py-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="flex flex-wrap items-center gap-2">
              <span dir="auto" className="text-[15.5px] font-bold text-ink-900">{e.title}</span>
              {e.status === 'cancelled' && <Badge tone="danger">Cancelled</Badge>}
              <Badge tone="neutral">{feeLabel(e.fee)}</Badge>
            </p>
            <p className="text-[13px] text-ink-700">{eventWhen(e)}</p>
            <p className="flex items-center gap-1 text-[12.5px] text-ink-500"><MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />{e.location}</p>
            {e.description && <p dir="auto" className="whitespace-pre-line pt-1 text-[13px] text-ink-700">{e.description}</p>}
            {e.status === 'cancelled' && <p className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-600">{e.cancelReason}{e.payments.length ? ' The school office will refund the fee.' : ''}</p>}
            {e.requiresConsent && e.status === 'published' &&
            <p className="flex items-center gap-1 text-[12.5px] text-ink-500"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />{open ? `Reply by ${e.consentDeadline ?? e.date}` : 'Replies are closed'}</p>
            }
            {e.results.length > 0 &&
            <p className="flex flex-wrap items-center gap-1.5 pt-1 text-[13px]"><TrophyIcon className="h-4 w-4 text-accent-500" aria-hidden="true" />{e.results.filter((r) => family.students.some((s) => s.student._id === r.student._id)).map((r) => `${r.student.name}: #${r.place}`).join(' · ') || 'Results published'}</p>
            }
          </div>
        </div>
        <ul className="divide-y divide-ink-100 border-t border-ink-100 bg-ink-50/50">
          {family.students.map(({ student, response, paid }) => {
            const state = !e.requiresConsent ? 'Going' : !response ? 'No reply yet' : response.decision === 'declined' ? 'Declined' : response.waitlisted ? 'On the waiting list' : 'Approved';
            const tone = state === 'Approved' || state === 'Going' ? 'success' : state === 'Declined' ? 'danger' : state === 'No reply yet' ? 'neutral' : 'warn';
            return (
              <li key={student._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                <span dir="auto" className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink-900">{student.name}</span>
                <Badge tone={tone}>{state}</Badge>
                {e.fee > 0 && response?.decision === 'approved' && !response.waitlisted && (paid ? <Badge tone="success">Fee paid</Badge> : <Badge tone="warn">Pay {feeLabel(e.fee)} at the office</Badge>)}
                {parent && open && e.requiresConsent &&
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <input aria-label={`Note for ${student.name}`} maxLength={200} value={notes[student._id] ?? ''} onChange={(ev) => setNotes({ ...notes, [student._id]: ev.target.value })} placeholder="Note (optional)" className="h-8 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 text-[13px] sm:w-44" />
                    <Button size="sm" variant={response?.decision === 'approved' ? 'primary' : 'secondary'} disabled={respond.isPending} icon={<CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => respond.mutate({ id: e._id, studentId: student._id, decision: 'approved', note: notes[student._id] })}>Approve</Button>
                    <Button size="sm" variant={response?.decision === 'declined' ? 'danger' : 'secondary'} disabled={respond.isPending || paid} icon={<XIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => respond.mutate({ id: e._id, studentId: student._id, decision: 'declined', note: notes[student._id] })}>Decline</Button>
                  </div>
                }
              </li>);

          })}
        </ul>
      </Card>
    </li>);

}
