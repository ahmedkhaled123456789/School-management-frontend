import { normalizeList, request, unwrap } from './client';
import type { PaginatedResult } from '../types/common';
import type { Expense, FeesGroup, FinancePayload } from '../types/finance';

export function listFeesGroups(signal?: AbortSignal): Promise<PaginatedResult<FeesGroup>> {
  return request<unknown>('/feesGroup', { signal }).then(normalizeList<FeesGroup>);
}

export async function getFeesGroup(id: string, signal?: AbortSignal): Promise<FeesGroup> {
  return unwrap<FeesGroup>(await request(`/feesGroup/${id}`, { signal }));
}

export async function createFeesGroup(payload: FinancePayload): Promise<FeesGroup> {
  return unwrap<FeesGroup>(await request('/feesGroup', { method: 'POST', body: payload }));
}

export async function updateFeesGroup(id: string, payload: FinancePayload): Promise<FeesGroup> {
  return unwrap<FeesGroup>(await request(`/feesGroup/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteFeesGroup(id: string): Promise<void> {
  await request(`/feesGroup/${id}`, { method: 'DELETE' });
}

export function listExpenses(signal?: AbortSignal): Promise<PaginatedResult<Expense>> {
  return request<unknown>('/expenses', { signal }).then(normalizeList<Expense>);
}

export async function createExpense(payload: FinancePayload): Promise<Expense> {
  return unwrap<Expense>(await request('/expenses', { method: 'POST', body: payload }));
}

export async function updateExpense(id: string, payload: FinancePayload): Promise<Expense> {
  return unwrap<Expense>(await request(`/expenses/${id}`, { method: 'PUT', body: payload }));
}

export async function deleteExpense(id: string): Promise<void> {
  await request(`/expenses/${id}`, { method: 'DELETE' });
}