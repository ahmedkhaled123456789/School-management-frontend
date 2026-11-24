import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheckIcon, CheckCircle2Icon, SearchIcon, ShieldAlertIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { ApplicationFields } from '../../components/admissions/ApplicationFields';
import { useBranding } from '../../hooks/branding';
import { useApplyOnline, useCheckApplicationStatus, usePublicAdmissionInfo, useVerifyCertificate } from '../../hooks/admissions';
import { APPLICATION_STATUS, applicationErrors, emptyApplication } from '../../utils/admissions';
import { formatDay } from '../../utils/attendance';
import { cn } from '../../utils/cn';

/** Branded frame for pages anyone can open (no sign-in). */
function PublicFrame({ title, description, children }: {title: string;description: string;children: ReactNode;}) {
  const { branding } = useBranding();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-primary-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <Logo imageClassName="h-11" />
            <span className="truncate text-[15px] font-bold text-white">{branding.appName}</span>
          </Link>
          <Link to="/login" className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white/85 hover:bg-white/10">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900">{title}</h1>
        <p className="mt-1 text-[14px] text-ink-500">{description}</p>
        <div className="mt-6">{children}</div>
      </main>
    </div>);

}

/** /apply — families apply online and follow their application. */
export function ApplyPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'status' ? 'status' : 'apply';
  const { branding } = useBranding();
  useEffect(() => {document.title = `Admissions · ${branding.appName}`;}, [branding.appName]);
  return (
    <PublicFrame title="Admissions" description="Apply for a place, then follow your application with its reference.">
      <div role="tablist" aria-label="View" className="mb-5 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
        {(['apply', 'status'] as const).map((t) =>
        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'status' ? { tab: t } : {})}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
            {t === 'apply' ? 'Apply' : 'Check my application'}
          </button>
        )}
      </div>
      {tab === 'apply' ? <ApplyForm /> : <StatusForm />}
      <p className="mt-6 text-[12px] text-ink-400">Preview: applications are stored in this browser until the admissions service is online.</p>
    </PublicFrame>);

}

function ApplyForm() {
  const info = usePublicAdmissionInfo();
  const apply = useApplyOnline();
  const [value, setValue] = useState(emptyApplication());
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<{reference: string;name: string;level: string;} | null>(null);

  if (done) {
    return (
      <div className="rounded-2xl border border-success-100 bg-white p-6 text-center shadow-card">
        <CheckCircle2Icon className="mx-auto h-10 w-10 text-success-500" aria-hidden="true" />
        <h2 className="mt-3 text-[18px] font-bold text-ink-900">Application received</h2>
        <p className="mt-1 text-[14px] text-ink-600">{done.name} · {done.level}</p>
        <p className="mt-4 text-[13px] text-ink-500">Your reference</p>
        <p className="font-mono text-[24px] font-bold tracking-wider text-ink-900">{done.reference}</p>
        <p className="mt-3 text-[13px] text-ink-500">Keep it: with your email it lets you follow the application. We also emailed it to you.</p>
        <Link to="/apply?tab=status" className="mt-4 inline-block text-[13.5px] font-semibold text-primary-600 hover:underline">Check my application</Link>
      </div>);

  }
  if (info.data && !info.data.open) {
    return <div className="rounded-2xl border border-ink-200 bg-white p-6 text-[14px] text-ink-600 shadow-card">Applications are closed at the moment. Please contact the school office.</div>;
  }
  const submit = () => {
    setTouched(true);
    if (Object.values(applicationErrors(value)).some(Boolean)) return;
    apply.mutate(value, { onSuccess: (r) => setDone({ reference: r.reference, name: r.applicant.name, level: r.classLevel.name }) });
  };
  return (
    <form onSubmit={(e) => {e.preventDefault();submit();}} noValidate className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:p-6">
      <ApplicationFields value={value} onChange={setValue} levels={info.data?.levels ?? []} showErrors={touched} />
      <Button type="submit" className="mt-6" size="lg" fullWidth isLoading={apply.isPending}>Send application</Button>
    </form>);

}

