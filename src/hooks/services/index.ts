import { useQuery } from '@tanstack/react-query';
import * as lib from '../../api/library';
import * as bus from '../../api/transport';
import type { Viewer } from '../../api/communication';
import type { StaffRef } from '../../types/attendance';
import type { BookPayload, CopyStatus, LibrarySettings } from '../../types/library';
import type { Boarding, BusPayload, RoutePayload, Trip } from '../../types/transport';
import { ROOT, useMockMutation } from '../sections';

const keys = {
  books: [...ROOT, 'library', 'books'] as const,
  loans: (f: string, s?: string) => [...ROOT, 'library', 'loans', f, s ?? 'all'] as const,
  borrower: (code: string) => [...ROOT, 'library', 'borrower', code] as const,
  libSettings: [...ROOT, 'library', 'settings'] as const,
  libStats: [...ROOT, 'library', 'stats'] as const,
  buses: [...ROOT, 'transport', 'buses'] as const,
  routes: [...ROOT, 'transport', 'routes'] as const,
  subs: [...ROOT, 'transport', 'subs'] as const,
  trip: (r: string, t: string) => [...ROOT, 'transport', 'trip', r, t] as const,
  family: (v: Viewer) => [...ROOT, 'transport', 'family', v] as const
};

/* --------------------------------- library --------------------------------- */

export const useBooks = () => useQuery({ queryKey: keys.books, queryFn: lib.listBooks });
export const useLoans = (filter: lib.LoanFilter, studentId?: string, enabled = true) =>
useQuery({ queryKey: keys.loans(filter, studentId), queryFn: () => lib.listLoans(filter, studentId), enabled });
export const useBorrower = (code: string, people: StaffRef[]) =>
useQuery({ queryKey: keys.borrower(code), queryFn: () => lib.getBorrower(code, people), enabled: Boolean(code), retry: false });
export const useLibrarySettings = () => useQuery({ queryKey: keys.libSettings, queryFn: lib.getLibrarySettings });
export const useLibraryStats = () => useQuery({ queryKey: keys.libStats, queryFn: lib.getLibraryStats });

export const useSaveBook = () =>
useMockMutation(({ payload, copies, id }: {payload: BookPayload;copies: number;id?: string;}) => lib.saveBook(payload, copies, id), (b) => `"${b.title}" saved (${b.copies.length} copies).`);
export const useAddCopies = () => useMockMutation(({ id, count }: {id: string;count: number;}) => lib.addCopies(id, count), (b) => `${b.copies.length} copies of "${b.title}".`);
export const useSetCopyStatus = () =>
useMockMutation(({ bookId, copyId, status }: {bookId: string;copyId: string;status: Exclude<CopyStatus, 'loaned'>;}) => lib.setCopyStatus(bookId, copyId, status), 'Copy updated.');
export const useDeleteBook = () => useMockMutation((id: string) => lib.deleteBook(id), 'Book removed.');
export const useCheckout = () =>
useMockMutation(({ code, barcode, people }: {code: string;barcode: string;people: StaffRef[];}) => lib.checkout(code, barcode, people), (l) => `"${l.title}" lent to ${l.borrower.name} until ${l.dueOn}.`);
export const useReturnCopy = () => useMockMutation((barcode: string) => lib.returnCopy(barcode), null);
export const useRenewLoan = (studentId?: string) => useMockMutation((id: string) => lib.renewLoan(id, studentId), (l) => `Renewed until ${l.dueOn}.`);
export const usePayFine = () => useMockMutation(({ id, method }: {id: string;method: 'cash' | 'card';}) => lib.payFine(id, method), 'Fine paid.');
export const useWaiveFine = () => useMockMutation(({ id, reason }: {id: string;reason: string;}) => lib.waiveFine(id, reason), 'Fine waived.');
export const useUpdateLibrarySettings = () => useMockMutation((s: LibrarySettings) => lib.updateLibrarySettings(s), 'Library rules saved.');
export const useSendLibraryReminders = () => useMockMutation(() => lib.sendLibraryReminders(), null);
export const useGenerateLibrarySample = () => useMockMutation(() => lib.generateLibrarySample(), (r) => `Sample catalogue: ${r.books} books, ${r.loans} loans.`);

/* -------------------------------- transport -------------------------------- */

export const useBuses = () => useQuery({ queryKey: keys.buses, queryFn: bus.listBuses });
export const useRoutes = () => useQuery({ queryKey: keys.routes, queryFn: bus.listRoutes });
export const useSubscriptions = () => useQuery({ queryKey: keys.subs, queryFn: bus.listSubscriptions });
export const useTripSheet = (routeId: string, trip: Trip) =>
useQuery({ queryKey: keys.trip(routeId, trip), queryFn: () => bus.getTripSheet(routeId, trip), enabled: Boolean(routeId) });
export const useFamilyTransport = (viewer: Viewer, enabled = true) =>
useQuery({ queryKey: keys.family(viewer), queryFn: () => bus.getFamilyTransport(viewer), enabled });

export const useSaveBus = () => useMockMutation(({ payload, id }: {payload: BusPayload;id?: string;}) => bus.saveBus(payload, id), (b) => `${b.name} saved.`);
export const useDeleteBus = () => useMockMutation((id: string) => bus.deleteBus(id), 'Bus removed.');
export const useSaveRoute = () => useMockMutation(({ payload, id }: {payload: RoutePayload;id?: string;}) => bus.saveRoute(payload, id), (r) => `${r.name} saved.`);
export const useDeleteRoute = () => useMockMutation((id: string) => bus.deleteRoute(id), 'Route removed.');
export const useSubscribe = () =>
useMockMutation(({ studentId, routeId, stopId, startOn }: {studentId: string;routeId: string;stopId: string;startOn: string;}) => bus.subscribe(studentId, routeId, stopId, startOn), (s) => `${s.student.name} added to the route. Parents were notified.`);
export const useChangeStop = () =>
useMockMutation(({ id, routeId, stopId }: {id: string;routeId: string;stopId: string;}) => bus.changeStop(id, routeId, stopId), 'Stop changed. Parents were notified.');
export const useCancelSubscription = () => useMockMutation((id: string) => bus.cancelSubscription(id), 'Subscription cancelled.');
export const useMarkSubscriptionPaid = () =>
useMockMutation(({ id, method }: {id: string;method: 'cash' | 'card' | 'transfer';}) => bus.markSubscriptionPaid(id, method), 'Payment recorded.');
export const useBoard = () =>
useMockMutation(({ routeId, trip, code, method }: {routeId: string;trip: Trip;code: string;method: Boarding['method'];}) => bus.board(routeId, trip, code, method), null);
export const useUnboard = () =>
useMockMutation(({ routeId, trip, studentId }: {routeId: string;trip: Trip;studentId: string;}) => bus.unboard(routeId, trip, studentId), null);
export const useDepart = () =>
useMockMutation(({ routeId, trip }: {routeId: string;trip: Trip;}) => bus.depart(routeId, trip), (r) => `Bus left: ${r.onBoard} on board${r.missing ? `, ${r.missing} missing (parents told)` : ''}.`);
export const useGenerateTransportSample = () =>
useMockMutation(() => bus.generateTransportSample(), (r) => `Sample: ${r.buses} buses, ${r.routes} routes, ${r.riders} riders.`);
