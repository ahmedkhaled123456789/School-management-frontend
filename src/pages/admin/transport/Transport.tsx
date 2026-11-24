import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BusIcon, CameraIcon, CheckIcon, MapPinIcon, PencilIcon, PhoneIcon, PlusIcon, SendIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { CameraScanner } from '../../../components/attendance/CameraScanner';
import { errorMessage } from '../../../api/client';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSections } from '../../../hooks/sections';
import {
  useBoard,
  useBuses,
  useCancelSubscription,
  useChangeStop,
  useDeleteBus,
  useDeleteRoute,
  useDepart,
  useGenerateTransportSample,
  useMarkSubscriptionPaid,
  useRoutes,
  useSaveBus,
  useSaveRoute,
  useSubscribe,
  useSubscriptions,
  useTripSheet,
  useUnboard } from
'../../../hooks/services';
import { PERMISSIONS } from '../../../lib/permissions';
import type { Bus, RouteView, Subscription, Trip } from '../../../types/transport';
import { todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { formatMoney, parseAmount } from '../../../utils/money';
import { formatTime, sectionLabel } from '../../../utils/timetable';

type Tab = 'trips' | 'routes' | 'riders' | 'buses';
const egp = (minor: number) => minor ? formatMoney(minor / 100) : 'Free';

export function AdminTransport() {
  const [params, setParams] = useSearchParams();
  const tab = (['routes', 'riders', 'buses'].includes(params.get('tab') ?? '') ? params.get('tab') : 'trips') as Tab;
  const routes = useRoutes();
  const subs = useSubscriptions();
  const sample = useGenerateTransportSample();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const active = (subs.data ?? []).filter((s) => s.status === 'active');
  const seats = (routes.data ?? []).reduce((n, r) => n + (r.bus?.capacity ?? 0), 0);
  const unpaid = active.filter((s) => !s.paid && (routes.data?.find((r) => r._id === s.routeId)?.fee ?? 0) > 0).length;

  return (
    <>
      <PageHeader title="Transport" description="Buses, routes and stops, who rides where, and the daily boarding check that tells parents when the bus leaves."
      breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Services' }, { label: 'Transport' }]} />
      <section aria-label="Totals" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Routes" value={String(routes.data?.length ?? '—')} />
        <Kpi label="Riders" value={String(active.length)} sub={seats ? `${seats} seats` : undefined} />
        <Kpi label="Seats free" value={String(Math.max(seats - active.length, 0))} />
        <Kpi label="Unpaid" value={String(unpaid)} sub="subscriptions" tone={unpaid ? 'warning' : undefined} />
      </section>
      {routes.data?.length === 0 && canManage &&
      <Card className="mb-5"><EmptyState icon={<BusIcon className="h-5 w-5" aria-hidden="true" />} title="No routes yet" description="Add buses and routes, or start with three sample routes around Cairo." action={<Button isLoading={sample.isPending} onClick={() => sample.mutate()}>Add sample routes</Button>} /></Card>
      }
      <div role="tablist" aria-label="View" className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
        {([['trips', 'Today’s trips'], ['routes', 'Routes'], ['riders', 'Riders'], ['buses', 'Buses']] as const).map(([id, label]) =>
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'trips' ? {} : { tab: id })}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{label}</button>
        )}
      </div>
      {tab === 'trips' && <Trips canManage={canManage} />}
      {tab === 'routes' && <Routes canManage={canManage} />}
      {tab === 'riders' && <Riders canManage={canManage} />}
      {tab === 'buses' && <Buses canManage={canManage} />}
    </>);

}

/* ----------------------------------- trips --------------------------------- */

