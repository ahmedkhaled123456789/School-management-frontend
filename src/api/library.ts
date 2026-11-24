/**
 * Library — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST/PUT/DELETE /library/books, POST /library/books/:id/copies, PATCH /library/copies/:id
 *   GET /library/borrowers/:code, POST /library/checkout, POST /library/return
 *   POST /library/loans/:id/{renew,pay,waive}, GET /library/loans, GET/PUT /library/settings
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type { StaffRef } from '../types/attendance';
import type { Book, BookPayload, Borrower, BorrowerAccount, CopyStatus, LibrarySettings, Loan } from '../types/library';
import { addDays, daysBetween, todayKey } from '../utils/attendance';
import { sectionLabel } from '../utils/timetable';
import { notify, queueOutbox } from './communication';

const READ = 'students.read';
const MANAGE = 'students.manage';

/* -------------------------------- helpers --------------------------------- */

const isActive = (l: Loan) => !l.returnedOn;
export const overdueDays = (l: Pick<Loan, 'dueOn' | 'returnedOn'>, today = todayKey()) => Math.max(0, daysBetween(l.dueOn, l.returnedOn ?? today));
const unpaid = (l: Loan) => l.fine > 0 && !l.finePaid && !l.fineWaived;

function nextBarcode(db: MockDb) {
  const n = db.books.reduce((s, b) => s + b.copies.length, 0) + 1;
  return `LIB-${String(n).padStart(6, '0')}`;
}

/** Student by code / id (newest section), or a staff member from the given list (email / id). */
function resolveBorrower(db: MockDb, code: string, people: StaffRef[] = []): Borrower {
  const value = code.trim();
  if (!value) fail(400, 'Scan or type the borrower code');
  const sections = [...db.sections].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  for (const s of sections) {
    const st = s.students.find((x) => x._id === value || x.studentId?.toLowerCase() === value.toLowerCase());
    if (st) return { _id: st._id, name: st.name, kind: 'student', code: st.studentId ?? st._id, section: sectionLabel(s) };
  }
  const person = people.find((p) => p._id === value || p.email?.toLowerCase() === value.toLowerCase());
  if (person) return { _id: person._id, name: person.name, kind: 'staff', code: person.email ?? person._id };
  return fail(404, `No student or staff member with the code "${value}"`);
}

function account(db: MockDb, borrower: Borrower): BorrowerAccount {
  const mine = db.loans.filter((l) => l.borrower._id === borrower._id);
  return {
    borrower,
    loans: mine.filter((l) => isActive(l) || unpaid(l)).sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
    unpaidFines: mine.filter(unpaid).reduce((s, l) => s + l.fine, 0),
    limit: borrower.kind === 'student' ? db.librarySettings.maxLoansStudent : db.librarySettings.maxLoansStaff
  };
}

function findCopy(db: MockDb, barcode: string) {
  const code = barcode.trim().toUpperCase();
  for (const book of db.books) {
    const copy = book.copies.find((c) => c.barcode === code);
    if (copy) return { book, copy };
  }
  return fail(404, `No copy with the barcode "${barcode.trim()}"`);
}

/* --------------------------------- settings -------------------------------- */

export async function getLibrarySettings(): Promise<LibrarySettings> {
  sessionActor();
  return read((db) => db.librarySettings);
}

export async function updateLibrarySettings(s: LibrarySettings): Promise<LibrarySettings> {
  requirePermission(MANAGE);
  return write((db) => {
    const int = (v: number, min: number, max: number, what: string) => {if (!Number.isInteger(v) || v < min || v > max) fail(400, `${what}: ${min}–${max}`);};
    int(s.loanDays, 1, 90, 'Loan period (days)');
    int(s.maxLoansStudent, 1, 20, 'Books per student');
    int(s.maxLoansStaff, 1, 50, 'Books per staff member');
    int(s.maxRenewals, 0, 5, 'Renewals');
    int(s.finePerDay, 0, 10_000, 'Fine per day (piasters)');
    db.librarySettings = { loanDays: s.loanDays, maxLoansStudent: s.maxLoansStudent, maxLoansStaff: s.maxLoansStaff, maxRenewals: s.maxRenewals, finePerDay: s.finePerDay };
    return db.librarySettings;
  });
}

