/**
 * Transport — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST/PUT/DELETE /transport/buses, /transport/routes
 *   GET/POST /transport/subscriptions, PATCH /transport/subscriptions/:id
 *   GET /transport/trips/:route/:trip, POST /transport/trips/:route/:trip/{board,depart}
 *   GET /transport/family
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type { Boarding, Bus, BusPayload, FamilyTransport, Route, RoutePayload, RouteView, Subscription, Trip, TripSheet } from '../types/transport';
import { isDateKey, isSchoolDate, nowTime, todayKey } from '../utils/attendance';
import { formatTime, sectionLabel, toMinutes } from '../utils/timetable';
import { notify, queueOutbox, type Viewer } from './communication';

const READ = 'students.read';
const MANAGE = 'students.manage';
const PHONE = /^\+?[\d\s-]{7,20}$/;

/* -------------------------------- helpers --------------------------------- */

const activeOn = (db: MockDb, routeId: string) => db.subscriptions.filter((s) => s.routeId === routeId && s.status === 'active');
const busOf = (db: MockDb, route: Route) => db.buses.find((b) => b._id === route.busId) ?? null;

function view(db: MockDb, route: Route): RouteView {
  const subs = activeOn(db, route._id);
  const perStop: Record<string, number> = {};
  subs.forEach((s) => {perStop[s.stopId] = (perStop[s.stopId] ?? 0) + 1;});
  return { ...route, bus: busOf(db, route), riders: subs.length, perStop };
}

const findRoute = (db: MockDb, id: string) => {
  const route = db.routes.find((r) => r._id === id);
  if (!route) fail(404, 'Route not found');
  return route;
};

function studentById(db: MockDb, idOrCode: string) {
  const value = idOrCode.trim().toLowerCase();
  const sections = [...db.sections].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  for (const s of sections) {
    const st = s.students.find((x) => x._id.toLowerCase() === value || x.studentId?.toLowerCase() === value);
    if (st) return { student: st, section: sectionLabel(s) };
  }
  return null;
}

const familyHref = (studentId: string) => ({ parent: `/parent/transport?child=${studentId}` });

/* ---------------------------------- buses ---------------------------------- */

export async function listBuses(): Promise<Bus[]> {
  requirePermission(READ);
  return read((db) => [...db.buses].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
}

export async function saveBus(p: BusPayload, id?: string): Promise<Bus> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!p.name?.trim() || p.name.length > 30) fail(400, 'Bus name: 1–30 characters');
    if (!p.plate?.trim() || p.plate.length > 15) fail(400, 'Enter the plate number');
    if (!Number.isInteger(p.capacity) || p.capacity < 4 || p.capacity > 80) fail(400, 'Seats: 4–80');
    if ((p.driver?.name?.trim().length ?? 0) < 3) fail(400, "Enter the driver's name");
    if (!PHONE.test(p.driver.phone?.trim() ?? '')) fail(400, "Enter the driver's phone");
    if (p.supervisor?.name?.trim() && !PHONE.test(p.supervisor.phone?.trim() ?? '')) fail(400, "Enter the supervisor's phone");
    if (db.buses.some((b) => b._id !== id && (b.name.toLowerCase() === p.name.trim().toLowerCase() || b.plate.replace(/\s/g, '') === p.plate.replace(/\s/g, '')))) fail(409, 'Another bus has this name or plate');
    if (id) {
      const route = db.routes.find((r) => r.busId === id);
      if (route && activeOn(db, route._id).length > p.capacity) fail(409, `${route.name} has ${activeOn(db, route._id).length} riders: the bus needs at least that many seats`);
    }
    const bus: Bus = {
      _id: id ?? newId(),
      name: p.name.trim(),
      plate: p.plate.trim().toUpperCase(),
      capacity: p.capacity,
      driver: { name: p.driver.name.trim(), phone: p.driver.phone.trim() },
      ...(p.supervisor?.name?.trim() ? { supervisor: { name: p.supervisor.name.trim(), phone: p.supervisor.phone.trim() } } : {})
    };
    db.buses = [...db.buses.filter((b) => b._id !== id), bus];
    return bus;
  });
}

