import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { useCreateExpense, useDeleteExpense, useExpenses, useUpdateExpense } from '../../hooks/finance';
import type { Expense } from '../../types/finance';

export function AdminExpenses() {
  const query = useExpenses(); const create = useCreateExpense(); const update = useUpdateExpense(); const remove = useDeleteExpense();
  return <CrudResourcePage<Expense> title="Expenses" description="Record and maintain school expenses." entityName="Expense" query={query} rowKey={(row) => row._id} searchAccessor={(row) => Object.values(row).filter((value) => typeof value === 'string' || typeof value === 'number').join(' ')} isSaving={create.isPending || update.isPending} isDeleting={remove.isPending} emptyDescription="Record your first expense to keep school spending organized." columns={[
    { key: 'name', header: 'Name', render: (row) => <span className="font-semibold text-ink-900">{String(row.name ?? row.title ?? '—')}</span> },
    { key: 'amount', header: 'Amount', render: (row) => String(row.amount ?? '—') },
    { key: 'category', header: 'Category', render: (row) => String(row.category ?? '—') },
    { key: 'date', header: 'Date', render: (row) => String(row.date ?? row.createdAt ?? '—') },
    { key: 'description', header: 'Description', render: (row) => String(row.description ?? '—') }
  ]} fields={[{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'amount', label: 'Amount', type: 'text' }, { name: 'category', label: 'Category', type: 'text' }, { name: 'date', label: 'Date', type: 'text' }, { name: 'description', label: 'Description', type: 'textarea' }]} toFormValues={(row) => ({ name: String(row.name ?? row.title ?? ''), amount: String(row.amount ?? ''), category: String(row.category ?? ''), date: String(row.date ?? ''), description: String(row.description ?? '') })} onCreate={(values) => create.mutateAsync(Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '')))} onUpdate={(row, values) => update.mutateAsync({ id: row._id, payload: Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '')) })} onDelete={(row) => remove.mutateAsync(row._id)} renderDetails={(row) => <dl className="space-y-3 text-sm">{Object.entries(row).filter(([key]) => key !== '_id').map(([key, value]) => <div key={key}><dt className="font-bold capitalize text-ink-500">{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd className="mt-1 text-ink-700">{String(value ?? '—')}</dd></div>)}</dl>} />;
}