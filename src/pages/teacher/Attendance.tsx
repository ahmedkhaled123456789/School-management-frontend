import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { NoAcademicYear } from '../../components/sections/Notices';
import { DateNav } from '../../components/attendance/DateNav';
import { StatusBadge } from '../../components/attendance/StatusBadge';
import { TeacherLessons } from '../../components/attendance/TeacherLessons';
import { useAttendanceSettings, useRegisters } from '../../hooks/attendance';
import { useTeacherWeek } from '../../hooks/sections';
import { useTeacherProfile } from '../../hooks/teachers';
import type { Section } from '../../types/sections';
import { addDays, dateFromKey, dayStatusOf, emptyTally, addMark, formatDay, isDateKey, recentSchoolDays, todayKey, type Tally } from '../../utils/attendance';
import { sectionLabel, weekDayOf } from '../../utils/timetable';

export function TeacherAttendance() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const date = isDateKey(params.get('date') ?? '') && (params.get('date') as string) <= today ? params.get('date') as string : today;
  const profile = useTeacherProfile();
  const teacherId = profile.data?._id;
  const week = useTeacherWeek(teacherId);
  const settings = useAttendanceSettings();
  const homerooms = week.sections.filter((s) => s.homeroomTeacher?._id === teacherId);

  // registers still open to the teacher (within the lock window) but never taken
  const lockDays = settings.data?.lockDays ?? 3;
  const windowDays = useMemo(() => week.schoolDay ? recentSchoolDays(week.schoolDay, addDays(today, -1), lockDays + 1).filter((d) => d >= addDays(today, -lockDays)) : [], [week.schoolDay, today, lockDays]);
  const recent = useRegisters({ academicYear: week.year.id, teacherId, from: windowDays[windowDays.length - 1], to: addDays(today, -1) }, Boolean(teacherId && windowDays.length));
  const missing = useMemo(() => {
    if (!week.entries || !recent.data || !week.schoolDay) return [];
    return windowDays.flatMap((d) => {
      const day = weekDayOf(dateFromKey(d));
      return week.entries!.
      filter((e) => e.day === day && !recent.data!.some((r) => r.date === d && r.section._id === e.section._id && r.periodId === e.periodId)).
      map((e) => ({ date: d, entry: e, period: week.schoolDay!.periods.find((p) => p._id === e.periodId) }));
    });
  }, [week.entries, week.schoolDay, recent.data, windowDays]);

  const breadcrumbs = [{ label: 'Teacher', to: '/teacher' }, { label: 'Attendance' }];
  if (!week.year.isLoading && !week.year.id) return <><PageHeader title="Attendance" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`Take a register for each lesson. You can correct your registers for ${lockDays} day(s); after that the school office can.`}
        breadcrumbs={breadcrumbs} />
      <DateNav value={date} onChange={(d) => setParams(d === today ? {} : { date: d }, { replace: true })} schoolDay={week.schoolDay} className="mb-4" />

      {week.error || profile.isError ?
      <Card><ErrorState error={week.error ?? profile.error} /></Card> :

      <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <TeacherLessons academicYear={week.year.id} teacherId={teacherId} date={date} schoolDay={week.schoolDay} entries={week.entries} isLoading={week.isLoading || profile.isLoading} title={date === today ? "Today's registers" : `Registers · ${formatDay(date)}`} />
            {missing.length > 0 &&
          <Card>
                <CardHeader title={<span className="flex items-center gap-2"><AlertTriangleIcon className="h-4 w-4 text-warn-500" aria-hidden="true" />Missing registers</span>} description="Earlier lessons you have not taken yet. Take them before they lock." />
                <ul className="divide-y divide-ink-100">
                  {missing.map(({ date: d, entry, period }) =>
              <li key={`${d}-${entry._id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[13px]">
                      <span className="w-36 shrink-0 font-semibold text-ink-800">{formatDay(d)} · {period?.label}</span>
                      <span dir="auto" className="min-w-0 flex-1 text-ink-700">{entry.section.name} · {entry.subject.name}</span>
                      <Link to={`/teacher/attendance/register?section=${entry.section._id}&date=${d}&period=${entry.periodId}`} className="font-semibold text-primary-600 hover:underline">Take register</Link>
                    </li>
              )}
                </ul>
              </Card>
          }
          </div>
          <div className="space-y-5">
            {homerooms.length === 0 ?
          <Card><CardHeader title="Homeroom" /><CardBody><p className="text-[13.5px] text-ink-500">You are not a homeroom teacher this year.</p></CardBody></Card> :
          homerooms.map((section) => <HomeroomDay key={section._id} section={section} date={date} academicYear={week.year.id} />)}
          </div>
        </div>
      }
    </>);

}

/** The homeroom teacher's view of the whole day for their section (all teachers' registers). */
function HomeroomDay({ section, date, academicYear }: {section: Section;date: string;academicYear: string;}) {
  const registers = useRegisters({ academicYear, sectionId: section._id, date });
  const rows = useMemo(() => {
    const per = new Map<string, Tally>();
    (registers.data ?? []).forEach((r) => r.marks.forEach((m) => addMark(per.get(m.student._id) ?? per.set(m.student._id, emptyTally()).get(m.student._id)!, m.status)));
    return section.students.
    map((student) => ({ student, tally: per.get(student._id), status: per.get(student._id) ? dayStatusOf(per.get(student._id)!) : null })).
    filter((r) => r.status && r.status !== 'present');
  }, [registers.data, section.students]);

  return (
    <Card>
      <CardHeader title={`Homeroom · ${sectionLabel(section)}`} description={`${registers.data?.length ?? 0} register(s) taken this day by all teachers.`} />
      <CardBody>
        {registers.isLoading ?
        <SkeletonText lines={3} /> :
        !registers.data?.length ?
        <p className="text-[13.5px] text-ink-500">No registers yet for this day.</p> :
        rows.length === 0 ?
        <p className="text-[13.5px] text-ink-500">All {section.students.length} students attended every period so far.</p> :

        <ul className="space-y-2">
            {rows.map((r) =>
          <li key={r.student._id} className="flex items-center justify-between gap-2 text-[13px]">
                <span dir="auto" className="min-w-0 truncate font-semibold text-ink-800">{r.student.name}</span>
                <StatusBadge status={r.status!} />
              </li>
          )}
          </ul>
        }
      </CardBody>
    </Card>);

}