export async function deleteBus(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    const route = db.routes.find((r) => r.busId === id);
    if (route && activeOn(db, route._id).length) fail(409, `${route.name} uses this bus and has riders: assign another bus first`);
    if (route) route.busId = null;
    db.buses = db.buses.filter((b) => b._id !== id);
  });
}

/* ---------------------------------- routes --------------------------------- */

export async function listRoutes(): Promise<RouteView[]> {
  requirePermission(READ);
  return read((db) => db.routes.map((r) => view(db, r)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
}

export async function saveRoute(p: RoutePayload, id?: string): Promise<Route> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!p.name?.trim() || p.name.length > 40) fail(400, 'Route name: 1–40 characters');
    if (db.routes.some((r) => r._id !== id && r.name.toLowerCase() === p.name.trim().toLowerCase())) fail(409, 'Another route has this name');
    if (!p.stops?.length || p.stops.length > 30) fail(400, 'Add 1–30 stops');
    const names = new Set<string>();
    p.stops.forEach((s, i) => {
      const n = s.name?.trim().toLowerCase();
      if (!n) fail(400, `Stop ${i + 1} needs a name`);
      if (names.has(n)) fail(400, `"${s.name.trim()}" is listed twice`);
      names.add(n);
      if (Number.isNaN(toMinutes(s.pickup)) || Number.isNaN(toMinutes(s.dropoff))) fail(400, `${s.name}: use times like 06:50`);
      const prev = p.stops[i - 1];
      if (prev && toMinutes(s.pickup) <= toMinutes(prev.pickup)) fail(400, `${s.name}: morning pick-ups must get later along the route`);
      if (prev && toMinutes(s.dropoff) <= toMinutes(prev.dropoff)) fail(400, `${s.name}: afternoon drop-offs must get later along the route`);
    });
    if (!Number.isInteger(p.fee) || p.fee < 0 || p.fee > 100_000_000) fail(400, 'Enter a valid fee (0 = free)');
    if (p.busId) {
      const bus = db.buses.find((b) => b._id === p.busId);
      if (!bus) fail(400, 'Choose a bus');
      const other = db.routes.find((r) => r._id !== id && r.busId === p.busId);
      if (other) fail(409, `${bus.name} already runs ${other.name}`);
      if (id && activeOn(db, id).length > bus.capacity) fail(409, `${bus.name} has ${bus.capacity} seats for ${activeOn(db, id).length} riders`);
    }
    const stops = p.stops.map((s) => ({ _id: s._id || newId(), name: s.name.trim(), pickup: s.pickup, dropoff: s.dropoff }));
    if (id) {
      const kept = new Set(stops.map((s) => s._id));
      const orphan = activeOn(db, id).find((s) => !kept.has(s.stopId));
      if (orphan) fail(409, `${orphan.student.name} uses a stop you removed: move the rider first`);
    }
    const route: Route = { _id: id ?? newId(), name: p.name.trim(), busId: p.busId || null, stops, fee: p.fee };
    if (id) findRoute(db, id);
    db.routes = [...db.routes.filter((r) => r._id !== id), route];
    return route;
  });
}

export async function deleteRoute(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    findRoute(db, id);
    if (activeOn(db, id).length) fail(409, 'This route has riders: move or cancel them first');
    db.routes = db.routes.filter((r) => r._id !== id);
  });
}

/* ------------------------------- subscriptions ----------------------------- */

export async function listSubscriptions(): Promise<Subscription[]> {
  requirePermission(READ);
  return read((db) => [...db.subscriptions].sort((a, b) => Number(a.status === 'cancelled') - Number(b.status === 'cancelled') || a.student.name.localeCompare(b.student.name)));
}

function checkSeat(db: MockDb, route: Route, ignoreSubscription?: string) {
  const bus = busOf(db, route);
  if (!bus) fail(400, `${route.name} has no bus yet: assign one first`);
  const riders = activeOn(db, route._id).filter((s) => s._id !== ignoreSubscription).length;
  if (riders >= bus.capacity) fail(409, `${route.name} is full (${bus.capacity} seats on ${bus.name})`);
}

