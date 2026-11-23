import { normalizeList, request, unwrap } from './client';
import type { ListParams, PaginatedResult } from '../types/common';
import type {
  CollectionsReport,
  Discount,
  DiscountPayload,
  Expense,
  ExpensePayload,
  FeeItem,
  FeeItemPayload,
  FeeStructure,
  FeeStructurePayload,
  Invoice,
  OutstandingReport,
  Payment,
  PaymentPayload } from
'../types/finance';

const F = '/finance';

/* ------------------------------- fee items -------------------------------- */

export const listFeeItems = (signal?: AbortSignal): Promise<PaginatedResult<FeeItem>> =>
request<unknown>(`${F}/fee-items`, { signal }).then(normalizeList<FeeItem>);
export const createFeeItem = async (payload: FeeItemPayload) =>
unwrap<FeeItem>(await request(`${F}/fee-items`, { method: 'POST', body: payload }));
export const updateFeeItem = async (id: string, payload: Partial<FeeItemPayload>) =>
unwrap<FeeItem>(await request(`${F}/fee-items/${id}`, { method: 'PUT', body: payload }));
export const deleteFeeItem = async (id: string) => {await request(`${F}/fee-items/${id}`, { method: 'DELETE' });};

/* ----------------------------- fee structures ----------------------------- */

export const listFeeStructures = (params: ListParams, signal?: AbortSignal): Promise<PaginatedResult<FeeStructure>> =>
request<unknown>(`${F}/fee-structures`, { params, signal }).then(normalizeList<FeeStructure>);
export const createFeeStructure = async (payload: FeeStructurePayload) =>
unwrap<FeeStructure>(await request(`${F}/fee-structures`, { method: 'POST', body: payload }));
export const updateFeeStructure = async (id: string, payload: FeeStructurePayload) =>
unwrap<FeeStructure>(await request(`${F}/fee-structures/${id}`, { method: 'PUT', body: payload }));
export const deleteFeeStructure = async (id: string) => {await request(`${F}/fee-structures/${id}`, { method: 'DELETE' });};

/* -------------------------------- discounts ------------------------------- */

export const listDiscounts = (signal?: AbortSignal): Promise<PaginatedResult<Discount>> =>
request<unknown>(`${F}/discounts`, { signal }).then(normalizeList<Discount>);
export const createDiscount = async (payload: DiscountPayload) =>
unwrap<Discount>(await request(`${F}/discounts`, { method: 'POST', body: payload }));
export const updateDiscount = async (id: string, payload: DiscountPayload) =>
unwrap<Discount>(await request(`${F}/discounts/${id}`, { method: 'PUT', body: payload }));
export const deleteDiscount = async (id: string) => {await request(`${F}/discounts/${id}`, { method: 'DELETE' });};

/* -------------------------------- invoices -------------------------------- */

export const listInvoices = (params: ListParams, signal?: AbortSignal): Promise<PaginatedResult<Invoice>> =>
request<unknown>(`${F}/invoices`, { params, signal }).then(normalizeList<Invoice>);
export const getInvoice = async (id: string, signal?: AbortSignal) =>
unwrap<Invoice>(await request(`${F}/invoices/${id}`, { signal }));
export const createInvoice = async (payload: {student: string;academicYear: string;}) =>
unwrap<Invoice>(await request(`${F}/invoices`, { method: 'POST', body: payload }));
export const generateInvoices = (payload: {academicYear: string;classLevel: string;}) =>
request<{message: string;data: {created: number;skipped: number;students: number;};}>(`${F}/invoices/generate`, { method: 'POST', body: payload });
export const applyInvoiceDiscount = async (id: string, discount: string) =>
unwrap<Invoice>(await request(`${F}/invoices/${id}/discounts`, { method: 'POST', body: { discount } }));
export const removeInvoiceDiscount = async (id: string, entryId: string) =>
unwrap<Invoice>(await request(`${F}/invoices/${id}/discounts/${entryId}`, { method: 'DELETE' }));
export const cancelInvoice = async (id: string, reason: string) =>
unwrap<Invoice>(await request(`${F}/invoices/${id}/cancel`, { method: 'POST', body: { reason } }));

/* -------------------------------- payments -------------------------------- */

export const listPayments = (params: ListParams, signal?: AbortSignal): Promise<PaginatedResult<Payment>> =>
request<unknown>(`${F}/payments`, { params, signal }).then(normalizeList<Payment>);
export const getPayment = async (id: string, signal?: AbortSignal) =>
unwrap<Payment & {invoice: Invoice;}>(await request(`${F}/payments/${id}`, { signal }));
export const createPayment = async (payload: PaymentPayload) =>
unwrap<{payment: Payment;invoice: Invoice;}>(await request(`${F}/payments`, { method: 'POST', body: payload }));
export const voidPayment = async (id: string, reason: string) =>
unwrap<{payment: Payment;invoice: Invoice;}>(await request(`${F}/payments/${id}/void`, { method: 'POST', body: { reason } }));

/* --------------------------------- reports -------------------------------- */

export const getOutstandingReport = async (params: ListParams, signal?: AbortSignal) =>
unwrap<OutstandingReport>(await request(`${F}/reports/outstanding`, { params, signal }));
export const getCollectionsReport = async (params: ListParams, signal?: AbortSignal) =>
unwrap<CollectionsReport>(await request(`${F}/reports/collections`, { params, signal }));

/* --------------------------------- parents -------------------------------- */

/** GET /parents/me/children/:studentId/invoices — the signed-in parent's child. */
export const listChildInvoices = async (studentId: string, signal?: AbortSignal) =>
unwrap<Invoice[]>(await request(`/parents/me/children/${studentId}/invoices`, { signal }));

/* --------------------------------- expenses ------------------------------- */

export function listExpenses(signal?: AbortSignal): Promise<PaginatedResult<Expense>> {
  return request<unknown>('/expenses', { signal }).then(normalizeList<Expense>);
}
export async function createExpense(payload: ExpensePayload): Promise<Expense> {
  return unwrap<Expense>(await request('/expenses', { method: 'POST', body: payload }));
}
export async function updateExpense(id: string, payload: Partial<ExpensePayload>): Promise<Expense> {
  return unwrap<Expense>(await request(`/expenses/${id}`, { method: 'PUT', body: payload }));
}
export async function deleteExpense(id: string): Promise<void> {
  await request(`/expenses/${id}`, { method: 'DELETE' });
}
