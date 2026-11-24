import { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { SchoolDay } from '../../types/sections';
import { STATUS_META, todayKey, type DayStatus, type Tally } from '../../utils/attendance';
import { dayKey } from '../../utils/reports';
import { cn } from '../../utils/cn';
import { StatusLegend } from './StatusBadge';

interface Props {
  days: Record<string, {status: DayStatus;tally: Tally;}>;
  schoolDay?: SchoolDay;
  /** month shown first, "YYYY-MM" (default: latest month with data, else this month) */
  initialMonth?: string;
}

const WEEK = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const JS_TO_SAT_FIRST = [1, 2, 3, 4, 5, 6, 0]; // getDay() (Sun=0) -> column (Sat first)

/** Month grid: each school day colored by the day's attendance, with a label for screen readers. */
export function AttendanceCalendar({ days, schoolDay, initialMonth }: Props) {
  const latest = useMemo(() => Object.keys(days).sort().pop(), [days]);
  const [month, setMonth] = useState(() => (initialMonth ?? latest ?? todayKey()).slice(0, 7));
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const total = new Date(y, m, 0).getDate();
  const lead = JS_TO_SAT_FIRST[first.getDay()];
  const today = todayKey();
  const school = new Set(schoolDay?.days ?? []);
  const jsDayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const cells = Array.from({ length: lead + total }, (_, i) => i < lead ? null : new Date(y, m - 1, i - lead + 1));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"><ChevronLeftIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /></button>
        <p className="text-[13.5px] font-bold text-ink-900" aria-live="polite">{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"><ChevronRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="list" aria-label="Attendance by day">
        {WEEK.map((d) => <div key={d} aria-hidden="true" className="pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">{d}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} aria-hidden="true" />;
          const key = dayKey(date);
          const info = days[key];
          const isSchool = school.size ? school.has(jsDayName[date.getDay()] as never) : true;
          const label = `${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${
          info ? `${STATUS_META[info.status].label} (${info.tally.present + info.tally.late}/${info.tally.total} periods)` : isSchool ? key > today ? 'upcoming' : 'not recorded' : 'no school'}`;
          return (
            <div
              key={key}
              role="listitem"
              aria-label={label}
              title={label}
              className={cn(
                'relative flex aspect-square min-h-[30px] items-center justify-center rounded-md text-[12px] font-semibold',
                // dark text reads on every status color except the red one
                info ? info.status === 'absent' ? 'text-white' : 'text-ink-900' : isSchool ? 'bg-ink-50 text-ink-500' : 'text-ink-300',
                key === today && 'ring-2 ring-primary-400 ring-offset-1'
              )}
              style={info ? { background: STATUS_META[info.status].color } : undefined}>
              {date.getDate()}
            </div>);

        })}
      </div>
      <StatusLegend className="mt-3" />
    </div>);

}