export async function subscribe(studentId: string, routeId: string, stopId: string, startOn: string): Promise<Subscription> {
  requirePermission(MANAGE);
  return write((db) => {
    const found = studentById(db, studentId);
    if (!found) fail(404, 'Student not found in the sections');
    const route = findRoute(db, routeId);
    const stop = route.stops.find((s) => s._id === stopId);
    if (!stop) fail(400, 'Choose a stop on this route');
    if (!isDateKey(startOn)) fail(400, 'Choose the start date');
    const current = db.subscriptions.find((s) => s.student._id === found.student._id && s.status === 'active');
    if (current) fail(409, `${found.student.name} already rides ${findRoute(db, current.routeId).name}: change the stop instead`);
    checkSeat(db, route);
    const sub: Subscription = { _id: newId(), student: found.student, section: found.section, routeId, stopId, startOn, status: 'active', createdAt: nowIso() };
    db.subscriptions.push(sub);
    const bus = busOf(db, route);
    notify(db, { to: [`parent-of:${found.student._id}`], kind: 'transport', title: `Bus: ${route.name}`, body: `${found.student.name} rides from ${stop.name} — pick-up ${formatTime(stop.pickup)}, drop-off ${formatTime(stop.dropoff)}. Driver ${bus?.driver.name} ${bus?.driver.phone}.`, href: familyHref(found.student._id) });
    queueOutbox(db, { channel: 'sms', to: `Parents of ${found.student.name}`, kind: 'transport', body: `${found.student.name}: bus ${route.name} from ${startOn}, stop ${stop.name}, pick-up ${stop.pickup}.` });
    return sub;
  });
}

export async function changeStop(id: string, routeId: string, stopId: string): Promise<Subscription> {
  requirePermission(MANAGE);
  return write((db) => {
    const sub = db.subscriptions.find((s) => s._id === id && s.status === 'active');
    if (!sub) fail(404, 'Subscription not found');
    const route = findRoute(db, routeId);
    const stop = route.stops.find((s) => s._id === stopId);
    if (!stop) fail(400, 'Choose a stop on this route');
    if (routeId !== sub.routeId) checkSeat(db, route, sub._id);
    sub.routeId = routeId;
    sub.stopId = stopId;
    notify(db, { to: [`parent-of:${sub.student._id}`], kind: 'transport', title: `Bus stop changed: ${route.name}`, body: `${sub.student.name} now boards at ${stop.name} (${formatTime(stop.pickup)}).`, href: familyHref(sub.student._id) });
    return sub;
  });
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  requirePermission(MANAGE);
  return write((db) => {
    const sub = db.subscriptions.find((s) => s._id === id && s.status === 'active');
    if (!sub) fail(404, 'Subscription not found');
    sub.status = 'cancelled';
    sub.cancelledOn = todayKey();
    return sub;
  });
}

export async function markSubscriptionPaid(id: string, method: 'cash' | 'card' | 'transfer'): Promise<Subscription> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const sub = db.subscriptions.find((s) => s._id === id);
    if (!sub) fail(404, 'Subscription not found');
    if (!findRoute(db, sub.routeId).fee) fail(400, 'This route is free');
    if (sub.paid) fail(409, 'Already paid');
    sub.paid = { on: todayKey(), method, by: actor.ref.name };
    return sub;
  });
}

/* ---------------------------------- trips ---------------------------------- */

export async function getTripSheet(routeId: string, trip: Trip, date = todayKey()): Promise<TripSheet> {
  requirePermission(READ);
  return read((db) => {
    const route = findRoute(db, routeId);
    const order = new Map(route.stops.map((s, i) => [s._id, i]));
    const run = db.tripRuns.find((t) => t.date === date && t.routeId === routeId && t.trip === trip);
    return {
      route: view(db, route),
      date,
      trip,
      ...(run ? { departedAt: run.departedAt } : {}),
      riders: activeOn(db, routeId).
      sort((a, b) => (order.get(a.stopId) ?? 0) - (order.get(b.stopId) ?? 0) || a.student.name.localeCompare(b.student.name)).
      map((s) => ({
        subscription: s,
        stop: route.stops.find((x) => x._id === s.stopId)!,
        boardedAt: db.boardings.find((b) => b.date === date && b.routeId === routeId && b.trip === trip && b.studentId === s.student._id)?.at
      }))
    };
  });
}

