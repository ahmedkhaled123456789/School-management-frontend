import { Link } from 'react-router-dom';
import { PrinterIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { NoAcademicYear } from '../../components/sections/Notices';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { TodaySchedule } from '../../components/timetable/TodaySchedule';
import { useTeacherWeek } from '../../hooks/sections';
import { useTeacherProfile } from '../../hooks/teachers';
import { sectionLabel } from '../../utils/timetable';

export function TeacherTimetable() {
  // the login response has no id for teachers: take it from the profile
  const profile = useTeacherProfile();
  const week = useTeacherWeek(profile.data?._id);
  const homeroom = week.sections.filter((s) => s.homeroomTeacher?._id === profile.data?._id);
  const breadcrumbs = [{ label: 'Teacher', to: '/teacher' }, { label: 'My Timetable' }];

  if (!week.year.isLoading && !week.year.id) return <><PageHeader title="My Timetable" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  return (
    <>
      <PageHeader
        title="My Timetable"
        description={`Your teaching week${week.year.name ? ` · ${week.year.name}` : ''}.`}
        breadcrumbs={breadcrumbs}
        actions={<Button variant="secondary" className="print:hidden" icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>Print</Button>} />

      {week.error || profile.isError ?
      <Card><ErrorState error={week.error ?? profile.error} /></Card> :

      <>
          <div className="mb-5 grid gap-5 lg:grid-cols-3 print:hidden">
            <div className="lg:col-span-2">
              <TodaySchedule schoolDay={week.schoolDay} entries={week.entries} perspective="teacher" isLoading={week.isLoading || profile.isLoading} emptyText="You have no periods today." />
            </div>
            <Card>
              <CardHeader title="This week" />
              <CardBody className="space-y-3 text-[13.5px]">
                {week.isLoading ?
              <SkeletonText lines={3} /> :

              <>
                    <p className="flex justify-between"><span className="text-ink-500">Periods</span><strong>{week.entries?.length ?? 0}</strong></p>
                    <p className="flex justify-between"><span className="text-ink-500">Sections</span><strong>{week.sections.length}</strong></p>
                    <div>
                      <p className="text-ink-500">Homeroom of</p>
                      <p dir="auto" className="font-semibold text-ink-900">{homeroom.length ? homeroom.map(sectionLabel).join(', ') : '—'}</p>
                    </div>
                    <Link to="/teacher/sections" className="inline-block text-[13px] font-semibold text-primary-600 hover:underline">My sections &amp; rosters</Link>
                  </>
              }
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Week" description="Highlighted: today and the period running now." />
            <CardBody>
              {week.schoolDay && week.entries ?
            <TimetableGrid schoolDay={week.schoolDay} entries={week.entries} perspective="teacher" highlightNow /> :
            <SkeletonText lines={8} />}
            </CardBody>
          </Card>
        </>
      }
    </>);

}
