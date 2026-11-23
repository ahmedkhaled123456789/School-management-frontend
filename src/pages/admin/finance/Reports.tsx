import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { useAcademicYears } from '../../../hooks/academicYears';
import { useClassLevels } from '../../../hooks/classes';
import { useCollectionsReport, useCurrency, useOutstandingReport } from '../../../hooks/finance';
import { formatDate } from '../../../utils/format';
import { PAYMENT_METHOD_LABEL, formatMoney, todayInput } from '../../../utils/money';

const firstOfMonth = () => `${todayInput().slice(0, 8)}01`;

function Stat({ label, value, tone = 'text-ink-900' }: {label: string;value: string;tone?: string;}) {
  return (
    <div className="rounded-lg bg-ink-50 px-4 py-3">
      <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-1 break-words font-mono text-[20px] font-extrabold ${tone}`}>{value}</p>
    </div>);

}

function OutstandingSection() {
  const currency = useCurrency();
  const years = useAcademicYears();
  const levels = useClassLevels();
  const [academicYear, setAcademicYear] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(true);
  const report = useOutstandingReport({
    academicYear: academicYear || undefined,
    classLevel: classLevel || undefined,
    overdueOnly: overdueOnly ? 'true' : 'false'
  });
  const data = report.data;

  return (
    <Card>
      <CardHeader title="Outstanding balances" description="Who still owes money, largest overdue amount first." />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
          <Select id="out-year" label="Academic year" options={(years.data?.items ?? []).map((y) => ({ value: y._id, label: y.name }))} placeholder="All years" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          <Select id="out-level" label="Class level" options={(levels.data?.items ?? []).map((l) => ({ value: l._id, label: l.name }))} placeholder="All levels" value={classLevel} onChange={(e) => setClassLevel(e.target.value)} />
          <label className="flex h-10 items-center gap-2 text-[13.5px] text-ink-700">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            Overdue only
          </label>
        </div>
        {report.isError ?
        <ErrorState error={report.error} onRetry={() => report.refetch()} /> :
        !data ?
        <SkeletonText lines={5} /> :

        <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Students" value={String(data.count)} />
              <Stat label="Overdue" value={formatMoney(data.totalOverdue, currency)} tone="text-danger-500" />
              <Stat label="Total balance" value={formatMoney(data.totalBalance, currency)} />
            </div>
            {data.invoices.length === 0 ?
          <EmptyState title="Nothing outstanding" description="Every invoice in this selection is paid on time." /> :

          <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full min-w-[640px] text-start text-[13.5px]">
                  <thead className="bg-ink-50 text-[11.5px] font-bold uppercase tracking-wider text-ink-500">
                    <tr>{['Student', 'Class', 'Invoice', 'Oldest overdue', 'Overdue', 'Balance'].map((h) => <th key={h} className="px-3 py-2 text-start">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {data.invoices.map((invoice) => {
                  const oldest = invoice.installments.find((i) => i.isOverdue);
                  return (
                    <tr key={invoice._id}>
                          <td className="px-3 py-2"><span dir="auto" className="font-semibold text-ink-900">{invoice.studentName}</span><span className="block font-mono text-[12px] text-ink-500">{invoice.studentCode}</span></td>
                          <td className="px-3 py-2">{invoice.classLevel?.name ?? '—'}</td>
                          <td className="px-3 py-2"><Link to={`/admin/finance/invoices/${invoice._id}`} className="font-mono text-primary-600 hover:underline">{invoice.invoiceNumber}</Link></td>
                          <td className="px-3 py-2">{oldest ? formatDate(oldest.dueDate) : '—'}</td>
                          <td className="px-3 py-2 font-mono font-semibold text-danger-500">{formatMoney(invoice.overdueAmount, currency)}</td>
                          <td className="px-3 py-2 font-mono">{formatMoney(invoice.balance, currency)}</td>
                        </tr>);

                })}
                  </tbody>
                </table>
              </div>
          }
          </>
        }
      </CardBody>
    </Card>);

}

function CollectionsSection() {
  const currency = useCurrency();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayInput());
  const report = useCollectionsReport({ from: from || undefined, to: to || undefined });
  const data = report.data;
  const max = Math.max(1, ...(data?.byMethod ?? []).map((m) => m.total));

  return (
    <Card>
      <CardHeader title="Collections" description="Money received in a period (voided payments excluded)." />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="col-from" label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input id="col-to" label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {report.isError ?
        <ErrorState error={report.error} onRetry={() => report.refetch()} /> :
        !data ?
        <SkeletonText lines={4} /> :

        <>
            {/* stacked: this card is narrow and amounts can be long */}
            <div className="grid gap-3">
              <Stat label="Collected" value={formatMoney(data.total, currency)} tone="text-success-600" />
              <Stat label="Payments" value={String(data.count)} />
            </div>
            {data.byMethod.length === 0 ?
          <p className="text-[13.5px] text-ink-500">No payments in this period.</p> :

          <ul className="space-y-2.5" aria-label="By payment method">
                {data.byMethod.map((row) =>
            <li key={row.method}>
                    <div className="flex justify-between text-[13px]">
                      <span className="font-semibold text-ink-800">{PAYMENT_METHOD_LABEL[row.method]} <span className="font-normal text-ink-500">· {row.count}</span></span>
                      <span className="font-mono">{formatMoney(row.total, currency)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-ink-100">
                      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${row.total / max * 100}%` }} />
                    </div>
                  </li>
            )}
              </ul>
          }
            {data.byDay.length > 0 &&
          <details className="text-[13px]">
                <summary className="cursor-pointer font-semibold text-primary-600">By day ({data.byDay.length})</summary>
                <ul className="mt-2 divide-y divide-ink-100">
                  {data.byDay.map((day) =>
              <li key={day.date} className="flex justify-between py-1.5"><span>{formatDate(day.date)} · {day.count}</span><span className="font-mono">{formatMoney(day.total, currency)}</span></li>
              )}
                </ul>
              </details>
          }
          </>
        }
      </CardBody>
    </Card>);

}

export function AdminFinanceReports() {
  return (
    <>
      <PageHeader
        title="Finance Reports"
        description="Outstanding balances and money collected."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Finance' }, { label: 'Reports' }]} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><OutstandingSection /></div>
        <CollectionsSection />
      </div>
    </>);

}
