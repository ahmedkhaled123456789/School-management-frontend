/**
 * HR — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST/PUT /hr/contracts, POST /hr/contracts/:id/{renew,terminate}
 *   GET/POST /hr/leave, PATCH /hr/leave/:id, PUT /hr/leave/:id/covers
 *   GET/POST/PUT /hr/reviews, POST /hr/reviews/:id/{share,acknowledge}, GET /hr/facts/:staffId
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write, type MockDb } from './mock/db';
import type { StaffRef } from '../types/attendance';
import type { Contract, ContractPayload, ContractStatus, Cover, LeaveBalance, LeavePayload, LeaveRequest, LeaveType, Review, ReviewPayload, StaffFacts } from '../types/hr';
import type { Ref } from '../types/sections';
import { addDays, daysBetween, formatDay, isDateKey, isSchoolDate, recentSchoolDays, todayKey, dateFromKey } from '../utils/attendance';
import { weekDayOf } from '../utils/timetable';
import { notify, type Viewer } from './communication';

const HR = 'staff.manage';

export const LEAVE_ALLOWANCE: Record<LeaveType, number | null> = { annual: 21, sick: 15, emergency: 3, unpaid: null };
export const LEAVE_LABEL: Record<LeaveType, string> = { annual: 'Annual', sick: 'Sick', emergency: 'Emergency', unpaid: 'Unpaid' };
export const REVIEW_CRITERIA = ['Teaching quality', 'Classroom management', 'Punctuality & attendance', 'Collaboration', 'Professional development'];

/* --------------------------------- helpers --------------------------------- */

const schoolDaysIn = (db: MockDb, from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) if (isSchoolDate(db.schoolDay, d)) out.push(d);
  return out;
};

/** The newest academic year that has a timetable. */
const currentYear = (db: MockDb) => [...db.sections].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]?.academicYear ?? '';

export function contractStatus(c: Pick<Contract, 'endOn' | 'terminated'>, today = todayKey()): ContractStatus {
  if (c.terminated) return 'terminated';
  if (c.endOn && c.endOn < today) return 'expired';
  if (c.endOn && daysBetween(today, c.endOn) <= 60) return 'expiring';
  return 'active';
}

/** Teacher portal: may only act for themselves. */
function selfOrHr(viewer: Viewer, staffId: string) {
  const { role } = sessionActor();
  if (role === 'admin') return requirePermission(HR);
  if (role !== 'teacher' || viewer.teacherId !== staffId) fail(403, 'You can only manage your own HR records');
}

/* -------------------------------- contracts -------------------------------- */

export async function listContracts(): Promise<Contract[]> {
  requirePermission(HR);
  return read((db) => [...db.contracts].sort((a, b) => a.staff.name.localeCompare(b.staff.name) || b.startOn.localeCompare(a.startOn)));
}

function validateContract(p: ContractPayload) {
  if (!p.staff?._id) fail(400, 'Choose the staff member');
  if (!['permanent', 'fixed', 'part_time', 'probation'].includes(p.type)) fail(400, 'Choose the contract type');
  if ((p.jobTitle?.trim().length ?? 0) < 2) fail(400, 'Enter the job title');
  if (!isDateKey(p.startOn)) fail(400, 'Enter the start date');
  if (p.type !== 'permanent' && !p.endOn) fail(400, 'This contract type needs an end date');
  if (p.endOn && (!isDateKey(p.endOn) || p.endOn <= p.startOn)) fail(400, 'The end date must be after the start date');
  if (!Number.isInteger(p.salary) || p.salary < 0 || p.salary > 1_000_000_00) fail(400, 'Enter a valid monthly salary');
  if (!Number.isInteger(p.hoursPerWeek) || p.hoursPerWeek < 1 || p.hoursPerWeek > 60) fail(400, 'Hours per week: 1–60');
  if ((p.notes?.length ?? 0) > 500) fail(400, 'Notes: 500 characters max');
}

