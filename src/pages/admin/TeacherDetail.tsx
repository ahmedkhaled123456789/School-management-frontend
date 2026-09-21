import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { useAcademicYears } from '../../hooks/academicYears';
import { useClassLevels } from '../../hooks/classes';
import { usePrograms } from '../../hooks/programs';
import { useSubjects } from '../../hooks/subjects';
import { useTeacher, useUpdateTeacher } from '../../hooks/teachers';
import { Input } from '../../components/ui/Input';
import { formatDate, initials, relationLabel } from '../../utils/format';

interface AssignValues {
  program: string;
  classLevel: string;
  academicYear: string;
  subject: string;
  name: string; email: string; password: string; gender: string; phone: string; address: string; religion: string; classLevels: string;
}

const EMPTY: AssignValues = { program: '', classLevel: '', academicYear: '', subject: '', name: '', email: '', password: '', gender: '', phone: '', address: '', religion: '', classLevels: '' };

export function AdminTeacherDetail() {
  const { teacherID = '' } = useParams();
  const [searchParams] = useSearchParams();
  const query = useTeacher(teacherID);
  const update = useUpdateTeacher(teacherID);
  const programs = usePrograms();
  const subjects = useSubjects();
  const classLevels = useClassLevels();
  const years = useAcademicYears();

  const [values, setValues] = useState<AssignValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(searchParams.get('assign') === '1');

  const teacher = query.data;

  useEffect(() => {
    if (!teacher) return;
    setValues({
      program: typeof teacher.program === 'string' ? teacher.program : '',
      classLevel: typeof teacher.classLevel === 'string' ? teacher.classLevel : '',
      academicYear: typeof teacher.academicYear === 'string' ? teacher.academicYear : '',
      subject: typeof teacher.subject === 'string' ? teacher.subject : ''
      , name: teacher.name ?? '', email: teacher.email ?? '', password: '', gender: teacher.gender ?? '', phone: teacher.phone ?? '', address: teacher.address ?? '', religion: teacher.religion ?? '', classLevels: teacher.classLevels?.[0] ?? ''
    });
  }, [teacher]);

  const options = useMemo(
    () => ({
      programs: (programs.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
      subjects: (subjects.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
      classLevels: (classLevels.data?.items ?? []).map((item) => ({
        value: item._id,
        label: item.name
      })),
      years: (years.data?.items ?? []).map((item) => ({ value: item._id, label: item.name }))
    }),
    [programs.data, subjects.data, classLevels.data, years.data]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.program && !values.subject && !values.classLevel && !values.academicYear) {
      setError('Choose at least one assignment before saving.');
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({
        name: values.name.trim(), email: values.email.trim(), password: values.password || undefined,
        gender: values.gender as 'Male' | 'Female' || undefined, phone: values.phone.trim() || undefined,
        address: values.address.trim() || undefined, religion: values.religion.trim() || undefined,
        classLevels: values.classLevels ? [values.classLevels] : undefined,
        program: values.program || undefined,
        academicYear: values.academicYear || undefined,
        subject: values.subject || undefined
      });
      setIsAssigning(false);
    } catch {

      // Toast handled by the mutation hook.
    }};

  if (query.isError) {
    return (
      <>
        <PageHeader
          title="Teacher"
          breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Teachers', to: '/admin/teachers' },
          { label: 'Detail' }]
          } />
        
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      </>);

  }

  return (
    <>
      <PageHeader
        title={query.isLoading ? 'Loading teacher…' : teacher?.name ?? 'Teacher'}
        description={teacher?.email}
        breadcrumbs={[
        { label: 'Admin', to: '/admin' },
        { label: 'Teachers', to: '/admin/teachers' },
        { label: teacher?.name ?? 'Detail' }]
        }
        actions={
        !query.isLoading &&
        <Button
          variant={isAssigning ? 'secondary' : 'primary'}
          onClick={() => setIsAssigning((prev) => !prev)}>
          
              {isAssigning ? 'Cancel' : 'Assign teacher'}
            </Button>

        } />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardBody>
            {query.isLoading ?
            <div className="space-y-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <SkeletonText lines={4} />
              </div> :

            <>
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-lg font-bold text-accent-500">
                    {initials(teacher?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-ink-900">{teacher?.name}</p>
                    <p className="truncate font-mono text-[12px] text-ink-500">
                      {teacher?.teacherId}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                  tone={
                  teacher?.applicationStatus === 'approved' ?
                  'success' :
                  teacher?.applicationStatus === 'rejected' ?
                  'danger' :
                  'warn'
                  }>
                  
                    {teacher?.applicationStatus ?? 'pending'}
                  </Badge>
                  {teacher?.isSuspended && <Badge tone="danger">Suspended</Badge>}
                  {teacher?.isWithdrawn && <Badge tone="warn">Withdrawn</Badge>}
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  {[
                ['Email', teacher?.email],
                ['Date employed', formatDate(teacher?.dateEmployed)],
                ['Exams created', String(teacher?.examsCreated?.length ?? 0)]].
                map(([label, value]) =>
                <div key={label as string} className="flex justify-between gap-3">
                      <dt className="text-ink-500">{label}</dt>
                      <dd className="text-right font-semibold text-ink-800">{value || '—'}</dd>
                    </div>
                )}
                </dl>
              </>
            }
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title={isAssigning ? 'Assign teacher' : 'Current assignment'}
              description={
              isAssigning ?
              'Sent to PUT /teachers/:teacherID/admin.' :
              'Program, subject, class level and academic year currently on record.'
              } />
            
            <CardBody>
              {query.isLoading ?
              <SkeletonText lines={5} /> :
              isAssigning ?
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input id="edit-teacher-name" label="Full name" required value={values.name} onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))} />
                    <Input id="edit-teacher-email" label="Email address" type="email" required value={values.email} onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))} />
                    <Input id="edit-teacher-password" label="Password" type="password" value={values.password} hint="Leave blank to keep the current password." onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))} />
                    <Select id="edit-teacher-gender" label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} value={values.gender} onChange={(event) => setValues((prev) => ({ ...prev, gender: event.target.value }))} />
                    <Input id="edit-teacher-phone" label="Phone" value={values.phone} onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))} />
                    <Input id="edit-teacher-address" label="Address" value={values.address} onChange={(event) => setValues((prev) => ({ ...prev, address: event.target.value }))} />
                    <Input id="edit-teacher-religion" label="Religion" value={values.religion} onChange={(event) => setValues((prev) => ({ ...prev, religion: event.target.value }))} />
                    <Select
                    id="assign-program"
                    label="Program"
                    options={options.programs}
                    value={values.program}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, program: event.target.value }))
                    } />
                  
                    <Select
                    id="assign-subject"
                    label="Subject"
                    options={options.subjects}
                    value={values.subject}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, subject: event.target.value }))
                    } />
                    <Select id="edit-teacher-class-levels" label="Class levels" options={options.classLevels} value={values.classLevels} onChange={(event) => setValues((prev) => ({ ...prev, classLevels: event.target.value }))} />
                  
                    <Select
                    id="assign-class"
                    label="Class level"
                    options={options.classLevels}
                    value={values.classLevel}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, classLevel: event.target.value }))
                    } />
                  
                    <Select
                    id="assign-year"
                    label="Academic year"
                    options={options.years}
                    value={values.academicYear}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, academicYear: event.target.value }))
                    } />
                  
                  </div>
                  {error &&
                <p role="alert" className="text-[13px] font-medium text-danger-500">
                      {error}
                    </p>
                }
                  <div className="flex justify-end gap-2">
                    <Button
                    variant="secondary"
                    onClick={() => setIsAssigning(false)}
                    disabled={update.isPending}>
                    
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={update.isPending}>
                      Save changes
                    </Button>
                  </div>
                </form> :

              <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                ['Program', relationLabel(teacher?.program, 'Unassigned')],
                ['Subject', relationLabel(teacher?.subject, 'Unassigned')],
                ['Class level', relationLabel(teacher?.classLevel)],
                ['Academic year', relationLabel(teacher?.academicYear)]].
                map(([label, value]) =>
                <div key={label as string} className="rounded-lg bg-ink-50 px-4 py-3">
                      <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">
                        {label}
                      </dt>
                      <dd className="mt-1 text-[14px] font-semibold text-ink-900">{value}</dd>
                    </div>
                )}
                </dl>
              }
            </CardBody>
          </Card>
 
        </div>
      </div>
    </>);

}