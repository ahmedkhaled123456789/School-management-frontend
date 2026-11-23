import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { useCreateExpense, useCurrency, useDeleteExpense, useExpenses, useUpdateExpense } from '../../hooks/finance';
import type { Expense } from '../../types/finance';
import { formatDate } from '../../utils/format';
import { formatMoney, parseAmount, todayInput } from '../../utils/money';

const CATEGORY_HINT = 'e.g. Utilities, Maintenance, Supplies, Salaries, Marketing';

/** Fixed: the form now sends the fields the backend expects (expensesType, date). */
export function AdminExpenses() {
  const query = useExpenses();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();
  const currency = useCurrency();

  const toPayload = (values: Record<string, string>) => ({
    name: values.name.trim(),
    expensesType: values.expensesType.trim(),
    amount: parseAmount(values.amount) ?? 0,
    date: values.date || todayInput(),
    description: values.description.trim(),
    phone: values.phone.trim() || undefined
  });

  return <CrudResourcePage<Expense>
    title="Expenses"
    description="Money the school spends, by category."
    entityName="Expense"
    query={query}
    rowKey={(row) => row._id}
    searchAccessor={(row) => `${row.name} ${row.expensesType} ${row.description ?? ''}`}
    isSaving={create.isPending || update.isPending}
    isDeleting={remove.isPending}
    emptyDescription="Record your first expense to keep school spending organized."
    columns={[
    { key: 'name', header: 'Name', render: (row) => <span dir="auto" className="font-semibold text-ink-900">{row.name}</span> },
    { key: 'category', header: 'Category', render: (row) => <span dir="auto">{row.expensesType || '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="font-mono">{formatMoney(row.amount, currency)}</span> },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'description', header: 'Description', render: (row) => <span dir="auto">{row.description || '—'}</span> }]
    }
    fields={[
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. November electricity' },
    { name: 'expensesType', label: 'Category', type: 'text', required: true, hint: CATEGORY_HINT },
    { name: 'amount', label: `Amount (${currency})`, type: 'number', required: true, validate: (value) => parseAmount(value) === null ? 'Enter an amount with up to 2 decimals.' : undefined },
    { name: 'date', label: 'Date (yyyy-mm-dd)', type: 'text', placeholder: todayInput(), hint: 'Leave empty for today.', validate: (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) ? undefined : 'Use yyyy-mm-dd.' },
    { name: 'phone', label: 'Payee phone', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' }]
    }
    toFormValues={(row) => ({
      name: row.name ?? '',
      expensesType: row.expensesType ?? '',
      amount: String(row.amount ?? ''),
      date: (row.date ?? '').slice(0, 10),
      phone: row.phone ?? '',
      description: row.description ?? ''
    })}
    onCreate={(values) => create.mutateAsync(toPayload(values))}
    onUpdate={(row, values) => update.mutateAsync({ id: row._id, payload: toPayload(values) })}
    onDelete={(row) => remove.mutateAsync(row._id)} />;

}
