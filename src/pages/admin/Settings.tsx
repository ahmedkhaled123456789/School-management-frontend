import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { AvatarUploader } from '../../components/ui/AvatarUploader';
import { useAcademicYears } from '../../hooks/academicYears';
import { useSettings, useUpdateSettings } from '../../hooks/staff';
import { emailField, requiredField, type Errors } from '../../utils/validation';

interface SettingsValues {
  schoolName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  invoicePrefix: string;
  receiptPrefix: string;
  currentAcademicYear: string;
  timezone: string;
}

const EMPTY: SettingsValues = {
  schoolName: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  currency: 'EGP',
  invoicePrefix: 'INV',
  receiptPrefix: 'RCT',
  currentAcademicYear: '',
  timezone: 'Africa/Cairo'
};

const PREFIX = /^[A-Za-z0-9-]{1,10}$/;

export function AdminSettings() {
  const query = useSettings();
  const update = useUpdateSettings();
  const years = useAcademicYears();
  const settings = query.data;

  const [values, setValues] = useState<SettingsValues>(EMPTY);
  const [errors, setErrors] = useState<Errors<SettingsValues>>({});

  useEffect(() => {
    if (!settings) return;
    const year = settings.currentAcademicYear;
    setValues({
      schoolName: settings.schoolName ?? '',
      address: settings.address ?? '',
      phone: settings.phone ?? '',
      email: settings.email ?? '',
      website: settings.website ?? '',
      currency: settings.currency ?? 'EGP',
      invoicePrefix: settings.invoicePrefix ?? 'INV',
      receiptPrefix: settings.receiptPrefix ?? 'RCT',
      currentAcademicYear: typeof year === 'string' ? year : year?._id ?? '',
      timezone: settings.timezone ?? 'Africa/Cairo'
    });
  }, [settings]);

  const yearOptions = useMemo(
    () => (years.data?.items ?? []).map((year) => ({ value: year._id, label: year.name })),
    [years.data]
  );

  const setField = (field: keyof SettingsValues) =>
  (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
  setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<SettingsValues> = {
      schoolName: requiredField(values.schoolName, 'School name'),
      email: values.email ? emailField(values.email) : undefined,
      currency: /^[A-Za-z]{3}$/.test(values.currency) ? undefined : 'Use a 3-letter currency code, e.g. EGP.',
      invoicePrefix: PREFIX.test(values.invoicePrefix) ? undefined : 'Letters, digits or "-", up to 10.',
      receiptPrefix: PREFIX.test(values.receiptPrefix) ? undefined : 'Letters, digits or "-", up to 10.'
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    try {
      await update.mutateAsync({
        ...values,
        schoolName: values.schoolName.trim(),
        currentAcademicYear: values.currentAcademicYear || null
      });
    } catch {

      // Toast handled by the mutation hook.
    }};

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'School Settings' }];

  if (query.isError) {
    return (
      <>
        <PageHeader title="School Settings" breadcrumbs={breadcrumbs} />
        <Card><ErrorState error={query.error} onRetry={() => query.refetch()} /></Card>
      </>);

  }

  return (
    <>
      <PageHeader
        title="School Settings"
        description="School-wide details used across the system, including invoice and receipt numbering."
        breadcrumbs={breadcrumbs} />


      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Logo" description="Shown on receipts and printed documents." />
          <CardBody>
            {query.isLoading ?
            <SkeletonText lines={2} /> :

            <div className="flex items-center gap-3">
                <AvatarUploader
                image={settings?.logo || undefined}
                name={settings?.schoolName}
                isSaving={update.isPending}
                onChange={(logo) => update.mutateAsync({ logo })} />
                <p dir="auto" className="min-w-0 truncate text-[15px] font-bold text-ink-900">{settings?.schoolName}</p>
              </div>
            }
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="School details" />
          <CardBody>
            {query.isLoading ?
            <SkeletonText lines={8} /> :

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="set-name" label="School name" required dir="auto" value={values.schoolName} error={errors.schoolName} onChange={setField('schoolName')} />
                  <Input id="set-phone" label="Phone" value={values.phone} onChange={setField('phone')} />
                  <Input id="set-email" label="Email" type="email" value={values.email} error={errors.email} onChange={setField('email')} />
                  <Input id="set-website" label="Website" value={values.website} onChange={setField('website')} />
                  <div className="sm:col-span-2">
                    <Input id="set-address" label="Address" dir="auto" value={values.address} onChange={setField('address')} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-ink-500">Academic & finance</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select id="set-year" label="Current academic year" options={yearOptions} placeholder={years.isLoading ? 'Loading…' : 'Not set'} value={values.currentAcademicYear} onChange={setField('currentAcademicYear')} />
                    <Input id="set-currency" label="Currency" value={values.currency} error={errors.currency} hint="ISO code, e.g. EGP" onChange={setField('currency')} />
                    <Input id="set-invoice" label="Invoice number prefix" value={values.invoicePrefix} error={errors.invoicePrefix} hint="e.g. INV → INV-2026-0001" onChange={setField('invoicePrefix')} />
                    <Input id="set-receipt" label="Receipt number prefix" value={values.receiptPrefix} error={errors.receiptPrefix} hint="e.g. RCT → RCT-2026-0001" onChange={setField('receiptPrefix')} />
                    <Input id="set-timezone" label="Timezone" value={values.timezone} onChange={setField('timezone')} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={update.isPending}>Save settings</Button>
                </div>
              </form>
            }
          </CardBody>
        </Card>
      </div>
    </>);

}