export async function saveContract(p: ContractPayload, id?: string): Promise<Contract> {
  const actor = sessionActor();
  requirePermission(HR);
  return write((db) => {
    validateContract(p);
    const clean = {
      staff: p.staff, type: p.type, jobTitle: p.jobTitle.trim(), startOn: p.startOn,
      ...(p.type !== 'permanent' && p.endOn ? { endOn: p.endOn } : {}),
      salary: p.salary, hoursPerWeek: p.hoursPerWeek, ...(p.notes?.trim() ? { notes: p.notes.trim() } : {})
    };
    // one contract at a time: periods may not overlap
    const overlap = db.contracts.find((c) => c._id !== id && c.staff._id === p.staff._id && !c.terminated && (!c.endOn || c.endOn >= clean.startOn) && (!clean.endOn || clean.endOn >= c.startOn));
    if (overlap) fail(409, `${p.staff.name} already has a contract for these dates (${overlap.jobTitle}, from ${overlap.startOn})`);
    if (id) {
      const c = db.contracts.find((x) => x._id === id);
      if (!c) fail(404, 'Contract not found');
      if (c.terminated) fail(409, 'A terminated contract can not be edited');
      delete c.endOn;
      delete c.notes;
      Object.assign(c, clean);
      c.history.push({ at: nowIso(), by: actor.ref.name, action: 'Edited' });
      return c;
    }
    const contract: Contract = { _id: newId(), ...clean, history: [{ at: nowIso(), by: actor.ref.name, action: 'Created' }], createdAt: nowIso() };
    db.contracts.push(contract);
    return contract;
  });
}

export async function renewContract(id: string, endOn: string): Promise<Contract> {
  const actor = sessionActor();
  requirePermission(HR);
  return write((db) => {
    const c = db.contracts.find((x) => x._id === id);
    if (!c) fail(404, 'Contract not found');
    if (c.terminated) fail(409, 'A terminated contract can not be renewed');
    if (!c.endOn) fail(400, 'Permanent contracts do not need renewing');
    if (!isDateKey(endOn) || endOn <= c.endOn) fail(400, `The new end date must be after ${c.endOn}`);
    const before = c.endOn;
    c.endOn = endOn;
    if (c.type === 'probation') c.type = 'fixed';
    c.history.push({ at: nowIso(), by: actor.ref.name, action: `Renewed: ${before} → ${endOn}` });
    if (c.staff.kind === 'teacher') notify(db, { to: [`teacher:${c.staff._id}`], kind: 'hr', title: 'Your contract was renewed', body: `${c.jobTitle} · until ${formatDay(endOn, { day: 'numeric', month: 'long', year: 'numeric' })}`, href: { teacher: '/teacher/leave?tab=contract' } });
    return c;
  });
}

export async function terminateContract(id: string, on: string, reason: string): Promise<Contract> {
  const actor = sessionActor();
  requirePermission(HR);
  return write((db) => {
    const c = db.contracts.find((x) => x._id === id);
    if (!c) fail(404, 'Contract not found');
    if (c.terminated) fail(409, 'Already terminated');
    if (!isDateKey(on) || on < c.startOn) fail(400, 'Choose a date after the start date');
    if (!reason?.trim()) fail(400, 'Give the reason');
    c.terminated = { on, reason: reason.trim().slice(0, 200) };
    c.history.push({ at: nowIso(), by: actor.ref.name, action: `Terminated on ${on}` });
    return c;
  });
}

/** The teacher's own current contract (teacher portal). */
export async function getMyContract(viewer: Viewer): Promise<Contract | null> {
  if (!viewer.teacherId) return null;
  selfOrHr(viewer, viewer.teacherId);
  return read((db) => db.contracts.filter((c) => c.staff._id === viewer.teacherId && !c.terminated).sort((a, b) => b.startOn.localeCompare(a.startOn))[0] ?? null);
}

/* ---------------------------------- leave ---------------------------------- */

export function balances(db: MockDb, staffId: string, year = todayKey().slice(0, 4)): LeaveBalance[] {
  const mine = db.leaves.filter((l) => l.staff._id === staffId && l.from.startsWith(year));
  return (Object.keys(LEAVE_ALLOWANCE) as LeaveType[]).map((type) => {
    const used = mine.filter((l) => l.type === type && l.status === 'approved').reduce((s, l) => s + l.days, 0);
    const pending = mine.filter((l) => l.type === type && l.status === 'pending').reduce((s, l) => s + l.days, 0);
    const allowance = LEAVE_ALLOWANCE[type];
    return { type, allowance, used, pending, left: allowance === null ? null : allowance - used };
  });
}

export async function getBalances(staffId: string, viewer: Viewer = {}): Promise<LeaveBalance[]> {
  selfOrHr(viewer, staffId);
  return read((db) => balances(db, staffId));
}

