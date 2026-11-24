import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { SkeletonText } from '../../components/ui/Skeleton';
import { StudentLibraryCard } from '../../components/library/StudentLibraryCard';
import { useBooks, useFamilyTransport } from '../../hooks/services';
import { useFamilyBoarding, useSetDailyLimit, useTopUp, useWallet } from '../../hooks/hr';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CardBody, CardHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/States';
import { useViewer } from '../../hooks/communication';
import { formatTime } from '../../utils/timetable';
import { formatMoney, parseAmount } from '../../utils/money';
import { PageHeader } from '../../components/ui/PageHeader';
import { AnnouncementList } from '../../components/communication/AnnouncementList';
import { FamilyEventList } from '../../components/events/FamilyEventList';
import { StudentCertificatesCard } from '../../components/certificates/StudentCertificatesCard';
import { useStudentProfile } from '../../hooks/students';
import { cn } from '../../utils/cn';

/** Parent portal: events for their children, with approval. */
export function ParentEventsPage() {
  const [params] = useSearchParams();
  return (
    <>
      <PageHeader title="Events" description="Trips, competitions and celebrations for your children. Approve or decline before the deadline." breadcrumbs={[{ label: 'Parent', to: '/parent' }, { label: 'Events' }]} />
      <FamilyEventList highlight={params.get('event')} />
    </>);

}

/** Student portal: school announcements and upcoming events. */
export function StudentAnnouncementsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'events' ? 'events' : 'announcements';
  return (
    <>
      <PageHeader title="Announcements" description="News from the school and events for your class." breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'Announcements' }]} />
      <div role="tablist" aria-label="View" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {(['announcements', 'events'] as const).map((t) =>
        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'events' ? { tab: t } : {})}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold capitalize', tab === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{t}</button>
        )}
      </div>
      {tab === 'announcements' ? <AnnouncementList /> : <FamilyEventList />}
    </>);

}

/** Student portal: certificates to download. */
export function StudentCertificatesPage() {
  const profile = useStudentProfile();
  return (
    <>
      <PageHeader title="My certificates" description="Certificates the school issued to you. Each has a code anyone can verify." breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'Certificates' }]} />
      <StudentCertificatesCard studentId={profile.data?._id} />
    </>);

}

/** Student portal: my books + the catalogue (availability). */
export function StudentLibraryPage() {
  const profile = useStudentProfile();
  const books = useBooks();
  const [query, setQuery] = useState('');
  const list = (books.data ?? []).filter((b) => !query.trim() || [b.title, b.author, b.category].some((v) => v.toLowerCase().includes(query.trim().toLowerCase())));
  return (
    <>
      <PageHeader title="Library" description="Your books, and what is on the shelves." breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'Library' }]} />
      <div className="grid gap-5 lg:grid-cols-5">
        <StudentLibraryCard studentId={profile.data?._id} canRenew className="lg:col-span-2 h-fit" />
        <Card className="lg:col-span-3">
          <div className="border-b border-ink-100 p-3"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Search books…" /></div>
          {books.isLoading ? <div className="p-5"><SkeletonText lines={6} /></div> :
          <ul className="scrollbar-thin max-h-[560px] divide-y divide-ink-100 overflow-y-auto">
              {list.map((b) =>
            <li key={b._id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate text-[13.5px] font-semibold text-ink-900">{b.title}</p>
                    <p dir="auto" className="truncate text-[12px] text-ink-500">{b.author} · {b.category} · shelf {b.shelf}</p>
                  </div>
                  {b.available ? <Badge tone="success">Available</Badge> : <Badge tone="warn">Out{b.nextDue ? ` · back ${b.nextDue}` : ''}</Badge>}
                </li>
            )}
              {!list.length && <li className="px-4 py-8 text-center text-[13px] text-ink-500">No book matches.</li>}
            </ul>
          }
        </Card>
      </div>
    </>);

}

