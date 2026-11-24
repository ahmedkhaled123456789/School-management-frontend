import { DoorOpenIcon, UserIcon, UsersIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { TimetableGrid } from '../timetable/TimetableGrid';
import { useStudentWeek } from '../../hooks/sections';
import { sectionLabel } from '../../utils/timetable';

/**
 * A student's section (homeroom teacher, room, classmates) and weekly
 * timetable. Used by the student portal and, for a child, by the parent portal.
 */
export function StudentClassCard({ studentId, title = 'Class & timetable' }: {studentId?: string;title?: string;}) {
  const week = useStudentWeek(studentId);

  return (
    <Card className="mt-5">
      <CardHeader title={title} description={week.year.name || undefined} />
      <CardBody className="space-y-4">
        {week.error ?
        <ErrorState error={week.error} /> :
        week.isLoading ?
        <SkeletonText lines={6} /> :
        !week.year.id ?
        <p className="text-[13.5px] text-ink-500">The school has not set the current academic year yet.</p> :
        !week.section ?
        <p className="text-[13.5px] text-ink-500">Not placed in a section yet. The timetable appears once the school assigns one.</p> :

        <>
            <dl className="grid gap-3 sm:grid-cols-4">
              {[
            { icon: UsersIcon, label: 'Section', value: sectionLabel(week.section) },
            { icon: UserIcon, label: 'Homeroom teacher', value: week.section.homeroomTeacher?.name ?? '—' },
            { icon: DoorOpenIcon, label: 'Room', value: week.section.room?.name ?? '—' },
            { icon: UsersIcon, label: 'Classmates', value: String(Math.max(week.section.students.length - 1, 0)) }].
            map(({ icon: Icon, label, value }) =>
            <div key={label} className="rounded-lg bg-ink-50 px-3.5 py-2.5">
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500"><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</dt>
                  <dd dir="auto" className="mt-0.5 truncate text-[14px] font-semibold text-ink-900">{value}</dd>
                </div>
            )}
            </dl>
            {week.schoolDay && week.entries &&
          (week.entries.length ?
          <TimetableGrid schoolDay={week.schoolDay} entries={week.entries} perspective="section" highlightNow /> :
          <p className="text-[13.5px] text-ink-500">The section's timetable is not ready yet.</p>)
          }
          </>
        }
      </CardBody>
    </Card>);

}
