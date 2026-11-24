import React, { useMemo, useState } from 'react';
import { FileStackIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { useAcademicYears } from '../../../hooks/academicYears';
import { useClassLevels } from '../../../hooks/classes';
import {
  useCreateFeeStructure,
  useCurrency,
  useDeleteFeeStructure,
  useFeeItems,
  useFeeStructures,
  useGenerateInvoices,
  useUpdateFeeStructure } from
'../../../hooks/finance';
import type { FeeStructure, FeeStructurePayload } from '../../../types/finance';
import { formatDate } from '../../../utils/format';
import { formatMoney, parseAmount } from '../../../utils/money';

interface ItemRow {feeItem: string;amount: string;}
interface InstallmentRow {label: string;dueDate: string;percentage: string;}
interface FormState {
  name: string;
  academicYear: string;
  classLevel: string;
  items: ItemRow[];
  installments: InstallmentRow[];
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  academicYear: '',
  classLevel: '',
  items: [{ feeItem: '', amount: '' }],
  installments: [{ label: 'Full payment', dueDate: '', percentage: '100' }],
  isActive: true
};

// quick presets for the installment plan
const PRESETS: Array<{label: string;rows: Array<Pick<InstallmentRow, 'label' | 'percentage'>>;}> = [
{ label: 'One payment', rows: [{ label: 'Full payment', percentage: '100' }] },
{ label: '2 installments', rows: [{ label: 'First installment', percentage: '50' }, { label: 'Second installment', percentage: '50' }] },
{ label: '3 terms', rows: [{ label: 'Term 1', percentage: '40' }, { label: 'Term 2', percentage: '30' }, { label: 'Term 3', percentage: '30' }] }];


const toForm = (s: FeeStructure): FormState => ({
  name: s.name ?? '',
  academicYear: s.academicYear?._id ?? '',
  classLevel: s.classLevel?._id ?? '',
  items: s.items.map((i) => ({ feeItem: i.feeItem?._id ?? '', amount: String(i.amount) })),
  installments: s.installments.map((i) => ({ label: i.label, dueDate: i.dueDate.slice(0, 10), percentage: String(i.percentage) })),
  isActive: s.isActive
});

function StructureForm({
  form,
  setForm,
  editing,
  errors





}: {form: FormState;setForm: React.Dispatch<React.SetStateAction<FormState>>;editing: boolean;errors: string[];}) {
  const years = useAcademicYears();
  const levels = useClassLevels();
  const feeItems = useFeeItems();
  const currency = useCurrency();

  const total = form.items.reduce((sum, row) => sum + (parseAmount(row.amount) ?? 0), 0);
  const percentTotal = form.installments.reduce((sum, row) => sum + (Number(row.percentage) || 0), 0);
  const itemOptions = (feeItems.data?.items ?? []).filter((i) => i.isActive).map((i) => ({ value: i._id, label: i.name }));

  const setItem = (index: number, patch: Partial<ItemRow>) =>
  setForm((prev) => ({ ...prev, items: prev.items.map((row, i) => i === index ? { ...row, ...patch } : row) }));
  const setInstallment = (index: number, patch: Partial<InstallmentRow>) =>
  setForm((prev) => ({ ...prev, installments: prev.installments.map((row, i) => i === index ? { ...row, ...patch } : row) }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Select id="fs-year" label="Academic year" required disabled={editing} options={(years.data?.items ?? []).map((y) => ({ value: y._id, label: y.name }))} value={form.academicYear} onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))} />
        <Select id="fs-level" label="Class level" required disabled={editing} options={(levels.data?.items ?? []).map((l) => ({ value: l._id, label: l.name }))} value={form.classLevel} onChange={(e) => setForm((p) => ({ ...p, classLevel: e.target.value }))} />
        <Input id="fs-name" label="Name (optional)" dir="auto" value={form.name} placeholder="e.g. Level 100 fees" onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Fees</h3>
          <span className="font-mono text-[13px] font-bold text-ink-900">Total {formatMoney(total, currency)}</span>
        </div>
        <div className="space-y-2">
          {form.items.map((row, index) =>
          <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Select id={`fs-item-${index}`} label={index === 0 ? 'Fee item' : ' '} options={itemOptions} value={row.feeItem} placeholder={feeItems.isLoading ? 'Loading…' : 'Choose a fee'} onChange={(e) => setItem(index, { feeItem: e.target.value })} />
              </div>
              <div className="w-36">
                <Input id={`fs-amount-${index}`} label={index === 0 ? `Amount (${currency})` : ' '} inputMode="decimal" value={row.amount} placeholder="0.00" onChange={(e) => setItem(index, { amount: e.target.value })} />
              </div>
              <Button variant="ghost" size="sm" aria-label="Remove fee" disabled={form.items.length === 1} onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }))}>
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
        <Button variant="secondary" size="sm" className="mt-2" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setForm((p) => ({ ...p, items: [...p.items, { feeItem: '', amount: '' }] }))}>
          Add fee
        </Button>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Installments</h3>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((preset) =>
            <Button key={preset.label} variant="ghost" size="sm" onClick={() => setForm((p) => ({ ...p, installments: preset.rows.map((r, i) => ({ ...r, dueDate: p.installments[i]?.dueDate ?? '' })) }))}>
                {preset.label}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {form.installments.map((row, index) =>
          <div key={index} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input id={`fs-inst-label-${index}`} label={index === 0 ? 'Label' : ' '} dir="auto" value={row.label} onChange={(e) => setInstallment(index, { label: e.target.value })} />
              </div>
              <div className="w-40">
                <Input id={`fs-inst-date-${index}`} label={index === 0 ? 'Due date' : ' '} type="date" value={row.dueDate} onChange={(e) => setInstallment(index, { dueDate: e.target.value })} />
              </div>
              <div className="w-24">
                <Input id={`fs-inst-pct-${index}`} label={index === 0 ? '%' : ' '} inputMode="decimal" value={row.percentage} onChange={(e) => setInstallment(index, { percentage: e.target.value })} />
              </div>
              <Button variant="ghost" size="sm" aria-label="Remove installment" disabled={form.installments.length === 1} onClick={() => setForm((p) => ({ ...p, installments: p.installments.filter((_, i) => i !== index) }))}>
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setForm((p) => ({ ...p, installments: [...p.installments, { label: `Installment ${p.installments.length + 1}`, dueDate: '', percentage: '' }] }))}>
            Add installment
          </Button>
          <span className={Math.abs(percentTotal - 100) < 0.001 ? 'text-[13px] font-semibold text-success-600' : 'text-[13px] font-semibold text-danger-500'}>
            {percentTotal}% of 100%
          </span>
        </div>
      </section>

      {editing &&
      <label className="flex items-center gap-2 text-[13.5px] text-ink-700">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
          Active (inactive structures are not used for new invoices)
        </label>
      }

      {errors.length > 0 &&
      <ul role="alert" className="space-y-1 rounded-lg border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      }
    </div>);

}

function validate(form: FormState): string[] {
  const errors: string[] = [];
  if (!form.academicYear) errors.push('Choose an academic year.');
  if (!form.classLevel) errors.push('Choose a class level.');
  if (form.items.some((r) => !r.feeItem)) errors.push('Choose a fee item on every row.');
  if (new Set(form.items.map((r) => r.feeItem)).size !== form.items.length) errors.push('A fee item is listed twice.');
  if (form.items.some((r) => parseAmount(r.amount) === null)) errors.push('Every amount must be a number with up to 2 decimals.');
  if (form.installments.some((r) => !r.label.trim() || !r.dueDate)) errors.push('Every installment needs a label and a due date.');
  const pct = form.installments.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
  if (Math.abs(pct - 100) > 0.001) errors.push(`Installment percentages must add up to 100% (now ${pct}%).`);
  return errors;
}

const toPayload = (form: FormState): FeeStructurePayload => ({
  name: form.name.trim(),
  academicYear: form.academicYear,
  classLevel: form.classLevel,
  items: form.items.map((r) => ({ feeItem: r.feeItem, amount: parseAmount(r.amount) ?? 0 })),
  installments: form.installments.map((r) => ({ label: r.label.trim(), dueDate: r.dueDate, percentage: Number(r.percentage) })),
  isActive: form.isActive
});

export function AdminFeeStructures() {
  const years = useAcademicYears();
  const [yearFilter, setYearFilter] = useState('');
  const query = useFeeStructures({ academicYear: yearFilter || undefined });
  const create = useCreateFeeStructure();
  const update = useUpdateFeeStructure();
  const remove = useDeleteFeeStructure();
  const generate = useGenerateInvoices();
  const currency = useCurrency();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<FeeStructure | null>(null);
  const [generating, setGenerating] = useState<FeeStructure | null>(null);

  const structures = useMemo(
    () => [...(query.data?.items ?? [])].sort((a, b) => (a.classLevel?.name ?? '').localeCompare(b.classLevel?.name ?? '')),
    [query.data]
  );

  const openForm = (structure?: FeeStructure) => {
    setEditing(structure ?? null);
    setForm(structure ? toForm(structure) : { ...EMPTY_FORM, academicYear: yearFilter });
    setErrors([]);
    setOpen(true);
  };

  const save = async () => {
    const problems = validate(form);
    setErrors(problems);
    if (problems.length) return;
    try {
      if (editing) {
        // year and class level are fixed once a structure exists
        const payload = toPayload(form);
        delete payload.academicYear;
        delete payload.classLevel;
        await update.mutateAsync({ id: editing._id, payload });
      } else {
        await create.mutateAsync(toPayload(form));
      }
      setOpen(false);
    } catch {

      // toast shown by the hook
    }};

  return (
    <>
      <PageHeader
        title="Fee Structures"
        description="What each class level pays in an academic year, and when. Invoices copy the structure, so later edits do not change issued invoices."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Finance' }, { label: 'Fee Structures' }]}
        actions={<Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => openForm()}>New structure</Button>} />


      <div className="mb-4 w-full sm:w-64">
        <Select id="fs-filter-year" label="Academic year" options={(years.data?.items ?? []).map((y) => ({ value: y._id, label: y.name }))} placeholder="All years" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} />
      </div>

      {query.isError ?
      <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card> :
      query.isLoading ?
      <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div> :
      structures.length === 0 ?
      <Card><EmptyState title="No fee structures yet" description="Create one per class level to start issuing invoices." /></Card> :

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {structures.map((s) =>
        <Card key={s._id} as="article" className="flex flex-col">
              <CardBody className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 dir="auto" className="truncate text-[15px] font-bold text-ink-900">{s.classLevel?.name ?? 'Class level'}</h2>
                    <p className="text-[12.5px] text-ink-500">{s.academicYear?.name}{s.name ? ` · ${s.name}` : ''}</p>
                  </div>
                  {!s.isActive && <Badge tone="neutral">Inactive</Badge>}
                </div>
                <ul className="mt-3 space-y-1 text-[13px]">
                  {s.items.map((item) =>
              <li key={item.feeItem?._id} className="flex justify-between gap-2">
                      <span dir="auto" className="text-ink-600">{item.feeItem?.name}</span>
                      <span className="font-mono text-ink-800">{formatMoney(item.amount, currency)}</span>
                    </li>
              )}
                </ul>
                <p className="mt-2 flex justify-between border-t border-ink-100 pt-2 text-[13.5px] font-bold text-ink-900">
                  <span>Total</span><span className="font-mono">{formatMoney(s.total, currency)}</span>
                </p>
                <p className="mt-3 text-[12px] text-ink-500">
                  {s.installments.map((i) => `${i.label}: ${i.percentage}% by ${formatDate(i.dueDate)}`).join(' · ')}
                </p>
              </CardBody>
              <div className="flex flex-wrap gap-1 border-t border-ink-100 px-4 py-2.5">
                <Button size="sm" icon={<FileStackIcon className="h-3.5 w-3.5" aria-hidden="true" />} disabled={!s.isActive} onClick={() => setGenerating(s)}>
                  Issue invoices
                </Button>
                <Button size="sm" variant="ghost" icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => openForm(s)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-danger-500 hover:bg-danger-50" icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setDeleting(s)}>Delete</Button>
              </div>
            </Card>
        )}
        </div>
      }

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit fee structure' : 'New fee structure'}
        size="lg"
        footer={
        <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button isLoading={create.isPending || update.isPending} onClick={save}>{editing ? 'Save changes' : 'Create structure'}</Button>
          </>
        }>

        <StructureForm form={form} setForm={setForm} editing={Boolean(editing)} errors={errors} />
      </Modal>

      <ConfirmDialog
        open={Boolean(generating)}
        title="Issue invoices?"
        message={`One invoice will be issued for every student currently in ${generating?.classLevel?.name ?? 'this level'} for ${generating?.academicYear?.name ?? 'this year'}. Students who already have an invoice for that year are skipped.`}
        confirmLabel="Issue invoices"
        isLoading={generate.isPending}
        onCancel={() => setGenerating(null)}
        onConfirm={async () => {
          if (!generating) return;
          try {
            await generate.mutateAsync({ academicYear: generating.academicYear._id, classLevel: generating.classLevel._id });
          } catch {

            // toast shown by the hook
          }setGenerating(null);
        }} />


      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete fee structure?"
        message="Only possible when no invoice was issued from it. Otherwise make it inactive instead."
        confirmLabel="Delete"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {await remove.mutateAsync(deleting._id);} catch {/* toast */}
          setDeleting(null);
        }} />

    </>);

}
