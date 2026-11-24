import type { Ref, StudentRef } from './sections';

/** Hostel (rooms, beds) and canteen (menu, wallets, purchases). MOCK API for now. */

export interface HostelRoom {
  _id: string;
  block: string;
  name: string;
  gender: 'Male' | 'Female';
  beds: number;
}

export interface BedAllocation {
  _id: string;
  student: StudentRef;
  section: string;
  roomId: string;
  bed: number;
  from: string;
  to?: string;
  status: 'active' | 'ended';
}

export interface RoomView extends HostelRoom {
  occupants: Array<{bed: number;allocation?: BedAllocation;}>;
}

export interface MenuItem {
  _id: string;
  name: string;
  category: 'Meals' | 'Snacks' | 'Drinks' | 'Fruit';
  /** minor units */
  price: number;
  /** matched against the student's health allergies */
  allergens: string[];
  available: boolean;
}

export type MenuItemPayload = Omit<MenuItem, '_id'>;

export interface Wallet {
  student: Ref;
  balance: number;
  /** set by the parent; 0 = no limit */
  dailyLimit: number;
}

export interface WalletTx {
  _id: string;
  studentId: string;
  type: 'topup' | 'purchase' | 'refund';
  /** positive for top-ups and refunds, negative for purchases (minor units) */
  amount: number;
  items?: Array<{name: string;qty: number;price: number;}>;
  method?: 'card' | 'cash';
  by: string;
  at: string;
}

/** What the till shows after scanning a card. */
export interface TillCustomer {
  student: StudentRef;
  section?: string;
  wallet: Wallet;
  spentToday: number;
  allergies: Array<{name: string;severity: string;}>;
}