/** Parent portal: each child's bus, stop, times, driver and today's trips. */
export function ParentTransportPage() {
  const { viewer, ready, children } = useViewer();
  const list = useFamilyTransport(viewer, ready);
  const [params] = useSearchParams();
  const focus = params.get('child');
  const riding = new Set((list.data ?? []).map((t) => t.student._id));
  const tripLine = (trip?: {boardedAt?: string;departedAt?: string;}, label = '') => !trip ? `${label}: not yet` :
  trip.boardedAt ? `${label}: on board at ${formatTime(trip.boardedAt)}${trip.departedAt ? `, left ${formatTime(trip.departedAt)}` : ''}` :
  trip.departedAt ? `${label}: did not board (bus left ${formatTime(trip.departedAt)})` : `${label}: not yet`;
  return (
    <>
      <PageHeader title="Transport" description="Your children's school bus: stop, times, driver and today's trips." breadcrumbs={[{ label: 'Parent', to: '/parent' }, { label: 'Transport' }]} />
      {list.isError ? <Card><ErrorState error={list.error} /></Card> : !ready || list.isLoading ? <Card className="p-5"><SkeletonText lines={4} /></Card> :
      <div className="grid gap-5 lg:grid-cols-2">
          {(list.data ?? []).map((t) =>
        <Card key={t.student._id} className={cn(focus === t.student._id && 'ring-2 ring-primary-400')}>
              <CardHeader title={t.student.name} description={<>{t.route.name}{t.bus && <> · {t.bus.name} (<bdi>{t.bus.plate}</bdi>)</>}</>} />
              <CardBody className="space-y-3 text-[13.5px]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-ink-50 px-3 py-2"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Morning pick-up</p><p className="font-mono text-[18px] font-bold text-ink-900">{formatTime(t.stop.pickup)}</p></div>
                  <div className="rounded-lg bg-ink-50 px-3 py-2"><p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Afternoon drop-off</p><p className="font-mono text-[18px] font-bold text-ink-900">{formatTime(t.stop.dropoff)}</p></div>
                </div>
                <p><span className="text-ink-500">Stop:</span> <strong>{t.stop.name}</strong></p>
                {t.bus && <p><span className="text-ink-500">Driver:</span> {t.bus.driver.name} · <a className="font-semibold text-primary-600 hover:underline" href={`tel:${t.bus.driver.phone.replace(/\s/g, '')}`}>{t.bus.driver.phone}</a></p>}
                {t.bus?.supervisor && <p><span className="text-ink-500">Supervisor:</span> {t.bus.supervisor.name} · <a className="font-semibold text-primary-600 hover:underline" href={`tel:${t.bus.supervisor.phone.replace(/\s/g, '')}`}>{t.bus.supervisor.phone}</a></p>}
                <div className="rounded-lg border border-ink-200 px-3 py-2 text-[13px]" aria-live="polite">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Today</p>
                  <p>{tripLine(t.today.morning, 'To school')}</p>
                  <p>{tripLine(t.today.afternoon, 'Home')}</p>
                </div>
                <p className="text-[12px] text-ink-500">{t.subscription.paid ? 'Fee paid.' : t.route.fee ? `Fee due: ${formatMoney(t.route.fee / 100)} (pay at the school office).` : ''}</p>
              </CardBody>
            </Card>
        )}
          {children.filter((c) => !riding.has(c._id)).map((c) =>
        <Card key={c._id}><CardHeader title={c.name} /><CardBody><p className="text-[13.5px] text-ink-500">Not using the school bus. Ask the school office to add a route.</p></CardBody></Card>
        )}
        </div>
      }
    </>);

}

