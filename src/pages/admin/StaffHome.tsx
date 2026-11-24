import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { AvatarUploader } from '../../components/ui/AvatarUploader';
import { ADMIN_NAV, flattenNav } from '../../components/layout/navigation';
import { useAuth } from '../../hooks/auth';
import { usePermissions } from '../../hooks/permissions';
import { useUpdateMyImage } from '../../hooks/profile';
import { useUpdateMyStaffProfile } from '../../hooks/staff';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '../../api/auth';
import { queryKeys } from '../../lib/queryKeys';
import { STAFF_ROLE_LABEL, type StaffRole } from '../../lib/permissions';
import { emailField, passwordField, requiredField, type Errors } from '../../utils/validation';
import { AdminDashboard } from './Dashboard';
import { AdminProfile } from './Profile';

/* -------------------------------------------------------------------------- */
/* Dashboard: full overview for admins, shortcuts for staff                    */
/* -------------------------------------------------------------------------- */

function StaffDashboard() {
  const { session } = useAuth();
  const { can, staffRole } = usePermissions();
  const sections = flattenNav(ADMIN_NAV).filter((item) => item.permission && can(item.permission));
  const firstName = session?.user.name?.split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'Welcome'}
        description="Your workspace. These are the sections your role gives you access to." />

      <div className="mb-5">
        <Badge tone="info">{STAFF_ROLE_LABEL[staffRole as StaffRole] ?? staffRole}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((item) =>
        <Link key={item.to} to={item.to} className="group">
            <Card className="h-full transition-colors group-hover:border-primary-200 group-hover:bg-primary-50/30">
              <CardBody className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-bold text-ink-900">{item.label}</span>
                <ArrowRightIcon className="h-4 w-4 text-ink-400 rtl:rotate-180" aria-hidden="true" />
              </CardBody>
            </Card>
          </Link>
        )}
      </div>
    </>);

}

/** /admin index: the full analytics dashboard needs admin-wide data. */
export function AdminHome() {
  const { isAdministrator } = usePermissions();
  return isAdministrator ? <AdminDashboard /> : <StaffDashboard />;
}

/* -------------------------------------------------------------------------- */
/* Profile: admins keep their page, staff get a simpler one                    */
/* -------------------------------------------------------------------------- */

interface StaffProfileValues {
  name: string;
  email: string;
  phone: string;
  password: string;
}

function StaffProfile() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: ({ signal }) => fetchMe(signal) });
  const update = useUpdateMyStaffProfile();
  const updateImage = useUpdateMyImage();
  const user = me.data?.data;

  const [values, setValues] = useState<StaffProfileValues>({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState<Errors<StaffProfileValues>>({});

  useEffect(() => {
    if (!user) return;
    setValues({
      name: user.name ?? '',
      email: user.email ?? '',
      phone: typeof user.phone === 'string' ? user.phone : '',
      password: ''
    });
  }, [user]);

  const setField = (field: keyof StaffProfileValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
  setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<StaffProfileValues> = {
      name: requiredField(values.name, 'Full name'),
      email: emailField(values.email),
      password: values.password ? passwordField(values.password, false) : undefined
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    try {
      await update.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        password: values.password || undefined
      });
      setValues((prev) => ({ ...prev, password: '' }));
    } catch {

      // Toast handled by the mutation hook.
    }};

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Profile' }];
  if (me.isError) {
    return (
      <>
        <PageHeader title="Profile" breadcrumbs={breadcrumbs} />
        <Card><ErrorState error={me.error} onRetry={() => me.refetch()} /></Card>
      </>);

  }

  return (
    <>
      <PageHeader title="Profile" description="Your staff account. Your role is managed by a super admin." breadcrumbs={breadcrumbs} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardBody>
            {me.isLoading ?
            <SkeletonText lines={4} /> :

            <div className="flex items-center gap-3">
                <AvatarUploader
                image={user?.image}
                name={user?.name}
                isSaving={updateImage.isPending}
                onChange={(image) => updateImage.mutateAsync(image)} />
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-[15px] font-bold text-ink-900">{user?.name}</p>
                  <Badge tone="info">{STAFF_ROLE_LABEL[me.data?.role as StaffRole] ?? me.data?.role}</Badge>
                </div>
              </div>
            }
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Account settings" description="Update your details or set a new password." />
          <CardBody>
            {me.isLoading ?
            <SkeletonText lines={4} /> :

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="staff-name" label="Full name" required dir="auto" value={values.name} error={errors.name} onChange={setField('name')} />
                  <Input id="staff-email" label="Email address" type="email" required value={values.email} error={errors.email} onChange={setField('email')} />
                  <Input id="staff-phone" label="Phone" value={values.phone} onChange={setField('phone')} />
                  <Input id="staff-password" label="New password" type="password" autoComplete="new-password" value={values.password} error={errors.password} hint="Leave blank to keep your current password." onChange={setField('password')} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" isLoading={update.isPending}>Save changes</Button>
                </div>
              </form>
            }
          </CardBody>
        </Card>
      </div>
    </>);

}

/** /admin/profile */
export function AdminOrStaffProfile() {
  const { isAdministrator } = usePermissions();
  return isAdministrator ? <AdminProfile /> : <StaffProfile />;
}
