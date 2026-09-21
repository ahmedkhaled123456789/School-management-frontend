import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { createExpense, createFeesGroup, deleteExpense, deleteFeesGroup, listExpenses, listFeesGroups, updateExpense, updateFeesGroup } from '../../api/finance';
import { queryKeys } from '../../lib/queryKeys';
import type { FinancePayload } from '../../types/finance';

export function useFeesGroups() { return useQuery({ queryKey: queryKeys.feesGroups, queryFn: ({ signal }) => listFeesGroups(signal) }); }
export function useCreateFeesGroup() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (payload: FinancePayload) => createFeesGroup(payload), onSuccess: () => { toast.success('Fees group created.'); queryClient.invalidateQueries({ queryKey: queryKeys.feesGroups }); }, onError: (error) => toast.error(errorMessage(error)) }); }
export function useUpdateFeesGroup() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: FinancePayload }) => updateFeesGroup(id, payload), onSuccess: () => { toast.success('Fees group updated.'); queryClient.invalidateQueries({ queryKey: queryKeys.feesGroups }); }, onError: (error) => toast.error(errorMessage(error)) }); }
export function useDeleteFeesGroup() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: string) => deleteFeesGroup(id), onSuccess: () => { toast.success('Fees group deleted.'); queryClient.invalidateQueries({ queryKey: queryKeys.feesGroups }); }, onError: (error) => toast.error(errorMessage(error)) }); }

export function useExpenses() { return useQuery({ queryKey: queryKeys.expenses, queryFn: ({ signal }) => listExpenses(signal) }); }
export function useCreateExpense() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (payload: FinancePayload) => createExpense(payload), onSuccess: () => { toast.success('Expense created.'); queryClient.invalidateQueries({ queryKey: queryKeys.expenses }); }, onError: (error) => toast.error(errorMessage(error)) }); }
export function useUpdateExpense() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: FinancePayload }) => updateExpense(id, payload), onSuccess: () => { toast.success('Expense updated.'); queryClient.invalidateQueries({ queryKey: queryKeys.expenses }); }, onError: (error) => toast.error(errorMessage(error)) }); }
export function useDeleteExpense() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: string) => deleteExpense(id), onSuccess: () => { toast.success('Expense deleted.'); queryClient.invalidateQueries({ queryKey: queryKeys.expenses }); }, onError: (error) => toast.error(errorMessage(error)) }); }