/* --------------------------------- catalogue ------------------------------- */

export interface BookView extends Book {
  available: number;
  onLoan: number;
  /** loans ever: "most borrowed" */
  borrowed: number;
  /** soonest return date when nothing is available */
  nextDue?: string;
}

/** The catalogue (every portal can search it). */
export async function listBooks(): Promise<BookView[]> {
  sessionActor();
  return read((db) => db.books.map((b) => {
    const active = db.loans.filter((l) => l.bookId === b._id && isActive(l));
    return {
      ...b,
      available: b.copies.filter((c) => c.status === 'available').length,
      onLoan: active.length,
      borrowed: db.loans.filter((l) => l.bookId === b._id).length,
      nextDue: active.map((l) => l.dueOn).sort()[0]
    };
  }).sort((a, b) => a.title.localeCompare(b.title)));
}

function validateBook(p: BookPayload) {
  if ((p.title?.trim().length ?? 0) < 2 || p.title.length > 150) fail(400, 'Title: 2–150 characters');
  if ((p.author?.trim().length ?? 0) < 2 || p.author.length > 100) fail(400, 'Author: 2–100 characters');
  if (p.isbn && !/^(97[89])?\d{9}[\dX]$/.test(p.isbn.replace(/[-\s]/g, ''))) fail(400, 'ISBN must have 10 or 13 digits');
  if (!p.category?.trim()) fail(400, 'Choose a category');
  if (!p.shelf?.trim() || p.shelf.length > 20) fail(400, 'Shelf: 1–20 characters, e.g. B-03');
  if (p.publishedYear !== undefined && (!Number.isInteger(p.publishedYear) || p.publishedYear < 1450 || p.publishedYear > new Date().getFullYear() + 1)) fail(400, 'Invalid year');
}

export async function saveBook(payload: BookPayload, copies: number, id?: string): Promise<Book> {
  requirePermission(MANAGE);
  return write((db) => {
    validateBook(payload);
    const clean = {
      title: payload.title.trim(),
      author: payload.author.trim(),
      ...(payload.isbn?.trim() ? { isbn: payload.isbn.replace(/[-\s]/g, '') } : {}),
      category: payload.category.trim(),
      shelf: payload.shelf.trim().toUpperCase(),
      ...(payload.publishedYear ? { publishedYear: payload.publishedYear } : {})
    };
    if (clean.isbn && db.books.some((b) => b._id !== id && b.isbn === clean.isbn)) fail(409, 'A book with this ISBN is already in the catalogue: add copies to it instead');
    if (id) {
      const book = db.books.find((b) => b._id === id);
      if (!book) fail(404, 'Book not found');
      delete book.isbn;
      delete book.publishedYear;
      Object.assign(book, clean);
      return book;
    }
    if (!Number.isInteger(copies) || copies < 1 || copies > 100) fail(400, 'Copies: 1–100');
    const book: Book = { _id: newId(), ...clean, copies: [], createdAt: nowIso() };
    db.books.push(book);
    for (let i = 0; i < copies; i += 1) book.copies.push({ _id: newId(), barcode: nextBarcode(db), status: 'available' });
    return book;
  });
}

export async function addCopies(bookId: string, count: number): Promise<Book> {
  requirePermission(MANAGE);
  return write((db) => {
    const book = db.books.find((b) => b._id === bookId);
    if (!book) fail(404, 'Book not found');
    if (!Number.isInteger(count) || count < 1 || count > 100) fail(400, 'Copies: 1–100');
    for (let i = 0; i < count; i += 1) book.copies.push({ _id: newId(), barcode: nextBarcode(db), status: 'available' });
    return book;
  });
}

export async function setCopyStatus(bookId: string, copyId: string, status: Exclude<CopyStatus, 'loaned'>): Promise<Book> {
  requirePermission(MANAGE);
  return write((db) => {
    const book = db.books.find((b) => b._id === bookId);
    const copy = book?.copies.find((c) => c._id === copyId);
    if (!book || !copy) fail(404, 'Copy not found');
    if (copy.status === 'loaned') fail(409, 'This copy is on loan: return it first');
    copy.status = status;
    return book;
  });
}

