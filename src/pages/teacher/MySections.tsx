import { useMemo } from 'react';
import { DoorOpenIcon, UsersIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { NoAcademicYear } from '../../components/sections/Notices';
import { useTeacherWeek } from '../../hooks/sections';
import { useTeacherProfile } from '../../hooks/teachers';
import { sectionLabel } from '../../utils/timetable';

/** Sections the teacher teaches or leads, with what they teach there and the roster. */
export function TeacherMySections() {
  const profile = useTeacherProfile();
  const me = profile.data?._id;
  const week = useTeacherWeek(me);

  const teachingBySection = useMemo(() => {
    const map = new Map<string, {subjects: Set<string>;periods: number;}>();
    (week.entries ?? []).forEach((e) => {
      const row = map.get(e.section._id) ?? { subjects: new Set<string>(), periods: 0 };
      row.subjects.add(e.subject.name);
      row.periods += 1;
      map.set(e.section._id, row);
    });
    return map;
  }, [week.entries]);

  const breadcrumbs = [{ label: 'Teacher', to: '/teacher' }, { label: 'My Sections' }];
  if (!week.year.isLoading && !week.year.id) return <><PageHeader title="My Sections" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  // homeroom sections first
  const sections = [...week.sections].sort((a, b) => Number(b.homeroomTeacher?._id === me) - Number(a.homeroomTeacher?._id === me) || sectionLabel(a).localeCompare(sectionLabel(b), undefined, { numeric: true }));

  return (
    <>
      <PageHeader title="My Sections" description="The sections you teach or lead as homeroom teacher, with their students." breadcrumbs={breadcrumbs} />
      {week.error || profile.isError ?
      <Card><ErrorState error={week.error ?? profile.error} /></Card> :
      week.isLoading || profile.isLoading ?
      <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div> :
      sections.length === 0 ?
      <Card><EmptyState icon={<UsersIcon className="h-5 w-5" aria-hidden="true" />} title="No sections yet" description="Sections appear here once the school puts you in a timetable or makes you a homeroom teacher." /></Card> :

      <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => {
          const teaching = teachingBySection.get(section._id);
          const isHomeroom = section.homeroomTeacher?._id === me;
          return (
            <Card key={section._id} as="article">
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 dir="auto" className="text-[18px] font-extrabold text-ink-900">{sectionLabel(section)}</h2>
                    <div className="flex flex-wrap gap-1">
                      {isHomeroom && <Badge tone="accent">Homeroom</Badge>}
                      {teaching && <Badge tone="info">{teaching.periods} period(s)/wk</Badge>}
                    </div>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-600">
                    {teaching ? <>You teach <strong dir="auto">{[...teaching.subjects].join(', ')}</strong></> : 'You do not teach this section'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-500">
                    <DoorOpenIcon className="h-3.5 w-3.5" aria-hidden="true" />{section.room?.name ?? 'No default room'}
                    {!isHomeroom && section.homeroomTeacher && <> · homeroom: <span dir="auto">{section.homeroomTeacher.name}</span></>}
                  </p>
                  <details className="mt-3" open={isHomeroom}>
                    <summary className="cursor-pointer text-[13px] font-semibold text-primary-600">Students ({section.students.length})</summary>
                    {section.students.length === 0 ?
                  <p className="mt-2 text-[13px] text-ink-500">No students yet.</p> :

                  <ol className="mt-2 columns-1 gap-4 text-[13px] sm:columns-2">
                        {section.students.map((student, i) =>
                    <li key={student._id} className="break-inside-avoid py-0.5">
                            <span className="me-1.5 font-mono text-[11.5px] text-ink-400">{i + 1}.</span><span dir="auto">{student.name}</span>
                          </li>
                    )}
                      </ol>
                  }
                  </details>
                </CardBody>
              </Card>);

        })}
        </div>
      }
    </>);

}
