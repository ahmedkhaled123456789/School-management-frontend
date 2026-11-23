import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { useChildInvoices, useCurrency } from '../../hooks/finance';
import { formatDate } from '../../utils/format';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE, PAYMENT_METHOD_LABEL, formatMoney } from '../../utils/money';

/** Parent view of a child's invoices, installments and receipts (read only). */
export function ChildFees({ studentId }: {studentId: string;}) {
  const query = useChildInvoices(studentId);
  const currency = useCurrency();
  const money = (value: number) => formatMoney(value, currency);

  return (
    <Card className="mt-5">
      <CardHeader title="Fees" description="School fees, installments and your payments." />
      <CardBody className="space-y-5">
        {query.isError ?
        <ErrorState error={query.error} onRetry={() => query.refetch()} /> :
        query.isLoading ?
        <SkeletonText lines={4} /> :
        (query.data ?? []).length === 0 ?
        <p className="text-[13.5px] text-ink-500">No invoices yet.</p> :

        (query.data ?? []).map((invoice) =>
        <section key={invoice._id} aria-label={invoice.invoiceNumber} className="rounded-lg border border-ink-100">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
                <div>
                  <p className="font-mono text-[13px] font-bold text-ink-900">{invoice.invoiceNumber}</p>
                  <p className="text-[12.5px] text-ink-500">{invoice.academicYear?.name} · {invoice.classLevel?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>
                  <Link to={`/parent/children/${studentId}/invoices/${invoice._id}/print`} target="_blank" className="text-[13px] font-semibold text-primary-600 hover:underline">
                    Invoice
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 px-4 py-3 sm:grid-cols-3">
                {[
            ['Total', money(invoice.total), 'text-ink-900'],
            ['Paid', money(invoice.paid), 'text-success-600'],
            ['Remaining', money(invoice.balance), invoice.overdueAmount > 0 ? 'text-danger-500' : 'text-ink-900']].
            map(([label, value, tone]) =>
            <div key={label}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
                    <p className={`font-mono text-[16px] font-extrabold ${tone}`}>{value}</p>
                  </div>
            )}
              </div>
              <ul className="divide-y divide-ink-100 border-t border-ink-100 text-[13px]">
                {invoice.installments.map((i) =>
            <li key={i._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                    <span dir="auto">{i.label} · due {formatDate(i.dueDate)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{money(i.amount)}</span>
                      {i.due === 0 ? <Badge tone="success">Paid</Badge> : i.isOverdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="neutral">Upcoming</Badge>}
                    </span>
                  </li>
            )}
              </ul>
              {(invoice.payments ?? []).length > 0 &&
          <div className="border-t border-ink-100 px-4 py-3">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">Payments</p>
                  <ul className="space-y-1 text-[13px]">
                    {(invoice.payments ?? []).map((p) =>
              <li key={p._id} className="flex flex-wrap justify-between gap-2">
                        <span>{formatDate(p.paidAt)} · {PAYMENT_METHOD_LABEL[p.method]}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono">{money(p.amount)}</span>
                          <Link to={`/parent/children/${studentId}/receipts/${p._id}/print`} target="_blank" className="font-semibold text-primary-600 hover:underline">
                            Receipt
                          </Link>
                        </span>
                      </li>
              )}
                  </ul>
                </div>
          }
            </section>
        )
        }
      </CardBody>
    </Card>);

}
