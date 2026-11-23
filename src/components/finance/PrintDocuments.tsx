import React, { useEffect } from 'react';
import { PrinterIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import type { Invoice, Payment } from '../../types/finance';
import type { SchoolSettings } from '../../types/staff';
import { formatDate, formatDateTime } from '../../utils/format';
import { INVOICE_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatMoney } from '../../utils/money';

/** Toolbar + A4-like sheet. The toolbar is hidden when printing; use "Save as PDF" in the print dialog. */
export function PrintShell({
  title,
  isLoading,
  error,
  children





}: {title: string;isLoading?: boolean;error?: unknown;children?: React.ReactNode;}) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {document.title = previous;};
  }, [title]);

  return (
    <div className="min-h-screen bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[800px] items-center justify-between gap-3 px-4 print:hidden">
        <p className="text-[13px] text-ink-500">Tip: choose “Save as PDF” in the print dialog to get a PDF.</p>
        <Button icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />} disabled={isLoading || Boolean(error)} onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <article className="mx-auto max-w-[800px] bg-white p-8 shadow-card print:max-w-none print:p-0 print:shadow-none">
        {error ? <ErrorState error={error} /> : isLoading ? <SkeletonText lines={12} /> : children}
      </article>
    </div>);

}

function SchoolHeader({ settings, docTitle, docNumber }: {settings?: SchoolSettings;docTitle: string;docNumber: string;}) {
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
      <div className="flex items-center gap-3">
        {settings?.logo ? <img src={settings.logo} alt="" className="h-16 w-16 object-contain" /> : <div className="rounded bg-primary-800 p-2"><Logo imageClassName="h-12" /></div>}
        <div>
          <p dir="auto" className="text-[18px] font-extrabold text-ink-900">{settings?.schoolName}</p>
          <p dir="auto" className="text-[12px] text-ink-600">{settings?.address}</p>
          <p className="text-[12px] text-ink-600">{[settings?.phone, settings?.email].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="text-end">
        <p className="text-[20px] font-extrabold uppercase tracking-wide text-ink-900">{docTitle}</p>
        <p className="font-mono text-[14px] font-bold text-ink-800">{docNumber}</p>
      </div>
    </header>);

}

const Row = ({ label, value, strong }: {label: string;value: React.ReactNode;strong?: boolean;}) =>
<div className={`flex justify-between gap-4 py-1 ${strong ? 'border-t border-ink-300 pt-2 text-[15px] font-extrabold' : ''}`}>
    <span>{label}</span><span className="font-mono">{value}</span>
  </div>;


export function InvoiceDocument({ invoice, settings }: {invoice: Invoice;settings?: SchoolSettings;}) {
  const currency = settings?.currency ?? 'EGP';
  const money = (v: number) => formatMoney(v, currency);
  return (
    <div className="space-y-6 text-[13px] text-ink-800">
      <SchoolHeader settings={settings} docTitle="Invoice" docNumber={invoice.invoiceNumber} />
      <section className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Billed to</p>
          <p dir="auto" className="font-bold text-ink-900">{invoice.studentName}</p>
          <p className="font-mono">{invoice.studentCode}</p>
          <p>{invoice.classLevel?.name} · {invoice.academicYear?.name}</p>
        </div>
        <div className="text-end">
          <p>Issued: {formatDate(invoice.issuedAt)}</p>
          <p>Status: <strong>{INVOICE_STATUS_LABEL[invoice.status]}</strong></p>
        </div>
      </section>

      <section>
        <table className="w-full text-start">
          <thead><tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-500"><th className="py-1.5 text-start">Description</th><th className="py-1.5 text-end">Amount</th></tr></thead>
          <tbody>
            {invoice.lines.map((line, i) => <tr key={i} className="border-b border-ink-100"><td dir="auto" className="py-1.5">{line.name}</td><td className="py-1.5 text-end font-mono">{money(line.amount)}</td></tr>)}
          </tbody>
        </table>
        <div className="ms-auto mt-3 w-full max-w-xs">
          <Row label="Subtotal" value={money(invoice.subtotal)} />
          {invoice.discounts.map((d) => <Row key={d._id} label={`${d.name}${d.type === 'percentage' ? ` (${d.value}%)` : ''}`} value={`− ${money(d.amount)}`} />)}
          <Row label="Total" value={money(invoice.total)} strong />
          <Row label="Paid" value={money(invoice.paid)} />
          <Row label="Balance due" value={money(invoice.balance)} strong />
        </div>
      </section>

      <section>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-500">Payment schedule</p>
        <table className="w-full text-start">
          <thead><tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-500"><th className="py-1.5 text-start">Installment</th><th className="py-1.5 text-start">Due date</th><th className="py-1.5 text-end">Amount</th><th className="py-1.5 text-end">Remaining</th></tr></thead>
          <tbody>
            {invoice.installments.map((i) =>
            <tr key={i._id} className="border-b border-ink-100">
                <td dir="auto" className="py-1.5">{i.label}</td>
                <td className="py-1.5">{formatDate(i.dueDate)}</td>
                <td className="py-1.5 text-end font-mono">{money(i.amount)}</td>
                <td className="py-1.5 text-end font-mono">{i.due === 0 ? 'Paid' : money(i.due)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      {invoice.isCancelled && <p className="text-center text-[16px] font-extrabold uppercase text-danger-500">Cancelled — {invoice.cancelReason}</p>}
    </div>);

}

export function ReceiptDocument({ payment, invoice, settings }: {payment: Payment;invoice: Invoice;settings?: SchoolSettings;}) {
  const currency = settings?.currency ?? 'EGP';
  return (
    <div className="space-y-6 text-[13px] text-ink-800">
      <SchoolHeader settings={settings} docTitle="Receipt" docNumber={payment.receiptNumber} />
      {payment.status === 'voided' && <p className="text-center text-[16px] font-extrabold uppercase text-danger-500">Voided — {payment.voidReason}</p>}
      <p className="text-[14px]">
        Received from <strong dir="auto">{invoice.studentName}</strong> ({invoice.studentCode}) the amount of
      </p>
      <p className="text-center font-mono text-[28px] font-extrabold text-ink-900">{formatMoney(payment.amount, currency)}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        {[
        ['Date', formatDateTime(payment.paidAt)],
        ['Method', PAYMENT_METHOD_LABEL[payment.method]],
        ['Reference', payment.reference || '—'],
        ['For invoice', invoice.invoiceNumber],
        ['Academic year', `${invoice.classLevel?.name ?? ''} · ${invoice.academicYear?.name ?? ''}`],
        ['Remaining balance', formatMoney(invoice.balance, currency)],
        ['Received by', payment.receivedBy?.name ?? '—']].
        map(([label, value]) =>
        <div key={label}><dt className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</dt><dd dir="auto" className="font-semibold">{value}</dd></div>
        )}
      </dl>
      {payment.notes && <p dir="auto" className="text-ink-600">{payment.notes}</p>}
      <div className="flex justify-end pt-10"><p className="w-48 border-t border-ink-400 pt-1 text-center text-[12px] text-ink-500">Signature &amp; stamp</p></div>
    </div>);

}
