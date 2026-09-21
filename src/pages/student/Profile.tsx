import React, { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { useStudentProfile, useUpdateStudentProfile } from '../../hooks/students';
import { formatDate, initials, relationLabel } from '../../utils/format';
import { emailField, passwordField, type Errors } from '../../utils/validation';

interface ProfileValues {
  email: string;
  password: string;
}

export function StudentProfilePage() {
  const query = useStudentProfile();
  const update = useUpdateStudentProfile();
  const student = query.data;

  const [values, setValues] = useState<ProfileValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors<ProfileValues>>({});

  useEffect(() => {
    if (!student) return;
    setValues({ email: student.email ?? '', password: '' });
  }, [student]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<ProfileValues> = {
      email: emailField(values.email),
      password: values.password ? passwordField(values.password, false) : undefined
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    try {
      await update.mutateAsync({
        email: values.email.trim(),
        password: values.password || undefined
      });
      setValues((prev) => ({ ...prev, password: '' }));
    } catch {

      // Toast handled by the mutation hook.
    }};

  if (query.isError) {
    return (
      <>
        <PageHeader title="My Profile" breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'Profile' }]} />
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      </>);

  }

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your enrolment record. Only your email and password can be changed here."
        breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'My Profile' }]} />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardBody>
            {query.isLoading ?
            <div className="space-y-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <SkeletonText lines={5} />
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
                  {student?.prefectName && <Badge tone="accent">{student.prefectName}</Badge>}
                  {student?.isGraduated && <Badge tone="info">Graduated</Badge>}
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  {[
                ['Email', student?.email],
                ['Program', relationLabel(student?.program, 'Unassigned')],
                ['Current class', student?.currentClassLevel || '—'],
                ['Admission date', formatDate(student?.dateAdmitted)]].
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
            title="Account settings"
            description="Update your sign-in email or set a new password." />
          
          <CardBody>
            {query.isLoading ?
            <SkeletonText lines={4} /> :

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input
                id="student-email"
                label="Email address"
                type="email"
                required
                value={values.email}
                error={errors.email}
                onChange={(event) =>
                setValues((prev) => ({ ...prev, email: event.target.value }))
                } />
              
                <Input
                id="student-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                error={errors.password}
                hint="At least 6 characters. Leave blank to keep your current password."
                onChange={(event) =>
                setValues((prev) => ({ ...prev, password: event.target.value }))
                } />
              
                <div className="flex justify-end">
                  <Button type="submit" isLoading={update.isPending}>
                    Save changes
                  </Button>
                </div>
              </form>
            }
          </CardBody>
        </Card>
      </div>
    </>);

}