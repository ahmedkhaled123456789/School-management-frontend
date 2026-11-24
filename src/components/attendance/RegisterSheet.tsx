import { useEffect, useMemo, useState } from 'react';
import {
  CheckCheckIcon,
  DoorOpenIcon,
  HeartPulseIcon,
  HistoryIcon,
  LockIcon,
  MessageSquarePlusIcon,
  RotateCcwIcon,
  ScanLineIcon,
  StethoscopeIcon } from
'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/SearchInput';
import type { HealthAlert } from '../../api/health';
import type { AttendanceMark, AttendanceStatus, MarkHint, RegisterDraft } from '../../types/attendance';
import { ABSENCE_REASONS, STATUSES, STATUS_META, tallyMarks } from '../../utils/attendance';
import { cn } from '../../utils/cn';

interface Props {
  draft: RegisterDraft;
  alerts?: Record<string, HealthAlert>;
  /** admins may change locked registers */
  canOverrideLock?: boolean;
  /** the user may only look (no edit permission) */
  viewOnly?: boolean;
  isSaving?: boolean;
  /** resolves when saved (the saved marks become the new baseline right away) */
  onSave: (marks: AttendanceMark[]) => Promise<unknown>;
}

const HINT_ICON: Record<MarkHint['kind'], LucideIcon> = {
  gate: ScanLineIcon,
  'no-gate': DoorOpenIcon,
  clinic: StethoscopeIcon,
  'earlier-period': HistoryIcon,
  saved: HistoryIcon
};

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: 'bg-success-500 text-white border-success-500',
  late: 'bg-[#fab219] text-ink-900 border-[#fab219]',
  absent: 'bg-danger-500 text-white border-danger-500',
  excused: 'bg-ink-500 text-white border-ink-500'
};

const same = (a: AttendanceMark, b: AttendanceMark) =>
a.status === b.status && (a.minutesLate ?? 0) === (b.minutesLate ?? 0) && (a.reason ?? '') === (b.reason ?? '') && (a.note ?? '') === (b.note ?? '');

/** Problems that block saving (shown on the row). */
function rowError(mark: AttendanceMark): string | null {
  if (mark.status === 'late' && (!Number.isInteger(mark.minutesLate) || (mark.minutesLate ?? 0) < 1 || (mark.minutesLate ?? 0) > 240)) return 'Enter 1–240 minutes';
  return null;
}

/**
 * The register for one lesson: one row per student with Present / Late /
 * Absent / Excused, suggestions explained, health alerts, and a sticky save bar.
 */
