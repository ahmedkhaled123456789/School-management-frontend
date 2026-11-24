/**
 * Hostel & canteen — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST/PUT/DELETE /hostel/rooms, POST /hostel/allocations, PATCH /hostel/allocations/:id
 *   GET/POST/PUT /canteen/menu, GET /canteen/wallets/:student, POST /canteen/wallets/:student/{topup,limit}
 *   GET /canteen/till/:code, POST /canteen/purchases, POST /canteen/purchases/:id/refund
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type { BedAllocation, HostelRoom, MenuItem, MenuItemPayload, RoomView, TillCustomer, Wallet, WalletTx } from '../types/boarding';
import type { StudentRef } from '../types/sections';
import { isDateKey, todayKey } from '../utils/attendance';
import { sectionLabel } from '../utils/timetable';
import { notify, type Viewer } from './communication';

const READ = 'students.read';
const MANAGE = 'students.manage';
export const ALLERGENS = ['Peanuts', 'Tree nuts', 'Eggs', 'Lactose', 'Gluten', 'Sesame', 'Fish', 'Soy'];
const LOW_BALANCE = 2000; // 20 EGP

function findStudent(db: MockDb, idOrCode: string): {student: StudentRef;section: string;} | null {
  const value = idOrCode.trim().toLowerCase();
  const sections = [...db.sections].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  for (const s of sections) {
    const st = s.students.find((x) => x._id.toLowerCase() === value || x.studentId?.toLowerCase() === value);
    if (st) return { student: st, section: sectionLabel(s) };
  }
  return null;
}

/** Families: only their own children; admins with the permission. */
function familyOrAdmin(studentId: string, viewer: Viewer, permission = READ) {
  const { role } = sessionActor();
  if (role === 'admin') return requirePermission(permission);
  if ((role !== 'parent' && role !== 'student') || !viewer.studentIds?.includes(studentId)) fail(403, 'You can only see your own child');
}

/* ---------------------------------- hostel --------------------------------- */

const activeAlloc = (db: MockDb) => db.allocations.filter((a) => a.status === 'active');

function roomView(db: MockDb, room: HostelRoom): RoomView {
  const allocs = activeAlloc(db).filter((a) => a.roomId === room._id);
  return { ...room, occupants: Array.from({ length: room.beds }, (_, i) => ({ bed: i + 1, allocation: allocs.find((a) => a.bed === i + 1) })) };
}

export async function listHostelRooms(): Promise<RoomView[]> {
  requirePermission(READ);
  return read((db) => db.hostelRooms.map((r) => roomView(db, r)).sort((a, b) => a.block.localeCompare(b.block) || a.name.localeCompare(b.name, undefined, { numeric: true })));
}

export async function saveHostelRoom(p: Omit<HostelRoom, '_id'>, id?: string): Promise<HostelRoom> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!p.block?.trim() || !p.name?.trim()) fail(400, 'Enter the block and room name');
    if (!['Male', 'Female'].includes(p.gender)) fail(400, 'Choose boys or girls');
    if (!Number.isInteger(p.beds) || p.beds < 1 || p.beds > 12) fail(400, 'Beds: 1–12');
    if (db.hostelRooms.some((r) => r._id !== id && r.block.toLowerCase() === p.block.trim().toLowerCase() && r.name.toLowerCase() === p.name.trim().toLowerCase())) fail(409, 'This room already exists in the block');
    if (id) {
      const used = activeAlloc(db).filter((a) => a.roomId === id);
      if (used.some((a) => a.bed > p.beds)) fail(409, 'A student sleeps in a bed you removed: move them first');
      const room = db.hostelRooms.find((r) => r._id === id);
      if (room && used.length && room.gender !== p.gender) fail(409, 'Empty the room before changing boys/girls');
    }
    const room: HostelRoom = { _id: id ?? newId(), block: p.block.trim(), name: p.name.trim(), gender: p.gender, beds: p.beds };
    db.hostelRooms = [...db.hostelRooms.filter((r) => r._id !== id), room];
    return room;
  });
}

export async function deleteHostelRoom(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {
    if (activeAlloc(db).some((a) => a.roomId === id)) fail(409, 'Students sleep in this room');
    db.hostelRooms = db.hostelRooms.filter((r) => r._id !== id);
  });
}

