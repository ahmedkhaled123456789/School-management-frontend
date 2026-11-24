import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pagination } from '../../../components/ui/Pagination';
import { Select } from '../../../components/ui/Select';
import { DataTable, type Column } from '../../../components/ui/Table';
import { useCurrency, usePayments } from '../../../hooks/finance';
import type { Payment } from '../../../types/finance';
import { formatDateTime } from '../../../utils/format';
import { PAYMENT_METHOD_LABEL, PAYMENT_METHOD_OPTIONS, formatMoney } from '../../../utils/money';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [{ value: 'valid', label: 'Valid' }, { value: 'voided', label: 'Voided' }];

export function AdminPayments() {
  const currency = useCurrency();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ method: '', status: '', from: '', to: '' });
  const query = usePayments({
    page,
    limit: PAGE_SIZE,
    method: filters.method || undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined
  });
  const setFilter = (key: keyof typeof filters, value: string) => {setFilters((p) => ({ ...p, [key]: value }));setPage(1);};

  const invoiceOf = (row: Payment) => typeof row.invoice === 'object' ? row.invoice : null;

  const columns: Array<Column<Payment>> = [
  { key: 'receipt', header: 'Receipt', render: (row) => <span className="font-mono text-[13px] font-semibold">{row.receiptNumber}</span> },
  { key: 'date', header: 'Date', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.paidAt)}</span> },
  {
    key: 'student',
    header: 'Student / invoice',
    render: (row) => {
      const invoice = invoiceOf(row);
      return (
        <div className="min-w-0">
            <p dir="auto" className="truncate font-semibold text-ink-900">{invoice?.studentName ?? '—'}</p>
            {invoice && <Link to={`/admin/finance/invoices/${invoice._id}`} className="font-mono text-[12px] text-primary-600 hover:underline">{invoice.invoiceNumber}</Link>}
          </div>);

    }
  },
  { key: 'method', header: 'Method', render: (row) => <span>{PAYMENT_METHOD_LABEL[row.method]}{row.reference ? <span className="block font-mono text-[12px] text-ink-500">{row.reference}</span> : null}</span> },
  { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className={`font-mono font-semibold ${row.status === 'voided' ? 'text-ink-400 line-through' : ''}`}>{formatMoney(row.amount, currency)}</span> },
  { key: 'by', header: 'Received by', render: (row) => row.receivedBy?.name ?? '—' },
  { key: 'status', header: 'Status', render: (row) => row.status === 'voided' ? <span title={row.voidReason}><Badge tone="neutral">Voided</Badge></span> : <Badge tone="success">Valid</Badge> },
  {
    key: 'actions',
    header: '',
    align: 'right',
    render: (row) => row.status === 'valid' ?
    <Link to={`/admin/finance/payments/${row._id}/print`} target="_blank"><Button size="sm" variant="ghost">Receipt</Button></Link> :
    null
  }];


  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment received, with its receipt. Mistakes are voided from the invoice, never deleted."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Finance' }, { label: 'Payments' }]} />

      <Card>
        <div className="grid gap-3 border-b border-ink-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Select id="pay-f-method" label="Method" options={PAYMENT_METHOD_OPTIONS} placeholder="All methods" value={filters.method} onChange={(e) => setFilter('method', e.target.value)} />
          <Select id="pay-f-status" label="Status" options={STATUS_OPTIONS} placeholder="All" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} />
          <Input id="pay-f-from" label="From" type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          <Input id="pay-f-to" label="To" type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items ?? []}
          rowKey={(row) => row._id}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyTitle="No payments found"
          emptyDescription="Payments are recorded from an invoice." />

        {(query.data?.total ?? 0) > PAGE_SIZE &&
        <Pagination page={page} limit={PAGE_SIZE} total={query.data?.total ?? 0} resultCount={query.data?.items.length ?? 0} hasNext={Boolean(query.data?.next)} hasPrevious={Boolean(query.data?.previous)} onPageChange={setPage} isFetching={query.isFetching} />
        }
      </Card>
    </>);

}
