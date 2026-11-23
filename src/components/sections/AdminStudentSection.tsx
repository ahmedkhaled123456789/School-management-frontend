import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { useCurrentAcademicYear, useStudentSection, useTimetable } from '../../hooks/sections';
import { sectionLabel } from '../../utils/timetable';

/** Admin > student detail: the student's section this year, with links. */
export function AdminStudentSection({ studentId }: {studentId: string;}) {
  const year = useCurrentAcademicYear();
  const section = useStudentSection(year.id, studentId);
  const periods = useTimetable({ academicYear: year.id, section: section.data?._id }, Boolean(section.data));

  return (
    <Card className="mt-5">
      <CardHeader title="Section" description={year.name || 'Current academic year'} />
      <CardBody>
        {year.isLoading || section.isLoading ?
        <SkeletonText lines={2} /> :
        !year.id ?
        <p className="text-[13.5px] text-ink-500">Set the current academic year in School Settings to use sections.</p> :
        !section.data ?
        <p className="text-[13.5px] text-ink-500">
            Not in a section yet. <Link to="/admin/academics/sections" className="font-semibold text-primary-600 hover:underline">Seat the student</Link>
          </p> :

        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link to={`/admin/academics/sections/${section.data._id}`} dir="auto" className="text-[16px] font-extrabold text-primary-700 hover:underline">{sectionLabel(section.data)}</Link>
              <p className="text-[13px] text-ink-500">
                Homeroom: <span dir="auto">{section.data.homeroomTeacher?.name ?? '—'}</span> · Room: {section.data.room?.name ?? '—'} · {periods.data?.length ?? 0} periods a week
              </p>
            </div>
            <Link to={`/admin/academics/timetable?section=${section.data._id}`} className="text-[13px] font-semibold text-primary-600 hover:underline">Timetable</Link>
          </div>
        }
      </CardBody>
    </Card>);

}
