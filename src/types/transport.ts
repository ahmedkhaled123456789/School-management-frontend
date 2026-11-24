import type { Ref, StudentRef } from './sections';

/** Transport: buses, routes with stops, subscriptions and daily boarding. MOCK API for now. */

export interface Bus {
  _id: string;
  name: string;
  plate: string;
  capacity: number;
  driver: {name: string;phone: string;};
  supervisor?: {name: string;phone: string;};
}

export type BusPayload = Omit<Bus, '_id'>;

export interface Stop {
  _id: string;
  name: string;
  /** morning pick-up "HH:MM" */
  pickup: string;
  /** afternoon drop-off "HH:MM" */
  dropoff: string;
}

export interface Route {
  _id: string;
  name: string;
  busId: string | null;
  stops: Stop[];
  /** term fee, minor units */
  fee: number;
}

export interface RoutePayload {
  name: string;
  busId: string | null;
  stops: Array<Omit<Stop, '_id'> & {_id?: string;}>;
  fee: number;
}

export interface Subscription {
  _id: string;
  student: StudentRef;
  section: string;
  routeId: string;
  stopId: string;
  startOn: string;
  status: 'active' | 'cancelled';
  cancelledOn?: string;
  paid?: {on: string;method: 'cash' | 'card' | 'transfer';by: string;};
  createdAt: string;
}

export type Trip = 'morning' | 'afternoon';

export interface Boarding {
  _id: string;
  date: string;
  routeId: string;
  trip: Trip;
  studentId: string;
  /** "HH:MM" */
  at: string;
  method: 'scan' | 'list';
}

export interface TripRun {
  _id: string;
  date: string;
  routeId: string;
  trip: Trip;
  departedAt: string;
}

/** A route as the screens use it: bus, occupancy, riders. */
export interface RouteView extends Route {
  bus: Bus | null;
  riders: number;
  /** riders per stop id */
  perStop: Record<string, number>;
}

/** One trip as the bus supervisor sees it. */
export interface TripSheet {
  route: RouteView;
  date: string;
  trip: Trip;
  departedAt?: string;
  riders: Array<{subscription: Subscription;stop: Stop;boardedAt?: string;}>;
}

/** What a family sees about a child's bus. */
export interface FamilyTransport {
  student: Ref;
  subscription: Subscription;
  route: Route;
  stop: Stop;
  bus: Bus | null;
  today: Partial<Record<Trip, {boardedAt?: string;departedAt?: string;}>>;
}
