import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangleIcon, CameraIcon, MinusIcon, PlusIcon, Trash2Icon, UtensilsIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { CameraScanner } from '../../../components/attendance/CameraScanner';
import { errorMessage } from '../../../api/client';
import { ALLERGENS, allergyClashes } from '../../../api/boarding';
import { usePermissions } from '../../../hooks/permissions';
import { useStudents } from '../../../hooks/students';
import {
  useCanteenStats,
  useDeleteMenuItem,
  useGenerateCanteenSample,
  useMenu,
  usePurchase,
  useRefund,
  useSaveMenuItem,
  useTillCustomer,
  useTopUp } from
'../../../hooks/hr';
import { PERMISSIONS } from '../../../lib/permissions';
import type { MenuItem } from '../../../types/boarding';
import { cn } from '../../../utils/cn';
import { formatMoney, parseAmount } from '../../../utils/money';

const egp = (minor: number) => formatMoney(minor / 100);
const CATEGORIES: MenuItem['category'][] = ['Meals', 'Snacks', 'Drinks', 'Fruit'];

export function AdminCanteen() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'menu' ? 'menu' : 'till';
  const stats = useCanteenStats();
  const menu = useMenu();
  const sample = useGenerateCanteenSample();
  const students = useStudents({ limit: 500 });
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const genders = useMemo(() => Object.fromEntries((students.data?.items ?? []).filter((s) => s.gender).map((s) => [s._id, s.gender as 'Male' | 'Female'])), [students.data]);
  const s = stats.data;
  return (
    <>
      <PageHeader title="Canteen" description="Students pay from a prepaid wallet with their ID card. The till checks allergies from the health record, the balance and the parent's daily limit."
      breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Services' }, { label: 'Canteen' }]} />
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sales today" value={s ? egp(s.salesToday) : '—'} />
        <Kpi label="Orders today" value={String(s?.ordersToday ?? '—')} />
        <Kpi label="In wallets" value={s ? egp(s.walletsTotal) : '—'} sub="prepaid by parents" />
        <Kpi label="Top item" value={s?.topItems[0]?.name ?? '—'} sub={s?.topItems[0] ? `${s.topItems[0].qty} sold` : undefined} />
      </section>
      {menu.data?.length === 0 && canManage &&
      <Card className="mb-5"><EmptyState icon={<UtensilsIcon className="h-5 w-5" aria-hidden="true" />} title="No menu yet" description="Start with a sample menu, wallets for every student and two hostel rooms per block." action={<Button isLoading={sample.isPending} onClick={() => sample.mutate(genders)}>Add sample menu & wallets</Button>} /></Card>
      }
      <div role="tablist" aria-label="View" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {([['till', 'Till'], ['menu', 'Menu']] as const).map(([id, label]) =>
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'till' ? {} : { tab: id })}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{label}</button>
        )}
      </div>
      {tab === 'till' ? <Till canManage={canManage} /> : <MenuTab canManage={canManage} />}
    </>);

}

