import type { Timestamped } from './common';

export interface FeesGroup extends Timestamped {
  _id: string;
  [key: string]: unknown;
}

export interface Expense extends Timestamped {
  _id: string;
  [key: string]: unknown;
}

export type FinancePayload = Record<string, string | number | boolean | null>;