/** Marks a rider on board (scanning the ID card QR, or ticking the list). */
export async function board(routeId: string, trip: Trip, code: string, method: Boarding['method']): Promise<Boarding & {name: string;}> {
  requirePermission(MANAGE);
  return write((db) => {
    const date = todayKey();
    if (!isSchoolDate(db.schoolDay, date)) fail(400, 'Today is not a school day');
    const route = findRoute(db, routeId);
    if (db.tripRuns.some((t) => t.date === date && t.routeId === routeId && t.trip === trip)) fail(409, 'This bus already left');
    const found = studentById(db, code);
    if (!found) fail(404, `No student with the code "${code.trim()}"`);
    const sub = activeOn(db, routeId).find((s) => s.student._id === found.student._id);
    if (!sub) {
      const other = db.subscriptions.find((s) => s.student._id === found.student._id && s.status === 'active');
      fail(409, other ? `${found.student.name} rides ${findRoute(db, other.routeId).name}, not ${route.name}` : `${found.student.name} has no bus subscription`);
    }
    const already = db.boardings.find((b) => b.date === date && b.routeId === routeId && b.trip === trip && b.studentId === found.student._id);
    if (already) fail(409, `${found.student.name} boarded at ${already.at}`);
    const boarding: Boarding = { _id: newId(), date, routeId, trip, studentId: found.student._id, at: nowTime(), method };
    db.boardings.push(boarding);
    return { ...boarding, name: found.student.name };
  });
}

export async function unboard(routeId: string, trip: Trip, studentId: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    const date = todayKey();
    if (db.tripRuns.some((t) => t.date === date && t.routeId === routeId && t.trip === trip)) fail(409, 'This bus already left');
    db.boardings = db.boardings.filter((b) => !(b.date === date && b.routeId === routeId && b.trip === trip && b.studentId === studentId));
  });
}

/** The bus leaves: every family on the route hears whether their child is on board. */
export async function depart(routeId: string, trip: Trip): Promise<{onBoard: number;missing: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    const date = todayKey();
    const route = findRoute(db, routeId);
    if (db.tripRuns.some((t) => t.date === date && t.routeId === routeId && t.trip === trip)) fail(409, 'Already marked as departed');
    const at = nowTime();
    db.tripRuns.push({ _id: newId(), date, routeId, trip, departedAt: at });
    let onBoard = 0;
    let missing = 0;
    activeOn(db, routeId).forEach((s) => {
      const boarded = db.boardings.find((b) => b.date === date && b.routeId === routeId && b.trip === trip && b.studentId === s.student._id);
      const stop = route.stops.find((x) => x._id === s.stopId);
      if (boarded) {
        onBoard += 1;
        notify(db, {
          to: [`parent-of:${s.student._id}`], kind: 'transport',
          title: trip === 'morning' ? `${s.student.name} is on the way to school` : `${s.student.name} is on the way home`,
          body: trip === 'morning' ? `${route.name} left at ${formatTime(at)} (boarded ${formatTime(boarded.at)}).` : `${route.name} left school at ${formatTime(at)} · drop-off at ${stop?.name} about ${stop ? formatTime(stop.dropoff) : ''}.`,
          href: familyHref(s.student._id)
        });
      } else {
        missing += 1;
        notify(db, { to: [`parent-of:${s.student._id}`], kind: 'transport', title: `${s.student.name} did not board the ${trip} bus`, body: `${route.name} left at ${formatTime(at)} without ${s.student.name}.`, href: familyHref(s.student._id) });
        queueOutbox(db, { channel: 'sms', to: `Parents of ${s.student.name}`, kind: 'transport', body: `${s.student.name} did not board ${route.name} (${trip}). The bus left at ${at}.` });
      }
    });
    return { onBoard, missing };
  });
}

/* --------------------------------- families -------------------------------- */