export async function listLeave(viewer: Viewer = {}): Promise<LeaveRequest[]> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(HR);else
  if (role !== 'teacher' || !viewer.teacherId) fail(403, 'You do not have permission to perform this action');
  return read((db) => db.leaves.
  filter((l) => role === 'admin' || l.staff._id === viewer.teacherId).
  sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.from.localeCompare(a.from)));
}

export async function requestLeave(p: LeavePayload, viewer: Viewer = {}): Promise<LeaveRequest> {
  selfOrHr(viewer, p.staff?._id);
  const { role } = sessionActor();
  return write((db) => {
    if (!p.staff?._id) fail(400, 'Choose the staff member');
    if (!Object.keys(LEAVE_ALLOWANCE).includes(p.type)) fail(400, 'Choose the type of leave');
    if (!isDateKey(p.from) || !isDateKey(p.to) || p.to < p.from) fail(400, 'Choose valid dates (the end on or after the start)');
    if (daysBetween(p.from, p.to) > 90) fail(400, 'One request can cover at most 90 days');
    // only sick leave may be recorded afterwards (up to 7 days back)
    if (p.from < todayKey() && (p.type !== 'sick' || daysBetween(p.from, todayKey()) > 7)) fail(400, p.type === 'sick' ? 'Sick leave can be recorded up to 7 days back' : 'Leave must start today or later');
    if (!p.reason?.trim() || p.reason.length > 300) fail(400, 'Give a reason (300 characters max)');
    const days = schoolDaysIn(db, p.from, p.to).length;
    if (!days) fail(400, 'There are no school days in these dates');
    const overlap = db.leaves.find((l) => l.staff._id === p.staff._id && ['pending', 'approved'].includes(l.status) && l.from <= p.to && l.to >= p.from);
    if (overlap) fail(409, `This overlaps another ${overlap.status} request (${overlap.from} → ${overlap.to})`);
    const bal = balances(db, p.staff._id, p.from.slice(0, 4)).find((b) => b.type === p.type)!;
    if (bal.left !== null && days > bal.left - bal.pending) fail(409, `Only ${Math.max(bal.left - bal.pending, 0)} ${p.type} day(s) left (${days} requested)`);
    const leave: LeaveRequest = { _id: newId(), staff: p.staff, type: p.type, from: p.from, to: p.to, days, reason: p.reason.trim(), status: 'pending', covers: [], createdAt: nowIso() };
    db.leaves.push(leave);
    if (role === 'teacher') notify(db, { to: ['admin'], kind: 'hr', title: `Leave request: ${p.staff.name}`, body: `${p.type} · ${p.from} → ${p.to} (${days} day(s))`, href: { admin: '/admin/hr/leave' } });
    return leave;
  });
}

/** Every lesson the teacher misses, with a free substitute (same subject first, then the least busy). */
function planCovers(db: MockDb, leave: LeaveRequest, people: StaffRef[]): Cover[] {
  if (leave.staff.kind !== 'teacher') return [];
  const year = currentYear(db);
  const entries = db.entries.filter((e) => e.academicYear === year);
  const mine = entries.filter((e) => e.teacher._id === leave.staff._id);
  const subjectsOf = (id: string) => new Set(entries.filter((e) => e.teacher._id === id).map((e) => e.subject._id));
  const away = (id: string, date: string) => db.leaves.some((l) => l._id !== leave._id && l.status === 'approved' && l.staff._id === id && l.from <= date && l.to >= date);
  const load = new Map<string, number>();
  const covers: Cover[] = [];
  schoolDaysIn(db, leave.from, leave.to).forEach((date) => {
    const day = weekDayOf(dateFromKey(date));
    mine.filter((e) => e.day === day).forEach((e) => {
      const busy = new Set(entries.filter((x) => x.day === day && x.periodId === e.periodId).map((x) => x.teacher._id));
      covers.filter((c) => c.date === date && c.periodId === e.periodId && c.substitute).forEach((c) => busy.add(c.substitute!._id));
      const free = people.filter((p) => p.kind === 'teacher' && p._id !== leave.staff._id && !busy.has(p._id) && !away(p._id, date));
      free.sort((a, b) => Number(subjectsOf(b._id).has(e.subject._id)) - Number(subjectsOf(a._id).has(e.subject._id)) || (load.get(a._id) ?? 0) - (load.get(b._id) ?? 0));
      const sub = free[0] ?? null;
      if (sub) load.set(sub._id, (load.get(sub._id) ?? 0) + 1);
      covers.push({
        date, periodId: e.periodId, periodLabel: db.schoolDay.periods.find((p) => p._id === e.periodId)?.label ?? 'Period',
        section: e.section, subject: e.subject, substitute: sub ? { _id: sub._id, name: sub.name } : null
      });
    });
  });
  return covers.sort((a, b) => a.date.localeCompare(b.date) || a.periodId.localeCompare(b.periodId));
}