/** Gives a bed. The student's gender (from the student record) must match the room. */
export async function allocateBed(studentId: string, gender: 'Male' | 'Female' | undefined, roomId: string, bed: number, from: string): Promise<BedAllocation> {
  requirePermission(MANAGE);
  return write((db) => {
    const found = findStudent(db, studentId);
    if (!found) fail(404, 'Student not found in the sections');
    const room = db.hostelRooms.find((r) => r._id === roomId);
    if (!room) fail(404, 'Room not found');
    if (!gender) fail(400, "The student's gender is not on file: update the student record first");
    if (gender !== room.gender) fail(409, `${room.block} ${room.name} is a ${room.gender === 'Male' ? 'boys' : 'girls'} room`);
    if (!Number.isInteger(bed) || bed < 1 || bed > room.beds) fail(400, 'Choose a bed');
    if (!isDateKey(from)) fail(400, 'Choose the start date');
    const current = activeAlloc(db).find((a) => a.student._id === found.student._id);
    if (current) fail(409, `${found.student.name} already has a bed: move them instead`);
    if (activeAlloc(db).some((a) => a.roomId === roomId && a.bed === bed)) fail(409, `Bed ${bed} is taken`);
    const alloc: BedAllocation = { _id: newId(), student: found.student, section: found.section, roomId, bed, from, status: 'active' };
    db.allocations.push(alloc);
    notify(db, { to: [`parent-of:${found.student._id}`], kind: 'canteen', title: `Boarding: ${room.block} ${room.name}, bed ${bed}`, body: `${found.student.name} from ${from}.`, href: { parent: `/parent/canteen?child=${found.student._id}` } });
    return alloc;
  });
}

export async function moveBed(id: string, roomId: string, bed: number): Promise<BedAllocation> {
  requirePermission(MANAGE);
  return write((db) => {
    const alloc = db.allocations.find((a) => a._id === id && a.status === 'active');
    if (!alloc) fail(404, 'Allocation not found');
    const from = db.hostelRooms.find((r) => r._id === alloc.roomId);
    const room = db.hostelRooms.find((r) => r._id === roomId);
    if (!room) fail(404, 'Room not found');
    if (from && from.gender !== room.gender) fail(409, `${room.block} ${room.name} is a ${room.gender === 'Male' ? 'boys' : 'girls'} room`);
    if (bed < 1 || bed > room.beds) fail(400, 'Choose a bed');
    if (activeAlloc(db).some((a) => a._id !== id && a.roomId === roomId && a.bed === bed)) fail(409, `Bed ${bed} is taken`);
    alloc.roomId = roomId;
    alloc.bed = bed;
    return alloc;
  });
}

export async function endAllocation(id: string): Promise<BedAllocation> {
  requirePermission(MANAGE);
  return write((db) => {
    const alloc = db.allocations.find((a) => a._id === id && a.status === 'active');
    if (!alloc) fail(404, 'Allocation not found');
    alloc.status = 'ended';
    alloc.to = todayKey();
    return alloc;
  });
}

/* ---------------------------------- canteen -------------------------------- */

