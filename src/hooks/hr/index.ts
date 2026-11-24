import { useQuery } from '@tanstack/react-query';
import * as hr from '../../api/hr';
import * as bd from '../../api/boarding';
import type { Viewer } from '../../api/communication';
import type { StaffRef } from '../../types/attendance';
import type { HostelRoom, MenuItemPayload } from '../../types/boarding';
import type { ContractPayload, LeavePayload, ReviewPayload } from '../../types/hr';
import type { Ref } from '../../types/sections';
import { ROOT, useMockMutation } from '../sections';

const keys = {
  contracts: [...ROOT, 'hr', 'contracts'] as const,
  myContract: (v: Viewer) => [...ROOT, 'hr', 'myContract', v] as const,
  leave: (v: Viewer) => [...ROOT, 'hr', 'leave', v] as const,
  balances: (id: string) => [...ROOT, 'hr', 'balances', id] as const,
  covers: (v: Viewer) => [...ROOT, 'hr', 'covers', v] as const,
  reviews: (v: Viewer) => [...ROOT, 'hr', 'reviews', v] as const,
  facts: (id: string) => [...ROOT, 'hr', 'facts', id] as const,
  rooms: [...ROOT, 'hostel', 'rooms'] as const,
  menu: [...ROOT, 'canteen', 'menu'] as const,
  wallet: (id: string) => [...ROOT, 'canteen', 'wallet', id] as const,
  till: (code: string) => [...ROOT, 'canteen', 'till', code] as const,
  stats: [...ROOT, 'canteen', 'stats'] as const,
  family: (v: Viewer) => [...ROOT, 'canteen', 'family', v] as const
};

/* ------------------------------------ HR ----------------------------------- */

export const useContracts = () => useQuery({ queryKey: keys.contracts, queryFn: hr.listContracts });
export const useMyContract = (viewer: Viewer, enabled = true) => useQuery({ queryKey: keys.myContract(viewer), queryFn: () => hr.getMyContract(viewer), enabled });
export const useSaveContract = () => useMockMutation(({ payload, id }: {payload: ContractPayload;id?: string;}) => hr.saveContract(payload, id), (c) => `Contract saved for ${c.staff.name}.`);
export const useRenewContract = () => useMockMutation(({ id, endOn }: {id: string;endOn: string;}) => hr.renewContract(id, endOn), (c) => `Renewed until ${c.endOn}.`);
export const useTerminateContract = () => useMockMutation(({ id, on, reason }: {id: string;on: string;reason: string;}) => hr.terminateContract(id, on, reason), 'Contract terminated.');

export const useLeave = (viewer: Viewer, enabled = true) => useQuery({ queryKey: keys.leave(viewer), queryFn: () => hr.listLeave(viewer), enabled });
export const useBalances = (staffId?: string, viewer: Viewer = {}) => useQuery({ queryKey: keys.balances(staffId ?? ''), queryFn: () => hr.getBalances(staffId as string, viewer), enabled: Boolean(staffId) });
export const useMyCovers = (viewer: Viewer, enabled = true) => useQuery({ queryKey: keys.covers(viewer), queryFn: () => hr.listMyCovers(viewer), enabled });
export const useRequestLeave = (viewer: Viewer = {}) => useMockMutation((p: LeavePayload) => hr.requestLeave(p, viewer), (l) => `Leave requested: ${l.days} school day(s).`);
export const useDecideLeave = () =>
useMockMutation(({ id, decision, note, people }: {id: string;decision: 'approved' | 'rejected';note?: string;people: StaffRef[];}) => hr.decideLeave(id, decision, note, people),
  (l) => l.status === 'approved' ? `Approved. ${l.covers.length} lesson(s) to cover, ${l.covers.filter((c) => !c.substitute).length} without a substitute.` : 'Request rejected.');
export const useSetCover = () => useMockMutation(({ id, index, substitute }: {id: string;index: number;substitute: Ref | null;}) => hr.setCover(id, index, substitute), 'Cover updated. The substitute was notified.');
export const useCancelLeave = (viewer: Viewer = {}) => useMockMutation((id: string) => hr.cancelLeave(id, viewer), 'Leave cancelled.');

