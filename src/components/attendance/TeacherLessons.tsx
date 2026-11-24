import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon, CircleDashedIcon, LockIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { useAttendanceSettings, useRegisters } from '../../hooks/attendance';
import type { SchoolDay, TimetableEntry } from '../../types/sections';
import { dateFromKey, daysBetween, nowTime, tallyMarks, todayKey } from '../../utils/attendance';
import { cn } from '../../utils/cn';
import { formatTime, toMinutes, weekDayOf } from '../../utils/timetable';

interface Props {
  academicYear: string;
  teacherId?: string;
  date: string;
  schoolDay?: SchoolDay;
  entries?: TimetableEntry[];
  isLoading?: boolean;
  title?: string;
  /** link to the full attendance page (dashboard use) */
  moreHref?: string;
}

/** A teacher's lessons on one day with the state of each register and a button to take it. */
export function TeacherLessons({ academicYear, teacherId, date, schoolDay, entries, isLoading, title = 'Registers', moreHref }: Props) {
  const registers = useRegisters({ academicYear, date, teacherId }, Boolean(teacherId));
  const settings = useAttendanceSettings();
  const [now, setNow] = useState(nowTime());
  useEffect(() => {
    const t = window.setInterval(() => setNow(nowTime()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const lessons = useMemo(() => {
    if (!schoolDay || !entries) return [];
    const day = weekDayOf(dateFromKey(date));
    const order = new Map(schoolDay.periods.map((p, i) => [p._id, i]));
    return entries.
    filter((e) => e.day === day).
    sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0)).
    flatMap((entry) => {
      const period = schoolDay.periods.find((p) => p._id === entry.periodId);
      return period ? [{ entry, period }] : [];
    });
  }, [entries, schoolDay, date]);

  const locked = daysBetween(date, todayKey()) > (settings.data?.lockDays ?? 3);
  const done = lessons.filter(({ entry }) => registers.data?.some((r) => r.section._id === entry.section._id && r.periodId === entry.periodId)).length;

  return (
    <Card>
      <CardHeader
        title={title}
        description={lessons.length ? `${done} of ${lessons.length} taken` : undefined}
        action={moreHref ? <Link to={moreHref} className="text-[13px] font-semibold text-primary-600 hover:underline">All registers</Link> : undefined} />
      {isLoading || registers.isLoading && Boolean(teacherId) ?
      <CardBody><SkeletonText lines={4} /></CardBody> :
      lessons.length === 0 ?
      <CardBody><p className="text-[13.5px] text-ink-500">No lessons on this day.</p></CardBody> :

      <ul className="divide-y divide-ink-100">
          {lessons.map(({ entry, period }) => {
          const register = registers.data?.find((r) => r.section._id === entry.section._id && r.periodId === entry.periodId);
          const started = date < todayKey() || toMinutes(period.start) <= toMinutes(now);
          const t = register ? tallyMarks(register.marks) : null;
          const href = `/teacher/attendance/register?section=${entry.section._id}&date=${date}&period=${entry.periodId}`;
          return (
            <li key={entry._id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3">
                <div className="w-24 shrink-0 text-[12.5px]">
                  <p className="font-bold text-ink-800">{period.label}</p>
                  <p className="text-ink-500">{formatTime(period.start)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="truncate text-[13.5px] font-semibold text-ink-900">{entry.section.name} · {entry.subject.name}</p>
                  <p className={cn('flex items-center gap-1.5 text-[12px]', register ? 'text-success-600' : 'text-ink-500')}>
                    {register ?
                  <><CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" />Taken · {t!.absent + t!.excused} away · {t!.late} late</> :
                  started ?
                  <><CircleDashedIcon className="h-3.5 w-3.5" aria-hidden="true" />Not taken yet</> :
                  <>Opens at {formatTime(period.start)}</>}
                  </p>
                </div>
                {locked ?
              register ? <Link to={href} className="text-[13px] font-semibold text-ink-600 hover:underline">View</Link> : <span className="flex items-center gap-1 text-[12.5px] text-ink-400"><LockIcon className="h-3.5 w-3.5" aria-hidden="true" />Locked</span> :
              started ?
              <Link
                to={href}
                className={cn('rounded-lg px-3 py-1.5 text-[13px] font-semibold', register ? 'text-primary-600 hover:bg-primary-50' : 'bg-primary-600 text-white hover:bg-primary-700')}>
                      {register ? 'Edit' : 'Take register'}
                    </Link> :
              null}
              </li>);

        })}
        </ul>
      }
    </Card>);

}
