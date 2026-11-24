import { useQuery } from '@tanstack/react-query';
import * as api from '../../api/events';
import type { Viewer } from '../../api/communication';
import type { EventPayload, EventResult } from '../../types/events';
import { ROOT, useMockMutation } from '../sections';

const keys = {
  list: (year: string) => [...ROOT, 'events', 'list', year] as const,
  one: (id: string) => [...ROOT, 'events', 'one', id] as const,
  family: (v: Viewer) => [...ROOT, 'events', 'family', v] as const
};

export const useEvents = (year: string) => useQuery({ queryKey: keys.list(year), queryFn: () => api.listEvents(year), enabled: Boolean(year) });
export const useEvent = (id?: string) => useQuery({ queryKey: keys.one(id ?? ''), queryFn: () => api.getEvent(id as string), enabled: Boolean(id), retry: false });

export const useSaveEvent = (year: string) =>
useMockMutation(({ payload, id }: {payload: EventPayload;id?: string;}) => api.saveEvent(year, payload, id), (e) => e.createdAt === e.updatedAt ? `"${e.title}" saved as a draft.` : `"${e.title}" updated.`);
export const usePublishEvent = () => useMockMutation((id: string) => api.publishEvent(id), (e) => `"${e.title}" published. Families were notified.`);
export const useCancelEvent = () =>
useMockMutation(({ id, reason }: {id: string;reason: string;}) => api.cancelEvent(id, reason), (e) => `"${e.title}" cancelled. Families were notified.`);
export const useDeleteEvent = () => useMockMutation((id: string) => api.deleteEvent(id), 'Draft deleted.');
export const useRecordEventPayment = () =>
useMockMutation(({ id, studentId, method }: {id: string;studentId: string;method: 'cash' | 'card' | 'transfer';}) => api.recordEventPayment(id, studentId, method), 'Payment recorded.');
export const useUndoEventPayment = () =>
useMockMutation(({ id, studentId }: {id: string;studentId: string;}) => api.undoEventPayment(id, studentId), 'Payment removed.');
export const useSaveEventResults = () =>
useMockMutation(({ id, results }: {id: string;results: EventResult[];}) => api.saveEventResults(id, results), 'Results saved. Winners’ families were notified.');

export const useFamilyEvents = (viewer: Viewer, enabled = true) =>
useQuery({ queryKey: keys.family(viewer), queryFn: () => api.listFamilyEvents(viewer), enabled });
export const useRespondToEvent = (viewer: Viewer) =>
useMockMutation(
  ({ id, studentId, decision, note }: {id: string;studentId: string;decision: 'approved' | 'declined';note?: string;}) => api.respondToEvent(id, studentId, decision, note, viewer),
  (r) => r.decision === 'declined' ? `Declined for ${r.student.name}.` : r.waitlisted ? `${r.student.name} is on the waiting list.` : `Approved for ${r.student.name}.`
);
