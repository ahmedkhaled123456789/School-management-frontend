import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpenIcon, CameraIcon, LibraryBigIcon, PlusIcon, PrinterIcon, RotateCcwIcon, SettingsIcon, Trash2Icon, UndoIcon } from 'lucide-react';
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
import { Kpi } from '../../../components/reports/charts';
import { CameraScanner } from '../../../components/attendance/CameraScanner';
import { printImages } from '../../../components/certificates/CanvasImage';
import { errorMessage } from '../../../api/client';
import { overdueDays, type BookView } from '../../../api/library';
import { useStaffDirectory } from '../../../hooks/attendance';
import { usePermissions } from '../../../hooks/permissions';
import {
  useAddCopies,
  useBooks,
  useBorrower,
  useCheckout,
  useDeleteBook,
  useGenerateLibrarySample,
  useLibrarySettings,
  useLibraryStats,
  useLoans,
  usePayFine,
  useRenewLoan,
  useReturnCopy,
  useSaveBook,
  useSendLibraryReminders,
  useSetCopyStatus,
  useUpdateLibrarySettings,
  useWaiveFine } from
'../../../hooks/services';
import { renderSpineLabel } from '../../../lib/cards';
import { PERMISSIONS } from '../../../lib/permissions';
import type { CopyStatus, Loan } from '../../../types/library';
import { formatDay } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { formatMoney } from '../../../utils/money';

type Tab = 'desk' | 'catalogue' | 'loans';
const egp = (minor: number) => formatMoney(minor / 100);
const CATEGORIES = ['Fiction', 'Science', 'History', 'Mathematics', 'Arabic', 'Reference', 'Religion', 'Art', 'Other'];