export async function deleteBook(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (db.loans.some((l) => l.bookId === id && isActive(l))) fail(409, 'Copies are on loan: wait for them to be returned');
    db.books = db.books.filter((b) => b._id !== id);
  });
}

/* --------------------------------- the desk -------------------------------- */

export async function getBorrower(code: string, people: StaffRef[] = []): Promise<BorrowerAccount> {
  requirePermission(READ);
  return read((db) => account(db, resolveBorrower(db, code, people)));
}

export async function checkout(code: string, barcode: string, people: StaffRef[] = []): Promise<Loan> {
  requirePermission(MANAGE);
  return write((db) => {
    const borrower = resolveBorrower(db, code, people);
    const { book, copy } = findCopy(db, barcode);
    if (copy.status !== 'available') fail(409, copy.status === 'loaned' ? `${copy.barcode} is already on loan: return it first` : `${copy.barcode} is marked "${copy.status}"`);
    const acc = account(db, borrower);
    const open = acc.loans.filter(isActive);
    if (open.length >= acc.limit) fail(409, `${borrower.name} already has ${open.length} book(s) (limit ${acc.limit})`);
    const late = open.filter((l) => overdueDays(l) > 0);
    if (late.length) fail(409, `${borrower.name} has ${late.length} overdue book(s): return them first`);
    if (acc.unpaidFines > 0) fail(409, `${borrower.name} has unpaid fines (${(acc.unpaidFines / 100).toFixed(2)} EGP)`);
    if (open.some((l) => l.bookId === book._id)) fail(409, `${borrower.name} already has a copy of "${book.title}"`);
    copy.status = 'loaned';
    const loan: Loan = {
      _id: newId(), bookId: book._id, title: book.title, barcode: copy.barcode, borrower,
      loanedOn: todayKey(), dueOn: addDays(todayKey(), db.librarySettings.loanDays), renewals: 0, fine: 0, createdAt: nowIso()
    };
    db.loans.push(loan);
    return loan;
  });
}

/** Returns a copy; a late return gets its fine (days late × fine per day). */
export async function returnCopy(barcode: string): Promise<Loan> {
  requirePermission(MANAGE);
  return write((db) => {
    const { copy } = findCopy(db, barcode);
    const loan = db.loans.find((l) => l.barcode === copy.barcode && isActive(l));
    if (!loan) fail(409, `${copy.barcode} is not on loan`);
    loan.returnedOn = todayKey();
    loan.fine = overdueDays(loan) * db.librarySettings.finePerDay;
    copy.status = 'available';
    if (loan.fine && loan.borrower.kind === 'student') {
      notify(db, { to: [`parent-of:${loan.borrower._id}`, `student:${loan.borrower._id}`], kind: 'library', title: `Library fine: ${(loan.fine / 100).toFixed(2)} EGP`, body: `"${loan.title}" was returned ${overdueDays(loan)} day(s) late.`, href: { student: '/student/library', parent: `/parent/children/${loan.borrower._id}` } });
    }
    return loan;
  });
}

export async function renewLoan(id: string, viewerStudentId?: string): Promise<Loan> {
  const actor = sessionActor();
  if (actor.role === 'admin') requirePermission(MANAGE);else
  if (actor.role !== 'student') fail(403, 'You do not have permission to perform this action');
  return write((db) => {
    const loan = db.loans.find((l) => l._id === id);
    if (!loan || !isActive(loan)) fail(404, 'Loan not found');
    if (actor.role === 'student' && loan.borrower._id !== viewerStudentId) fail(403, 'You can only renew your own books');
    if (overdueDays(loan) > 0) fail(409, 'Overdue books can not be renewed: return it to the library');
    if (loan.renewals >= db.librarySettings.maxRenewals) fail(409, `Already renewed ${loan.renewals} time(s) (limit ${db.librarySettings.maxRenewals})`);
    loan.renewals += 1;
    loan.dueOn = addDays(loan.dueOn, db.librarySettings.loanDays);
    return loan;
  });
}

