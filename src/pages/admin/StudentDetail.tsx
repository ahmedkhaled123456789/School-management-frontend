import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { useAcademicYears } from '../../hooks/academicYears';
import { useClassLevels } from '../../hooks/classes';
import { usePrograms } from '../../hooks/programs';
import { useStudent, useUpdateStudent } from '../../hooks/students';
import { formatDate, initials, relationLabel } from '../../utils/format';
import { emailField, requiredField, type Errors } from '../../utils/validation';

interface EditValues {
  name: string;
  email: string;
  academicYear: string;
  program: string;
  prefectName: string;
  classLevels: string;
  password: string; admissionDate: string; phone: string; address: string; gender: string;
  fatherOccupation: string; dateOfBirth: string; motherName: string; fatherName: string;
  religion: string; status: string; fatherEmail: string;
}

const EMPTY: EditValues = {
  name: '',
  email: '',
  academicYear: '',
  program: '',
  prefectName: '',
  classLevels: ''
  , password: '', admissionDate: '', phone: '', address: '', gender: '', fatherOccupation: '', dateOfBirth: '', motherName: '', fatherName: '', religion: '', status: 'true', fatherEmail: ''
};

export function AdminStudentDetail() {
  const { studentID = '' } = useParams();
  const [searchParams] = useSearchParams();
  const query = useStudent(studentID);
  const update = useUpdateStudent(studentID);
  const years = useAcademicYears();
  const programs = usePrograms();
  const classLevels = useClassLevels();

  const [values, setValues] = useState<EditValues>(EMPTY);
  const [errors, setErrors] = useState<Errors<EditValues>>({});
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === '1');

  const student = query.data;

  useEffect(() => {
    if (!student) return;
    setValues({
      name: student.name ?? '',
      email: student.email ?? '',
      academicYear: typeof student.academicYear === 'string' ? student.academicYear : '',
      program: typeof student.program === 'string' ? student.program : '',
      prefectName: student.prefectName ?? '',
      classLevels: student.classLevels?.[0] ?? ''
      , password: '', admissionDate: student.dateAdmitted ?? '', phone: student.phone ?? '', address: student.address ?? '', gender: student.gender ?? '', fatherOccupation: student.fatherOccupation ?? '', dateOfBirth: student.dateOfBirth ?? '', motherName: student.motherName ?? '', fatherName: student.fatherName ?? '', religion: student.religion ?? '', status: String(student.status ?? true), fatherEmail: student.fatherEmail ?? ''
    });
  }, [student]);

  const yearOptions = useMemo(
    () => (years.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
    [years.data]
  );
  const programOptions = useMemo(
    () => (programs.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
    [programs.data]
  );
  const classOptions = useMemo(
    () => (classLevels.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
    [classLevels.data]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<EditValues> = {
      name: requiredField(values.name, 'Full name'),
      email: emailField(values.email)
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) return;
    try {
      await update.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        academicYear: values.academicYear || undefined,
        program: values.program || undefined,
        prefectName: values.prefectName.trim() || undefined,
        classLevels: values.classLevels ? [values.classLevels] : undefined,
        password: values.password || undefined, admissionDate: values.admissionDate || undefined,
        phone: values.phone.trim() || undefined, address: values.address.trim() || undefined,
        gender: values.gender as 'Male' | 'Female' || undefined, fatherOccupation: values.fatherOccupation.trim() || undefined,
        dateOfBirth: values.dateOfBirth || undefined, motherName: values.motherName.trim() || undefined,
        fatherName: values.fatherName.trim() || undefined, religion: values.religion.trim() || undefined,
        status: values.status === 'true', fatherEmail: values.fatherEmail.trim() || undefined
      });
      setIsEditing(false);
    } catch {

      // Toast handled by the mutation hook.
    }};

  if (query.isError) {
    return (
      <>
        <PageHeader
          title="Student"
          breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Students', to: '/admin/students' },
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
        title={query.isLoading ? 'Loading student…' : student?.name ?? 'Student'}
        description={student?.email}
        breadcrumbs={[
        { label: 'Admin', to: '/admin' },
        { label: 'Students', to: '/admin/students' },
        { label: student?.name ?? 'Detail' }]
        }
        actions={
        !query.isLoading &&
        <Button
          variant={isEditing ? 'secondary' : 'primary'}
          onClick={() => setIsEditing((prev) => !prev)}>
          
              {isEditing ? 'Cancel editing' : 'Edit student'}
            </Button>

        } />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardBody>
            {query.isLoading ?
            <div className="space-y-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <SkeletonText lines={4} />
              </div> :

            <>
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                    {initials(student?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-ink-900">{student?.name}</p>
                    <p className="truncate font-mono text-[12px] text-ink-500">
                      {student?.studentId}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {student?.isSuspended ?
                <Badge tone="danger">Suspended</Badge> :
                student?.isWithdrawn ?
                <Badge tone="warn">Withdrawn</Badge> :

                <Badge tone="success">Active</Badge>
                }
                  {student?.isGraduated && <Badge tone="info">Graduated</Badge>}
                  {student?.prefectName && <Badge tone="accent">{student.prefectName}</Badge>}
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  {[
                ['Email', student?.email],
                ['Program', relationLabel(student?.program, 'Unassigned')],
                ['Current class', student?.currentClassLevel || '—'],
                ['Academic year', relationLabel(student?.academicYear)],
                ['Date admitted', formatDate(student?.dateAdmitted)],
                ['Exam results', String(student?.examResults?.length ?? 0)]].
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

        <Card className="lg:col-span-2">
          <CardHeader
            title={isEditing ? 'Edit student record' : 'Academic placement'}
            description={
            isEditing ?
            'Updates are sent to PUT /students/:studentID/update/admin.' :
            'Switch to edit mode to change placement details.'
            } />
          
          <CardBody>
            {query.isLoading ?
            <SkeletonText lines={6} /> :
            isEditing ?
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                  id="edit-name"
                  label="Full name"
                  required
                  value={values.name}
                  error={errors.name}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, name: event.target.value }))
                  } />
                  <Input id="edit-password" label="Password" type="password" value={values.password} hint="Leave blank to keep the current password." onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))} />
                  <Input id="edit-admission-date" label="Admission date" type="date" value={values.admissionDate} onChange={(event) => setValues((prev) => ({ ...prev, admissionDate: event.target.value }))} />
                  <Input id="edit-date-of-birth" label="Date of birth" type="date" value={values.dateOfBirth} onChange={(event) => setValues((prev) => ({ ...prev, dateOfBirth: event.target.value }))} />
                  <Input id="edit-phone" label="Phone" value={values.phone} onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))} />
                  <Input id="edit-address" label="Address" value={values.address} onChange={(event) => setValues((prev) => ({ ...prev, address: event.target.value }))} />
                  <Select id="edit-gender" label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} value={values.gender} onChange={(event) => setValues((prev) => ({ ...prev, gender: event.target.value }))} />
                  <Select id="edit-status" label="Status" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} value={values.status} onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value }))} />
                  <Input id="edit-father-name" label="Father name" value={values.fatherName} onChange={(event) => setValues((prev) => ({ ...prev, fatherName: event.target.value }))} />
                  <Input id="edit-father-email" label="Father email" type="email" value={values.fatherEmail} onChange={(event) => setValues((prev) => ({ ...prev, fatherEmail: event.target.value }))} />
                  <Input id="edit-father-occupation" label="Father occupation" value={values.fatherOccupation} onChange={(event) => setValues((prev) => ({ ...prev, fatherOccupation: event.target.value }))} />
                  <Input id="edit-mother-name" label="Mother name" value={values.motherName} onChange={(event) => setValues((prev) => ({ ...prev, motherName: event.target.value }))} />
                  <Input id="edit-religion" label="Religion" value={values.religion} onChange={(event) => setValues((prev) => ({ ...prev, religion: event.target.value }))} />
                
                  <Input
                  id="edit-email"
                  label="Email address"
                  type="email"
                  required
                  value={values.email}
                  error={errors.email}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, email: event.target.value }))
                  } />
                
                  <Select
                  id="edit-year"
                  label="Academic year"
                  options={yearOptions}
                  value={values.academicYear}
                  placeholder={years.isLoading ? 'Loading…' : 'Select academic year'}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, academicYear: event.target.value }))
                  } />
                
                  <Select
                  id="edit-program"
                  label="Program"
                  options={programOptions}
                  value={values.program}
                  placeholder={programs.isLoading ? 'Loading…' : 'Select program'}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, program: event.target.value }))
                  } />
                
                  <Select
                  id="edit-class"
                  label="Class level"
                  options={classOptions}
                  value={values.classLevels}
                  placeholder={classLevels.isLoading ? 'Loading…' : 'Select class level'}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, classLevels: event.target.value }))
                  } />
                
                  <Input
                  id="edit-prefect"
                  label="Prefect role"
                  value={values.prefectName}
                  placeholder="e.g. Head Prefect"
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, prefectName: event.target.value }))
                  } />
                
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
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
              ['Program', relationLabel(student?.program, 'Unassigned')],
              ['Academic year', relationLabel(student?.academicYear)],
              ['Current class level', student?.currentClassLevel || '—'],
              ['Class levels recorded', String(student?.classLevels?.length ?? 0)],
              ['Prefect role', student?.prefectName || '—'],
              ['Promoted to level 200', student?.isPromotedToLevel200 ? 'Yes' : 'No']].
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
    </>);

}