export function AdminLibrary() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'catalogue' ? 'catalogue' : params.get('tab') === 'loans' ? 'loans' : 'desk';
  const stats = useLibraryStats();
  const books = useBooks();
  const sample = useGenerateLibrarySample();
  const reminders = useSendLibraryReminders();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // overdue / due-tomorrow reminders: once a day, when the library is opened (a server job later)
  const reminded = useRef(false);
  useEffect(() => {
    if (!reminded.current && canManage) {
      reminded.current = true;
      reminders.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = stats.data;
  return (
    <>
      <PageHeader
        title="Library"
        description="Lend and return by scanning the student's ID card and the book's label. Late returns are fined automatically."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Services' }, { label: 'Library' }]}
        actions={canManage ? <Button variant="ghost" icon={<SettingsIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setSettingsOpen(true)}>Rules</Button> : undefined} />

      <section aria-label="Totals" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Titles" value={String(s?.titles ?? '—')} sub={s ? `${s.copies} copies` : undefined} />
        <Kpi label="On loan" value={String(s?.onLoan ?? '—')} />
        <Kpi label="Overdue" value={String(s?.overdue ?? '—')} tone={s?.overdue ? 'critical' : undefined} sub={s?.overdue ? 'families get a daily reminder' : undefined} />
        <Kpi label="Unpaid fines" value={s ? egp(s.unpaidFines) : '—'} />
        <Kpi label="Fines collected" value={s ? egp(s.collectedFines) : '—'} />
      </section>

      {books.data && books.data.length === 0 && canManage &&
      <Card className="mb-5"><EmptyState icon={<LibraryBigIcon className="h-5 w-5" aria-hidden="true" />} title="The catalogue is empty" description="Add books one by one, or start with a sample catalogue and a few loans." action={<Button isLoading={sample.isPending} onClick={() => sample.mutate()}>Add sample catalogue</Button>} /></Card>
      }

      <div role="tablist" aria-label="View" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {([['desk', 'Desk'], ['catalogue', 'Catalogue'], ['loans', 'Loans & fines']] as const).map(([id, label]) =>
        <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setParams(id === 'desk' ? {} : { tab: id })}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{label}</button>
        )}
      </div>
      {tab === 'desk' && <Desk canManage={canManage} />}
      {tab === 'catalogue' && <Catalogue canManage={canManage} topBooks={s?.topBooks ?? []} />}
      {tab === 'loans' && <Loans canManage={canManage} />}
      {settingsOpen && <RulesModal onClose={() => setSettingsOpen(false)} />}
    </>);

}

/* ----------------------------------- desk ---------------------------------- */

function Desk({ canManage }: {canManage: boolean;}) {
  const staff = useStaffDirectory();
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [returnCode, setReturnCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [returned, setReturned] = useState<Loan | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const account = useBorrower(code, staff.people);
  const checkout = useCheckout();
  const giveBack = useReturnCopy();

  const lend = () => {
    if (!barcode.trim() || !code) return;
    checkout.mutate({ code, barcode, people: staff.people }, { onSuccess: () => {setBarcode('');document.getElementById('desk-book')?.focus();} });
  };
  const doReturn = (value: string) => {
    if (!value.trim()) return;
    setReturnError(null);
    giveBack.mutate(value, { onSuccess: (l) => {setReturned(l);setReturnCode('');}, onError: (e) => setReturnError(errorMessage(e)) });
  };
  // the camera fills the right box: book labels start with LIB-, everything else is a person
  const onScan = (value: string) => {
    if (/^LIB-/i.test(value)) {
      if (code) setBarcode(value.toUpperCase());else
      doReturn(value);
    } else {
      setCodeInput(value);
      setCode(value);
    }
  };

  const acc = account.data;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Lend" description="1. Scan the ID card · 2. scan each book" action={<Button size="sm" variant="ghost" icon={<CameraIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setCamera((v) => !v)}>{camera ? 'Stop camera' : 'Camera'}</Button>} />
        <CardBody className="space-y-4">
          {camera && <CameraScanner onCode={onScan} />}
          <form onSubmit={(e) => {e.preventDefault();setCode(codeInput.trim());}} className="flex items-end gap-2">
            <div className="flex-1"><Input id="desk-borrower" label="Borrower (student code or staff email)" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="STU12345AB" autoComplete="off" /></div>
            <Button type="submit" variant="secondary" disabled={!codeInput.trim()}>Find</Button>
          </form>
          {account.isError && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-600">{errorMessage(account.error)}</p>}
          {acc &&
          <div className="rounded-xl border border-ink-200 p-3">
              <p className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-bold text-ink-900">{acc.borrower.name}</span><Badge tone="neutral">{acc.borrower.kind === 'student' ? acc.borrower.section ?? 'Student' : 'Staff'}</Badge></p>
              <p className="text-[12.5px] text-ink-500">{acc.loans.filter((l) => !l.returnedOn).length} of {acc.limit} books{acc.unpaidFines ? ` · unpaid fines ${egp(acc.unpaidFines)}` : ''}</p>
              {acc.loans.length > 0 &&
            <ul className="mt-2 space-y-1 text-[13px]">
                  {acc.loans.map((l) =>
              <li key={l._id} className="flex flex-wrap items-center justify-between gap-2">
                      <span dir="auto" className="min-w-0 truncate text-ink-800">{l.title} <span className="font-mono text-[11.5px] text-ink-400">{l.barcode}</span></span>
                      {l.returnedOn ? <Badge tone="danger">Fine {egp(l.fine)}</Badge> : overdueDays(l) ? <Badge tone="danger">{overdueDays(l)} day(s) late</Badge> : <span className="text-[12px] text-ink-500">due {formatDay(l.dueOn)}</span>}
                    </li>
              )}
                </ul>
            }
              {canManage &&
            <form onSubmit={(e) => {e.preventDefault();lend();}} className="mt-3 flex items-end gap-2">
                  <div className="flex-1"><Input id="desk-book" label="Book label" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="LIB-000001" autoComplete="off" /></div>
                  <Button type="submit" disabled={!barcode.trim()} isLoading={checkout.isPending}>Lend</Button>
                </form>
            }
            </div>
          }
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Return" description="Scan the book label. A late return gets its fine." />
        <CardBody className="space-y-4">
          <form onSubmit={(e) => {e.preventDefault();doReturn(returnCode);}} className="flex items-end gap-2">
            <div className="flex-1"><Input id="desk-return" label="Book label" value={returnCode} onChange={(e) => setReturnCode(e.target.value)} placeholder="LIB-000001" autoComplete="off" disabled={!canManage} /></div>
            <Button type="submit" disabled={!returnCode.trim() || !canManage} isLoading={giveBack.isPending} icon={<UndoIcon className="h-4 w-4" aria-hidden="true" />}>Return</Button>
          </form>
          {returnError && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-[13px] text-danger-600">{returnError}</p>}
          {returned &&
          <div className={cn('rounded-xl border px-4 py-3 text-[13.5px]', returned.fine ? 'border-danger-100 bg-danger-50' : 'border-success-100 bg-success-50')} aria-live="polite">
              <p className="font-bold text-ink-900">"{returned.title}" returned</p>
              <p className="text-ink-700">{returned.borrower.name} · borrowed {formatDay(returned.loanedOn)}, due {formatDay(returned.dueOn)}</p>
              {returned.fine ? <p className="mt-1 font-semibold text-danger-600">{overdueDays(returned)} day(s) late · fine {egp(returned.fine)} (pay in “Loans & fines”)</p> : <p className="mt-1 text-success-600">On time — no fine.</p>}
            </div>
          }
        </CardBody>
      </Card>
    </div>);

}

/* -------------------------------- catalogue -------------------------------- */

function Catalogue({ canManage, topBooks }: {canManage: boolean;topBooks: Array<{title: string;count: number;}>;}) {
  const books = useBooks();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<BookView | null>(null);
  const list = useMemo(() => (books.data ?? []).filter((b) => (!category || b.category === category) && (!query.trim() || [b.title, b.author, b.isbn ?? '', b.shelf].some((v) => v.toLowerCase().includes(query.trim().toLowerCase())))), [books.data, query, category]);
  const categories = [...new Set((books.data ?? []).map((b) => b.category))].sort();
  const current = open ? books.data?.find((b) => b._id === open._id) ?? null : null;

  return (
    <div className="grid gap-5 lg:grid-cols-4">
      <Card className="lg:col-span-3">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3">
          <div className="w-64"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Title, author, ISBN, shelf…" /></div>
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-[13px]">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          {canManage && <Button className="ms-auto" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setAdding(true)}>Add book</Button>}
        </div>
        {books.isError ? <ErrorState error={books.error} /> : books.isLoading ? <div className="p-5"><SkeletonText lines={6} /></div> : list.length === 0 ? <EmptyState title="No book matches" /> :
        <ul className="divide-y divide-ink-100">
            {list.map((b) =>
          <li key={b._id}>
                <button type="button" onClick={() => setOpen(b)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-start hover:bg-ink-50">
                  <BookOpenIcon className="h-5 w-5 shrink-0 text-ink-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate text-[14px] font-semibold text-ink-900">{b.title}</p>
                    <p dir="auto" className="truncate text-[12px] text-ink-500">{b.author} · {b.category} · shelf {b.shelf}{b.isbn ? ` · ISBN ${b.isbn}` : ''}</p>
                  </div>
                  {b.available ? <Badge tone="success">{b.available} of {b.copies.length} in</Badge> : <Badge tone="warn">All out{b.nextDue ? ` · back ${formatDay(b.nextDue)}` : ''}</Badge>}
                </button>
              </li>
          )}
          </ul>
        }
      </Card>
      <Card className="h-fit">
        <CardHeader title="Most borrowed" />
        <CardBody>
          {topBooks.length ? <ol className="space-y-1.5 text-[13px]">{topBooks.map((t, i) => <li key={t.title} className="flex justify-between gap-2"><span dir="auto" className="truncate text-ink-800">{i + 1}. {t.title}</span><span className="font-mono text-ink-500">{t.count}</span></li>)}</ol> : <p className="text-[13px] text-ink-500">No loans yet.</p>}
        </CardBody>
      </Card>
      {adding && <BookModal onClose={() => setAdding(false)} />}
      {current && <BookDetail book={current} canManage={canManage} onClose={() => setOpen(null)} />}
    </div>);

}

function BookModal({ onClose, initial }: {onClose: () => void;initial?: BookView;}) {
  const save = useSaveBook();
  const [v, setV] = useState({ title: initial?.title ?? '', author: initial?.author ?? '', isbn: initial?.isbn ?? '', category: initial?.category ?? 'Fiction', shelf: initial?.shelf ?? '', year: initial?.publishedYear ? String(initial.publishedYear) : '', copies: '1' });
  const valid = v.title.trim().length >= 2 && v.author.trim().length >= 2 && v.shelf.trim() && (!v.year || /^\d{4}$/.test(v.year)) && (initial || /^\d+$/.test(v.copies) && Number(v.copies) >= 1 && Number(v.copies) <= 100);
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit book' : 'Add a book'} size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={save.isPending}
    onClick={() => save.mutate({ id: initial?._id, copies: Number(v.copies), payload: { title: v.title, author: v.author, isbn: v.isbn || undefined, category: v.category, shelf: v.shelf, publishedYear: v.year ? Number(v.year) : undefined } }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Input id="book-title" label="Title" required maxLength={150} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
        <Input id="book-author" label="Author" required maxLength={100} value={v.author} onChange={(e) => setV({ ...v, author: e.target.value })} />
        <Input id="book-isbn" label="ISBN (optional)" value={v.isbn} onChange={(e) => setV({ ...v, isbn: e.target.value })} />
        <Select id="book-category" label="Category" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <Input id="book-shelf" label="Shelf" required maxLength={20} value={v.shelf} onChange={(e) => setV({ ...v, shelf: e.target.value })} placeholder="B-03" />
        <Input id="book-year" label="Year (optional)" inputMode="numeric" value={v.year} onChange={(e) => setV({ ...v, year: e.target.value })} />
        {!initial && <Input id="book-copies" label="Copies" inputMode="numeric" value={v.copies} onChange={(e) => setV({ ...v, copies: e.target.value })} hint="Each copy gets its own label" />}
      </div>
    </Modal>);

}

const COPY_TONE: Record<CopyStatus, 'success' | 'info' | 'warn' | 'danger'> = { available: 'success', loaned: 'info', repair: 'warn', lost: 'danger' };

function BookDetail({ book, canManage, onClose }: {book: BookView;canManage: boolean;onClose: () => void;}) {
  const addCopies = useAddCopies();
  const setStatus = useSetCopyStatus();
  const remove = useDeleteBook();
  const [editing, setEditing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printLabels = async () => {
    setPrinting(true);
    const urls = [];
    for (const c of book.copies) urls.push((await renderSpineLabel({ barcode: c.barcode, title: book.title, shelf: book.shelf })).toDataURL('image/png'));
    setPrinting(false);
    printImages(urls, 'labels', `Labels · ${book.title}`);
  };
  if (editing) return <BookModal initial={book} onClose={() => setEditing(false)} />;
  return (
    <Modal open onClose={onClose} title={book.title} description={`${book.author} · ${book.category} · shelf ${book.shelf}`} size="md"
    footer={canManage ? <>
          <Button variant="ghost" icon={<Trash2Icon className="h-4 w-4" aria-hidden="true" />} isLoading={remove.isPending} onClick={() => remove.mutate(book._id, { onSuccess: onClose })}>Remove</Button>
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="secondary" icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />} isLoading={printing} onClick={printLabels}>Print labels</Button>
          <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} isLoading={addCopies.isPending} onClick={() => addCopies.mutate({ id: book._id, count: 1 })}>Add copy</Button>
        </> : <Button onClick={onClose}>Close</Button>}>
      <p className="mb-3 text-[13px] text-ink-600">{book.available} of {book.copies.length} available · borrowed {book.borrowed} time(s)</p>
      <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200">
        {book.copies.map((c) =>
        <li key={c._id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
            <span className="w-28 font-mono text-ink-800">{c.barcode}</span>
            <Badge tone={COPY_TONE[c.status]}>{c.status === 'loaned' ? 'On loan' : c.status}</Badge>
            {canManage && c.status !== 'loaned' &&
          <select aria-label={`Status of ${c.barcode}`} value={c.status} onChange={(e) => setStatus.mutate({ bookId: book._id, copyId: c._id, status: e.target.value as Exclude<CopyStatus, 'loaned'> })} className="ms-auto h-8 rounded-lg border border-ink-200 bg-white px-2 text-[12.5px]">
                <option value="available">Available</option><option value="repair">In repair</option><option value="lost">Lost</option>
              </select>
          }
          </li>
        )}
      </ul>
    </Modal>);

}

/* ---------------------------------- loans ---------------------------------- */

function Loans({ canManage }: {canManage: boolean;}) {
  const [filter, setFilter] = useState<'active' | 'overdue' | 'fines' | 'returned'>('active');
  const loans = useLoans(filter);
  const renew = useRenewLoan();
  const pay = usePayFine();
  const waive = useWaiveFine();
  const [waiving, setWaiving] = useState<Loan | null>(null);
  const [reason, setReason] = useState('');
  return (
    <Card>
      <div className="border-b border-ink-100 px-5 py-3">
        <div role="radiogroup" aria-label="Show" className="inline-flex gap-1 rounded-lg bg-ink-100 p-1">
          {([['active', 'On loan'], ['overdue', 'Overdue'], ['fines', 'Unpaid fines'], ['returned', 'Returned']] as const).map(([id, label]) =>
          <button key={id} type="button" role="radio" aria-checked={filter === id} onClick={() => setFilter(id)}
          className={cn('rounded-md px-2.5 py-1 text-[12.5px] font-semibold', filter === id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>{label}</button>
          )}
        </div>
      </div>
      {loans.isError ? <ErrorState error={loans.error} /> : loans.isLoading ? <div className="p-5"><SkeletonText lines={5} /></div> : !loans.data?.length ? <EmptyState title="Nothing here" /> :
      <ul className="divide-y divide-ink-100">
          {loans.data.map((l) => {
          const late = overdueDays(l);
          return (
            <li key={l._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[13px]">
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="font-semibold text-ink-900">{l.title} <span className="font-mono text-[11.5px] font-normal text-ink-400">{l.barcode}</span></p>
                  <p className="text-[12px] text-ink-500">{l.borrower.name}{l.borrower.section ? ` · ${l.borrower.section}` : ''} · {formatDay(l.loanedOn)} → {formatDay(l.dueOn)}{l.returnedOn ? ` · returned ${formatDay(l.returnedOn)}` : ''}{l.renewals ? ` · renewed ${l.renewals}×` : ''}</p>
                </div>
                {!l.returnedOn && (late ? <Badge tone="danger">{late} day(s) late</Badge> : <Badge tone="success">On time</Badge>)}
                {l.fine > 0 && (l.finePaid ? <Badge tone="success">Fine paid</Badge> : l.fineWaived ? <Badge tone="neutral">Waived</Badge> : <Badge tone="danger">Fine {egp(l.fine)}</Badge>)}
                {canManage && !l.returnedOn && !late && <Button size="sm" variant="ghost" icon={<RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />} isLoading={renew.isPending && renew.variables === l._id} onClick={() => renew.mutate(l._id)}>Renew</Button>}
                {canManage && l.fine > 0 && !l.finePaid && !l.fineWaived &&
              <>
                    <Button size="sm" variant="secondary" onClick={() => pay.mutate({ id: l._id, method: 'cash' })}>Paid (cash)</Button>
                    <Button size="sm" variant="ghost" onClick={() => {setReason('');setWaiving(l);}}>Waive</Button>
                  </>
              }
              </li>);

        })}
        </ul>
      }
      <Modal open={Boolean(waiving)} onClose={() => setWaiving(null)} title="Waive this fine?" size="sm"
      footer={<><Button variant="secondary" onClick={() => setWaiving(null)}>Cancel</Button><Button disabled={!reason.trim()} isLoading={waive.isPending} onClick={() => waiving && waive.mutate({ id: waiving._id, reason }, { onSuccess: () => setWaiving(null) })}>Waive</Button></>}>
        <Input id="waive-reason" label="Reason" required maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The student was ill" />
      </Modal>
    </Card>);

}

function RulesModal({ onClose }: {onClose: () => void;}) {
  const settings = useLibrarySettings();
  const update = useUpdateLibrarySettings();
  const [v, setV] = useState<Record<string, string> | null>(null);
  const s = settings.data;
  const val = v ?? (s ? { loanDays: String(s.loanDays), maxLoansStudent: String(s.maxLoansStudent), maxLoansStaff: String(s.maxLoansStaff), maxRenewals: String(s.maxRenewals), fine: String(s.finePerDay / 100) } : null);
  if (!val) return null;
  const valid = Object.entries(val).every(([k, x]) => k === 'fine' ? /^\d+(\.\d{1,2})?$/.test(x) : /^\d+$/.test(x));
  return (
    <Modal open onClose={onClose} title="Library rules" size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={update.isPending}
    onClick={() => update.mutate({ loanDays: Number(val.loanDays), maxLoansStudent: Number(val.maxLoansStudent), maxLoansStaff: Number(val.maxLoansStaff), maxRenewals: Number(val.maxRenewals), finePerDay: Math.round(Number(val.fine) * 100) }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Input id="lr-days" label="Loan period (days)" inputMode="numeric" value={val.loanDays} onChange={(e) => setV({ ...val, loanDays: e.target.value })} />
        <Input id="lr-renew" label="Renewals allowed" inputMode="numeric" value={val.maxRenewals} onChange={(e) => setV({ ...val, maxRenewals: e.target.value })} />
        <Input id="lr-student" label="Books per student" inputMode="numeric" value={val.maxLoansStudent} onChange={(e) => setV({ ...val, maxLoansStudent: e.target.value })} />
        <Input id="lr-staff" label="Books per staff" inputMode="numeric" value={val.maxLoansStaff} onChange={(e) => setV({ ...val, maxLoansStaff: e.target.value })} />
        <div className="col-span-2"><Input id="lr-fine" label="Fine per late day (EGP)" inputMode="decimal" value={val.fine} onChange={(e) => setV({ ...val, fine: e.target.value })} /></div>
      </div>
    </Modal>);

}
