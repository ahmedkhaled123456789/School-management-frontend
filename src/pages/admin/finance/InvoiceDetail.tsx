import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BanIcon, PrinterIcon, ReceiptIcon, XIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { Textarea } from '../../../components/ui/Textarea';
import {
  useApplyInvoiceDiscount,
  useCancelInvoice,
  useCurrency,
  useDiscounts,
  useInvoice,
  useRecordPayment,
  useRemoveInvoiceDiscount,
  useVoidPayment } from
'../../../hooks/finance';
import type { Invoice, Payment, PaymentMethod } from '../../../types/finance';
import { formatDate, formatDateTime } from '../../../utils/format';
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_OPTIONS,
  formatMoney,
  parseAmount,
  todayInput } from
'../../../utils/money';

/* ---------------------------- record a payment ---------------------------- */

function RecordPaymentModal({ invoice, onClose, onRecorded }: {invoice: Invoice;onClose: () => void;onRecorded: (payment: Payment) => void;}) {
  const currency = useCurrency();
  const record = useRecordPayment();
  // suggest the next unpaid installment
  const next = invoice.installments.find((i) => i.due > 0);
  const [amount, setAmount] = useState(String(next?.due ?? invoice.balance));
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(todayInput());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const value = parseAmount(amount);
    if (!value || value <= 0) return setError('Enter a positive amount with up to 2 decimals.');
    if (value > invoice.balance) return setError(`The remaining balance is ${formatMoney(invoice.balance, currency)}.`);
    if (method !== 'cash' && !reference.trim()) return setError('Add the transfer / transaction reference.');
    setError('');
    try {
      // today => the server stamps the exact time; an earlier day => local noon
      // (a bare "yyyy-mm-dd" would be read as UTC midnight and show as 02:00)
      const when = paidAt && paidAt !== todayInput() ? new Date(`${paidAt}T12:00:00`).toISOString() : undefined;
      const result = await record.mutateAsync({ invoice: invoice._id, amount: value, method, reference: reference.trim(), paidAt: when, notes: notes.trim() });
      onRecorded(result.payment);
    } catch {/* toast */}
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record a payment"
      description={`${invoice.invoiceNumber} · ${invoice.studentName} · balance ${formatMoney(invoice.balance, currency)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={record.isPending} onClick={submit}>Record payment</Button></>}>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {next && <Button size="sm" variant="secondary" onClick={() => setAmount(String(next.due))}>{next.label}: {formatMoney(next.due, currency)}</Button>}
          <Button size="sm" variant="secondary" onClick={() => setAmount(String(invoice.balance))}>Full balance: {formatMoney(invoice.balance, currency)}</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="pay-amount" label={`Amount (${currency})`} inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select id="pay-method" label="Method" required options={PAYMENT_METHOD_OPTIONS} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} />
          <Input id="pay-reference" label="Reference" value={reference} placeholder={method === 'cash' ? 'Optional' : 'Transfer / transaction no.'} onChange={(e) => setReference(e.target.value)} />
          <Input id="pay-date" label="Payment date" type="date" max={todayInput()} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </div>
        <Textarea id="pay-notes" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {error && <p role="alert" className="text-[13px] font-medium text-danger-500">{error}</p>}
      </div>
    </Modal>);

}

/* ---------------------------- reason (void/cancel) ------------------------ */

function ReasonModal({ title, message, confirmLabel, isLoading, onClose, onConfirm }: {title: string;message: string;confirmLabel: string;isLoading: boolean;onClose: () => void;onConfirm: (reason: string) => void;}) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Back</Button><Button variant="danger" disabled={!reason.trim()} isLoading={isLoading} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button></>}>

      <p className="mb-3 text-[13.5px] text-ink-600">{message}</p>
      <Textarea id="reason" label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>);

}

/* -------------------------------------------------------------------------- */

export function AdminInvoiceDetail() {
  const { invoiceId = '' } = useParams();
  const query = useInvoice(invoiceId);
  const currency = useCurrency();
  const discounts = useDiscounts();
  const applyDiscount = useApplyInvoiceDiscount();
  const removeDiscount = useRemoveInvoiceDiscount();
  const cancel = useCancelInvoice();
  const voidPayment = useVoidPayment();

  const [paying, setPaying] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Payment | null>(null);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [discountId, setDiscountId] = useState('');

  const invoice = query.data;
  const money = (value: number) => formatMoney(value, currency);
  const open = invoice && !invoice.isCancelled;

  const discountOptions = useMemo(
    () => (discounts.data?.items ?? []).
    filter((d) => d.isActive && !invoice?.discounts.some((applied) => applied.discount === d._id)).
    map((d) => ({ value: d._id, label: `${d.name} (${d.type === 'percentage' ? `${d.value}%` : money(d.value)})` })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discounts.data, invoice, currency]
  );

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Invoices', to: '/admin/finance/invoices' }, { label: invoice?.invoiceNumber ?? 'Invoice' }];

  if (query.isError) {
    return <><PageHeader title="Invoice" breadcrumbs={breadcrumbs} /><Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card></>;
  }
  if (!invoice) {
    return <><PageHeader title="Loading invoice…" breadcrumbs={breadcrumbs} /><Card><CardBody><SkeletonText lines={8} /></CardBody></Card></>;
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.studentName} (${invoice.studentCode}) · ${invoice.classLevel?.name ?? ''} · ${invoice.academicYear?.name ?? ''}`}
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>
            <Link to={`/admin/finance/invoices/${invoice._id}/print`} target="_blank">
              <Button variant="secondary" icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />}>Print</Button>
            </Link>
            {open && invoice.balance > 0 &&
          <Button icon={<ReceiptIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setPaying(true)}>Record payment</Button>
          }
            {open && invoice.paid === 0 &&
          <Button variant="ghost" className="text-danger-500 hover:bg-danger-50" icon={<BanIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setCancelling(true)}>Cancel invoice</Button>
          }
          </>
        } />


      {invoice.isCancelled &&
      <p role="status" className="mb-5 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-[13.5px] text-ink-700">
          Cancelled on {formatDate(invoice.cancelledAt)}: {invoice.cancelReason}
        </p>
      }
      {lastReceipt &&
      <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-[13.5px] text-success-600">
          <span>Payment recorded — receipt <strong className="font-mono">{lastReceipt.receiptNumber}</strong>.</span>
          <Link to={`/admin/finance/payments/${lastReceipt._id}/print`} target="_blank"><Button size="sm" variant="secondary" icon={<PrinterIcon className="h-3.5 w-3.5" aria-hidden="true" />}>Print receipt</Button></Link>
        </div>
      }

      <section aria-label="Totals" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
        ['Total', money(invoice.total), 'text-ink-900'],
        ['Paid', money(invoice.paid), 'text-success-600'],
        ['Balance', money(invoice.balance), 'text-ink-900'],
        ['Overdue', money(invoice.overdueAmount), invoice.overdueAmount > 0 ? 'text-danger-500' : 'text-ink-400']].
        map(([label, value, tone]) =>
        <Card key={label}><CardBody>
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
            <p className={`mt-1 font-mono text-[20px] font-extrabold ${tone}`}>{value}</p>
          </CardBody></Card>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Fees" description={`Issued ${formatDate(invoice.issuedAt)}`} />
          <CardBody className="space-y-2 text-[13.5px]">
            {invoice.lines.map((line, i) =>
            <p key={i} className="flex justify-between gap-2"><span dir="auto" className="text-ink-600">{line.name}</span><span className="font-mono">{money(line.amount)}</span></p>
            )}
            <p className="flex justify-between gap-2 border-t border-ink-100 pt-2 font-semibold"><span>Subtotal</span><span className="font-mono">{money(invoice.subtotal)}</span></p>
            {invoice.discounts.map((d) =>
            <p key={d._id} className="flex items-center justify-between gap-2 text-success-600">
                <span dir="auto">{d.name}{d.type === 'percentage' ? ` (${d.value}%)` : ''}</span>
                <span className="flex items-center gap-1 font-mono">
                  − {money(d.amount)}
                  {open &&
                <button type="button" aria-label={`Remove ${d.name}`} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-danger-500" disabled={removeDiscount.isPending} onClick={() => removeDiscount.mutate({ id: invoice._id, entryId: d._id })}>
                      <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                }
                </span>
              </p>
            )}
            <p className="flex justify-between gap-2 border-t border-ink-100 pt-2 text-[15px] font-bold text-ink-900"><span>Total</span><span className="font-mono">{money(invoice.total)}</span></p>
            {open &&
            <div className="flex items-end gap-2 pt-3">
                <div className="min-w-0 flex-1">
                  <Select id="apply-discount" label="Apply a discount" options={discountOptions} placeholder={discounts.isLoading ? 'Loading…' : 'Choose a discount'} value={discountId} onChange={(e) => setDiscountId(e.target.value)} />
                </div>
                <Button variant="secondary" disabled={!discountId} isLoading={applyDiscount.isPending} onClick={async () => {
                try {await applyDiscount.mutateAsync({ id: invoice._id, discount: discountId });setDiscountId('');} catch {/* toast */}
              }}>Apply</Button>
              </div>
            }
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Installments" description="Payments fill the earliest installment first." />
          <CardBody className="space-y-2">
            {invoice.installments.map((i) =>
            <div key={i._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3.5 py-2.5 text-[13.5px]">
                <div>
                  <p dir="auto" className="font-semibold text-ink-900">{i.label} <span className="font-normal text-ink-500">· {i.percentage}%</span></p>
                  <p className="text-[12.5px] text-ink-500">Due {formatDate(i.dueDate)}</p>
                </div>
                <div className="text-end">
                  <p className="font-mono font-semibold">{money(i.amount)}</p>
                  {i.due === 0 ?
                <Badge tone="success">Paid</Badge> :
                i.isOverdue ?
                <Badge tone="danger">{money(i.due)} overdue</Badge> :
                <span className="text-[12px] text-ink-500">{money(i.due)} remaining</span>}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Payments" />
        {(invoice.payments ?? []).length === 0 ?
        <CardBody><p className="text-[13.5px] text-ink-500">No payments yet.</p></CardBody> :

        <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-[13.5px]">
              <thead className="bg-ink-50 text-[11.5px] font-bold uppercase tracking-wider text-ink-500">
                <tr>{['Receipt', 'Date', 'Method', 'Amount', 'Received by', 'Status', ''].map((h) => <th key={h} className="px-4 py-2.5 text-start">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {(invoice.payments ?? []).map((p) =>
              <tr key={p._id} className={p.status === 'voided' ? 'text-ink-400' : ''}>
                    <td className="px-4 py-2.5 font-mono">{p.receiptNumber}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDateTime(p.paidAt)}</td>
                    <td className="px-4 py-2.5">{PAYMENT_METHOD_LABEL[p.method]}{p.reference ? <span className="block font-mono text-[12px] text-ink-500">{p.reference}</span> : null}</td>
                    <td className={`px-4 py-2.5 font-mono font-semibold ${p.status === 'voided' ? 'line-through' : ''}`}>{money(p.amount)}</td>
                    <td className="px-4 py-2.5">{p.receivedBy?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">{p.status === 'voided' ? <span title={p.voidReason}><Badge tone="neutral">Voided</Badge></span> : <Badge tone="success">Valid</Badge>}</td>
                    <td className="px-4 py-2.5 text-end">
                      {p.status === 'valid' &&
                  <div className="flex justify-end gap-1">
                          <Link to={`/admin/finance/payments/${p._id}/print`} target="_blank"><Button size="sm" variant="ghost">Receipt</Button></Link>
                          <Button size="sm" variant="ghost" className="text-danger-500 hover:bg-danger-50" onClick={() => setVoiding(p)}>Void</Button>
                        </div>
                  }
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </Card>

      {paying &&
      <RecordPaymentModal invoice={invoice} onClose={() => setPaying(false)} onRecorded={(payment) => {setPaying(false);setLastReceipt(payment);}} />
      }
      {voiding &&
      <ReasonModal
        title={`Void receipt ${voiding.receiptNumber}?`}
        message={`${money(voiding.amount)} goes back to the invoice balance. The payment stays in the history as voided.`}
        confirmLabel="Void payment"
        isLoading={voidPayment.isPending}
        onClose={() => setVoiding(null)}
        onConfirm={async (reason) => {
          try {await voidPayment.mutateAsync({ id: voiding._id, reason });setVoiding(null);setLastReceipt(null);} catch {/* toast */}
        }} />
      }
      {cancelling &&
      <ReasonModal
        title="Cancel this invoice?"
        message="A new invoice can be issued for this student and year afterwards."
        confirmLabel="Cancel invoice"
        isLoading={cancel.isPending}
        onClose={() => setCancelling(false)}
        onConfirm={async (reason) => {
          try {await cancel.mutateAsync({ id: invoice._id, reason });setCancelling(false);} catch {/* toast */}
        }} />
      }
    </>);

}