export async function listMenu(): Promise<MenuItem[]> {
  sessionActor();
  return read((db) => [...db.menu].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
}

export async function saveMenuItem(p: MenuItemPayload, id?: string): Promise<MenuItem> {
  requirePermission(MANAGE);
  return write((db) => {
    if ((p.name?.trim().length ?? 0) < 2 || p.name.length > 60) fail(400, 'Name: 2–60 characters');
    if (!['Meals', 'Snacks', 'Drinks', 'Fruit'].includes(p.category)) fail(400, 'Choose a category');
    if (!Number.isInteger(p.price) || p.price < 50 || p.price > 50_000) fail(400, 'Price: 0.50–500 EGP');
    if (p.allergens.some((a) => !ALLERGENS.includes(a))) fail(400, 'Unknown allergen');
    if (db.menu.some((m) => m._id !== id && m.name.toLowerCase() === p.name.trim().toLowerCase())) fail(409, 'An item with this name exists');
    const item: MenuItem = { _id: id ?? newId(), name: p.name.trim(), category: p.category, price: p.price, allergens: [...new Set(p.allergens)], available: p.available };
    db.menu = [...db.menu.filter((m) => m._id !== id), item];
    return item;
  });
}

export async function deleteMenuItem(id: string): Promise<void> {
  requirePermission(MANAGE);
  return write((db) => {db.menu = db.menu.filter((m) => m._id !== id);});
}

const walletOf = (db: MockDb, student: StudentRef): Wallet => {
  let w = db.wallets.find((x) => x.student._id === student._id);
  if (!w) {
    w = { student: { _id: student._id, name: student.name }, balance: 0, dailyLimit: 0 };
    db.wallets.push(w);
  }
  return w;
};
const localDate = (iso: string) => {const d = new Date(iso);return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;};
const spentToday = (db: MockDb, studentId: string) =>
-db.walletTx.filter((t) => t.studentId === studentId && localDate(t.at) === todayKey() && t.type !== 'topup').reduce((s, t) => s + t.amount, 0);

export async function getWallet(studentId: string, viewer: Viewer = {}): Promise<{wallet: Wallet;spentToday: number;transactions: WalletTx[];}> {
  familyOrAdmin(studentId, viewer);
  return read((db) => {
    const found = findStudent(db, studentId);
    if (!found) fail(404, 'Student not found');
    const w = db.wallets.find((x) => x.student._id === studentId) ?? { student: { _id: found.student._id, name: found.student.name }, balance: 0, dailyLimit: 0 };
    return { wallet: w, spentToday: spentToday(db, studentId), transactions: db.walletTx.filter((t) => t.studentId === studentId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30) };
  });
}

/** Office (cash) or parent (card — simulated until a payment gateway exists). */
export async function topUp(studentId: string, amount: number, viewer: Viewer = {}): Promise<Wallet> {
  const actor = sessionActor();
  familyOrAdmin(studentId, viewer, MANAGE);
  if (actor.role === 'student') fail(403, 'Ask a parent to top up the wallet');
  return write((db) => {
    if (!Number.isInteger(amount) || amount < 500 || amount > 500_000) fail(400, 'Top up 5–5,000 EGP');
    const found = findStudent(db, studentId);
    if (!found) fail(404, 'Student not found');
    const w = walletOf(db, found.student);
    w.balance += amount;
    db.walletTx.push({ _id: newId(), studentId, type: 'topup', amount, method: actor.role === 'parent' ? 'card' : 'cash', by: actor.ref.name, at: nowIso() });
    return w;
  });
}

export async function setDailyLimit(studentId: string, limit: number, viewer: Viewer = {}): Promise<Wallet> {
  const { role } = sessionActor();
  familyOrAdmin(studentId, viewer, MANAGE);
  if (role === 'student') fail(403, 'Only a parent can change the limit');
  return write((db) => {
    if (!Number.isInteger(limit) || limit < 0 || limit > 100_000) fail(400, 'Daily limit: 0–1,000 EGP (0 = no limit)');
    const found = findStudent(db, studentId);
    if (!found) fail(404, 'Student not found');
    const w = walletOf(db, found.student);
    w.dailyLimit = limit;
    return w;
  });
}

function allergiesOf(db: MockDb, studentId: string) {
  return (db.healthProfiles.find((p) => p.student._id === studentId)?.allergies ?? []).map((a) => ({ name: a.name, severity: a.severity }));
}

export async function getTillCustomer(code: string): Promise<TillCustomer> {
  requirePermission(MANAGE);
  return read((db) => {
    const found = findStudent(db, code);
    if (!found) fail(404, `No student with the code "${code.trim()}"`);
    const w = db.wallets.find((x) => x.student._id === found.student._id) ?? { student: { _id: found.student._id, name: found.student.name }, balance: 0, dailyLimit: 0 };
    return { student: found.student, section: found.section, wallet: w, spentToday: spentToday(db, found.student._id), allergies: allergiesOf(db, found.student._id) };
  });
}

/** Items that clash with the student's allergies (case-insensitive). */
export function allergyClashes(items: MenuItem[], allergies: Array<{name: string;severity: string;}>) {
  const names = new Map(allergies.map((a) => [a.name.trim().toLowerCase(), a]));
  return items.flatMap((i) => i.allergens.filter((x) => names.has(x.toLowerCase())).map((x) => ({ item: i.name, allergen: x, severity: names.get(x.toLowerCase())!.severity })));
}

/**
 * Charges the wallet. A severe allergy blocks the sale; a milder one needs
 * `confirmAllergy`. Balance and the parent's daily limit are enforced.
 */
export async function purchase(code: string, lines: Array<{itemId: string;qty: number;}>, confirmAllergy = false): Promise<{tx: WalletTx;balance: number;}> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const found = findStudent(db, code);
    if (!found) fail(404, `No student with the code "${code.trim()}"`);
    if (!lines.length) fail(400, 'Add at least one item');
    const items = lines.map((l) => {
      const item = db.menu.find((m) => m._id === l.itemId);
      if (!item) fail(404, 'Item not found');
      if (!item.available) fail(409, `${item.name} is sold out`);
      if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 10) fail(400, 'Quantity: 1–10');
      return { item, qty: l.qty };
    });
    const clashes = allergyClashes(items.map((x) => x.item), allergiesOf(db, found.student._id));
    const severe = clashes.find((c) => c.severity === 'severe');
    if (severe) fail(409, `Blocked: ${severe.item} contains ${severe.allergen} — ${found.student.name} has a severe ${severe.allergen} allergy`);
    if (clashes.length && !confirmAllergy) fail(409, `Allergy warning: ${clashes.map((c) => `${c.item} (${c.allergen}, ${c.severity})`).join(', ')}. Confirm to sell anyway.`);
    const total = items.reduce((s, x) => s + x.item.price * x.qty, 0);
    const w = walletOf(db, found.student);
    if (w.balance < total) fail(409, `Not enough balance: ${(w.balance / 100).toFixed(2)} EGP for ${(total / 100).toFixed(2)} EGP`);
    if (w.dailyLimit && spentToday(db, found.student._id) + total > w.dailyLimit) fail(409, `Over the daily limit set by the parents (${(w.dailyLimit / 100).toFixed(2)} EGP; ${(spentToday(db, found.student._id) / 100).toFixed(2)} spent today)`);
    w.balance -= total;
    const tx: WalletTx = { _id: newId(), studentId: found.student._id, type: 'purchase', amount: -total, items: items.map((x) => ({ name: x.item.name, qty: x.qty, price: x.item.price })), by: actor.ref.name, at: nowIso() };
    db.walletTx.push(tx);
    if (w.balance < LOW_BALANCE && w.balance + total >= LOW_BALANCE) {
      notify(db, { to: [`parent-of:${found.student._id}`], kind: 'canteen', title: `Low canteen balance: ${found.student.name}`, body: `${(w.balance / 100).toFixed(2)} EGP left. Top up from the parent portal.`, href: { parent: `/parent/canteen?child=${found.student._id}` } });
    }
    return { tx, balance: w.balance };
  });
}

