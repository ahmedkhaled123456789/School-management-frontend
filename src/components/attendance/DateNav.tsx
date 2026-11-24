import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { SchoolDay } from '../../types/sections';
import { addDays, formatDay, isDateKey, isSchoolDate, todayKey } from '../../utils/attendance';
import { cn } from '../../utils/cn';

/** Step to the previous / next school day (or the previous / next day without a school day). */
function step(from: string, delta: 1 | -1, schoolDay?: SchoolDay) {
  let key = addDays(from, delta);
  if (!schoolDay?.days.length) return key;
  for (let i = 0; i < 14 && !isSchoolDate(schoolDay, key); i += 1) key = addDays(key, delta);
  return key;
}

/** Date picker for day views: prev / next school day, a date field and "Today". Never goes past today. */
export function DateNav({ value, onChange, schoolDay, className }: {value: string;onChange: (date: string) => void;schoolDay?: SchoolDay;className?: string;}) {
  const today = todayKey();
  const next = step(value, 1, schoolDay);
  const offDay = schoolDay && !isSchoolDate(schoolDay, value);
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center rounded-lg border border-ink-200 bg-white">
        <button type="button" aria-label="Previous school day" onClick={() => onChange(step(value, -1, schoolDay))} className="rounded-s-lg p-2 text-ink-600 hover:bg-ink-50">
          <ChevronLeftIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
        <label className="border-x border-ink-200">
          <span className="sr-only">Date</span>
          <input
            type="date"
            value={value}
            max={today}
            onChange={(e) => isDateKey(e.target.value) && onChange(e.target.value > today ? today : e.target.value)}
            className="h-9 bg-transparent px-2 text-[13px] font-semibold text-ink-800" />
        </label>
        <button type="button" aria-label="Next school day" disabled={next > today} onClick={() => onChange(next)} className="rounded-e-lg p-2 text-ink-600 hover:bg-ink-50 disabled:opacity-30 disabled:hover:bg-transparent">
          <ChevronRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      {value !== today &&
      <button type="button" onClick={() => onChange(today)} className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-primary-600 hover:bg-primary-50">Today</button>
      }
      <span className="text-[13px] text-ink-500">
        {formatDay(value, { weekday: 'long', day: 'numeric', month: 'long' })}
        {offDay && ' · no school'}
      </span>
    </div>);

}
