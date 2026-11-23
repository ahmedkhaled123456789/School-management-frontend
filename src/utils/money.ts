import type { InvoiceStatus, PaymentMethod } from '../types/finance';

/** 12500.5 => "EGP 12,500.50" (currency from the school settings). */
export function formatMoney(amount: number | null | undefined, currency = 'EGP'): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** "12.5" / "12.50" ok; "12.505", "-1", "abc" => null */
export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  vodafone_cash: 'Vodafone Cash',
  instapay: 'InstaPay',
  other: 'Other'
};

export const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABEL[value]
}));

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  issued: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  cancelled: 'Cancelled'
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, 'neutral' | 'success' | 'danger' | 'warn' | 'info' | 'accent'> = {
  issued: 'warn',
  partially_paid: 'info',
  paid: 'success',
  cancelled: 'neutral'
};

/** today as yyyy-mm-dd (local time) for <input type="date"> */
export function todayInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
