import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClockIcon, CheckIcon, ClipboardCheckIcon, CopyIcon, GraduationCapIcon, ListOrderedIcon, XIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { Textarea } from '../../../components/ui/Textarea';
import { errorMessage } from '../../../api/client';
import { createStudent } from '../../../api/students';
import { useAdmissionSettings, useApplication, useDecide, useMarkEnrolled, useRecordScore, useScheduleTest, useWithdrawApplication } from '../../../hooks/admissions';
import { usePermissions } from '../../../hooks/permissions';
import { useSections } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import { queryKeys } from '../../../lib/queryKeys';
import type { Application } from '../../../types/admissions';
import { APPLICATION_STATUS, PIPELINE, generatePassword, loginFromName } from '../../../utils/admissions';
import { formatDay, todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { sectionLabel } from '../../../utils/timetable';

export function AdminApplicationDetail() {
  const { applicationId = '' } = useParams();
  const query = useApplication(applicationId);
  const settings = useAdmissionSettings();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const a = query.data;
  // lives here, not in the action panel: the panel disappears once the student is enrolled,
  // and the window must stay open to show the one-time password
  const [enrolling, setEnrolling] = useState(false);
  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Admissions', to: '/admin/admissions' }, { label: a?.applicant.name ?? 'Application' }];

  if (query.isError) return <><PageHeader title="Application" breadcrumbs={breadcrumbs} /><Card><ErrorState error={query.error} /></Card></>;
  if (!a) return <><PageHeader title="Loading…" breadcrumbs={breadcrumbs} /><Card className="p-5"><SkeletonText lines={8} /></Card></>;
  const step = PIPELINE.indexOf(a.status === 'waitlisted' ? 'tested' : a.status);
  const pass = settings.data?.passMark ?? 50;

  return (
    <>
      <PageHeader title={a.applicant.name} description={`${a.reference} · applying for ${a.classLevel.name} · ${a.source === 'online' ? 'applied online' : 'entered at the office'}`} breadcrumbs={breadcrumbs}
      actions={<Badge tone={APPLICATION_STATUS[a.status].tone}>{APPLICATION_STATUS[a.status].label}</Badge>} />

      {/* pipeline */}
      <ol className="mb-5 grid grid-cols-5 gap-2" aria-label="Progress">
        {PIPELINE.map((s, i) =>
        <li key={s} aria-current={i === step ? 'step' : undefined} className="min-w-0">
            <span className={cn('block h-1.5 rounded-full', step >= 0 && i <= step ? 'bg-primary-600' : 'bg-ink-200', ['rejected', 'withdrawn'].includes(a.status) && 'bg-ink-200')} />
            <span className={cn('mt-1 block truncate text-[11.5px] font-semibold', i === step ? 'text-ink-900' : 'text-ink-400')}>{APPLICATION_STATUS[s].label}</span>
          </li>
        )}
      </ol>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {canManage && <ActionPanel app={a} passMark={pass} onEnrol={() => setEnrolling(true)} />}
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-2">
                {[
                ['Date of birth', `${formatDay(a.applicant.dateOfBirth, { day: 'numeric', month: 'long', year: 'numeric' })} (${Math.floor((Date.now() - new Date(a.applicant.dateOfBirth).getTime()) / (365.25 * 86_400_000))} years)`],
                ['Gender', a.applicant.gender],
                ['Previous school', a.applicant.previousSchool ?? '—'],
                ['Applying for', a.classLevel.name],
                ['Parent / guardian', `${a.guardian.name} (${a.guardian.relation})`],
                ['Phone', a.guardian.phone],
                ['Email', a.guardian.email],
                ['Entrance test', a.test ? `${formatDay(a.test.date)} · ${a.test.time}${a.test.room ? ` · ${a.test.room}` : ''}` : '—'],
                ['Score', a.score !== undefined ? `${a.score}/100 (pass mark ${pass})` : '—'],
                ['Student', a.student ? `${a.student.name} · ${a.student.studentId ?? ''}` : '—']].
                map(([k, v]) =>
                <div key={k}><dt className="text-[12px] font-bold uppercase tracking-wide text-ink-500">{k}</dt><dd dir="auto" className="mt-0.5 text-ink-900">{v}</dd></div>
                )}
              </dl>
              {a.testNotes && <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-[13px] text-ink-700"><strong>Test notes:</strong> {a.testNotes}</p>}
              {a.student && <Link to={`/admin/students/${a.student._id}`} className="mt-4 inline-block text-[13px] font-semibold text-primary-600 hover:underline">Open the student profile</Link>}
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5">
          <Card>
            <CardHeader title={`Seats · ${a.classLevel.name}`} />
            <CardBody className="space-y-1 text-[13px] text-ink-700">
              <p><strong className="font-mono text-[18px] text-ink-900">{a.seats.free}</strong> free of {a.seats.capacity}</p>
              <p>{a.seats.seated} seated · {a.seats.promised} accepted · {a.seats.waitlist} waiting</p>
              {a.waitlistRank && <p className="flex items-center gap-1.5 font-semibold text-warn-500"><ListOrderedIcon className="h-4 w-4" aria-hidden="true" />#{a.waitlistRank} on the waiting list</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="History" />
            <ol className="space-y-3 px-5 py-4">
              {[...a.history].reverse().map((h, i) =>
              <li key={i} className="relative ps-5 text-[13px]">
                  <span className="absolute start-0 top-1.5 h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
                  <p className="font-semibold text-ink-900">{h.action}</p>
                  {h.note && <p className="text-ink-600">{h.note}</p>}
                  <p className="text-[11.5px] text-ink-400">{h.by} · {new Date(h.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </li>
              )}
            </ol>
          </Card>
        </div>
      </div>
      {enrolling && <EnrolModal app={a} onClose={() => setEnrolling(false)} />}
    </>);

}

/** What can happen next, for the application's current status. */
function ActionPanel({ app, passMark, onEnrol }: {app: Application & {waitlistRank?: number;};passMark: number;onEnrol: () => void;}) {
  const schedule = useScheduleTest();
  const score = useRecordScore();
  const decide = useDecide();
  const withdraw = useWithdrawApplication();
  const [date, setDate] = useState(app.test?.date ?? '');
  const [time, setTime] = useState(app.test?.time ?? '10:00');
  const [room, setRoom] = useState(app.test?.room ?? '');
  const [points, setPoints] = useState(app.score !== undefined ? String(app.score) : '');
  const [notes, setNotes] = useState(app.testNotes ?? '');
  const [note, setNote] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const open = !['enrolled', 'rejected', 'withdrawn'].includes(app.status);
  const testFuture = Boolean(app.test && app.test.date > todayKey());
  const scoreValid = /^\d+$/.test(points) && Number(points) <= 100;

  if (!open) {
    return app.status === 'enrolled' ? null :
    <Card><CardBody className="text-[13.5px] text-ink-600">This application is closed{app.decisionNote ? `: ${app.decisionNote}` : '.'}</CardBody></Card>;
  }

  return (
    <Card>
      <CardHeader title="Next step" action={<Button size="sm" variant="ghost" onClick={() => setWithdrawing(true)}>Withdraw</Button>} />
      <CardBody className="space-y-4">
        {(app.status === 'new' || app.status === 'test_scheduled') &&
        <div>
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-bold text-ink-900"><CalendarClockIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />{app.status === 'new' ? 'Invite to the entrance test' : 'Reschedule the test'}</h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr_auto] sm:items-end">
              <Input id="test-date" label="Date" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
              <Input id="test-time" label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              <Input id="test-room" label="Room (optional)" maxLength={40} value={room} onChange={(e) => setRoom(e.target.value)} />
              <Button disabled={!date || date < todayKey()} isLoading={schedule.isPending} onClick={() => schedule.mutate({ id: app._id, test: { date, time, room } })}>{app.status === 'new' ? 'Schedule' : 'Save'}</Button>
            </div>
          </div>
        }
        {(app.status === 'test_scheduled' || app.status === 'tested') &&
        <div className="border-t border-ink-100 pt-4 first:border-0 first:pt-0">
            <h3 className="mb-2 flex items-center gap-2 text-[13.5px] font-bold text-ink-900"><ClipboardCheckIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />Test result</h3>
            {testFuture ?
          <p className="text-[13px] text-ink-500">The test is on {app.test!.date}. Record the score after it.</p> :

          <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
                <Input id="test-score" label="Score /100" inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} error={points && !scoreValid ? '0–100' : undefined} />
                <Input id="test-notes" label="Notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <Button disabled={!scoreValid} isLoading={score.isPending} onClick={() => score.mutate({ id: app._id, score: Number(points), notes })}>Save score</Button>
              </div>
          }
          </div>
        }
        {(app.status === 'tested' || app.status === 'waitlisted') &&
        <div className="border-t border-ink-100 pt-4">
            <h3 className="mb-1 text-[13.5px] font-bold text-ink-900">Decision</h3>
            {app.score !== undefined &&
          <p className="mb-2 text-[13px] text-ink-600">Score <strong className={app.score >= passMark ? 'text-success-600' : 'text-danger-600'}>{app.score}/100</strong> — {app.score >= passMark ? 'above' : 'below'} the pass mark ({passMark}).</p>
          }
            <Textarea id="decision-note" label="Note (required to reject)" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button icon={<CheckIcon className="h-4 w-4" aria-hidden="true" />} isLoading={decide.isPending && decide.variables?.decision === 'accepted'} onClick={() => decide.mutate({ id: app._id, decision: 'accepted', note })}>Accept</Button>
              {app.status === 'tested' && <Button variant="secondary" icon={<ListOrderedIcon className="h-4 w-4" aria-hidden="true" />} isLoading={decide.isPending && decide.variables?.decision === 'waitlisted'} onClick={() => decide.mutate({ id: app._id, decision: 'waitlisted', note })}>Waiting list</Button>}
              <Button variant="danger" icon={<XIcon className="h-4 w-4" aria-hidden="true" />} disabled={!note.trim()} isLoading={decide.isPending && decide.variables?.decision === 'rejected'} onClick={() => decide.mutate({ id: app._id, decision: 'rejected', note })}>Reject</Button>
            </div>
          </div>
        }
        {app.status === 'accepted' &&
        <div>
            <h3 className="mb-1 flex items-center gap-2 text-[13.5px] font-bold text-ink-900"><GraduationCapIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />Enrol</h3>
            <p className="mb-3 text-[13px] text-ink-600">Creates the student account and seats the student in a {app.classLevel.name} section.</p>
            <Button onClick={onEnrol}>Enrol {app.applicant.name.split(' ')[0]}</Button>
          </div>
        }
      </CardBody>
      <Modal open={withdrawing} onClose={() => setWithdrawing(false)} title="Withdraw this application?" size="sm"
      footer={<><Button variant="secondary" onClick={() => setWithdrawing(false)}>Keep</Button><Button variant="danger" isLoading={withdraw.isPending} onClick={() => withdraw.mutate({ id: app._id, note }, { onSuccess: () => setWithdrawing(false) })}>Withdraw</Button></>}>
        <Input id="withdraw-note" label="Reason (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The family moved" />
      </Modal>
    </Card>);

}

/** Creates the REAL student (backend), then records the enrolment and seats the student (mock). */
function EnrolModal({ app, onClose }: {app: Application;onClose: () => void;}) {
  const sections = useSections(app.academicYear, app.classLevel._id);
  const enrolled = useMarkEnrolled();
  const { can } = usePermissions();
  const canSeat = can(PERMISSIONS.ACADEMICS_MANAGE);
  const [email, setEmail] = useState(`${loginFromName(app.applicant.name)}@school.test`);
  const [password] = useState(generatePassword);
  const open = useMemo(() => (sections.data ?? []).filter((s) => s.students.length < s.capacity), [sections.data]);
  const [sectionId, setSectionId] = useState('');
  // fields the student record requires that the application does not ask for
  const isFather = app.guardian.relation.trim().toLowerCase() === 'father';
  const isMother = app.guardian.relation.trim().toLowerCase() === 'mother';
  const [family, setFamily] = useState({
    fatherName: isFather ? app.guardian.name : '',
    fatherEmail: isFather ? app.guardian.email : '',
    fatherOccupation: '',
    motherName: isMother ? app.guardian.name : '',
    religion: '',
    address: ''
  });
  const missing = Object.entries(family).filter(([, v]) => !v.trim()).map(([k]) => k);
  const fatherEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(family.fatherEmail.trim());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{code?: string;section?: string;studentId: string;} | null>(null);
  // the real account, kept if the next step fails, so a retry never creates it twice
  const [created, setCreated] = useState<{_id: string;name: string;studentId?: string;} | null>(null);
  const queryClient = useQueryClient();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const enrol = async () => {
    setBusy(true);
    setError(null);
    try {
      const student = created ?? await createStudent({
        name: app.applicant.name,
        email: email.trim().toLowerCase(),
        password,
        dateOfBirth: app.applicant.dateOfBirth,
        gender: app.applicant.gender,
        admissionDate: todayKey(),
        classLevels: [app.classLevel._id],
        fatherName: family.fatherName.trim(),
        fatherEmail: family.fatherEmail.trim().toLowerCase(),
        fatherOccupation: family.fatherOccupation.trim(),
        motherName: family.motherName.trim(),
        religion: family.religion.trim(),
        address: family.address.trim(),
        status: true,
        phone: app.guardian.phone
      });
      if (!created) {
        setCreated({ _id: student._id, name: student.name, studentId: student.studentId });
        queryClient.invalidateQueries({ queryKey: queryKeys.studentsRoot });
      }
      const result = await enrolled.mutateAsync({ id: app._id, student: { _id: student._id, name: student.name, studentId: student.studentId }, sectionId: sectionId || undefined });
      setDone({ code: student.studentId, section: result.section, studentId: student._id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Modal open onClose={onClose} title="Enrolled" description="Give these sign-in details to the family. The password is shown only now." size="sm"
      footer={<><Link to={`/admin/students/${done.studentId}`}><Button variant="secondary">Open profile</Button></Link><Button onClick={onClose}>Done</Button></>}>
        <dl className="space-y-2 rounded-xl bg-ink-50 p-4 text-[13.5px]">
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Student code</dt><dd className="font-mono font-bold">{done.code ?? '—'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Email</dt><dd className="font-mono">{email}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Password</dt><dd className="font-mono">{password}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-500">Section</dt><dd>{done.section ?? 'Not seated yet'}</dd></div>
        </dl>
        <Button className="mt-3" size="sm" variant="ghost" icon={<CopyIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => navigator.clipboard?.writeText(`Email: ${email}\nPassword: ${password}`)}>Copy sign-in details</Button>
      </Modal>);

  }

  return (
    <Modal open onClose={onClose} title={`Enrol ${app.applicant.name}`} size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!emailValid || (!created && (missing.length > 0 || !fatherEmailOk))} isLoading={busy} onClick={enrol}>Create student</Button></>}>
      <div className="space-y-3">
        <Input id="enrol-email" label="Student sign-in email" type="email" disabled={Boolean(created)} value={email} onChange={(e) => setEmail(e.target.value)} error={emailValid ? undefined : 'Enter a valid email'} />
        <p className="text-[12.5px] text-ink-500">A first password is generated and shown after enrolment.</p>
        {!created &&
        <fieldset className="space-y-3 rounded-xl border border-ink-200 p-3">
            <legend className="px-1 text-[12.5px] font-bold uppercase tracking-wide text-ink-500">Complete the student record</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input id="enrol-father" label="Father's name" required value={family.fatherName} onChange={(e) => setFamily({ ...family, fatherName: e.target.value })} />
              <Input id="enrol-father-email" label="Father's email" type="email" required value={family.fatherEmail} onChange={(e) => setFamily({ ...family, fatherEmail: e.target.value })} error={family.fatherEmail && !fatherEmailOk ? 'Enter a valid email' : undefined} />
              <Input id="enrol-father-job" label="Father's occupation" required value={family.fatherOccupation} onChange={(e) => setFamily({ ...family, fatherOccupation: e.target.value })} />
              <Input id="enrol-mother" label="Mother's name" required value={family.motherName} onChange={(e) => setFamily({ ...family, motherName: e.target.value })} />
              <Select id="enrol-religion" label="Religion" required value={family.religion} placeholder="Choose" onChange={(e) => setFamily({ ...family, religion: e.target.value })}
            options={['Muslim', 'Christian', 'Other'].map((r) => ({ value: r, label: r }))} />
              <Input id="enrol-address" label="Address" required value={family.address} onChange={(e) => setFamily({ ...family, address: e.target.value })} />
            </div>
          </fieldset>
        }
        <Select id="enrol-section" label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!canSeat}
        placeholder={!canSeat ? 'Your role can not seat students' : open.length ? 'Seat later' : 'No section has a free seat'}
        options={open.map((s) => ({ value: s._id, label: `${sectionLabel(s)} · ${s.capacity - s.students.length} free` }))} />
        {error && <p role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-[13px] text-danger-600">{error}{created ? ` The student account (${created.studentId ?? created.name}) was created: try again to finish the enrolment.` : ''}</p>}
      </div>
    </Modal>);

}
