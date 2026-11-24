import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClockIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import type { SchoolDay, TimetableEntry } from '../../types/sections';
import { cn } from '../../utils/cn';
import { DAY_LABEL, formatTime, sortedDays, subjectColor, toMinutes, weekDayOf } from '../../utils/timetable';
import type { GridPerspective } from './TimetableGrid';

interface TodayScheduleProps {
  schoolDay?: SchoolDay;
  entries?: TimetableEntry[];
  perspective: GridPerspective;
  isLoading?: boolean;
  /** link to the full week */
  weekHref?: string;
  emptyText?: string;
}

/** Today's periods with live "now" / "next" markers; on days off, the next school day. */
export function TodaySchedule({ schoolDay, entries, perspective, isLoading, weekHref, emptyText = 'No periods planned.' }: TodayScheduleProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const view = useMemo(() => {
    if (!schoolDay || !entries) return null;
    const days = sortedDays(schoolDay.days);
    const today = weekDayOf(now);
    const isSchoolDay = days.includes(today);
    // on a day off show the next school day
    let day = today;
    if (!isSchoolDay) {
      for (let i = 1; i <= 7; i += 1) {
        const candidate = weekDayOf(new Date(now.getTime() + i * 86_400_000));
        if (days.includes(candidate)) {day = candidate;break;}
      }
    }
    const order = new Map(schoolDay.periods.map((p, i) => [p._id, i]));
    const list = entries.
    filter((e) => e.day === day).
    sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0)).
    flatMap((entry) => {
      const period = schoolDay.periods.find((p) => p._id === entry.periodId);
      return period ? [{ entry, period }] : [];
    });
    const minutes = now.getHours() * 60 + now.getMinutes();
    const nowId = isSchoolDay ? list.find((x) => toMinutes(x.period.start) <= minutes && minutes < toMinutes(x.period.end))?.entry._id : undefined;
    const nextId = isSchoolDay ? list.find((x) => toMinutes(x.period.start) > minutes)?.entry._id : list[0]?.entry._id;
    const finished = isSchoolDay && list.length > 0 && list.every((x) => toMinutes(x.period.end) <= minutes);
    return { day, isSchoolDay, list, nowId, nextId, finished };
  }, [schoolDay, entries, now]);

  const title = view && !view.isSchoolDay ? `Next school day · ${DAY_LABEL[view.day]}` : 'Today';

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-2"><CalendarClockIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />{title}</span>}
        description={view ? `${view.list.length} period(s)${view.finished ? ' · done for today' : ''}` : undefined}
        action={weekHref ? <Link to={weekHref} className="text-[13px] font-semibold text-primary-600 hover:underline">Full week</Link> : undefined} />

      <CardBody>
        {isLoading || !view ?
        <SkeletonText lines={4} /> :
        view.list.length === 0 ?
        <p className="text-[13.5px] text-ink-500">{emptyText}</p> :

        <ol className="space-y-2">
            {view.list.map(({ entry, period }) => {
            const isNow = entry._id === view.nowId;
            const isNext = entry._id === view.nextId;
            const past = view.isSchoolDay && toMinutes(period.end) <= now.getHours() * 60 + now.getMinutes();
            const detail = perspective === 'teacher' ? entry.section.name : entry.teacher.name;
            return (
              <li key={entry._id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', subjectColor(entry.subject._id), past && 'opacity-50', isNow && 'ring-2 ring-accent-300')}>
                  <div className="w-16 shrink-0 text-[12px] font-semibold">
                    <p>{formatTime(period.start)}</p>
                    <p className="opacity-70">{formatTime(period.end)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate text-[13.5px] font-bold">{entry.subject.name}</p>
                    <p dir="auto" className="truncate text-[12px] opacity-80">{[detail, entry.room?.name].filter(Boolean).join(' · ')}</p>
                  </div>
                  {isNow && <Badge tone="accent">Now</Badge>}
                  {!isNow && isNext && <Badge tone="info">Next</Badge>}
                </li>);

          })}
          </ol>
        }
      </CardBody>
    </Card>);

}
