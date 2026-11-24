import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/States';
import { StudentAttendanceCard } from '../../components/attendance/StudentAttendanceCard';
import { GatePassCard } from '../../components/attendance/GatePassCard';
import { HealthSummaryCard } from '../../components/health/HealthSummaryCard';
import { useStudentProfile } from '../../hooks/students';

export function StudentAttendancePage() {
  const profile = useStudentProfile();
  const me = profile.data;
  return (
    <>
      <PageHeader title="My attendance" description="Your attendance this year, taken by your teachers in every period." breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'Attendance' }]} />
      {profile.isError ?
      <Card><ErrorState error={profile.error} /></Card> :

      <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StudentAttendanceCard studentId={me?._id} who="You" title="This year" className="mt-0" />
          </div>
          <div className="space-y-5">
            {me && <GatePassCard name={me.name} code={me.studentId} />}
            {me && <HealthSummaryCard student={{ _id: me._id, name: me.name, studentId: me.studentId }} mode="student" />}
          </div>
        </div>
      }
    </>);

}