export const useReviews = (viewer: Viewer, enabled = true) => useQuery({ queryKey: keys.reviews(viewer), queryFn: () => hr.listReviews(viewer), enabled });
export const useStaffFacts = (staffId?: string) => useQuery({ queryKey: keys.facts(staffId ?? ''), queryFn: () => hr.getStaffFacts(staffId as string), enabled: Boolean(staffId) });
export const useSaveReview = () => useMockMutation(({ payload, id }: {payload: ReviewPayload;id?: string;}) => hr.saveReview(payload, id), 'Review saved.');
export const useShareReview = () => useMockMutation((id: string) => hr.shareReview(id), 'Review shared with the staff member.');
export const useAcknowledgeReview = (viewer: Viewer) => useMockMutation(({ id, comment }: {id: string;comment: string;}) => hr.acknowledgeReview(id, comment, viewer), 'Review acknowledged.');
export const useGenerateHrSample = () => useMockMutation((people: StaffRef[]) => hr.generateHrSample(people), (r) => `${r.contracts} sample contracts added.`);

/* ------------------------------ hostel & canteen ---------------------------- */

export const useHostelRooms = () => useQuery({ queryKey: keys.rooms, queryFn: bd.listHostelRooms });
export const useSaveHostelRoom = () => useMockMutation(({ payload, id }: {payload: Omit<HostelRoom, '_id'>;id?: string;}) => bd.saveHostelRoom(payload, id), (r) => `${r.block} ${r.name} saved.`);
export const useDeleteHostelRoom = () => useMockMutation((id: string) => bd.deleteHostelRoom(id), 'Room removed.');
export const useAllocateBed = () =>
useMockMutation(({ studentId, gender, roomId, bed, from }: {studentId: string;gender?: 'Male' | 'Female';roomId: string;bed: number;from: string;}) => bd.allocateBed(studentId, gender, roomId, bed, from), (a) => `${a.student.name} has bed ${a.bed}.`);
export const useMoveBed = () => useMockMutation(({ id, roomId, bed }: {id: string;roomId: string;bed: number;}) => bd.moveBed(id, roomId, bed), 'Moved.');
export const useEndAllocation = () => useMockMutation((id: string) => bd.endAllocation(id), 'Checked out.');

export const useMenu = () => useQuery({ queryKey: keys.menu, queryFn: bd.listMenu });
export const useSaveMenuItem = () => useMockMutation(({ payload, id }: {payload: MenuItemPayload;id?: string;}) => bd.saveMenuItem(payload, id), (i) => `${i.name} saved.`);
export const useDeleteMenuItem = () => useMockMutation((id: string) => bd.deleteMenuItem(id), 'Item removed.');
export const useWallet = (studentId?: string, viewer: Viewer = {}) => useQuery({ queryKey: keys.wallet(studentId ?? ''), queryFn: () => bd.getWallet(studentId as string, viewer), enabled: Boolean(studentId) });
export const useTillCustomer = (code: string) => useQuery({ queryKey: keys.till(code), queryFn: () => bd.getTillCustomer(code), enabled: Boolean(code), retry: false });
export const useCanteenStats = () => useQuery({ queryKey: keys.stats, queryFn: bd.getCanteenStats });
export const useFamilyBoarding = (viewer: Viewer, enabled = true) => useQuery({ queryKey: keys.family(viewer), queryFn: () => bd.getFamilyBoarding(viewer), enabled });
export const useTopUp = (viewer: Viewer = {}) => useMockMutation(({ studentId, amount }: {studentId: string;amount: number;}) => bd.topUp(studentId, amount, viewer), (w) => `Topped up. New balance ${(w.balance / 100).toFixed(2)} EGP.`);
export const useSetDailyLimit = (viewer: Viewer = {}) => useMockMutation(({ studentId, limit }: {studentId: string;limit: number;}) => bd.setDailyLimit(studentId, limit, viewer), 'Daily limit saved.');
export const usePurchase = () => useMockMutation(({ code, lines, confirmAllergy }: {code: string;lines: Array<{itemId: string;qty: number;}>;confirmAllergy?: boolean;}) => bd.purchase(code, lines, confirmAllergy), null);
export const useRefund = () => useMockMutation((id: string) => bd.refund(id), 'Refunded to the wallet.');
export const useGenerateCanteenSample = () =>
useMockMutation((genders: Record<string, 'Male' | 'Female'>) => bd.generateCanteenSample(genders), (r) => `Sample: ${r.items} menu items, ${r.wallets} wallets, ${r.rooms} hostel rooms.`);