export async function getFamilyTransport(viewer: Viewer): Promise<FamilyTransport[]> {
  const { role } = sessionActor();
  if (role !== 'parent' && role !== 'student') fail(403, 'You do not have permission to perform this action');
  return read((db) => {
    const date = todayKey();
    return (viewer.studentIds ?? []).flatMap((id) => {
      const sub = db.subscriptions.find((s) => s.student._id === id && s.status === 'active');
      if (!sub) return [];
      const route = db.routes.find((r) => r._id === sub.routeId);
      const stop = route?.stops.find((s) => s._id === sub.stopId);
      if (!route || !stop) return [];
      const today: FamilyTransport['today'] = {};
      (['morning', 'afternoon'] as Trip[]).forEach((trip) => {
        const b = db.boardings.find((x) => x.date === date && x.routeId === route._id && x.trip === trip && x.studentId === id);
        const run = db.tripRuns.find((x) => x.date === date && x.routeId === route._id && x.trip === trip);
        if (b || run) today[trip] = { ...(b ? { boardedAt: b.at } : {}), ...(run ? { departedAt: run.departedAt } : {}) };
      });
      return [{ student: sub.student, subscription: sub, route, stop, bus: busOf(db, route), today }];
    });
  });
}

/** Today's morning boarding of one student (used by attendance suggestions). */
export const morningBoarding = (db: MockDb, studentId: string, date: string) =>
db.boardings.find((b) => b.date === date && b.trip === 'morning' && b.studentId === studentId);

/* ------------------------------- sample data ------------------------------- */

/** Three buses and routes around Cairo; about two thirds of the students ride. */
export async function generateTransportSample(): Promise<{buses: number;routes: number;riders: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    if (db.routes.length || db.buses.length) fail(409, 'Transport is already set up');
    const buses: Bus[] = [
    { _id: newId(), name: 'Bus 1', plate: 'ق ط ب 1234', capacity: 24, driver: { name: 'Hamdy Saeed', phone: '+20 10 1111 2201' }, supervisor: { name: 'Nagwa Ali', phone: '+20 10 1111 2202' } },
    { _id: newId(), name: 'Bus 2', plate: 'ق ط ب 5678', capacity: 24, driver: { name: 'Sayed Mahmoud', phone: '+20 10 1111 2203' }, supervisor: { name: 'Amal Fathy', phone: '+20 10 1111 2204' } },
    { _id: newId(), name: 'Bus 3', plate: 'ق ط ب 9012', capacity: 14, driver: { name: 'Reda Kamel', phone: '+20 10 1111 2205' } }];

    db.buses.push(...buses);
    const stops = (list: Array<[string, string, string]>) => list.map(([name, pickup, dropoff]) => ({ _id: newId(), name, pickup, dropoff }));
    const routes: Route[] = [
    { _id: newId(), name: 'Route A · Maadi', busId: buses[0]._id, fee: 450000, stops: stops([['Maadi Degla', '06:40', '14:35'], ['Maadi Station', '06:50', '14:45'], ['Corniche El Maadi', '07:05', '14:55'], ['Zahraa El Maadi', '07:15', '15:05']]) },
    { _id: newId(), name: 'Route B · Nasr City', busId: buses[1]._id, fee: 450000, stops: stops([['Abbas El Akkad', '06:35', '14:30'], ['Makram Ebeid', '06:45', '14:40'], ['City Stars', '06:55', '14:50'], ['Rabaa', '07:05', '15:00'], ['Heliopolis Merghany', '07:15', '15:10']]) },
    { _id: newId(), name: 'Route C · New Cairo', busId: buses[2]._id, fee: 500000, stops: stops([['Fifth Settlement', '06:45', '14:40'], ['Rehab Gate 1', '07:00', '14:55'], ['Madinaty', '07:15', '15:10']]) }];

    db.routes.push(...routes);
    const students = db.sections.flatMap((s) => s.students.map((st) => ({ st, section: sectionLabel(s) })));
    let riders = 0;
    students.forEach(({ st, section }, i) => {
      if (i % 3 === 2) return; // a third come by car
      const route = routes[i % routes.length];
      const bus = buses.find((b) => b._id === route.busId)!;
      if (activeOn(db, route._id).length >= bus.capacity) return;
      db.subscriptions.push({
        _id: newId(), student: st, section, routeId: route._id, stopId: route.stops[i % route.stops.length]._id, startOn: todayKey(), status: 'active',
        ...(i % 4 === 0 ? {} : { paid: { on: todayKey(), method: 'transfer' as const, by: 'Accounts' } }), createdAt: nowIso()
      });
      riders += 1;
    });
    return { buses: buses.length, routes: routes.length, riders };
  });
}
