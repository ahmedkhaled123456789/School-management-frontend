import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { useStudentAttendance } from '../../hooks/attendance';
import { formatDay, LOW_RATE, STREAK_ALERT } from '../../utils/attendance';
import { cn } from '../../utils/cn';
import { AttendanceCalendar } from './AttendanceCalendar';
import { StatusBadge } from './StatusBadge';

interface Props {
  studentId?: string;
  title?: string;
  /** "you" (student portal) or the student's first name, for the alert text */
  who?: string;
  className?: string;
}

/**
 * One student's attendance this year: rate, alerts, a month calendar, rate
 * per subject and the latest absences / late arrivals.
 */
export function StudentAttendanceCard({ studentId, title = 'Attendance', who = 'The student', className }: Props) {
  const { year, schoolDay, summary, isLoading, error } = useStudentAttendance(studentId);

  return (
    <Card className={cn('mt-5', className)}>
      <CardHeader title={title} description={year.name ? `${year.name} · from the period registers` : undefined} />
      <CardBody>
        {error ?
        <ErrorState error={error} /> :
        isLoading || !summary ?
        <SkeletonText lines={6} /> :
        !year.id ?
        <p className="text-[13.5px] text-ink-500">The school has not set the current academic year yet.</p> :
        summary.periods.total === 0 ?
        <p className="text-[13.5px] text-ink-500">No attendance recorded yet this year.</p> :

        <div className="space-y-5">
            {(summary.streak >= STREAK_ALERT || summary.rate < LOW_RATE) &&
          <div role="alert" className="flex gap-2.5 rounded-lg border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] text-ink-800">
                <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" aria-hidden="true" />
                <p>
                  {summary.streak >= STREAK_ALERT && <><strong>{who} {who === 'You' ? 'have' : 'has'} been away the last {summary.streak} school days.</strong>{' '}</>}
                  {summary.rate < LOW_RATE && <>Attendance is {summary.rate}%, below the school&apos;s {LOW_RATE}% target.</>}
                </p>
              </div>
          }
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
            { label: 'Attendance', value: `${summary.rate}%`, sub: `${summary.periods.present + summary.periods.late} of ${summary.periods.total} periods` },
            { label: 'Days away', value: String(summary.daysAbsent), sub: 'whole days absent / excused' },
            { label: 'Part days', value: String(summary.daysPartial), sub: 'left early or missed periods' },
            { label: 'Late', value: String(summary.lates), sub: 'periods arrived late' }].
            map((k) =>
            <div key={k.label} className="rounded-lg bg-ink-50 px-3.5 py-2.5">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{k.label}</dt>
                  <dd className="mt-0.5 font-mono text-[20px] font-extrabold text-ink-900">{k.value}</dd>
                  <dd className="text-[11.5px] text-ink-500">{k.sub}</dd>
                </div>
            )}
            </dl>

            <div className="grid gap-6 lg:grid-cols-2">
              <AttendanceCalendar days={summary.days} schoolDay={schoolDay} />
              <div>
                <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-500">By subject</h3>
                <ul className="space-y-2">
                  {summary.bySubject.map((s) =>
                <li key={s.subject} className="text-[13px]">
                      <div className="flex justify-between gap-2">
                        <span dir="auto" className="truncate font-semibold text-ink-800">{s.subject}</span>
                        <span className="shrink-0 font-mono text-ink-700">{s.rate}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${s.rate}%`, background: s.rate < LOW_RATE ? 'var(--viz-critical)' : 'var(--viz-series-1)' }} />
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-ink-500">{s.tally.absent + s.tally.excused} missed · {s.tally.late} late · {s.tally.total} periods</p>
                    </li>
                )}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-ink-500">Latest absences &amp; late arrivals</h3>
              {summary.recent.length === 0 ?
            <p className="text-[13px] text-ink-500">None — every period attended.</p> :

            <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
                  {summary.recent.slice(0, 8).map((r, i) =>
              <li key={`${r.date}-${r.period}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                      <span className="w-28 shrink-0 font-semibold text-ink-800">{formatDay(r.date)}</span>
                      <span dir="auto" className="min-w-0 flex-1 truncate text-ink-600">{r.period} · {r.subject}</span>
                      {r.mark.reason && <span className="text-[12px] text-ink-500">{r.mark.reason}</span>}
                      {r.mark.status === 'late' && r.mark.minutesLate && <span className="text-[12px] text-ink-500">{r.mark.minutesLate} min</span>}
                      <StatusBadge status={r.mark.status} />
                    </li>
              )}
                </ul>
            }
            </div>
          </div>
        }
      </CardBody>
    </Card>);

}
