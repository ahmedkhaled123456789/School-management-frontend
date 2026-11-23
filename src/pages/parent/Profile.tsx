import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { AvatarUploader } from '../../components/ui/AvatarUploader';
import { useParentProfile, useUpdateParentProfile } from '../../hooks/parentPortal';
import { useUpdateMyImage } from '../../hooks/profile';
import { emailField, passwordField, requiredField, type Errors } from '../../utils/validation';

interface ProfileValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  occupation: string;
  religion: string;
  password: string;
}

const EMPTY: ProfileValues = {
  name: '',
  email: '',
  phone: '',
  address: '',
  occupation: '',
  religion: '',
  password: ''
};

const BREADCRUMBS = [{ label: 'Parent', to: '/parent' }, { label: 'My Profile' }];

export function ParentProfilePage() {
  const query = useParentProfile();
  const update = useUpdateParentProfile();
  const updateImage = useUpdateMyImage();
  const parent = query.data;

  const [values, setValues] = useState<ProfileValues>(EMPTY);
  const [errors, setErrors] = useState<Errors<ProfileValues>>({});

  useEffect(() => {
    if (!parent) return;
    setValues({
      name: parent.name ?? '',
      email: parent.email ?? '',
      phone: parent.phone ?? '',
      address: parent.address ?? '',
      occupation: parent.occupation ?? '',
      religion: parent.religion ?? '',
      password: ''
    });
  }, [parent]);

  const setField = (field: keyof ProfileValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
  setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<ProfileValues> = {
      name: requiredField(values.name, 'Full name'),
      email: emailField(values.email),
      phone: requiredField(values.phone, 'Phone'),
      password: values.password ? passwordField(values.password, false) : undefined
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    try {
      await update.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim() || undefined,
        occupation: values.occupation.trim() || undefined,
        religion: values.religion.trim() || undefined,
        password: values.password || undefined
      });
      setValues((prev) => ({ ...prev, password: '' }));
    } catch {

      // Toast handled by the mutation hook.
    }};

  if (query.isError) {
    return (
      <>
        <PageHeader title="My Profile" breadcrumbs={BREADCRUMBS} />
        <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card>
      </>);

  }

  const children = (parent?.student ?? []).filter(
    (item): item is {_id?: string;name?: string;studentId?: string;} => typeof item === 'object'
  );

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your contact details. Your children are linked by the school office."
        breadcrumbs={BREADCRUMBS} />


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
                  <AvatarUploader
                  image={parent?.image}
                  name={parent?.name}
                  isSaving={updateImage.isPending}
                  onChange={(image) => updateImage.mutateAsync(image)} />
                  <div className="min-w-0">
                    <p dir="auto" className="truncate text-[15px] font-bold text-ink-900">
                      {parent?.name}
                    </p>
                    <p className="truncate font-mono text-[12px] text-ink-500">{parent?.parentId}</p>
                  </div>
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  {[
                ['Email', parent?.email],
                ['Phone', parent?.phone],
                ['Occupation', parent?.occupation]].
                map(([label, value]) =>
                <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-ink-500">{label}</dt>
                      <dd dir="auto" className="min-w-0 truncate text-end font-semibold text-ink-800">
                        {value || '—'}
                      </dd>
                    </div>
                )}
                </dl>
                <div className="mt-5 border-t border-ink-100 pt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    My children
                  </p>
                  {children.length === 0 ?
                <p className="mt-2 text-[13px] text-ink-500">No children linked yet.</p> :

                <ul className="mt-2 space-y-1.5">
                      {children.map((child) =>
                  <li key={child._id ?? child.studentId}>
                          <Link
                      to={`/parent/children/${child._id}`}
                      dir="auto"
                      className="text-[13.5px] font-semibold text-primary-600 hover:underline">
                            {child.name ?? child.studentId}
                          </Link>
                        </li>
                  )}
                    </ul>
                }
                </div>
              </>
            }
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Account settings"
            description="Update your contact details or set a new password." />

          <CardBody>
            {query.isLoading ?
            <SkeletonText lines={6} /> :

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="parent-name" label="Full name" required dir="auto" value={values.name} error={errors.name} onChange={setField('name')} />
                  <Input id="parent-email" label="Email address" type="email" required value={values.email} error={errors.email} onChange={setField('email')} />
                  <Input id="parent-phone" label="Phone" required value={values.phone} error={errors.phone} onChange={setField('phone')} />
                  <Input id="parent-occupation" label="Occupation" dir="auto" value={values.occupation} onChange={setField('occupation')} />
                  <Input id="parent-address" label="Address" dir="auto" value={values.address} onChange={setField('address')} />
                  <Input id="parent-religion" label="Religion" dir="auto" value={values.religion} onChange={setField('religion')} />
                  <Input
                  id="parent-password"
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={values.password}
                  error={errors.password}
                  hint="At least 6 characters. Leave blank to keep your current password."
                  onChange={setField('password')} />

                </div>
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