function notifyCover(db: MockDb, c: Cover) {
  if (!c.substitute) return;
  notify(db, {
    to: [`teacher:${c.substitute._id}`], kind: 'hr',
    title: `Cover: ${c.section.name} · ${c.periodLabel}`,
    body: `${c.subject.name} · ${formatDay(c.date, { weekday: 'long', day: 'numeric', month: 'short' })}. You can take the register.`,
    href: { teacher: `/teacher/attendance/register?section=${c.section._id}&date=${c.date}&period=${c.periodId}` }
  });
}

/** Records "on leave" in staff attendance for each school day of an approved leave. */
function markLeaveAttendance(db: MockDb, leave: LeaveRequest) {
  schoolDaysIn(db, leave.from, leave.to).forEach((date) => {
    const existing = db.staffAttendance.find((r) => r.date === date && r.staff._id === leave.staff._id);
    if (existing && (existing.status === 'present' || existing.status === 'late')) return; // came in after all
    const record = { _id: existing?._id ?? newId(), date, staff: leave.staff, status: 'leave' as const, source: 'manual' as const, note: `Approved ${leave.type} leave`, createdAt: existing?.createdAt ?? nowIso(), updatedAt: nowIso() };
    db.staffAttendance = [...db.staffAttendance.filter((r) => !(r.date === date && r.staff._id === leave.staff._id)), record];
  });
}

export async function decideLeave(id: string, decision: 'approved' | 'rejected', note: string | undefined, people: StaffRef[]): Promise<LeaveRequest> {
  const actor = sessionActor();
  requirePermission(HR);
  return write((db) => {
    const leave = db.leaves.find((l) => l._id === id);
    if (!leave) fail(404, 'Request not found');
    if (leave.status !== 'pending') fail(409, `This request is already ${leave.status}`);
    if (decision === 'rejected' && !note?.trim()) fail(400, 'Give the reason for rejecting');
    if (decision === 'approved') {
      const bal = balances(db, leave.staff._id, leave.from.slice(0, 4)).find((b) => b.type === leave.type)!;
      if (bal.left !== null && leave.days > bal.left) fail(409, `Only ${bal.left} ${leave.type} day(s) left`);
    }
    leave.status = decision;
    leave.decidedBy = actor.ref.name;
    leave.decisionNote = note?.trim() || undefined;
    if (decision === 'approved') {
      leave.covers = planCovers(db, leave, people);
      leave.covers.forEach((c) => notifyCover(db, c));
      markLeaveAttendance(db, leave);
    }
    if (leave.staff.kind === 'teacher') {
      notify(db, { to: [`teacher:${leave.staff._id}`], kind: 'hr', title: `Leave ${decision}: ${leave.from} → ${leave.to}`, body: note?.trim() || `${leave.days} day(s) of ${leave.type} leave`, href: { teacher: '/teacher/leave' } });
    }
    return leave;
  });
}

/** Changes the substitute of one covered lesson. */
export async function setCover(id: string, index: number, substitute: Ref | null): Promise<LeaveRequest> {
  requirePermission(HR);
  return write((db) => {
    const leave = db.leaves.find((l) => l._id === id);
    const cover = leave?.covers[index];
    if (!leave || !cover) fail(404, 'Lesson not found');
    if (substitute) {
      const day = weekDayOf(dateFromKey(cover.date));
      const busy = db.entries.some((e) => e.day === day && e.periodId === cover.periodId && e.teacher._id === substitute._id) ||
      db.leaves.some((l) => l.status === 'approved' && l.covers.some((c, i) => !(l._id === id && i === index) && c.date === cover.date && c.periodId === cover.periodId && c.substitute?._id === substitute._id));
      if (busy) fail(409, `${substitute.name} teaches or covers another lesson in ${cover.periodLabel}`);
    }
    cover.substitute = substitute;
    notifyCover(db, cover);
    return leave;
  });
}