export async function payFine(id: string, method: 'cash' | 'card'): Promise<Loan> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const loan = db.loans.find((l) => l._id === id);
    if (!loan || !unpaid(loan)) fail(409, 'No unpaid fine on this loan');
    loan.finePaid = { on: todayKey(), method, by: actor.ref.name };
    return loan;
  });
}

export async function waiveFine(id: string, reason: string): Promise<Loan> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const loan = db.loans.find((l) => l._id === id);
    if (!loan || !unpaid(loan)) fail(409, 'No unpaid fine on this loan');
    if (!reason?.trim()) fail(400, 'Give a reason for waiving the fine');
    loan.fineWaived = { on: todayKey(), reason: reason.trim().slice(0, 120), by: actor.ref.name };
    return loan;
  });
}

export type LoanFilter = 'active' | 'overdue' | 'fines' | 'returned' | 'all';

/** Admins: every loan; students / parents: one student's (studentId required). */
export async function listLoans(filter: LoanFilter, studentId?: string): Promise<Loan[]> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if (!studentId) fail(403, 'You can only see your own loans');
  return read((db) => db.loans.
  filter((l) => (!studentId || l.borrower._id === studentId) && (
  filter === 'all' || (
  filter === 'active' ? isActive(l) :
  filter === 'overdue' ? isActive(l) && overdueDays(l) > 0 :
  filter === 'fines' ? unpaid(l) :
  !isActive(l)))).
  sort((a, b) => filter === 'returned' ? (b.returnedOn ?? '').localeCompare(a.returnedOn ?? '') : a.dueOn.localeCompare(b.dueOn)));
}

/**
 * Daily reminders (a server job later): overdue books to the student and the
 * parents (+ SMS), and "due tomorrow" to the student. Safe to run often:
 * each loan is reminded at most once a day.
 */
export async function sendLibraryReminders(): Promise<{sent: number;}> {
  sessionActor();
  return write((db) => {
    const today = todayKey();
    let sent = 0;
    db.loans.filter((l) => isActive(l) && l.borrower.kind === 'student' && l.remindedOn !== today).forEach((l) => {
      const late = overdueDays(l);
      const href = { student: '/student/library', parent: `/parent/children/${l.borrower._id}` };
      if (late > 0) {
        notify(db, { to: [`student:${l.borrower._id}`, `parent-of:${l.borrower._id}`], kind: 'library', title: `Overdue library book: "${l.title}"`, body: `${l.borrower.name} · ${late} day(s) late · ${(db.librarySettings.finePerDay / 100).toFixed(2)} EGP per day`, href });
        queueOutbox(db, { channel: 'sms', to: `Parents of ${l.borrower.name}`, kind: 'library', body: `"${l.title}" borrowed by ${l.borrower.name} is ${late} day(s) overdue. Please return it to the school library.` });
        l.remindedOn = today;
        sent += 1;
      } else if (l.dueOn === addDays(today, 1)) {
        notify(db, { to: [`student:${l.borrower._id}`], kind: 'library', title: `Due tomorrow: "${l.title}"`, body: 'Return or renew it to avoid a fine.', href });
        l.remindedOn = today;
        sent += 1;
      }
    });
    return { sent };
  });
}

export interface LibraryStats {
  titles: number;
  copies: number;
  onLoan: number;
  overdue: number;
  unpaidFines: number;
  collectedFines: number;
  topBooks: Array<{title: string;count: number;}>;
  topReaders: Array<{name: string;section?: string;count: number;}>;
}