function Trips({ canManage }: {canManage: boolean;}) {
  const routes = useRoutes();
  const [routeId, setRouteId] = useState('');
  const [trip, setTrip] = useState<Trip>(() => new Date().getHours() < 12 ? 'morning' : 'afternoon');
  const id = routeId || routes.data?.[0]?._id || '';
  const sheet = useTripSheet(id, trip);
  const board = useBoard();
  const unboard = useUnboard();
  const depart = useDepart();
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [feedback, setFeedback] = useState<{ok: boolean;text: string;} | null>(null);
  const [confirm, setConfirm] = useState(false);
  const s = sheet.data;
  const onBoard = s?.riders.filter((r) => r.boardedAt).length ?? 0;
  const left = Boolean(s?.departedAt);

  const scan = (value: string, method: 'scan' | 'list') => {
    if (!value.trim() || !id) return;
    board.mutate({ routeId: id, trip, code: value, method }, {
      onSuccess: (b) => setFeedback({ ok: true, text: `${b.name} on board · ${formatTime(b.at)}` }),
      onError: (e) => setFeedback({ ok: false, text: errorMessage(e) })
    });
  };

  if (routes.data && !routes.data.length) return <Card><EmptyState title="No routes yet" /></Card>;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="h-fit">
        <CardBody className="space-y-3">
          <Select id="trip-route" label="Route" value={id} onChange={(e) => setRouteId(e.target.value)} options={(routes.data ?? []).map((r) => ({ value: r._id, label: `${r.name}${r.bus ? ` · ${r.bus.name}` : ''}` }))} />
          <div role="radiogroup" aria-label="Trip" className="grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1">
            {(['morning', 'afternoon'] as Trip[]).map((t) =>
            <button key={t} type="button" role="radio" aria-checked={trip === t} onClick={() => setTrip(t)}
            className={cn('rounded-md px-2 py-1.5 text-[13px] font-semibold capitalize', trip === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500')}>{t === 'morning' ? 'Morning · to school' : 'Afternoon · home'}</button>
            )}
          </div>
          {canManage && !left &&
          <>
              <form onSubmit={(e) => {e.preventDefault();scan(code, 'scan');setCode('');}} className="flex items-end gap-2">
                <div className="flex-1"><Input id="trip-code" label="Scan ID card" value={code} onChange={(e) => setCode(e.target.value)} placeholder="STU12345AB" autoComplete="off" /></div>
                <Button type="submit" disabled={!code.trim()}>Board</Button>
              </form>
              <Button variant="secondary" fullWidth size="sm" icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setCamera((v) => !v)}>{camera ? 'Stop camera' : 'Scan with the camera'}</Button>
              {camera && <CameraScanner onCode={(v) => scan(v, 'scan')} />}
            </>
          }
          {feedback && <p role="status" className={cn('rounded-lg px-3 py-2 text-[13px] font-semibold', feedback.ok ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>{feedback.text}</p>}
          {s?.route.bus &&
          <div className="rounded-lg bg-ink-50 p-3 text-[12.5px] text-ink-700">
              <p className="font-semibold text-ink-900">{s.route.bus.name} · <bdi>{s.route.bus.plate}</bdi></p>
              <p className="flex items-center gap-1"><PhoneIcon className="h-3.5 w-3.5" aria-hidden="true" />Driver {s.route.bus.driver.name} {s.route.bus.driver.phone}</p>
              {s.route.bus.supervisor && <p>Supervisor {s.route.bus.supervisor.name} {s.route.bus.supervisor.phone}</p>}
            </div>
          }
        </CardBody>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title={s ? `${s.route.name} · ${trip}` : 'Trip'} description={s ? `${onBoard} of ${s.riders.length} on board${left ? ` · left at ${formatTime(s.departedAt!)}` : ''}` : undefined}
        action={canManage && s && !left ? <Button icon={<SendIcon className="h-4 w-4" aria-hidden="true" />} disabled={!s.riders.length} onClick={() => setConfirm(true)}>Bus left</Button> : left ? <Badge tone="success">Departed</Badge> : undefined} />
        {sheet.isError ? <ErrorState error={sheet.error} /> : !s ? <div className="p-5"><SkeletonText lines={6} /></div> : !s.riders.length ? <EmptyState title="No riders on this route" /> :
        <ul className="divide-y divide-ink-100">
            {s.riders.map(({ subscription: sub, stop, boardedAt }) =>
          <li key={sub._id} className="flex items-center gap-3 px-5 py-2.5 text-[13px]">
                <span className="w-16 shrink-0 text-[12px] text-ink-500">{formatTime(trip === 'morning' ? stop.pickup : stop.dropoff)}</span>
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="font-semibold text-ink-900">{sub.student.name}</p>
                  <p className="flex items-center gap-1 text-[12px] text-ink-500"><MapPinIcon className="h-3 w-3" aria-hidden="true" />{stop.name} · {sub.section}</p>
                </div>
                {boardedAt ?
            <button type="button" disabled={left || !canManage} onClick={() => unboard.mutate({ routeId: id, trip, studentId: sub.student._id })} className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-[12px] font-bold text-success-600 disabled:cursor-default" aria-label={`${sub.student.name} boarded at ${boardedAt}${left ? '' : ', press to undo'}`}>
                    <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />{formatTime(boardedAt)}
                  </button> :
            left ? <Badge tone="danger">Did not board</Badge> :
            canManage ? <Button size="sm" variant="secondary" onClick={() => scan(sub.student._id, 'list')}>On board</Button> : <Badge tone="neutral">Waiting</Badge>}
              </li>
          )}
          </ul>
        }
      </Card>
      <ConfirmDialog open={confirm} title="Mark the bus as left?" confirmLabel="Bus left" isLoading={depart.isPending}
      message={s ? `${onBoard} on board, ${s.riders.length - onBoard} not. Every family on the route is told now${s.riders.length - onBoard ? ' (missing riders by SMS too)' : ''}.` : ''}
      onCancel={() => setConfirm(false)} onConfirm={() => depart.mutate({ routeId: id, trip }, { onSettled: () => setConfirm(false) })} />
    </div>);

}

/* ---------------------------------- routes --------------------------------- */

function Routes({ canManage }: {canManage: boolean;}) {
  const routes = useRoutes();
  const remove = useDeleteRoute();
  const [editing, setEditing] = useState<RouteView | 'new' | null>(null);
  if (routes.isError) return <Card><ErrorState error={routes.error} /></Card>;
  return (
    <div className="space-y-4">
      {canManage && <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing('new')}>New route</Button>}
      <ul className="grid gap-4 lg:grid-cols-2">
        {(routes.data ?? []).map((r) => {
          const cap = r.bus?.capacity ?? 0;
          return (
            <li key={r._id}>
              <Card>
                <CardHeader title={r.name} description={<>{r.bus ? <>{r.bus.name} · <bdi>{r.bus.plate}</bdi></> : 'No bus assigned'} · {egp(r.fee)} a term</>}
                action={canManage ? <div className="flex gap-1"><Button size="sm" variant="ghost" aria-label={`Edit ${r.name}`} icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEditing(r)} /><Button size="sm" variant="ghost" aria-label={`Delete ${r.name}`} icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => remove.mutate(r._id)} /></div> : undefined} />
                <CardBody>
                  <p className="mb-1 flex justify-between text-[12.5px] text-ink-600"><span>{r.riders} riders</span><span>{cap ? `${cap - r.riders} seats free` : '—'}</span></p>
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden="true"><div className={cn('h-full rounded-full', cap && r.riders >= cap ? 'bg-danger-500' : 'bg-primary-600')} style={{ width: `${cap ? Math.min(r.riders / cap * 100, 100) : 0}%` }} /></div>
                  <ol className="relative space-y-2.5 border-s-2 border-primary-100 ps-4">
                    {r.stops.map((s) =>
                    <li key={s._id} className="relative text-[13px]">
                        <span className="absolute -start-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-600" aria-hidden="true" />
                        <p className="flex justify-between gap-2"><span className="font-semibold text-ink-900">{s.name}</span><span className="text-[12px] text-ink-500">{r.perStop[s._id] ?? 0} rider(s)</span></p>
                        <p className="text-[12px] text-ink-500">Pick-up {formatTime(s.pickup)} · drop-off {formatTime(s.dropoff)}</p>
                      </li>
                    )}
                  </ol>
                </CardBody>
              </Card>
            </li>);

        })}
      </ul>
      {editing && <RouteModal initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>);

}

