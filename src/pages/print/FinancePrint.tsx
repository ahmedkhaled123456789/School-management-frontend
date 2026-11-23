import { useParams } from 'react-router-dom';
import { InvoiceDocument, PrintShell, ReceiptDocument } from '../../components/finance/PrintDocuments';
import { useChildInvoices, useInvoice, usePayment } from '../../hooks/finance';
import { useSettings } from '../../hooks/staff';

/* Admin / accountant */

export function AdminInvoicePrint() {
  const { invoiceId = '' } = useParams();
  const invoice = useInvoice(invoiceId);
  const settings = useSettings();
  return (
    <PrintShell title={invoice.data?.invoiceNumber ?? 'Invoice'} isLoading={!invoice.data} error={invoice.error}>
      {invoice.data && <InvoiceDocument invoice={invoice.data} settings={settings.data} />}
    </PrintShell>);

}

export function AdminReceiptPrint() {
  const { paymentId = '' } = useParams();
  const payment = usePayment(paymentId);
  const settings = useSettings();
  return (
    <PrintShell title={payment.data?.receiptNumber ?? 'Receipt'} isLoading={!payment.data} error={payment.error}>
      {payment.data && <ReceiptDocument payment={payment.data} invoice={payment.data.invoice} settings={settings.data} />}
    </PrintShell>);

}

/* Parent (only their own child's documents — checked by the backend) */

export function ParentInvoicePrint() {
  const { studentId = '', invoiceId = '' } = useParams();
  const invoices = useChildInvoices(studentId);
  const settings = useSettings();
  const invoice = invoices.data?.find((i) => i._id === invoiceId);
  const notFound = invoices.data && !invoice ? new Error('Invoice not found') : undefined;
  return (
    <PrintShell title={invoice?.invoiceNumber ?? 'Invoice'} isLoading={!invoice && !notFound} error={invoices.error ?? notFound}>
      {invoice && <InvoiceDocument invoice={invoice} settings={settings.data} />}
    </PrintShell>);

}

export function ParentReceiptPrint() {
  const { studentId = '', paymentId = '' } = useParams();
  const invoices = useChildInvoices(studentId);
  const settings = useSettings();
  const invoice = invoices.data?.find((i) => i.payments?.some((p) => p._id === paymentId));
  const payment = invoice?.payments?.find((p) => p._id === paymentId);
  const notFound = invoices.data && !payment ? new Error('Receipt not found') : undefined;
  return (
    <PrintShell title={payment?.receiptNumber ?? 'Receipt'} isLoading={!payment && !notFound} error={invoices.error ?? notFound}>
      {payment && invoice && <ReceiptDocument payment={payment} invoice={invoice} settings={settings.data} />}
    </PrintShell>);

}