export async function refund(txId: string): Promise<WalletTx> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    const tx = db.walletTx.find((t) => t._id === txId);
    if (!tx || tx.type !== 'purchase') fail(404, 'Purchase not found');
    if (localDate(tx.at) !== todayKey()) fail(409, 'Only today’s purchases can be refunded at the till');
    if (db.walletTx.some((t) => t.type === 'refund' && t.items?.[0]?.name === `refund:${tx._id}`)) fail(409, 'Already refunded');
    const w = db.wallets.find((x) => x.student._id === tx.studentId)!;
    w.balance += -tx.amount;
    const back: WalletTx = { _id: newId(), studentId: tx.studentId, type: 'refund', amount: -tx.amount, items: [{ name: `refund:${tx._id}`, qty: 1, price: -tx.amount }], by: actor.ref.name, at: nowIso() };
    db.walletTx.push(back);
    return back;
  });
}

export interface CanteenStats {
  salesToday: number;
  ordersToday: number;
  topItems: Array<{name: string;qty: number;}>;
  recent: Array<WalletTx & {student: string;}>;
  walletsTotal: number;
}

export async function getCanteenStats(): Promise<CanteenStats> {
  requirePermission(READ);
  return read((db) => {
    const today = db.walletTx.filter((t) => localDate(t.at) === todayKey());
    const sales = today.filter((t) => t.type === 'purchase');
    const counts = new Map<string, number>();
    sales.forEach((t) => t.items?.forEach((i) => counts.set(i.name, (counts.get(i.name) ?? 0) + i.qty)));
    const refunded = new Set(today.filter((t) => t.type === 'refund').map((t) => t.items?.[0]?.name.replace('refund:', '')));
    const names = new Map(db.wallets.map((w) => [w.student._id, w.student.name]));
    return {
      salesToday: -sales.filter((t) => !refunded.has(t._id)).reduce((s, t) => s + t.amount, 0),
      ordersToday: sales.length - refunded.size,
      topItems: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty })),
      recent: [...today].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15).map((t) => ({ ...t, student: names.get(t.studentId) ?? '' })),
      walletsTotal: db.wallets.reduce((s, w) => s + w.balance, 0)
    };
  });
}

