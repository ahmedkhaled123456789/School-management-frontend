import { CrudResourcePage } from '../../../components/admin/CrudResourcePage';
import { Badge } from '../../../components/ui/Badge';
import { useCreateFeeItem, useDeleteFeeItem, useFeeItems, useUpdateFeeItem } from '../../../hooks/finance';
import type { FeeItem } from '../../../types/finance';

const ACTIVE_OPTIONS = [
{ value: 'true', label: 'Active' },
{ value: 'false', label: 'Inactive (hidden from new structures)' }];


/** Kinds of fees: tuition, bus, books, uniform, activities... */
export function AdminFeeItems() {
  const query = useFeeItems();
  const create = useCreateFeeItem();
  const update = useUpdateFeeItem();
  const remove = useDeleteFeeItem();

  return <CrudResourcePage<FeeItem>
    title="Fee Items"
    description="The kinds of fees the school charges. Fee structures combine them into what each class level pays."
    entityName="Fee item"
    query={query}
    rowKey={(row) => row._id}
    searchAccessor={(row) => `${row.name} ${row.code} ${row.description ?? ''}`}
    isSaving={create.isPending || update.isPending}
    isDeleting={remove.isPending}
    emptyDescription="Add tuition, books, bus or any other fee."
    columns={[
    { key: 'name', header: 'Name', render: (row) => <span dir="auto" className="font-semibold text-ink-900">{row.name}</span> },
    { key: 'code', header: 'Code', render: (row) => <code className="font-mono text-[12.5px]">{row.code}</code> },
    { key: 'description', header: 'Description', render: (row) => <span dir="auto">{row.description || '—'}</span> },
    { key: 'status', header: 'Status', render: (row) => row.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge> }]
    }
    fields={[
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Tuition' },
    { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. TUITION', hint: '2–20 letters, digits, "-" or "_".', validate: (value) => /^[A-Za-z0-9_-]{2,20}$/.test(value.trim()) ? undefined : 'Use 2–20 letters, digits, "-" or "_".' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'isActive', label: 'Status', type: 'select', options: ACTIVE_OPTIONS, placeholder: 'Active (default)' }]
    }
    toFormValues={(row) => ({ name: row.name, code: row.code, description: row.description ?? '', isActive: String(row.isActive) })}
    onCreate={(values) => create.mutateAsync({
      name: values.name.trim(),
      code: values.code.trim(),
      description: values.description.trim(),
      isActive: values.isActive !== 'false'
    })}
    onUpdate={(row, values) => update.mutateAsync({
      id: row._id,
      payload: {
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim(),
        isActive: values.isActive !== 'false'
      }
    })}
    onDelete={(row) => remove.mutateAsync(row._id)} />;

}
