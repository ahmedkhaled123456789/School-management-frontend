import type { Ref } from './sections';

/** Library: catalogue, copies, loans and fines. MOCK API for now. */

export type CopyStatus = 'available' | 'loaned' | 'repair' | 'lost';

export interface BookCopy {
  _id: string;
  /** printed on the spine label (QR): "LIB-000123" */
  barcode: string;
  status: CopyStatus;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn?: string;
  category: string;
  shelf: string;
  publishedYear?: number;
  copies: BookCopy[];
  createdAt: string;
}

export type BookPayload = Pick<Book, 'title' | 'author' | 'isbn' | 'category' | 'shelf' | 'publishedYear'>;

export interface Borrower extends Ref {
  kind: 'student' | 'staff';
  /** student code / staff email: what is scanned at the desk */
  code: string;
  section?: string;
}

export interface Loan {
  _id: string;
  bookId: string;
  title: string;
  barcode: string;
  borrower: Borrower;
  loanedOn: string;
  dueOn: string;
  returnedOn?: string;
  renewals: number;
  /** minor units, set on return when late */
  fine: number;
  finePaid?: {on: string;method: 'cash' | 'card';by: string;};
  fineWaived?: {on: string;reason: string;by: string;};
  /** last day a reminder went out for this loan (one a day at most) */
  remindedOn?: string;
  createdAt: string;
}

export interface LibrarySettings {
  loanDays: number;
  maxLoansStudent: number;
  maxLoansStaff: number;
  maxRenewals: number;
  /** minor units per late day */
  finePerDay: number;
}

/** A borrower at the desk: open loans and unpaid fines. */
export interface BorrowerAccount {
  borrower: Borrower;
  loans: Loan[];
  unpaidFines: number;
  limit: number;
}
