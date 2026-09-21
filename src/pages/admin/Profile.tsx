import React, { useEffect, useState } from 'react';
import { ShieldCheckIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { useAdminProfile, useUpdateAdmin } from '../../hooks/admins';
import { useAuth } from '../../hooks/auth';
import { initials } from '../../utils/format';
import { emailField, requiredField, type Errors } from '../../utils/validation';

interface FormValues {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  schoolName: string;
  city: string;
  lauguage: string;
}

const EMPTY: FormValues = {
  name: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  schoolName: '',
  city: '',
  lauguage: ''
};

export function AdminProfile() {
  const { session } = useAuth();
  const profile = useAdminProfile();
  const update = useUpdateAdmin();

  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Errors<FormValues>>({});

  const admin = profile.data;

  useEffect(() => {
    if (!admin) return;
    setValues({
      name: admin.name ?? '',
      email: admin.email ?? '',
      password: '',
      phone: admin.phone ?? '',
      address: admin.address ?? '',
      schoolName: admin.schoolName ?? '',
      city: admin.city ?? '',
      lauguage: admin.lauguage ?? ''
    });
  }, [admin]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<FormValues> = {
      name: requiredField(values.name, 'Full name'),
      email: emailField(values.email)
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) return;

    const id = admin?._id || session?.user._id;
    if (!id) return;

    try {
      await update.mutateAsync({
        id,
        payload: {
          name: values.name.trim(),
          email: values.email.trim(),
          // Only sent when the administrator actually typed a new password.
          ...(values.password ? { password: values.password } : {}),
          phone: values.phone.trim() || undefined,
          address: values.address.trim() || undefined,
          schoolName: values.schoolName.trim() || undefined,
          city: values.city.trim() || undefined,
          lauguage: values.lauguage.trim() || undefined
        }
      });
      setValues((prev) => ({ ...prev, password: '' }));
      setIsEditing(false);
    } catch {

      // Toast already surfaced by the mutation hook.
    }};

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your administrator account and school details."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Profile' }]}
        actions={
        !isEditing ?
        <Button variant="secondary" onClick={() => setIsEditing(true)} disabled={!admin}>
              Edit profile
            </Button> :
        undefined
        } />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white">
                {initials(admin?.name || session?.user.name || session?.user.email)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-ink-900">
                  {admin?.name || session?.user.name || 'Administrator'}
                </p>
                <p className="truncate text-[13px] text-ink-500">
                  {admin?.email || session?.user.email}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Badge tone="info" icon={<ShieldCheckIcon className="h-3 w-3" aria-hidden="true" />}>
                Admin access
              </Badge>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">
              Your token is stored on this device only and is never displayed or logged.
            </p>
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title={isEditing ? 'Edit profile' : 'Account details'}
              description={
              isEditing ?
              'Saved with PUT /admins/:id. Leave the password blank to keep your current one.' :
              'Live data from GET /admins/profile.'
              } />
            
            <CardBody>
              {profile.isError ?
              <ErrorState error={profile.error} onRetry={() => profile.refetch()} /> :
              profile.isLoading ?
              <SkeletonText lines={6} /> :
              isEditing ?
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                    id="admin-name"
                    label="Full name"
                    required
                    value={values.name}
                    error={errors.name}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, name: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-email"
                    label="Email address"
                    type="email"
                    required
                    value={values.email}
                    error={errors.email}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, email: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-phone"
                    label="Phone"
                    value={values.phone}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, phone: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-city"
                    label="City"
                    value={values.city}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, city: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-school"
                    label="School name"
                    value={values.schoolName}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, schoolName: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-language"
                    label="Language"
                    value={values.lauguage}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, lauguage: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-address"
                    label="Address"
                    value={values.address}
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, address: event.target.value }))
                    } />
                  
                    <Input
                    id="admin-password"
                    label="New password"
                    type="password"
                    value={values.password}
                    hint="Leave blank to keep your current password."
                    onChange={(event) =>
                    setValues((prev) => ({ ...prev, password: event.target.value }))
                    } />
                  
                  </div>
                  <div className="flex justify-end gap-2">
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
                ['Name', admin?.name || '—'],
                ['Email', admin?.email || '—'],
                ['Phone', admin?.phone || '—'],
                ['School', admin?.schoolName || '—'],
                ['City', admin?.city || '—'],
                ['Language', admin?.lauguage || '—'],
                ['Address', admin?.address || '—'],
                ['Account ID', admin?._id || '—']].
                map(([label, value]) =>
                <div key={label} className="rounded-lg bg-ink-50 px-4 py-3">
                      <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">
                        {label}
                      </dt>
                      <dd className="mt-1 truncate text-[14px] font-semibold text-ink-900">
                        {value}
                      </dd>
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