/** Families: wallet + bed of each child. */
export async function getFamilyBoarding(viewer: Viewer): Promise<Array<{studentId: string;wallet: Wallet;spentToday: number;bed?: {room: string;bed: number;from: string;};}>> {
  const { role } = sessionActor();
  if (role !== 'parent' && role !== 'student') fail(403, 'You do not have permission to perform this action');
  return read((db) => (viewer.studentIds ?? []).map((id) => {
    const alloc = activeAlloc(db).find((a) => a.student._id === id);
    const room = alloc && db.hostelRooms.find((r) => r._id === alloc.roomId);
    const found = findStudent(db, id);
    return {
      studentId: id,
      wallet: db.wallets.find((w) => w.student._id === id) ?? { student: { _id: id, name: found?.student.name ?? '' }, balance: 0, dailyLimit: 0 },
      spentToday: spentToday(db, id),
      ...(alloc && room ? { bed: { room: `${room.block} ${room.name}`, bed: alloc.bed, from: alloc.from } } : {})
    };
  }));
}

/* ------------------------------- sample data ------------------------------- */

const MENU: Array<[string, MenuItem['category'], number, string[]]> = [
['Chicken shawarma wrap', 'Meals', 4500, ['Gluten', 'Sesame']],
['Koshari box', 'Meals', 3500, ['Gluten']],
['Cheese & tomato sandwich', 'Meals', 2500, ['Gluten', 'Lactose']],
['Falafel (ta\'meya) sandwich', 'Meals', 1500, ['Gluten', 'Sesame']],
['Peanut butter cookie', 'Snacks', 1000, ['Peanuts', 'Gluten', 'Eggs']],
['Croissant', 'Snacks', 1500, ['Gluten', 'Lactose', 'Eggs']],
['Fruit cup', 'Fruit', 1500, []],
['Banana', 'Fruit', 500, []],
['Water 500 ml', 'Drinks', 500, []],
['Orange juice', 'Drinks', 1500, []],
['Chocolate milk', 'Drinks', 1500, ['Lactose']]];


export async function generateCanteenSample(genders: Record<string, 'Male' | 'Female'>): Promise<{items: number;wallets: number;rooms: number;}> {
  requirePermission(MANAGE);
  return write((db) => {
    if (db.menu.length) fail(409, 'The menu already has items');
    MENU.forEach(([name, category, price, allergens]) => db.menu.push({ _id: newId(), name, category, price, allergens, available: true }));
    const students = db.sections.flatMap((s) => s.students);
    students.forEach((st, i) => {
      const w = walletOf(db, st);
      const amount = [10_000, 5_000, 20_000, 1_500][i % 4];
      w.balance = amount;
      if (i % 3 === 0) w.dailyLimit = 5_000;
      db.walletTx.push({ _id: newId(), studentId: st._id, type: 'topup', amount, method: 'card', by: 'Parent', at: nowIso() });
    });
    if (!db.hostelRooms.length) {
      [['Boys block', 'B-101', 'Male'], ['Boys block', 'B-102', 'Male'], ['Girls block', 'G-101', 'Female'], ['Girls block', 'G-102', 'Female']].forEach(([block, name, gender]) =>
      db.hostelRooms.push({ _id: newId(), block, name, gender: gender as 'Male' | 'Female', beds: 4 })
      );
      // two boarders of each gender (when known)
      (['Male', 'Female'] as const).forEach((g) => {
        const room = db.hostelRooms.find((r) => r.gender === g)!;
        students.filter((st) => genders[st._id] === g).slice(0, 2).forEach((st, i) => {
          const sec = db.sections.find((s) => s.students.some((x) => x._id === st._id));
          db.allocations.push({ _id: newId(), student: st, section: sec ? sectionLabel(sec) : '', roomId: room._id, bed: i + 1, from: todayKey(), status: 'active' });
        });
      });
    }
    return { items: db.menu.length, wallets: students.length, rooms: db.hostelRooms.length };
  });
}