/** Staff cancel their pending request; HR can also withdraw an approved one (future days come back). */
export async function cancelLeave(id: string, viewer: Viewer = {}): Promise<LeaveRequest> {
  const { role } = sessionActor();
  return write((db) => {
    const leave = db.leaves.find((l) => l._id === id);
    if (!leave) fail(404, 'Request not found');
    if (role === 'admin') requirePermission(HR);else
    if (role !== 'teacher' || leave.staff._id !== viewer.teacherId) fail(403, 'You can only cancel your own requests');
    if (role !== 'admin' && leave.status !== 'pending') fail(409, 'Only pending requests can be cancelled: ask HR');
    if (!['pending', 'approved'].includes(leave.status)) fail(409, `This request is already ${leave.status}`);
    if (leave.status === 'approved') {
      const today = todayKey();
      db.staffAttendance = db.staffAttendance.filter((r) => !(r.staff._id === leave.staff._id && r.date >= today && r.date >= leave.from && r.date <= leave.to && r.status === 'leave'));
      leave.covers = leave.covers.filter((c) => c.date < today);
    }
    leave.status = 'cancelled';
    return leave;
  });
}

/** Approved leave covering a lesson today: the substitute may take its register. */
export function coverFor(db: MockDb, teacherId: string, sectionId: string, date: string, periodId: string) {
  return db.leaves.some((l) => l.status === 'approved' && l.covers.some((c) => c.date === date && c.periodId === periodId && c.section._id === sectionId && c.substitute?._id === teacherId));
}

/** Lessons a teacher covers on a day (teacher portal). */
export async function listMyCovers(viewer: Viewer, from = todayKey()): Promise<Array<Cover & {absent: string;}>> {
  if (!viewer.teacherId) return [];
  sessionActor();
  return read((db) => db.leaves.
  filter((l) => l.status === 'approved').
  flatMap((l) => l.covers.filter((c) => c.substitute?._id === viewer.teacherId && c.date >= from).map((c) => ({ ...c, absent: l.staff.name }))).
  sort((a, b) => a.date.localeCompare(b.date) || a.periodId.localeCompare(b.periodId)));
}

/* --------------------------------- reviews --------------------------------- */

