import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon, MapPinIcon, PartyPopperIcon, PlusIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { NoAcademicYear } from '../../../components/sections/Notices';
import { EventForm } from '../../../components/events/EventForm';
import type { EventSummary } from '../../../api/events';
import { useEvents } from '../../../hooks/events';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import { todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { dayKey } from '../../../utils/reports';
import { EVENT_STATUS_META, EVENT_TYPE_META, eventWhen, feeLabel, isPast } from '../../../utils/events';

type Filter = 'upcoming' | 'past' | 'draft' | 'all';

export function AdminEvents() {
  const year = useCurrentAcademicYear();
  const events = useEvents(year.id);
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'calendar' ? 'calendar' : 'list';
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => (events.data ?? []).filter((e) =>
  filter === 'all' || (filter === 'draft' ? e.status === 'draft' : filter === 'past' ? isPast(e) && e.status !== 'draft' : !isPast(e) && e.status !== 'draft')
  ), [events.data, filter]);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Communication' }, { label: 'Events' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Events" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  return (
    <>
      <PageHeader
        title="Events"
        description="Trips, competitions and celebrations. Parents approve from their portal; places, waiting lists and fees are tracked here."
        breadcrumbs={breadcrumbs}
        actions={canManage ? <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setCreating(true)}>New event</Button> : undefined} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {view === 'list' ?
        <div role="radiogroup" aria-label="Show" className="flex gap-1 rounded-xl bg-ink-100 p-1">
            {(['upcoming', 'past', 'draft', 'all'] as Filter[]).map((f) =>
          <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
          className={cn('rounded-lg px-3 py-1.5 text-[13px] font-semibold capitalize', filter === f ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                {f === 'draft' ? 'Drafts' : f}
              </button>
          )}
          </div> :
        <span />}
        <div role="radiogroup" aria-label="View" className="flex gap-1 rounded-xl bg-ink-100 p-1">
          {([['list', ListIcon], ['calendar', CalendarDaysIcon]] as const).map(([v, Icon]) =>
          <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setParams(v === 'calendar' ? { view: v } : {}, { replace: true })}
          className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold capitalize', view === v ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
              <Icon className="h-4 w-4" aria-hidden="true" />{v}
            </button>
          )}
        </div>
      </div>

      {events.isError ?
      <Card><ErrorState error={events.error} onRetry={() => events.refetch()} /></Card> :
      events.isLoading ?
      <Card className="p-5"><SkeletonText lines={6} /></Card> :
      view === 'calendar' ?
      <EventCalendar events={(events.data ?? []).filter((e) => e.status !== 'cancelled')} /> :
      list.length === 0 ?
      <Card><EmptyState icon={<PartyPopperIcon className="h-5 w-5" aria-hidden="true" />} title={filter === 'upcoming' ? 'No upcoming events' : 'Nothing here'} description="Create an event, then publish it to notify families." action={canManage ? <Button onClick={() => setCreating(true)}>New event</Button> : undefined} /></Card> :

      <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((e) => <EventCard key={e._id} event={e} />)}
        </ul>
      }

      {creating && <EventForm onClose={() => setCreating(false)} />}
    </>);

}

function EventCard({ event: e }: {event: EventSummary;}) {
  const Icon = EVENT_TYPE_META[e.type].icon;
  const pending = e.requiresConsent ? e.eligible - e.approved - e.waitlisted - e.declined : 0;
  return (
    <li>
      <Link to={`/admin/events/${e._id}`} className="block h-full rounded-xl border border-ink-200/80 bg-white p-4 shadow-card transition-colors hover:border-primary-200">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span dir="auto" className="text-[15px] font-bold text-ink-900">{e.title}</span>
              <Badge tone={EVENT_STATUS_META[e.status].tone}>{EVENT_STATUS_META[e.status].label}</Badge>
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-600">{eventWhen(e)}</p>
            <p className="flex items-center gap-1 text-[12.5px] text-ink-500"><MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />{e.location} · {e.audienceLabel}</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-ink-100 pt-3 text-center text-[12px]">
          <div><dt className="text-ink-500">Invited</dt><dd className="font-mono text-[14px] font-bold text-ink-900">{e.eligible}</dd></div>
          <div><dt className="text-ink-500">{e.requiresConsent ? 'Approved' : 'Going'}</dt><dd className="font-mono text-[14px] font-bold text-ink-900">{e.requiresConsent ? e.approved : e.eligible}{e.capacity ? <span className="text-ink-400">/{e.capacity}</span> : null}</dd></div>
          <div><dt className="text-ink-500">{e.requiresConsent ? 'No reply' : 'Fee'}</dt><dd className="font-mono text-[14px] font-bold text-ink-900">{e.requiresConsent ? pending : feeLabel(e.fee)}</dd></div>
          <div><dt className="text-ink-500">{e.fee ? 'Paid' : 'Waitlist'}</dt><dd className="font-mono text-[14px] font-bold text-ink-900">{e.fee ? `${e.paid}/${e.approved}` : e.waitlisted}</dd></div>
        </dl>
      </Link>
    </li>);

}

const WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function EventCalendar({ events }: {events: EventSummary[];}) {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const total = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 1) % 7;
  const shift = (d: number) => {const x = new Date(y, m - 1 + d, 1);setMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);};
  const today = todayKey();
  const on = (key: string) => events.filter((e) => e.date <= key && (e.endDate ?? e.date) >= key);
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="rounded-md p-1.5 hover:bg-ink-100"><ChevronLeftIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /></button>
        <p className="text-[15px] font-bold text-ink-900" aria-live="polite">{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <button type="button" aria-label="Next month" onClick={() => shift(1)} className="rounded-md p-1.5 hover:bg-ink-100"><ChevronRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200">
        {WEEK.map((d) => <div key={d} aria-hidden="true" className="bg-ink-50 py-1.5 text-center text-[11px] font-bold uppercase text-ink-500">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} className="min-h-[92px] bg-white" />)}
        {Array.from({ length: total }, (_, i) => {
          const key = dayKey(new Date(y, m - 1, i + 1));
          const list = on(key);
          return (
            <div key={key} className={cn('min-h-[92px] bg-white p-1.5', key === today && 'bg-primary-50/50')}>
              <p className={cn('mb-1 text-[12px] font-semibold', key === today ? 'text-primary-700' : 'text-ink-500')}>{i + 1}</p>
              <ul className="space-y-1">
                {list.slice(0, 3).map((e) =>
                <li key={e._id}>
                    <Link to={`/admin/events/${e._id}`} title={e.title} className={cn('block truncate rounded px-1.5 py-0.5 text-[11.5px] font-semibold', e.status === 'draft' ? 'border border-dashed border-ink-300 text-ink-600' : 'bg-primary-600 text-white')}>
                      {e.title}
                    </Link>
                  </li>
                )}
                {list.length > 3 && <li className="px-1 text-[11px] text-ink-500">+{list.length - 3} more</li>}
              </ul>
            </div>);

        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-500">Dashed: drafts (not visible to families).</p>
    </Card>);

}
