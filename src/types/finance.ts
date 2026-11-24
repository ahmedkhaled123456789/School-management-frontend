import type { Timestamped } from './common';

/* All amounts below are major units (pounds); the backend stores piasters. */

interface NamedRef {
  _id: string;
  name?: string;
}

export interface FeeItem extends Timestamped {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface FeeItemPayload {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

export interface StructureInstallment {
  label: string;
  dueDate: string;
  percentage: number;
}

export interface FeeStructure extends Timestamped {
  _id: string;
  name?: string;
  academicYear: NamedRef;
  classLevel: NamedRef;
  items: Array<{feeItem: NamedRef & {code?: string;};amount: number;}>;
  installments: StructureInstallment[];
  total: number;
  isActive: boolean;
}

export interface FeeStructurePayload {
  name?: string;
  academicYear?: string;
  classLevel?: string;
  items?: Array<{feeItem: string;amount: number;}>;
  installments?: StructureInstallment[];
  isActive?: boolean;
}

export type DiscountKind = 'sibling' | 'scholarship' | 'staff_child' | 'other';
export type DiscountType = 'percentage' | 'fixed';

export interface Discount extends Timestamped {
  _id: string;
  name: string;
  kind: DiscountKind;
  type: DiscountType;
  value: number;
  description?: string;
  isActive: boolean;
}

export interface DiscountPayload {
  name?: string;
  kind?: DiscountKind;
  type?: DiscountType;
  value?: number;
  description?: string;
  isActive?: boolean;
}

export type InvoiceStatus = 'issued' | 'partially_paid' | 'paid' | 'cancelled';

export interface InvoiceInstallment {
  _id: string;
  label: string;
  dueDate: string;
  percentage: number;
  amount: number;
  paid: number;
  due: number;
  isOverdue: boolean;
}

export interface Invoice extends Timestamped {
  _id: string;
  invoiceNumber: string;
  student: string;
  studentName?: string;
  studentCode?: string;
  academicYear?: NamedRef | null;
  classLevel?: NamedRef | null;
  lines: Array<{feeItem?: string;name: string;amount: number;}>;
  discounts: Array<{_id: string;discount?: string;name: string;type: DiscountType;value: number;amount: number;}>;
  subtotal: number;
  discountTotal: number;
  total: number;
  paid: number;
  balance: number;
  overdueAmount: number;
  installments: InvoiceInstallment[];
  status: InvoiceStatus;
  isCancelled: boolean;
  cancelReason?: string;
  cancelledAt?: string;
  issuedAt: string;
  notes?: string;
  /** Included by the detail endpoints. */
  payments?: Payment[];
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'vodafone_cash' | 'instapay' | 'other';

export interface Payment extends Timestamped {
  _id: string;
  receiptNumber: string;
  invoice: string | (Pick<Invoice, '_id' | 'invoiceNumber' | 'studentName' | 'studentCode'> & Partial<Invoice>);
  student: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt: string;
  notes?: string;
  receivedBy?: {id?: string;name?: string;};
  status: 'valid' | 'voided';
  voidReason?: string;
  voidedAt?: string;
}

export interface PaymentPayload {
  invoice: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  paidAt?: string;
  notes?: string;
}

export interface OutstandingReport {
  invoices: Invoice[];
  count: number;
  totalBalance: number;
  totalOverdue: number;
}

export interface CollectionsReport {
  total: number;
  count: number;
  byMethod: Array<{method: PaymentMethod;total: number;count: number;}>;
  byDay: Array<{date: string;total: number;count: number;}>;
}

export interface Expense extends Timestamped {
  _id: string;
  name: string;
  expensesType: string;
  amount: number;
  date: string;
  description?: string;
  phone?: string;
  status?: boolean;
}

export interface ExpensePayload {
  name: string;
  expensesType: string;
  amount: number;
  date: string;
  description?: string;
  phone?: string;
}