export async function getLibraryStats(): Promise<LibraryStats> {
  requirePermission(READ);
  return read((db) => {
    const count = <K extends string,>(keyOf: (l: Loan) => K) => {
      const m = new Map<K, number>();
      db.loans.forEach((l) => m.set(keyOf(l), (m.get(keyOf(l)) ?? 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    };
    const readers = new Map(db.loans.map((l) => [l.borrower._id, l.borrower]));
    return {
      titles: db.books.length,
      copies: db.books.reduce((s, b) => s + b.copies.length, 0),
      onLoan: db.loans.filter(isActive).length,
      overdue: db.loans.filter((l) => isActive(l) && overdueDays(l) > 0).length,
      unpaidFines: db.loans.filter(unpaid).reduce((s, l) => s + l.fine, 0),
      collectedFines: db.loans.filter((l) => l.finePaid).reduce((s, l) => s + l.fine, 0),
      topBooks: count((l) => l.title).map(([title, n]) => ({ title, count: n })),
      topReaders: count((l) => l.borrower._id).filter(([id]) => readers.get(id)?.kind === 'student').map(([id, n]) => ({ name: readers.get(id)!.name, section: readers.get(id)!.section, count: n }))
    };
  });
}

/* ------------------------------- sample data ------------------------------- */

const SAMPLE: Array<[string, string, string, string, number]> = [
['The Little Prince', 'Antoine de Saint-Exupéry', 'Fiction', 'A-01', 3],
['Charlotte\'s Web', 'E. B. White', 'Fiction', 'A-02', 2],
['Matilda', 'Roald Dahl', 'Fiction', 'A-03', 3],
['Harry Potter and the Philosopher\'s Stone', 'J. K. Rowling', 'Fiction', 'A-04', 4],
['The Secret Garden', 'Frances Hodgson Burnett', 'Fiction', 'A-05', 2],
['Wonder', 'R. J. Palacio', 'Fiction', 'A-06', 2],
['A Brief History of Time', 'Stephen Hawking', 'Science', 'C-01', 1],
['The Way Things Work', 'David Macaulay', 'Science', 'C-02', 2],
['Cosmos', 'Carl Sagan', 'Science', 'C-03', 1],
['The Story of Egypt', 'Joann Fletcher', 'History', 'D-01', 2],
['Atlas of the World', 'National Geographic', 'Reference', 'R-01', 1],
['Oxford Children\'s Dictionary', 'Oxford', 'Reference', 'R-02', 3],
['Kalila wa Dimna', 'Ibn al-Muqaffa', 'Arabic', 'E-01', 2],
['Al-Ayyam', 'Taha Hussein', 'Arabic', 'E-02', 2],
['Math Puzzles for Kids', 'Ivan Moscovich', 'Mathematics', 'F-01', 2]];


/** A starter catalogue plus a few loans (on time, due soon, overdue, a paid and an unpaid fine). */
export async function generateLibrarySample(): Promise<{books: number;loans: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    if (db.books.length) fail(409, 'The catalogue already has books');
    SAMPLE.forEach(([title, author, category, shelf, copies], i) => {
      const book: Book = { _id: newId(), title, author, category, shelf, ...(i % 3 === 0 ? { publishedYear: 1990 + i } : {}), copies: [], createdAt: nowIso() };
      db.books.push(book);
      for (let c = 0; c < copies; c += 1) book.copies.push({ _id: newId(), barcode: nextBarcode(db), status: 'available' });
    });
    const students = db.sections.flatMap((s) => s.students.map((st) => ({ st, section: sectionLabel(s) })));
    const today = todayKey();
    const plan = [-3, -20, -16, -30, -12, -2, -25, -8];
    let loans = 0;
    students.slice(0, plan.length).forEach(({ st, section }, i) => {
      const book = db.books[(i * 2) % db.books.length];
      const copy = book.copies.find((c) => c.status === 'available');
      if (!copy) return;
      const loanedOn = addDays(today, plan[i]);
      const loan: Loan = {
        _id: newId(), bookId: book._id, title: book.title, barcode: copy.barcode,
        borrower: { _id: st._id, name: st.name, kind: 'student', code: st.studentId ?? st._id, section },
        loanedOn, dueOn: addDays(loanedOn, db.librarySettings.loanDays), renewals: 0, fine: 0, createdAt: nowIso()
      };
      // some returned (one paid fine, one unpaid), the rest still out
      if (i === 3 || i === 6) {
        loan.returnedOn = addDays(loanedOn, db.librarySettings.loanDays + (i === 3 ? 4 : 2));
        loan.fine = overdueDays(loan) * db.librarySettings.finePerDay;
        if (i === 3) loan.finePaid = { on: loan.returnedOn, method: 'cash', by: 'Librarian' };
      } else copy.status = 'loaned';
      db.loans.push(loan);
      loans += 1;
    });
    return { books: db.books.length, loans };
  });
}