/** Parent portal: canteen wallet (top up, daily limit, purchases) and boarding bed per child. */
export function ParentCanteenPage() {
  const { viewer, ready, children } = useViewer();
  const family = useFamilyBoarding(viewer, ready);
  const [params, setParams] = useSearchParams();
  const child = children.find((c) => c._id === params.get('child')) ?? children[0];
  const wallet = useWallet(child?._id, viewer);
  const topUp = useTopUp(viewer);
  const limit = useSetDailyLimit(viewer);
  const [amount, setAmount] = useState('100');
  const [cap, setCap] = useState('');
  const mine = family.data?.find((f) => f.studentId === child?._id);
  const w = wallet.data;
  const amt = parseAmount(amount);
  return (
    <>
      <PageHeader title="Canteen & boarding" description="Top up your child's canteen wallet, set a daily spending limit and see what they buy." breadcrumbs={[{ label: 'Parent', to: '/parent' }, { label: 'Canteen' }]} />
      {children.length > 1 &&
      <div role="tablist" aria-label="Child" className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
          {children.map((c) => <button key={c._id} type="button" role="tab" aria-selected={c._id === child?._id} onClick={() => setParams({ child: c._id }, { replace: true })} className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', c._id === child?._id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500')}>{c.name}</button>)}
        </div>
      }
      {!child ? <Card><CardBody><SkeletonText lines={3} /></CardBody></Card> :
      <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader title="Wallet" />
            <CardBody className="space-y-4 text-[13.5px]">
              <p className="font-mono text-[28px] font-extrabold text-ink-900">{w ? formatMoney(w.wallet.balance / 100) : '…'}</p>
              <p className="text-ink-500">{w ? `${formatMoney(w.spentToday / 100)} spent today${w.wallet.dailyLimit ? ` of ${formatMoney(w.wallet.dailyLimit / 100)} limit` : ''}` : ''}</p>
              <form onSubmit={(e) => {e.preventDefault();if (amt) topUp.mutate({ studentId: child._id, amount: Math.round(amt * 100) });}} className="flex items-end gap-2">
                <div className="flex-1"><Input id="pc-topup" label="Top up (EGP)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <Button type="submit" disabled={!amt} isLoading={topUp.isPending}>Pay by card</Button>
              </form>
              <form onSubmit={(e) => {e.preventDefault();const v = parseAmount(cap || '0');if (v !== null) limit.mutate({ studentId: child._id, limit: Math.round(v * 100) });}} className="flex items-end gap-2">
                <div className="flex-1"><Input id="pc-limit" label="Daily limit (EGP, 0 = none)" inputMode="decimal" value={cap} placeholder={w ? String(w.wallet.dailyLimit / 100) : ''} onChange={(e) => setCap(e.target.value)} /></div>
                <Button type="submit" variant="secondary" isLoading={limit.isPending}>Save</Button>
              </form>
              <p className="text-[12px] text-ink-500">Preview: card payment is simulated until a payment gateway is connected.</p>
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Recent activity" description={mine?.bed ? `Boarding: ${mine.bed.room}, bed ${mine.bed.bed} (since ${mine.bed.from})` : undefined} />
            {!w ? <CardBody><SkeletonText lines={4} /></CardBody> : !w.transactions.length ? <CardBody><p className="text-[13.5px] text-ink-500">Nothing yet.</p></CardBody> :
          <ul className="divide-y divide-ink-100">
                {w.transactions.map((t) =>
            <li key={t._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
                    <span className="w-28 text-[12px] text-ink-500">{new Date(t.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="min-w-0 flex-1">{t.type === 'purchase' ? t.items?.map((i) => `${i.qty}× ${i.name}`).join(', ') : t.type === 'topup' ? `Top-up (${t.method})` : 'Refund'}</span>
                    <span className={cn('font-mono font-semibold', t.amount < 0 ? 'text-ink-900' : 'text-success-600')}>{t.amount < 0 ? '−' : '+'}{formatMoney(Math.abs(t.amount) / 100)}</span>
                  </li>
            )}
              </ul>
          }
          </Card>
        </div>
      }
    </>);

}