function StatusForm() {
  const check = useCheckApplicationStatus();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const r = check.data;
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => {e.preventDefault();check.mutate({ reference, email });}} className="grid gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Input id="st-ref" label="Reference" required value={reference} onChange={(e) => setReference(e.target.value)} placeholder="APP-2026-0001" />
        <Input id="st-email" label="Your email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={!reference.trim() || !email.trim()} isLoading={check.isPending} icon={<SearchIcon className="h-4 w-4" aria-hidden="true" />}>Check</Button>
      </form>
      {r &&
      <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card" aria-live="polite">
          <p className="flex flex-wrap items-center gap-2"><span className="text-[16px] font-bold text-ink-900">{r.applicant}</span><Badge tone={APPLICATION_STATUS[r.status].tone}>{APPLICATION_STATUS[r.status].label}</Badge></p>
          <p className="text-[13px] text-ink-500">{r.reference} · {r.classLevel}</p>
          <p className="mt-3 text-[14px] text-ink-800">{APPLICATION_STATUS[r.status].family}</p>
          {r.status === 'test_scheduled' && r.test && <p className="mt-2 rounded-lg bg-accent-50 px-3 py-2 text-[13.5px] text-ink-800">Entrance test: <strong>{formatDay(r.test.date, { weekday: 'long', day: 'numeric', month: 'long' })}</strong> at <strong>{r.test.time}</strong>{r.test.room ? `, ${r.test.room}` : ''}.</p>}
          <p className="mt-3 text-[12px] text-ink-400">Last update {new Date(r.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      }
    </div>);

}

/** /verify?code=… — anyone can check a printed certificate. */
export function VerifyPage() {
  const [params, setParams] = useSearchParams();
  const verify = useVerifyCertificate();
  const [code, setCode] = useState(params.get('code') ?? '');
  const initial = params.get('code');
  useEffect(() => {
    if (initial) verify.mutate(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const r = verify.data;
  return (
    <PublicFrame title="Verify a certificate" description="Enter the code printed at the bottom of the certificate (or scan its QR code).">
      <form onSubmit={(e) => {e.preventDefault();setParams({ code: code.trim().toUpperCase() });}} className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card">
        <div className="min-w-[240px] flex-1"><Input id="verify-code" label="Certificate code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ASAS-2026-00012" /></div>
        <Button type="submit" disabled={!code.trim()} isLoading={verify.isPending}>Verify</Button>
      </form>
      {verify.isError &&
      <p role="alert" className="mt-4 rounded-2xl border border-danger-100 bg-danger-50 px-5 py-4 text-[14px] text-danger-600">{verify.error instanceof Error ? verify.error.message : 'Could not verify this code.'}</p>
      }
      {r &&
      <div className={cn('mt-4 flex gap-4 rounded-2xl border bg-white p-5 shadow-card', r.status === 'valid' ? 'border-success-100' : 'border-danger-100')} aria-live="polite">
          {r.status === 'valid' ? <BadgeCheckIcon className="h-10 w-10 shrink-0 text-success-500" aria-hidden="true" /> : <ShieldAlertIcon className="h-10 w-10 shrink-0 text-danger-500" aria-hidden="true" />}
          <div className="text-[14px]">
            <p className="text-[17px] font-bold text-ink-900">{r.status === 'valid' ? 'Valid certificate' : 'This certificate was revoked'}</p>
            <p className="mt-1 text-ink-700"><strong>{r.studentName}</strong> · {r.title}</p>
            <p className="text-ink-500">Issued {formatDay(r.issuedOn, { day: 'numeric', month: 'long', year: 'numeric' })} by {r.school} · {r.serial}</p>
            {r.revokedReason && <p className="mt-2 text-danger-600">Reason: {r.revokedReason}</p>}
          </div>
        </div>
      }
    </PublicFrame>);

}
