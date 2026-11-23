import { PageHeader } from '../../components/ui/PageHeader';
import { StudentClassCard } from '../../components/sections/StudentClassCard';
import { TodaySchedule } from '../../components/timetable/TodaySchedule';
import { useStudentWeek } from '../../hooks/sections';
import { useStudentProfile } from '../../hooks/students';

export function StudentTimetablePage() {
  const profile = useStudentProfile();
  const week = useStudentWeek(profile.data?._id);
  return (
    <>
      <PageHeader title="My Timetable" description="Your class and weekly timetable." breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'My Timetable' }]} />
      {week.section &&
      <TodaySchedule schoolDay={week.schoolDay} entries={week.entries} perspective="section" isLoading={week.isLoading} emptyText="No lessons today." />
      }
      <StudentClassCard studentId={profile.data?._id} title="My class" />
    </>);

}
