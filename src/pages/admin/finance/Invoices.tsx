import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Pagination } from '../../../components/ui/Pagination';
import { SearchInput } from '../../../components/ui/SearchInput';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Select } from '../../../components/ui/Select';
import { DataTable, type Column } from '../../../components/ui/Table';
import { useAcademicYears } from '../../../hooks/academicYears';
import { useClassLevels } from '../../../hooks/classes';
import { useCreateInvoice, useCurrency, useInvoices } from '../../../hooks/finance';
import { useSettings } from '../../../hooks/staff';
import { useStudents } from '../../../hooks/students';
import type { Invoice, InvoiceStatus } from '../../../types/finance';
import { formatDate } from '../../../utils/format';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE, formatMoney } from '../../../utils/money';

const PAGE_SIZE = 15;
const STATUS_OPTIONS = (Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map((value) => ({ value, label: INVOICE_STATUS_LABEL[value] }));

/** Issue one invoice for one student (e.g. a late registration). */
function IssueInvoiceModal({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const navigate = useNavigate();
  const settings = useSettings();
  const years = useAcademicYears();
  const [search, setSearch] = useState('');
  const students = useStudents({ name: search || undefined, limit: 20 });
  const create = useCreateInvoice();
  const [student, setStudent] = useState('');
  const currentYear = typeof settings.data?.currentAcademicYear === 'object' ? settings.data?.currentAcademicYear?._id : settings.data?.currentAcademicYear;
  const [year, setYear] = useState('');
  const academicYear = year || currentYear || '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue an invoice"
      description="Uses the fee structure of the student's current class level for that year."
      footer={
      <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
          disabled={!student || !academicYear}
          isLoading={create.isPending}
          onClick={async () => {
            try {
              const invoice = await create.mutateAsync({ student, academicYear });
              onClose();
              navigate(`/admin/finance/invoices/${invoice._id}`);
            } catch {/* toast */}
          }}>

            Issue invoice
          </Button>
        </>
      }>

      <div className="space-y-4">
        <SearchableSelect
          id="issue-student"
          label="Student"
          options={(students.data?.items ?? []).map((s) => ({ value: s._id, label: s.name, description: s.studentId }))}
          value={student}
          onChange={setStudent}
          onSearchChange={setSearch}
          isLoading={students.isFetching} />

        <Select
          id="issue-year"
          label="Academic year"
          options={(years.data?.items ?? []).map((y) => ({ value: y._id, label: y.name }))}
          value={academicYear}
          onChange={(e) => setYear(e.target.value)} />

      </div>
    </Modal>);

}

export function AdminInvoices() {
  const currency = useCurrency();
  const years = useAcademicYears();
  const levels = useClassLevels();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [issuing, setIssuing] = useState(false);

  const query = useInvoices({
    page,
    limit: PAGE_SIZE,
    q: q || undefined,
    status: status || undefined,
    academicYear: academicYear || undefined,
    classLevel: classLevel || undefined
  });
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {setter(value);setPage(1);};

  const columns: Array<Column<Invoice>> = [
  {
    key: 'number',
    header: 'Invoice',
    render: (row) =>
    <Link to={`/admin/finance/invoices/${row._id}`} className="font-mono text-[13px] font-semibold text-primary-600 hover:underline">
          {row.invoiceNumber}
        </Link>

  },
  {
    key: 'student',
    header: 'Student',
    render: (row) =>
    <div className="min-w-0">
          <p dir="auto" className="truncate font-semibold text-ink-900">{row.studentName}</p>
          <p className="font-mono text-[12px] text-ink-500">{row.studentCode}</p>
        </div>

  },
  { key: 'class', header: 'Class', render: (row) => <span>{row.classLevel?.name ?? '—'}<span className="block text-[12px] text-ink-500">{row.academicYear?.name}</span></span> },
  { key: 'total', header: 'Total', align: 'right', render: (row) => <span className="font-mono">{formatMoney(row.total, currency)}</span> },
  { key: 'paid', header: 'Paid', align: 'right', render: (row) => <span className="font-mono text-success-600">{formatMoney(row.paid, currency)}</span> },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (row) =>
    <span className="font-mono font-semibold">
          {formatMoney(row.balance, currency)}
          {row.overdueAmount > 0 && <span className="block text-[11.5px] font-semibold text-danger-500">{formatMoney(row.overdueAmount, currency)} overdue</span>}
        </span>

  },
  { key: 'status', header: 'Status', render: (row) => <Badge tone={INVOICE_STATUS_TONE[row.status]}>{INVOICE_STATUS_LABEL[row.status]}</Badge> },
  { key: 'issued', header: 'Issued', render: (row) => <span className="whitespace-nowrap">{formatDate(row.issuedAt)}</span> }];


  return (
    <>
      <PageHeader
        title="Invoices"
        description="One invoice per student per academic year, paid in installments. Issue them in bulk from Fee Structures, or one by one here."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Finance' }, { label: 'Invoices' }]}
        actions={<Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setIssuing(true)}>Issue invoice</Button>} />


      <Card>
        <div className="grid gap-3 border-b border-ink-100 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <SearchInput value={q} onChange={resetPage(setQ)} placeholder="Invoice no., student name or ID…" className="sm:w-full" />
          <Select id="inv-status" label="Status" options={STATUS_OPTIONS} placeholder="All statuses" value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} />
          <Select id="inv-year" label="Academic year" options={(years.data?.items ?? []).map((y) => ({ value: y._id, label: y.name }))} placeholder="All years" value={academicYear} onChange={(e) => resetPage(setAcademicYear)(e.target.value)} />
          <Select id="inv-level" label="Class level" options={(levels.data?.items ?? []).map((l) => ({ value: l._id, label: l.name }))} placeholder="All levels" value={classLevel} onChange={(e) => resetPage(setClassLevel)(e.target.value)} />
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
          emptyTitle="No invoices found"
          emptyDescription="Issue invoices from a fee structure, or one by one with “Issue invoice”." />

        {(query.data?.total ?? 0) > PAGE_SIZE &&
        <Pagination page={page} limit={PAGE_SIZE} total={query.data?.total ?? 0} resultCount={query.data?.items.length ?? 0} hasNext={Boolean(query.data?.next)} hasPrevious={Boolean(query.data?.previous)} onPageChange={setPage} isFetching={query.isFetching} />
        }
      </Card>

      {issuing && <IssueInvoiceModal open={issuing} onClose={() => setIssuing(false)} />}
    </>);

}