function RouteModal({ initial, onClose }: {initial?: RouteView;onClose: () => void;}) {
  const buses = useBuses();
  const routes = useRoutes();
  const save = useSaveRoute();
  const [name, setName] = useState(initial?.name ?? '');
  const [busId, setBusId] = useState(initial?.busId ?? '');
  const [fee, setFee] = useState(initial ? String(initial.fee / 100) : '0');
  const [stops, setStops] = useState(initial?.stops ?? [{ _id: '', name: '', pickup: '07:00', dropoff: '14:30' }]);
  const taken = new Set((routes.data ?? []).filter((r) => r._id !== initial?._id && r.busId).map((r) => r.busId));
  const feeMajor = parseAmount(fee);
  const set = (i: number, patch: Partial<(typeof stops)[number]>) => setStops(stops.map((s, j) => j === i ? { ...s, ...patch } : s));
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.name}` : 'New route'} description="Stops in driving order: morning pick-ups and afternoon drop-offs get later along the route." size="lg"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!name.trim() || feeMajor === null || !stops.every((s) => s.name.trim())} isLoading={save.isPending}
    onClick={() => save.mutate({ id: initial?._id, payload: { name, busId: busId || null, fee: Math.round((feeMajor ?? 0) * 100), stops } }, { onSuccess: onClose })}>Save route</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input id="route-name" label="Name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Route A · Maadi" />
          <Select id="route-bus" label="Bus" value={busId} placeholder="No bus yet" onChange={(e) => setBusId(e.target.value)}
          options={(buses.data ?? []).filter((b) => !taken.has(b._id)).map((b) => ({ value: b._id, label: `${b.name} · ${b.capacity} seats` }))} />
          <Input id="route-fee" label="Fee per term (EGP)" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} error={feeMajor === null ? 'e.g. 4500' : undefined} />
        </div>
        <fieldset>
          <legend className="mb-2 text-[13px] font-bold text-ink-900">Stops</legend>
          <ol className="space-y-2">
            {stops.map((s, i) =>
            <li key={i} className="grid grid-cols-[24px_1fr_100px_100px_auto] items-end gap-2">
                <span className="pb-2.5 text-center text-[12px] font-bold text-ink-400">{i + 1}</span>
                <Input id={`stop-${i}`} label={i ? '' : 'Stop'} aria-label={`Stop ${i + 1} name`} value={s.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Stop name" />
                <Input id={`stop-in-${i}`} label={i ? '' : 'Pick-up'} aria-label={`Stop ${i + 1} pick-up`} type="time" value={s.pickup} onChange={(e) => set(i, { pickup: e.target.value })} />
                <Input id={`stop-out-${i}`} label={i ? '' : 'Drop-off'} aria-label={`Stop ${i + 1} drop-off`} type="time" value={s.dropoff} onChange={(e) => set(i, { dropoff: e.target.value })} />
                <button type="button" aria-label={`Remove stop ${i + 1}`} disabled={stops.length === 1} onClick={() => setStops(stops.filter((_, j) => j !== i))} className="mb-1 rounded p-2 text-ink-400 hover:text-danger-600 disabled:opacity-30"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
              </li>
            )}
          </ol>
          <Button className="mt-2" size="sm" variant="ghost" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => {const last = stops[stops.length - 1];setStops([...stops, { _id: '', name: '', pickup: last?.pickup ?? '07:00', dropoff: last?.dropoff ?? '14:30' }]);}}>Add stop</Button>
        </fieldset>
      </div>
    </Modal>);

}

/* ---------------------------------- riders --------------------------------- */

function Riders({ canManage }: {canManage: boolean;}) {
  const subs = useSubscriptions();
  const routes = useRoutes();
  const cancel = useCancelSubscription();
  const paid = useMarkSubscriptionPaid();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Subscription | null>(null);
  const routeOf = (id: string) => routes.data?.find((r) => r._id === id);
  const rows = (subs.data ?? []).filter((s) => s.status === 'active' && (!query.trim() || s.student.name.toLowerCase().includes(query.trim().toLowerCase()) || (routeOf(s.routeId)?.name ?? '').toLowerCase().includes(query.trim().toLowerCase())));
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
        <div className="w-64"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Student or route…" /></div>
        {canManage && <Button className="ms-auto" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setAdding(true)}>Add rider</Button>}
      </div>
      {subs.isLoading ? <div className="p-5"><SkeletonText lines={6} /></div> : !rows.length ? <EmptyState title="No riders" /> :
      <ul className="divide-y divide-ink-100">
          {rows.map((s) => {
          const route = routeOf(s.routeId);
          const stop = route?.stops.find((x) => x._id === s.stopId);
          return (
            <li key={s._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="font-semibold text-ink-900">{s.student.name} <span className="font-normal text-ink-500">· {s.section}</span></p>
                  <p className="text-[12px] text-ink-500">{route?.name} · {stop?.name} · pick-up {stop ? formatTime(stop.pickup) : ''}</p>
                </div>
                {route && route.fee > 0 && (s.paid ? <Badge tone="success">Paid</Badge> : canManage ? <Button size="sm" variant="secondary" onClick={() => paid.mutate({ id: s._id, method: 'cash' })}>Mark paid · {egp(route.fee)}</Button> : <Badge tone="warn">Unpaid</Badge>)}
                {canManage && <><Button size="sm" variant="ghost" onClick={() => setMoving(s)}>Change stop</Button><Button size="sm" variant="ghost" onClick={() => cancel.mutate(s._id)}>Cancel</Button></>}
              </li>);

        })}
        </ul>
      }
      {adding && <RiderModal onClose={() => setAdding(false)} />}
      {moving && <RiderModal subscription={moving} onClose={() => setMoving(null)} />}
    </Card>);

}

function RiderModal({ subscription, onClose }: {subscription?: Subscription;onClose: () => void;}) {
  const year = useCurrentAcademicYear();
  const sections = useSections(year.id);
  const routes = useRoutes();
  const subs = useSubscriptions();
  const subscribe = useSubscribe();
  const change = useChangeStop();
  const [studentId, setStudentId] = useState(subscription?.student._id ?? '');
  const [routeId, setRouteId] = useState(subscription?.routeId ?? '');
  const [stopId, setStopId] = useState(subscription?.stopId ?? '');
  const [startOn, setStartOn] = useState(todayKey());
  const riding = new Set((subs.data ?? []).filter((s) => s.status === 'active').map((s) => s.student._id));
  const students = useMemo(() => (sections.data ?? []).flatMap((s) => s.students.map((st) => ({ ...st, section: sectionLabel(s) }))).filter((s) => !riding.has(s._id)), [sections.data, riding]);
  const route = routes.data?.find((r) => r._id === routeId);
  const full = (r: RouteView) => Boolean(r.bus) && r.riders >= (r.bus?.capacity ?? 0) && r._id !== subscription?.routeId;
  return (
    <Modal open onClose={onClose} title={subscription ? `Change stop · ${subscription.student.name}` : 'Add a rider'} size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!studentId || !routeId || !stopId} isLoading={subscribe.isPending || change.isPending}
    onClick={() => subscription ? change.mutate({ id: subscription._id, routeId, stopId }, { onSuccess: onClose }) : subscribe.mutate({ studentId, routeId, stopId, startOn }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="space-y-3">
        {!subscription && <SearchableSelect id="rider-student" label="Student" value={studentId} onChange={setStudentId} emptyMessage="Everyone already rides" options={students.map((s) => ({ value: s._id, label: s.name, description: s.section }))} />}
        <Select id="rider-route" label="Route" value={routeId} placeholder="Choose a route" onChange={(e) => {setRouteId(e.target.value);setStopId('');}}
        options={(routes.data ?? []).map((r) => ({ value: r._id, label: `${r.name} · ${r.bus ? full(r) ? 'full' : `${r.bus.capacity - r.riders} seats free` : 'no bus'}` }))} />
        <Select id="rider-stop" label="Stop" value={stopId} placeholder={route ? 'Choose a stop' : 'Choose the route first'} disabled={!route} onChange={(e) => setStopId(e.target.value)}
        options={(route?.stops ?? []).map((s) => ({ value: s._id, label: `${s.name} · ${formatTime(s.pickup)} / ${formatTime(s.dropoff)}` }))} />
        {!subscription && <Input id="rider-start" label="From" type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} />}
        <p className="text-[12.5px] text-ink-500">The parents are notified with the stop, times and the driver's phone.</p>
      </div>
    </Modal>);

}

/* ---------------------------------- buses ---------------------------------- */

function Buses({ canManage }: {canManage: boolean;}) {
  const buses = useBuses();
  const remove = useDeleteBus();
  const [editing, setEditing] = useState<Bus | 'new' | null>(null);
  return (
    <Card>
      <div className="flex justify-end border-b border-ink-100 px-5 py-3">{canManage && <Button size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEditing('new')}>Add bus</Button>}</div>
      {!buses.data?.length ? <EmptyState title="No buses" /> :
      <ul className="divide-y divide-ink-100">
          {buses.data.map((b) =>
        <li key={b._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
              <BusIcon className="h-5 w-5 text-ink-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{b.name} · <bdi className="font-mono">{b.plate}</bdi> · {b.capacity} seats</p>
                <p className="text-[12px] text-ink-500">Driver {b.driver.name} {b.driver.phone}{b.supervisor ? ` · supervisor ${b.supervisor.name} ${b.supervisor.phone}` : ''}</p>
              </div>
              {canManage && <><Button size="sm" variant="ghost" onClick={() => setEditing(b)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove.mutate(b._id)}>Remove</Button></>}
            </li>
        )}
        </ul>
      }
      {editing && <BusModal initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>);

}

function BusModal({ initial, onClose }: {initial?: Bus;onClose: () => void;}) {
  const save = useSaveBus();
  const [v, setV] = useState({ name: initial?.name ?? '', plate: initial?.plate ?? '', capacity: String(initial?.capacity ?? 24), driver: initial?.driver.name ?? '', driverPhone: initial?.driver.phone ?? '', sup: initial?.supervisor?.name ?? '', supPhone: initial?.supervisor?.phone ?? '' });
  const valid = v.name.trim() && v.plate.trim() && /^\d+$/.test(v.capacity) && v.driver.trim().length >= 3 && v.driverPhone.trim();
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add a bus'} size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={save.isPending}
    onClick={() => save.mutate({ id: initial?._id, payload: { name: v.name, plate: v.plate, capacity: Number(v.capacity), driver: { name: v.driver, phone: v.driverPhone }, ...(v.sup.trim() ? { supervisor: { name: v.sup, phone: v.supPhone } } : {}) } }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input id="bus-name" label="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Bus 4" />
        <Input id="bus-plate" label="Plate" value={v.plate} onChange={(e) => setV({ ...v, plate: e.target.value })} />
        <Input id="bus-seats" label="Seats" inputMode="numeric" value={v.capacity} onChange={(e) => setV({ ...v, capacity: e.target.value })} />
        <Input id="bus-driver" label="Driver" value={v.driver} onChange={(e) => setV({ ...v, driver: e.target.value })} />
        <Input id="bus-driver-phone" label="Driver phone" type="tel" value={v.driverPhone} onChange={(e) => setV({ ...v, driverPhone: e.target.value })} />
        <span className="hidden sm:block" />
        <Input id="bus-sup" label="Supervisor (optional)" value={v.sup} onChange={(e) => setV({ ...v, sup: e.target.value })} />
        <Input id="bus-sup-phone" label="Supervisor phone" type="tel" value={v.supPhone} onChange={(e) => setV({ ...v, supPhone: e.target.value })} />
      </div>
    </Modal>);

}
