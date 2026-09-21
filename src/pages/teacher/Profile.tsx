import React, { useEffect, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { useTeacherProfile, useUpdateTeacherProfile } from '../../hooks/teachers';
import { formatDate, initials, relationLabel } from '../../utils/format';
import { emailField, passwordField, requiredField, type Errors } from '../../utils/validation';

interface ProfileValues {
  name: string;
  email: string;
  password: string;
}

export function TeacherProfile() {
  const query = useTeacherProfile();
  const teacher = query.data;
  const update = useUpdateTeacherProfile(teacher?._id ?? '');

  const [values, setValues] = useState<ProfileValues>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Errors<ProfileValues>>({});

  useEffect(() => {
    if (!teacher) return;
    setValues({ name: teacher.name ?? '', email: teacher.email ?? '', password: '' });
  }, [teacher]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<ProfileValues> = {
      name: requiredField(values.name, 'Full name'),
      email: emailField(values.email),
      password: values.password ? passwordField(values.password, false) : undefined
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.password) return;
    try {
      await update.mutateAsync({
        name: values.name.trim(),
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
        <PageHeader title="Profile" breadcrumbs={[{ label: 'Teacher', to: '/teacher' }, { label: 'Profile' }]} />
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      </>);

  }

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your teaching record and account details."
        breadcrumbs={[{ label: 'Teacher', to: '/teacher' }, { label: 'Profile' }]} />
      

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
                  tone={teacher?.applicationStatus === 'approved' ? 'success' : 'warn'}>
                  
                    {teacher?.applicationStatus ?? 'pending'}
                  </Badge>
                  {teacher?.isSuspended && <Badge tone="danger">Suspended</Badge>}
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  {[
                ['Email', teacher?.email],
                ['Subject', relationLabel(teacher?.subject, 'Unassigned')],
                ['Program', relationLabel(teacher?.program, 'Unassigned')],
                ['Class level', relationLabel(teacher?.classLevel)],
                ['Date employed', formatDate(teacher?.dateEmployed)]].
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
            title="Account details"
            description="Update your name, email or password. Leave the password blank to keep it unchanged." />
          
          <CardBody>
            {query.isLoading ?
            <SkeletonText lines={5} /> :

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                  id="profile-name"
                  label="Full name"
                  required
                  value={values.name}
                  error={errors.name}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, name: event.target.value }))
                  } />
                
                  <Input
                  id="profile-email"
                  label="Email address"
                  type="email"
                  required
                  value={values.email}
                  error={errors.email}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, email: event.target.value }))
                  } />
                
                </div>
                <Input
                id="profile-password"
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
                  <Button type="submit" isLoading={update.isPending} disabled={!teacher?._id}>
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