export function RegisterSheet({ draft, alerts = {}, canOverrideLock, viewOnly, isSaving, onSave }: Props) {
  const [initial, setInitial] = useState<AttendanceMark[]>(draft.marks);
  const [marks, setMarks] = useState<AttendanceMark[]>(draft.marks);
  const [query, setQuery] = useState('');
  const [notesOpen, setNotesOpen] = useState<Set<string>>(() => new Set(initial.filter((m) => m.note).map((m) => m.student._id)));
  useEffect(() => {
    setInitial(draft.marks);
    setMarks(draft.marks);
  }, [draft]);

  const readOnly = viewOnly || draft.locked && !canOverrideLock;
  const tally = tallyMarks(marks);
  const changed = marks.filter((m, i) => !initial[i] || !same(m, initial[i])).length;
  const [savedOnce, setSavedOnce] = useState(false);
  useEffect(() => setSavedOnce(false), [draft.section._id, draft.date, draft.periodId]);
  const isNew = !draft.register && !savedOnce;
  const dirty = changed > 0;
  const errors = marks.map(rowError);
  const blocking = errors.filter(Boolean).length;

  // keep work from being lost by closing the tab
  useEffect(() => {
    if (!dirty || readOnly) return undefined;
    const warn = (e: BeforeUnloadEvent) => {e.preventDefault();e.returnValue = '';};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, readOnly]);

  const update = (id: string, patch: Partial<AttendanceMark>) =>
  setMarks((prev) => prev.map((m) => {
    if (m.student._id !== id) return m;
    const next = { ...m, ...patch };
    if (patch.status) {
      if (patch.status !== 'late') delete next.minutesLate;else
      if (!next.minutesLate) next.minutesLate = 5;
      if (patch.status !== 'absent' && patch.status !== 'excused') delete next.reason;
    }
    return next;
  }));

  const markAllPresent = () =>
  setMarks((prev) => prev.map((m) => draft.hints[m.student._id]?.some((h) => h.kind === 'clinic') ? m : { student: m.student, status: 'present', ...(m.note ? { note: m.note } : {}) }));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marks.
    map((mark, index) => ({ mark, index })).
    filter(({ mark }) => !q || mark.student.name.toLowerCase().includes(q) || mark.student.studentId?.toLowerCase().includes(q));
  }, [marks, query]);

  const suggested = isNew && Object.values(draft.hints).some((list) => list.some((h) => h.kind !== 'saved'));

  return (
    <div>
      {readOnly &&
      <p className="mb-4 flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-2.5 text-[13px] text-ink-700">
          <LockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {viewOnly ? 'View only: your role can not change registers.' : 'This register is locked. Ask the school office to correct it.'}
        </p>
      }
      {suggested && !readOnly &&
      <p className="mb-4 rounded-lg border border-primary-100 bg-primary-50 px-3.5 py-2.5 text-[13px] text-ink-700">
          <strong>Suggested marks.</strong> Filled in from today&apos;s gate check-ins, clinic visits and earlier periods. Check them and save.
        </p>
      }

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ul className="flex flex-wrap gap-2" aria-label="Totals">
          {STATUSES.map((s) =>
          <li key={s} className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12.5px]">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].color }} aria-hidden="true" />
              <span className="text-ink-600">{STATUS_META[s].label}</span>
              <strong className="font-mono text-ink-900">{tally[s]}</strong>
            </li>
          )}
        </ul>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="w-52"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Find a student…" /></div>
          {!readOnly &&
          <>
              <Button variant="secondary" size="sm" icon={<CheckCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={markAllPresent}>All present</Button>
              <Button variant="ghost" size="sm" disabled={!dirty} icon={<RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setMarks(initial)}>Undo</Button>
            </>
          }
        </div>
      </div>

      <ol className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
        {visible.length === 0 &&
        <li className="px-4 py-8 text-center text-[13px] text-ink-500">{marks.length ? 'No student matches your search.' : 'This section has no students yet.'}</li>
        }
        {visible.map(({ mark, index }) => {
          const id = mark.student._id;
          const hints = draft.hints[id] ?? [];
          const alert = alerts[id];
          const severe = alert?.allergies.some((a) => a.severity === 'severe');
          const error = errors[index];
          const name = mark.student.name;
          return (
            <li key={id} className={cn('px-4 py-3', initial[index] && !same(mark, initial[index]) && 'bg-primary-50/40')}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-[12px] font-bold text-ink-600" aria-hidden="true">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5">
                    <span dir="auto" className="truncate text-[14px] font-semibold text-ink-900">{name}</span>
                    {alert &&
                    <span
                      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-bold', severe ? 'bg-danger-50 text-danger-600' : 'bg-warn-50 text-warn-500')}
                      title={[...alert.allergies.map((a) => `${a.name} allergy (${a.severity})${a.reaction ? `: ${a.reaction}` : ''}`), ...alert.conditions].join('\n')}>
                        <HeartPulseIcon className="h-3 w-3" aria-hidden="true" />
                        <span className="sr-only">Health alert: </span>
                        {[...alert.allergies.map((a) => a.name), ...alert.conditions].slice(0, 2).join(', ')}
                      </span>
                    }
                  </p>
                  <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-ink-500">
                    {mark.student.studentId && <span className="font-mono">{mark.student.studentId}</span>}
                    {hints.map((h, i) => {
                      const Icon = HINT_ICON[h.kind];
                      return <span key={i} className={cn('inline-flex items-center gap-1', (h.kind === 'clinic' || h.kind === 'no-gate') && 'text-danger-600')}><Icon className="h-3 w-3" aria-hidden="true" />{h.text}</span>;
                    })}
                  </p>
                </div>
                <div role="radiogroup" aria-label={`Attendance for ${name}`} className="flex shrink-0 gap-1">
                  {STATUSES.map((s) => {
                    const on = mark.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={STATUS_META[s].label}
                        title={STATUS_META[s].label}
                        disabled={readOnly}
                        onClick={() => update(id, { status: s })}
                        className={cn(
                          'h-9 min-w-[38px] rounded-lg border px-2 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed',
                          on ? STATUS_STYLE[s] : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50 disabled:hover:bg-white'
                        )}>
                        <span aria-hidden="true">{STATUS_META[s].short}</span>
                        <span className="ms-1 hidden text-[12px] font-semibold sm:inline">{on ? STATUS_META[s].label : ''}</span>
                      </button>);

                  })}
                </div>
                {!readOnly &&
                <button
                  type="button"
                  aria-label={`Note for ${name}`}
                  aria-expanded={notesOpen.has(id)}
                  onClick={() => setNotesOpen((prev) => {const next = new Set(prev);if (next.has(id)) next.delete(id);else next.add(id);return next;})}
                  className={cn('rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700', mark.note && 'text-primary-600')}>
                    <MessageSquarePlusIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                }
              </div>

              {(mark.status === 'late' || mark.status === 'absent' || mark.status === 'excused' || notesOpen.has(id)) &&
              <div className="mt-2 flex flex-wrap gap-2 ps-11">
                  {mark.status === 'late' &&
                <label className="flex items-center gap-2 text-[12.5px] text-ink-600">
                      Minutes late
                      <input
                    type="number"
                    min={1}
                    max={240}
                    value={mark.minutesLate ?? ''}
                    disabled={readOnly}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => update(id, { minutesLate: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className={cn('h-8 w-20 rounded-lg border px-2 text-[13px]', error ? 'border-danger-500' : 'border-ink-200')} />
                      {error && <span className="text-danger-600">{error}</span>}
                    </label>
                }
                  {(mark.status === 'absent' || mark.status === 'excused') &&
                <label className="flex items-center gap-2 text-[12.5px] text-ink-600">
                      Reason
                      <select
                    value={mark.reason ?? ''}
                    disabled={readOnly}
                    onChange={(e) => update(id, { reason: e.target.value || undefined })}
                    className="h-8 rounded-lg border border-ink-200 bg-white px-2 text-[13px]">
                        <option value="">{mark.status === 'absent' ? 'Unknown' : 'Choose…'}</option>
                        {[...new Set([...ABSENCE_REASONS, ...mark.reason ? [mark.reason] : []])].map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </label>
                }
                  {notesOpen.has(id) &&
                <input
                  type="text"
                  maxLength={200}
                  value={mark.note ?? ''}
                  disabled={readOnly}
                  aria-label={`Note for ${name}`}
                  placeholder="Note (visible to the office)"
                  onChange={(e) => update(id, { note: e.target.value || undefined })}
                  className="h-8 min-w-[220px] flex-1 rounded-lg border border-ink-200 px-2 text-[13px]" />
                }
                </div>
              }
            </li>);

        })}
      </ol>

      {!readOnly &&
      <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white/95 px-4 py-3 shadow-pop backdrop-blur">
          <p className="text-[13px] text-ink-600" aria-live="polite">
            {blocking ? <span className="text-danger-600">{blocking} row(s) need attention.</span> :
          isNew ? `${marks.length} student(s) · not saved yet` :
          dirty ? `${changed} change(s) not saved` :
          `Saved${draft.register?.updatedAt ? ` · ${new Date(draft.register.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}${draft.register?.takenBy ? ` by ${draft.register.takenBy.name}` : ''}`}
          </p>
          <Button isLoading={isSaving} disabled={!marks.length || blocking > 0 || !isNew && !dirty} onClick={() => onSave(marks).then(() => {setInitial(marks);setSavedOnce(true);}).catch(() => undefined)}>
            {isNew ? 'Save attendance' : 'Save changes'}
          </Button>
        </div>
      }
    </div>);

}
