import { useEffect, useMemo, useState } from 'react';
import { CoffeeIcon, PlusIcon } from 'lucide-react';
import type { Period, SchoolDay, TimetableEntry, WeekDay } from '../../types/sections';
import { cn } from '../../utils/cn';
import { DAY_LABEL, DAY_SHORT, currentPeriod, formatTime, sortedDays, subjectColor, weekDayOf } from '../../utils/timetable';

/** Whose week is shown — decides what each cell says. */
export type GridPerspective = 'section' | 'teacher' | 'room';

interface TimetableGridProps {
  schoolDay: SchoolDay;
  entries: TimetableEntry[];
  perspective: GridPerspective;
  /** editing: clicking a teaching cell (empty or not) */
  onCellClick?: (day: WeekDay, period: Period, entry?: TimetableEntry) => void;
  /** highlight today and the period running now */
  highlightNow?: boolean;
  /** extra marker per cell, e.g. a clash warning in the editor */
  cellNote?: (day: WeekDay, period: Period) => string | undefined;
}

function CellContent({ entry, perspective, compact }: {entry: TimetableEntry;perspective: GridPerspective;compact?: boolean;}) {
  const lines =
  perspective === 'section' ?
  [entry.teacher.name, entry.room?.name] :
  perspective === 'teacher' ?
  [entry.section.name, entry.room?.name] :
  [entry.section.name, entry.teacher.name];
  return (
    <>
      <p dir="auto" className={cn('truncate font-bold', compact ? 'text-[13px]' : 'text-[12.5px]')}>{entry.subject.name}</p>
      {lines.filter(Boolean).map((line) =>
      <p key={line} dir="auto" className="truncate text-[11.5px] opacity-80">{line}</p>
      )}
    </>);

}

export function TimetableGrid({ schoolDay, entries, perspective, onCellClick, highlightNow = false, cellNote }: TimetableGridProps) {
  const days = sortedDays(schoolDay.days);
  const byCell = useMemo(() => {
    const map = new Map<string, TimetableEntry>();
    entries.forEach((entry) => map.set(`${entry.day}|${entry.periodId}`, entry));
    return map;
  }, [entries]);

  // re-evaluate "now" every minute so the highlight moves on its own
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!highlightNow) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [highlightNow]);
  const today = highlightNow ? weekDayOf(now) : null;
  const running = highlightNow ? currentPeriod(schoolDay, now) : null;

  // phones: one day at a time, starting today when it is a school day
  const [mobileDay, setMobileDay] = useState<WeekDay>(() => today && days.includes(today) ? today : days[0]);
  useEffect(() => {
    if (!days.includes(mobileDay) && days[0]) setMobileDay(days[0]);
  }, [days, mobileDay]);

  const renderCell = (day: WeekDay, period: Period, compact = false) => {
    const entry = byCell.get(`${day}|${period._id}`);
    const note = cellNote?.(day, period);
    const isNow = day === today && running?._id === period._id;
    const body = entry ?
    <div className={cn('h-full rounded-lg border px-2.5 py-2 text-start', subjectColor(entry.subject._id), isNow && 'ring-2 ring-accent-300 ring-offset-1')}>
        <CellContent entry={entry} perspective={perspective} compact={compact} />
        {isNow && <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wider">Now</p>}
      </div> :

    <div className={cn('flex h-full min-h-[56px] items-center justify-center rounded-lg border border-dashed border-ink-200 text-ink-300', onCellClick && 'group-hover:border-primary-300 group-hover:text-primary-500')}>
        {onCellClick ? <PlusIcon className="h-4 w-4" aria-hidden="true" /> : <span className="text-[12px]">—</span>}
      </div>;

    const content =
    <>
        {body}
        {note && <p className="mt-1 text-[11px] font-semibold text-danger-500">{note}</p>}
      </>;

    if (!onCellClick) return content;
    return (
      <button
        type="button"
        className="group block h-full w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        aria-label={`${DAY_LABEL[day]}, ${period.label}: ${entry ? `${entry.subject.name}, edit` : 'empty, add a period'}`}
        onClick={() => onCellClick(day, period, entry)}>

        {content}
      </button>);

  };

  if (!days.length || !schoolDay.periods.length) {
    return <p className="px-5 py-10 text-center text-[13.5px] text-ink-500">The school day is not set up yet.</p>;
  }

  return (
    <>
      {/* desktop / print: full week */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block print:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-1.5 text-[13px]">
          <thead>
            <tr>
              <th scope="col" className="w-28 px-2 py-1.5 text-start text-[11px] font-bold uppercase tracking-wider text-ink-500">Period</th>
              {days.map((day) =>
              <th key={day} scope="col" className={cn('rounded-lg px-2 py-1.5 text-center text-[11.5px] font-bold uppercase tracking-wider', day === today ? 'bg-primary-600 text-white' : 'text-ink-500')}>
                  {DAY_LABEL[day]}{day === today && <span className="ms-1 font-semibold normal-case tracking-normal">· today</span>}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {schoolDay.periods.map((period) =>
            period.isBreak ?
            <tr key={period._id}>
                  <th scope="row" className="px-2 py-1 text-start align-middle">
                    <p className="text-[12px] font-semibold text-ink-500">{period.label}</p>
                    <p className="text-[11px] text-ink-400">{formatTime(period.start)}</p>
                  </th>
                  <td colSpan={days.length} className="rounded-lg bg-ink-50 py-1.5 text-center text-[12px] font-semibold text-ink-400">
                    <CoffeeIcon className="me-1 inline h-3.5 w-3.5" aria-hidden="true" />{period.label} · {formatTime(period.start)} – {formatTime(period.end)}
                  </td>
                </tr> :

            <tr key={period._id}>
                  <th scope="row" className={cn('px-2 py-1 text-start align-top', running?._id === period._id && 'text-primary-700')}>
                    <p className="text-[12.5px] font-bold text-ink-800">{period.label}</p>
                    <p className="text-[11px] text-ink-500">{formatTime(period.start)} – {formatTime(period.end)}</p>
                  </th>
                  {days.map((day) =>
              <td key={day} className={cn('h-[72px] w-[16%] align-top', day === today && 'bg-primary-50/40')}>
                      {renderCell(day, period)}
                    </td>
              )}
                </tr>

            )}
          </tbody>
        </table>
      </div>

      {/* phones: day picker + agenda */}
      <div className="md:hidden print:hidden">
        <div role="tablist" aria-label="Day" className="scrollbar-thin flex gap-1 overflow-x-auto px-1 pb-2">
          {days.map((day) =>
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={day === mobileDay}
            onClick={() => setMobileDay(day)}
            className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold', day === mobileDay ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600')}>

              {DAY_SHORT[day]}{day === today ? ' · today' : ''}
            </button>
          )}
        </div>
        <ol className="space-y-2">
          {schoolDay.periods.map((period) =>
          <li key={period._id} className="flex gap-3">
              <div className="w-20 shrink-0 pt-1.5">
                <p className="text-[12px] font-bold text-ink-700">{period.label}</p>
                <p className="text-[11px] text-ink-500">{formatTime(period.start)}</p>
              </div>
              <div className="min-w-0 flex-1">
                {period.isBreak ?
              <p className="rounded-lg bg-ink-50 px-3 py-2 text-[12px] font-semibold text-ink-400">{period.label}</p> :
              renderCell(mobileDay, period, true)}
              </div>
            </li>
          )}
        </ol>
      </div>
    </>);

}