export async function listReviews(viewer: Viewer = {}): Promise<Review[]> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(HR);else
  if (role !== 'teacher' || !viewer.teacherId) fail(403, 'You do not have permission to perform this action');
  return read((db) => db.reviews.
  filter((r) => role === 'admin' || r.staff._id === viewer.teacherId && r.status !== 'draft').
  sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function saveReview(p: ReviewPayload, id?: string): Promise<Review> {
  const actor = sessionActor();
  requirePermission(HR);
  return write((db) => {
    if (!p.staff?._id) fail(400, 'Choose the staff member');
    if (!p.period?.trim() || p.period.length > 40) fail(400, 'Enter the review period, e.g. 2026 · Term 1');
    if (!p.scores?.length) fail(400, 'Score at least one criterion');
    p.scores.forEach((s) => {if (!Number.isInteger(s.score) || s.score < 1 || s.score > 5) fail(400, `${s.criterion}: score 1–5`);});
    if ((p.strengths?.length ?? 0) > 1000 || (p.improvements?.length ?? 0) > 1000) fail(400, 'Comments: 1,000 characters max');
    const dup = db.reviews.find((r) => r._id !== id && r.staff._id === p.staff._id && r.period.trim().toLowerCase() === p.period.trim().toLowerCase());
    if (dup) fail(409, `${p.staff.name} already has a review for ${dup.period}`);
    const overall = Math.round(p.scores.reduce((s, x) => s + x.score, 0) / p.scores.length * 10) / 10;
    const clean = { staff: p.staff, period: p.period.trim(), scores: p.scores.map((s) => ({ criterion: s.criterion, score: s.score, ...(s.comment?.trim() ? { comment: s.comment.trim().slice(0, 300) } : {}) })), overall, strengths: p.strengths?.trim() ?? '', improvements: p.improvements?.trim() ?? '' };
    if (id) {
      const r = db.reviews.find((x) => x._id === id);
      if (!r) fail(404, 'Review not found');
      if (r.status === 'acknowledged') fail(409, 'An acknowledged review can not change');
      Object.assign(r, clean, { updatedAt: nowIso() });
      return r;
    }
    const review: Review = { _id: newId(), ...clean, reviewer: actor.ref, status: 'draft', createdAt: nowIso(), updatedAt: nowIso() };
    db.reviews.push(review);
    return review;
  });
}

export async function shareReview(id: string): Promise<Review> {
  requirePermission(HR);
  return write((db) => {
    const r = db.reviews.find((x) => x._id === id);
    if (!r) fail(404, 'Review not found');
    if (r.status !== 'draft') fail(409, 'Already shared');
    r.status = 'shared';
    r.updatedAt = nowIso();
    if (r.staff.kind === 'teacher') notify(db, { to: [`teacher:${r.staff._id}`], kind: 'hr', title: `Your performance review: ${r.period}`, body: `Overall ${r.overall}/5. Read it and acknowledge.`, href: { teacher: '/teacher/leave?tab=reviews' } });
    return r;
  });
}

export async function acknowledgeReview(id: string, comment: string, viewer: Viewer): Promise<Review> {
  const { role } = sessionActor();
  return write((db) => {
    const r = db.reviews.find((x) => x._id === id);
    if (!r) fail(404, 'Review not found');
    if (role !== 'teacher' || r.staff._id !== viewer.teacherId) fail(403, 'Only the reviewed person acknowledges a review');
    if (r.status !== 'shared') fail(409, r.status === 'acknowledged' ? 'Already acknowledged' : 'Not shared yet');
    if ((comment?.length ?? 0) > 500) fail(400, 'Comment: 500 characters max');
    r.status = 'acknowledged';
    r.acknowledgedOn = todayKey();
    if (comment?.trim()) r.staffComment = comment.trim();
    r.updatedAt = nowIso();
    notify(db, { to: ['admin'], kind: 'hr', title: `Review acknowledged: ${r.staff.name}`, body: r.period, href: { admin: '/admin/hr/performance' } });
    return r;
  });
}

/** Facts from attendance, leave and the timetable for the last 90 days. */
export async function getStaffFacts(staffId: string): Promise<StaffFacts> {
  requirePermission(HR);
  return read((db) => {
    const from = addDays(todayKey(), -90);
    const att = db.staffAttendance.filter((r) => r.staff._id === staffId && r.date >= from);
    const year = currentYear(db);
    const lessons = db.entries.filter((e) => e.academicYear === year && e.teacher._id === staffId);
    const days = recentSchoolDays(db.schoolDay, addDays(todayKey(), -1), 30).filter((d) => d >= addDays(todayKey(), -30));
    const expected = days.reduce((n, d) => n + lessons.filter((e) => e.day === weekDayOf(dateFromKey(d))).length, 0);
    const taken = db.registers.filter((r) => r.teacher._id === staffId && days.includes(r.date)).length;
    return {
      daysRecorded: att.length,
      late: att.filter((r) => r.status === 'late').length,
      absent: att.filter((r) => r.status === 'absent').length,
      leaveDays: db.leaves.filter((l) => l.staff._id === staffId && l.status === 'approved' && l.from >= from).reduce((s, l) => s + l.days, 0),
      lessonsPerWeek: lessons.length,
      registersTaken: taken,
      registersExpected: expected
    };
  });
}

/* ------------------------------- sample data ------------------------------- */

/** Contracts for everyone (a few expiring), two leave requests and a review draft. */
export async function generateHrSample(people: StaffRef[]): Promise<{contracts: number;}> {
  const actor = sessionActor();
  requirePermission(HR);
  return write((db) => {
    if (db.contracts.length) fail(409, 'Contracts already exist');
    if (!people.length) fail(400, 'No teachers or staff to add contracts for');
    const today = todayKey();
    people.forEach((p, i) => {
      const type = i % 5 === 0 ? 'permanent' : i % 5 === 4 ? 'probation' : 'fixed';
      const startOn = addDays(today, -(200 + i * 40));
      db.contracts.push({
        _id: newId(), staff: p, type, jobTitle: p.kind === 'teacher' ? 'Teacher' : 'Office staff', startOn,
        ...(type === 'permanent' ? {} : { endOn: addDays(today, i % 3 === 0 ? 25 + i : 160 + i * 20) }),
        salary: (p.kind === 'teacher' ? 1_200_000 : 900_000) + i * 25_000, hoursPerWeek: type === 'probation' ? 30 : 40,
        history: [{ at: nowIso(), by: actor.ref.name, action: 'Created' }], createdAt: nowIso()
      });
    });
    return { contracts: people.length };
  });
}