function Till({ canManage }: {canManage: boolean;}) {
  const menu = useMenu();
  const stats = useCanteenStats();
  const purchase = usePurchase();
  const refund = useRefund();
  const topUp = useTopUp();
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [message, setMessage] = useState<{ok: boolean;text: string;} | null>(null);
  const [confirmAllergy, setConfirmAllergy] = useState(false);
  const [topping, setTopping] = useState(false);
  const [amount, setAmount] = useState('100');
  const customer = useTillCustomer(code);
  const items = (menu.data ?? []).filter((m) => m.available);
  const lines = [...cart.entries()].map(([id, qty]) => ({ item: items.find((m) => m._id === id)!, qty })).filter((l) => l.item);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const c = customer.data;
  const clashes = c ? allergyClashes(lines.map((l) => l.item), c.allergies) : [];
  const severe = clashes.some((x) => x.severity === 'severe');
  const add = (id: string, delta: number) => setCart((prev) => {const next = new Map(prev);const q = (next.get(id) ?? 0) + delta;if (q <= 0) next.delete(id);else next.set(id, Math.min(q, 10));return next;});
  const charge = () => purchase.mutate({ code, lines: lines.map((l) => ({ itemId: l.item._id, qty: l.qty })), confirmAllergy }, {
    onSuccess: (r) => {setMessage({ ok: true, text: `Paid ${egp(-r.tx.amount)} · balance ${egp(r.balance)}` });setCart(new Map());setConfirmAllergy(false);},
    onError: (e) => setMessage({ ok: false, text: errorMessage(e) })
  });
  const find = (v: string) => {setInput(v);setCode(v.trim());setMessage(null);setCart(new Map());setConfirmAllergy(false);};

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader title="Customer" action={<Button size="sm" variant="ghost" icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setCamera((v) => !v)}>{camera ? 'Stop' : 'Camera'}</Button>} />
        <CardBody className="space-y-3">
          {camera && <CameraScanner onCode={find} />}
          <form onSubmit={(e) => {e.preventDefault();find(input);}} className="flex items-end gap-2">
            <div className="flex-1"><Input id="till-code" label="Scan the ID card" value={input} onChange={(e) => setInput(e.target.value)} placeholder="STU12345AB" autoComplete="off" /></div>
            <Button type="submit" variant="secondary" disabled={!input.trim()}>Find</Button>
          </form>
          {customer.isError && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-600">{errorMessage(customer.error)}</p>}
          {c &&
          <div className="rounded-xl border border-ink-200 p-3 text-[13.5px]">
              <p className="font-bold text-ink-900">{c.student.name} <span className="font-normal text-ink-500">· {c.section}</span></p>
              <p className="mt-1"><span className="text-ink-500">Balance</span> <strong className="font-mono">{egp(c.wallet.balance)}</strong></p>
              <p className="text-[12.5px] text-ink-500">{c.wallet.dailyLimit ? `Daily limit ${egp(c.wallet.dailyLimit)} · ${egp(c.spentToday)} spent today` : `No daily limit · ${egp(c.spentToday)} spent today`}</p>
              {c.allergies.length > 0 &&
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-danger-50 px-2.5 py-1.5 text-[12.5px] font-semibold text-danger-600">
                  <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Allergies: {c.allergies.map((a) => `${a.name} (${a.severity})`).join(', ')}
                </p>
            }
              {canManage && <Button className="mt-2" size="sm" variant="ghost" onClick={() => setTopping(true)}>Top up (cash)</Button>}
            </div>
          }
        </CardBody>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader title="Order" description={c ? `Total ${egp(total)}` : 'Scan a card first'} />
        <CardBody className="space-y-3">
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((m) => {
              const qty = cart.get(m._id) ?? 0;
              const bad = c ? allergyClashes([m], c.allergies) : [];
              return (
                <li key={m._id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', bad.length ? 'border-danger-100 bg-danger-50/60' : 'border-ink-200')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink-900">{m.name}</p>
                    <p className="text-[11.5px] text-ink-500">{egp(m.price)}{bad.length ? <span className="font-semibold text-danger-600"> · contains {bad.map((b) => b.allergen).join(', ')}</span> : m.allergens.length ? ` · ${m.allergens.join(', ')}` : ''}</p>
                  </div>
                  {qty > 0 && <button type="button" aria-label={`One less ${m.name}`} onClick={() => add(m._id, -1)} className="rounded p-1 text-ink-500 hover:bg-ink-100"><MinusIcon className="h-4 w-4" aria-hidden="true" /></button>}
                  {qty > 0 && <span className="w-5 text-center font-mono text-[13px] font-bold">{qty}</span>}
                  <button type="button" aria-label={`Add ${m.name}`} disabled={!c} onClick={() => add(m._id, 1)} className="rounded p-1 text-primary-600 hover:bg-primary-50 disabled:opacity-30"><PlusIcon className="h-4 w-4" aria-hidden="true" /></button>
                </li>);

            })}
          </ul>
          {clashes.length > 0 &&
          <div role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-[13px] text-danger-600">
              {severe ? <strong>Severe allergy: remove {clashes.filter((x) => x.severity === 'severe').map((x) => x.item).join(', ')}.</strong> :
            <label className="flex items-center gap-2"><input type="checkbox" checked={confirmAllergy} onChange={(e) => setConfirmAllergy(e.target.checked)} className="h-4 w-4" />Allergy warning ({clashes.map((x) => `${x.item}: ${x.allergen}`).join(', ')}). I checked with the student.</label>}
            </div>
          }
          {message && <p role="status" className={cn('rounded-lg px-3 py-2 text-[13px] font-semibold', message.ok ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600')}>{message.text}</p>}
          <Button fullWidth size="lg" disabled={!c || !lines.length || !canManage || severe || clashes.length > 0 && !confirmAllergy} isLoading={purchase.isPending} onClick={charge}>Charge {egp(total)}</Button>
        </CardBody>
      </Card>
      <Card className="lg:col-span-5">
        <CardHeader title="Today" />
        {!stats.data?.recent.length ? <CardBody><p className="text-[13px] text-ink-500">No sales yet today.</p></CardBody> :
        <ul className="divide-y divide-ink-100">
            {stats.data.recent.map((t) =>
          <li key={t._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 text-[13px]">
                <span className="w-14 font-mono text-[12px] text-ink-500">{new Date(t.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="min-w-0 flex-1">{t.student} · {t.type === 'purchase' ? t.items?.map((i) => `${i.qty}× ${i.name}`).join(', ') : t.type === 'topup' ? 'Top-up' : 'Refund'}</span>
                <span className={cn('font-mono font-semibold', t.amount < 0 ? 'text-ink-900' : 'text-success-600')}>{t.amount < 0 ? '−' : '+'}{egp(Math.abs(t.amount))}</span>
                {t.type === 'purchase' && canManage && <Button size="sm" variant="ghost" onClick={() => refund.mutate(t._id)}>Refund</Button>}
              </li>
          )}
          </ul>
        }
      </Card>
      <Modal open={topping} onClose={() => setTopping(false)} title={`Top up · ${c?.student.name ?? ''}`} size="sm"
      footer={<><Button variant="secondary" onClick={() => setTopping(false)}>Cancel</Button><Button disabled={parseAmount(amount) === null} isLoading={topUp.isPending} onClick={() => c && topUp.mutate({ studentId: c.student._id, amount: Math.round((parseAmount(amount) ?? 0) * 100) }, { onSuccess: () => setTopping(false) })}>Top up</Button></>}>
        <Input id="topup-amount" label="Amount (EGP, cash received)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Modal>
    </div>);

}

function MenuTab({ canManage }: {canManage: boolean;}) {
  const menu = useMenu();
  const save = useSaveMenuItem();
  const remove = useDeleteMenuItem();
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  return (
    <Card>
      <div className="flex justify-end border-b border-ink-100 px-5 py-3">{canManage && <Button size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEditing('new')}>Add item</Button>}</div>
      <ul className="divide-y divide-ink-100">
        {(menu.data ?? []).map((m) =>
        <li key={m._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">{m.name} <span className="font-normal text-ink-500">· {m.category}</span></p>
              <p className="text-[12px] text-ink-500">{m.allergens.length ? `Contains ${m.allergens.join(', ')}` : 'No listed allergens'}</p>
            </div>
            <span className="font-mono font-semibold">{egp(m.price)}</span>
            {canManage && <label className="flex items-center gap-1.5 text-[12.5px] text-ink-600"><input type="checkbox" checked={m.available} onChange={(e) => save.mutate({ id: m._id, payload: { ...m, available: e.target.checked } })} className="h-4 w-4" />Available</label>}
            {canManage && <><Button size="sm" variant="ghost" onClick={() => setEditing(m)}>Edit</Button><Button size="sm" variant="ghost" aria-label={`Remove ${m.name}`} icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => remove.mutate(m._id)} /></>}
          </li>
        )}
      </ul>
      {editing && <MenuModal initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>);

}

function MenuModal({ initial, onClose }: {initial?: MenuItem;onClose: () => void;}) {
  const save = useSaveMenuItem();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<MenuItem['category']>(initial?.category ?? 'Meals');
  const [price, setPrice] = useState(initial ? String(initial.price / 100) : '');
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const p = parseAmount(price);
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add menu item'} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={name.trim().length < 2 || p === null} isLoading={save.isPending}
    onClick={() => save.mutate({ id: initial?._id, payload: { name, category, price: Math.round((p ?? 0) * 100), allergens, available: initial?.available ?? true } }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="space-y-3">
        <Input id="menu-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select id="menu-cat" label="Category" value={category} onChange={(e) => setCategory(e.target.value as MenuItem['category'])} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Input id="menu-price" label="Price (EGP)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-700">Contains</legend>
          <div className="flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) =>
            <label key={a} className={cn('flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-[12.5px] font-semibold', allergens.includes(a) ? 'border-danger-500 bg-danger-50 text-danger-600' : 'border-ink-200 text-ink-600')}>
                <input type="checkbox" className="sr-only" checked={allergens.includes(a)} onChange={() => setAllergens(allergens.includes(a) ? allergens.filter((x) => x !== a) : [...allergens, a])} />{a}
              </label>
            )}
          </div>
          <p className="mt-1.5 text-[12px] text-ink-500">Matched against students' allergies in Health records.</p>
        </fieldset>
      </div>
    </Modal>);

}
