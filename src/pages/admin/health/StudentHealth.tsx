import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheckIcon, PlusIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { HealthProfileForm } from '../../../components/health/HealthProfileForm';
import { ClinicVisitModal } from '../../../components/health/ClinicVisitModal';
import { useClinicVisits, useHealthProfile, useSaveHealthProfile } from '../../../hooks/health';
import { usePermissions } from '../../../hooks/permissions';
import { useStudent } from '../../../hooks/students';
import { PERMISSIONS } from '../../../lib/permissions';
import type { StudentRef } from '../../../types/sections';
import { formatDay } from '../../../utils/attendance';
import { CLINIC_ACTION_META } from '../../../utils/health';
import { formatTime } from '../../../utils/timetable';

/** One student's full health record (edit) and clinic history. */
export function AdminStudentHealth() {
  const { studentId = '' } = useParams();
  const studentQuery = useStudent(studentId);
  const student: StudentRef | undefined = useMemo(() => studentQuery.data ? { _id: studentQuery.data._id, name: studentQuery.data.name, studentId: studentQuery.data.studentId } : undefined, [studentQuery.data]);
  const profile = useHealthProfile(student);
  const visits = useClinicVisits({ studentId }, Boolean(studentId));
  const save = useSaveHealthProfile();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [logOpen, setLogOpen] = useState(false);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Health', to: '/admin/health' }, { label: student?.name ?? 'Student' }];

  return (
    <>
      <PageHeader
        title={student ? `${student.name} · Health` : 'Health record'}
        description={student?.studentId}
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <Link to={`/admin/students/${studentId}`}><Button variant="secondary" icon={<CalendarCheckIcon className="h-4 w-4" aria-hidden="true" />}>Profile &amp; attendance</Button></Link>
            {canManage && <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} disabled={!student} onClick={() => setLogOpen(true)}>Log clinic visit</Button>}
          </>
        } />

      {studentQuery.isError ?
      <Card><ErrorState error={studentQuery.error} /></Card> :

      <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Health record" description={profile.data?.updatedAt ? `Last updated ${new Date(profile.data.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}${profile.data.updatedBy ? ` by ${profile.data.updatedBy.name}` : ''}` : 'Nothing recorded yet.'} />
            <CardBody>
              {profile.isError ?
            <ErrorState error={profile.error} /> :
            !profile.data || !student ?
            <SkeletonText lines={10} /> :
            canManage ?
            <HealthProfileForm profile={profile.data} isSaving={save.isPending} onSave={(payload) => save.mutate({ student, payload })} /> :
            <p className="text-[13px] text-ink-500">Your role can view but not change health records.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Clinic visits" description="Most recent first." />
            {visits.isLoading ?
          <CardBody><SkeletonText lines={4} /></CardBody> :
          !visits.data?.length ?
          <CardBody><p className="text-[13px] text-ink-500">No visits.</p></CardBody> :

          <ul className="divide-y divide-ink-100">
                {visits.data.map((v) =>
            <li key={v._id} className="space-y-1 px-5 py-3 text-[13px]">
                    <p className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink-800">{formatDay(v.date)} · {formatTime(v.time)}</span>
                      <Badge tone={CLINIC_ACTION_META[v.action].tone}>{CLINIC_ACTION_META[v.action].label}</Badge>
                    </p>
                    <p className="text-ink-700">{v.complaint}{v.temperature ? ` · ${v.temperature} °C` : ''}</p>
                    {v.notes && <p className="text-[12px] text-ink-500">{v.notes}</p>}
                  </li>
            )}
              </ul>
          }
          </Card>
        </div>
      }
      {logOpen && student && <ClinicVisitModal open onClose={() => setLogOpen(false)} students={[]} student={student} />}
    </>);

}
