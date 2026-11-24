import { CrudResourcePage } from '../../../components/admin/CrudResourcePage';
import { Badge } from '../../../components/ui/Badge';
import { useCreateDiscount, useCurrency, useDeleteDiscount, useDiscounts, useUpdateDiscount } from '../../../hooks/finance';
import type { Discount, DiscountKind, DiscountType } from '../../../types/finance';
import { formatMoney, parseAmount } from '../../../utils/money';

const KIND_OPTIONS: Array<{value: DiscountKind;label: string;}> = [
{ value: 'sibling', label: 'Sibling discount' },
{ value: 'scholarship', label: 'Scholarship' },
{ value: 'staff_child', label: 'Staff child' },
{ value: 'other', label: 'Other' }];

const KIND_LABEL = Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label])) as Record<DiscountKind, string>;

const TYPE_OPTIONS = [
{ value: 'percentage', label: 'Percentage of the invoice' },
{ value: 'fixed', label: 'Fixed amount' }];


const ACTIVE_OPTIONS = [
{ value: 'true', label: 'Active' },
{ value: 'false', label: 'Inactive' }];


export function AdminDiscounts() {
  const query = useDiscounts();
  const create = useCreateDiscount();
  const update = useUpdateDiscount();
  const remove = useDeleteDiscount();
  const currency = useCurrency();

  const describe = (row: Discount) => row.type === 'percentage' ? `${row.value}%` : formatMoney(row.value, currency);

  const validateValue = (value: string, values: Record<string, string>) => {
    if (values.type === 'percentage') {
      const pct = Number(value);
      return pct > 0 && pct <= 100 ? undefined : 'Enter a percentage between 0 and 100.';
    }
    const amount = parseAmount(value);
    return amount && amount > 0 ? undefined : 'Enter a positive amount with up to 2 decimals.';
  };

  const toPayload = (values: Record<string, string>) => ({
    name: values.name.trim(),
    kind: (values.kind || 'other') as DiscountKind,
    type: values.type as DiscountType,
    value: Number(values.value),
    description: values.description.trim(),
    isActive: values.isActive !== 'false'
  });

  return <CrudResourcePage<Discount>
    title="Discounts"
    description="Sibling discounts, scholarships and other reductions. Apply them from an invoice. Changing one here does not change invoices it is already on."
    entityName="Discount"
    query={query}
    rowKey={(row) => row._id}
    searchAccessor={(row) => `${row.name} ${KIND_LABEL[row.kind]} ${row.description ?? ''}`}
    isSaving={create.isPending || update.isPending}
    isDeleting={remove.isPending}
    emptyDescription="Add a sibling discount or a scholarship."
    columns={[
    { key: 'name', header: 'Name', render: (row) => <span dir="auto" className="font-semibold text-ink-900">{row.name}</span> },
    { key: 'kind', header: 'Kind', render: (row) => KIND_LABEL[row.kind] },
    { key: 'value', header: 'Value', render: (row) => <span className="font-mono font-semibold">{describe(row)}</span> },
    { key: 'status', header: 'Status', render: (row) => row.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge> }]
    }
    fields={[
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Second child 10%' },
    { name: 'kind', label: 'Kind', type: 'select', options: KIND_OPTIONS, placeholder: 'Other (default)' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: TYPE_OPTIONS },
    { name: 'value', label: 'Value', type: 'number', required: true, hint: `Percentage (e.g. 10) or amount in ${currency}.`, validate: validateValue },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'isActive', label: 'Status', type: 'select', options: ACTIVE_OPTIONS, placeholder: 'Active (default)' }]
    }
    toFormValues={(row) => ({
      name: row.name,
      kind: row.kind,
      type: row.type,
      value: String(row.value),
      description: row.description ?? '',
      isActive: String(row.isActive)
    })}
    onCreate={(values) => create.mutateAsync(toPayload(values))}
    onUpdate={(row, values) => update.mutateAsync({ id: row._id, payload: toPayload(values) })}
    onDelete={(row) => remove.mutateAsync(row._id)} />;

}
