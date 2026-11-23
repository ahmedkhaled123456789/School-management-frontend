import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import * as api from '../../api/finance';
import { queryKeys } from '../../lib/queryKeys';
import { useSettings } from '../staff';
import type { ListParams } from '../../types/common';
import type {
  DiscountPayload,
  ExpensePayload,
  FeeItemPayload,
  FeeStructurePayload,
  PaymentPayload } from
'../../types/finance';

/**
 * Mutation with a success toast + cache refresh. `message` may use the result
 * (e.g. the receipt number). Every finance change can move totals, so the
 * invoice/payment/report caches are refreshed together.
 */
function useFinanceMutation<TVars, TResult>(
fn: (vars: TVars) => Promise<TResult>,
message: string | ((result: TResult) => string),
keys: QueryKey[] = [])
{
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      toast.success(typeof message === 'function' ? message(result) : message);
      [...keys, queryKeys.financeRoot].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/** School currency code from the settings (EGP until they load). */
export function useCurrency(): string {
  return useSettings().data?.currency ?? 'EGP';
}

/* ------------------------------- fee items -------------------------------- */

export const useFeeItems = () =>
useQuery({ queryKey: queryKeys.feeItems, queryFn: ({ signal }) => api.listFeeItems(signal) });
export const useCreateFeeItem = () =>
useFinanceMutation((p: FeeItemPayload) => api.createFeeItem(p), 'Fee item created.', [queryKeys.feeItems]);
export const useUpdateFeeItem = () =>
useFinanceMutation(({ id, payload }: {id: string;payload: Partial<FeeItemPayload>;}) => api.updateFeeItem(id, payload), 'Fee item updated.', [queryKeys.feeItems]);
export const useDeleteFeeItem = () =>
useFinanceMutation((id: string) => api.deleteFeeItem(id), 'Fee item deleted.', [queryKeys.feeItems]);

/* ----------------------------- fee structures ----------------------------- */

export const useFeeStructures = (params: ListParams = {}) =>
useQuery({ queryKey: queryKeys.feeStructures(params), queryFn: ({ signal }) => api.listFeeStructures(params, signal) });
export const useCreateFeeStructure = () =>
useFinanceMutation((p: FeeStructurePayload) => api.createFeeStructure(p), 'Fee structure created.');
export const useUpdateFeeStructure = () =>
useFinanceMutation(({ id, payload }: {id: string;payload: FeeStructurePayload;}) => api.updateFeeStructure(id, payload), 'Fee structure updated. Issued invoices are not changed.');
export const useDeleteFeeStructure = () =>
useFinanceMutation((id: string) => api.deleteFeeStructure(id), 'Fee structure deleted.');

/* -------------------------------- discounts ------------------------------- */

export const useDiscounts = () =>
useQuery({ queryKey: queryKeys.discounts, queryFn: ({ signal }) => api.listDiscounts(signal) });
export const useCreateDiscount = () =>
useFinanceMutation((p: DiscountPayload) => api.createDiscount(p), 'Discount created.', [queryKeys.discounts]);
export const useUpdateDiscount = () =>
useFinanceMutation(({ id, payload }: {id: string;payload: DiscountPayload;}) => api.updateDiscount(id, payload), 'Discount updated.', [queryKeys.discounts]);
export const useDeleteDiscount = () =>
useFinanceMutation((id: string) => api.deleteDiscount(id), 'Discount deleted.', [queryKeys.discounts]);

/* -------------------------------- invoices -------------------------------- */

export const useInvoices = (params: ListParams, enabled = true) =>
useQuery({ queryKey: queryKeys.invoices(params), queryFn: ({ signal }) => api.listInvoices(params, signal), placeholderData: keepPreviousData, enabled });
export const useInvoice = (id?: string) =>
useQuery({ queryKey: queryKeys.invoice(id ?? ''), queryFn: ({ signal }) => api.getInvoice(id as string, signal), enabled: Boolean(id), retry: false });
export const useCreateInvoice = () =>
useFinanceMutation(api.createInvoice, (invoice) => `Invoice ${invoice.invoiceNumber} issued.`);
export const useGenerateInvoices = () =>
useFinanceMutation(api.generateInvoices, (result) => result.message);
export const useApplyInvoiceDiscount = () =>
useFinanceMutation(({ id, discount }: {id: string;discount: string;}) => api.applyInvoiceDiscount(id, discount), 'Discount applied.');
export const useRemoveInvoiceDiscount = () =>
useFinanceMutation(({ id, entryId }: {id: string;entryId: string;}) => api.removeInvoiceDiscount(id, entryId), 'Discount removed.');
export const useCancelInvoice = () =>
useFinanceMutation(({ id, reason }: {id: string;reason: string;}) => api.cancelInvoice(id, reason), 'Invoice cancelled.');

/* -------------------------------- payments -------------------------------- */

export const usePayments = (params: ListParams) =>
useQuery({ queryKey: queryKeys.payments(params), queryFn: ({ signal }) => api.listPayments(params, signal), placeholderData: keepPreviousData });
export const usePayment = (id?: string) =>
useQuery({ queryKey: queryKeys.payment(id ?? ''), queryFn: ({ signal }) => api.getPayment(id as string, signal), enabled: Boolean(id), retry: false });
export const useRecordPayment = () =>
useFinanceMutation((p: PaymentPayload) => api.createPayment(p), (result) => `Payment recorded — receipt ${result.payment.receiptNumber}.`);
export const useVoidPayment = () =>
useFinanceMutation(({ id, reason }: {id: string;reason: string;}) => api.voidPayment(id, reason), 'Payment voided.');

/* --------------------------------- reports -------------------------------- */

export const useOutstandingReport = (params: ListParams) =>
useQuery({ queryKey: queryKeys.outstanding(params), queryFn: ({ signal }) => api.getOutstandingReport(params, signal), placeholderData: keepPreviousData });
export const useCollectionsReport = (params: ListParams) =>
useQuery({ queryKey: queryKeys.collections(params), queryFn: ({ signal }) => api.getCollectionsReport(params, signal), placeholderData: keepPreviousData });

/* --------------------------------- parents -------------------------------- */

export const useChildInvoices = (studentId?: string) =>
useQuery({ queryKey: queryKeys.childInvoices(studentId ?? ''), queryFn: ({ signal }) => api.listChildInvoices(studentId as string, signal), enabled: Boolean(studentId), retry: false });

/* --------------------------------- expenses ------------------------------- */

export const useExpenses = () =>
useQuery({ queryKey: queryKeys.expenses, queryFn: ({ signal }) => api.listExpenses(signal) });
export const useCreateExpense = () =>
useFinanceMutation((p: ExpensePayload) => api.createExpense(p), 'Expense recorded.', [queryKeys.expenses]);
export const useUpdateExpense = () =>
useFinanceMutation(({ id, payload }: {id: string;payload: Partial<ExpensePayload>;}) => api.updateExpense(id, payload), 'Expense updated.', [queryKeys.expenses]);
export const useDeleteExpense = () =>
useFinanceMutation((id: string) => api.deleteExpense(id), 'Expense deleted.', [queryKeys.expenses]);
