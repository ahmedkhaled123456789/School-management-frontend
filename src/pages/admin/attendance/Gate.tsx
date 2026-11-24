import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraIcon, CheckCircle2Icon, ClockIcon, KeyboardIcon, ScanLineIcon, Trash2Icon, Volume2Icon, VolumeXIcon, XCircleIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { NoAcademicYear } from '../../../components/sections/Notices';
import { CameraScanner } from '../../../components/attendance/CameraScanner';
import { errorMessage } from '../../../api/client';
import { useCheckIn, useDeleteGateScan, useGateScans } from '../../../hooks/attendance';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSchoolDay, useSections } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import type { GateScan } from '../../../types/attendance';
import { firstTeachingStart, isSchoolDate, todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { formatTime } from '../../../utils/timetable';

type Feedback = {kind: 'ok' | 'late' | 'error';title: string;detail: string;};

const METHOD_LABEL: Record<GateScan['method'], string> = { camera: 'Camera', scanner: 'Scanner', manual: 'Typed' };

/** Short tone: high for success, low for a problem (Web Audio, no files). */
function beep(ok: boolean) {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as {webkitAudioContext: typeof AudioContext;}).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (ok ? 0.15 : 0.35));
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.15 : 0.35));
    osc.onended = () => ctx.close();
  } catch {

    // no audio: the on-screen message is enough
  }}

/**
 * Gate check-in. A USB / Bluetooth barcode scanner types the code and presses
 * Enter into the focused field (keyboard wedge), the camera reads QR codes, or
 * the code is typed by hand.
 */
export function AdminAttendanceGate() {
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const today = todayKey();
  const scans = useGateScans(today);
  const sections = useSections(year.id);
  const checkIn = useCheckIn(year.id);
  const remove = useDeleteGateScan();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);

  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [sound, setSound] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typing = useRef<{start: number;keys: number;}>({ start: 0, keys: 0 });

  const expected = useMemo(() => (sections.data ?? []).reduce((s, x) => s + x.students.length, 0), [sections.data]);
  const isSchoolDay = schoolDay.data ? isSchoolDate(schoolDay.data, today) : true;
  const bell = schoolDay.data ? firstTeachingStart(schoolDay.data) : '08:00';

  // keep the field focused for the scanner (unless the user is elsewhere on purpose)
  useEffect(() => {
    const refocus = () => {
      const active = document.activeElement;
      if (!active || active === document.body) inputRef.current?.focus();
    };
    const timer = window.setInterval(refocus, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const submit = (value: string, method: GateScan['method']) => {
    if (!value.trim() || checkIn.isPending) return;
    checkIn.mutate({ code: value.trim(), method }, {
      onSuccess: (scan) => {
        setFeedback({
          kind: scan.late ? 'late' : 'ok',
          title: scan.student.name,
          detail: `${scan.section?.name ?? ''} · ${formatTime(scan.time)}${scan.late ? ' · after the bell' : ''}`
        });
        if (sound) beep(true);
      },
      onError: (error) => {
        setFeedback({ kind: 'error', title: 'Not checked in', detail: errorMessage(error) });
        if (sound) beep(false);
      }
    });
  };

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Attendance', to: '/admin/attendance' }, { label: 'Gate check-in' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Gate check-in" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  const list = scans.data ?? [];
  const late = list.filter((s) => s.late).length;

  return (
    <>
      <PageHeader
        title="Gate check-in"
        description={`Scan the code on the student's card. Arrivals after ${formatTime(bell)} are marked late; teachers see check-ins as suggestions in their registers.`}
        breadcrumbs={breadcrumbs}
        actions={
        <button type="button" onClick={() => setSound((v) => !v)} aria-pressed={sound} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-600 hover:bg-ink-100">
            {sound ? <Volume2Icon className="h-4 w-4" aria-hidden="true" /> : <VolumeXIcon className="h-4 w-4" aria-hidden="true" />}
            Sound {sound ? 'on' : 'off'}
          </button>
        } />

      {!isSchoolDay ?
      <Card><EmptyState title="No school today" description="Check-ins are only taken on school days." /></Card> :

      <div className="grid gap-5 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <CardBody className="space-y-4">
                <form
                onSubmit={(e) => {
                  e.preventDefault();
                  // a scanner "types" a whole code in a few ms; people are much slower
                  const t = typing.current;
                  const fast = t.keys >= 4 && (performance.now() - t.start) / t.keys < 50;
                  submit(code, fast ? 'scanner' : 'manual');
                  setCode('');
                  typing.current = { start: 0, keys: 0 };
                }}>
                  <label htmlFor="gate-code" className="mb-1.5 block text-[13px] font-semibold text-ink-700">Student code</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanLineIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                      <input
                      id="gate-code"
                      ref={inputRef}
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      disabled={!canManage}
                      value={code}
                      onKeyDown={(e) => {
                        if (e.key.length === 1) {
                          if (!typing.current.keys) typing.current.start = performance.now();
                          typing.current.keys += 1;
                        }
                      }}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Scan or type, e.g. STU12345AB"
                      className="h-11 w-full rounded-lg border border-ink-200 bg-white ps-9 pe-3 font-mono text-[15px] uppercase placeholder:font-sans placeholder:normal-case focus:border-primary-500" />
                    </div>
                    <Button type="submit" size="lg" disabled={!canManage || !code.trim()} isLoading={checkIn.isPending}>Check in</Button>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-500"><KeyboardIcon className="h-3.5 w-3.5" aria-hidden="true" />Barcode scanners work here directly: keep this field focused.</p>
                </form>

                <div aria-live="assertive" aria-atomic="true">
                  {feedback &&
                <div className={cn('flex items-center gap-3 rounded-xl border px-4 py-3',
                feedback.kind === 'ok' && 'border-success-100 bg-success-50',
                feedback.kind === 'late' && 'border-warn-100 bg-warn-50',
                feedback.kind === 'error' && 'border-danger-100 bg-danger-50')}>
                      {feedback.kind === 'ok' && <CheckCircle2Icon className="h-7 w-7 shrink-0 text-success-500" aria-hidden="true" />}
                      {feedback.kind === 'late' && <ClockIcon className="h-7 w-7 shrink-0 text-warn-500" aria-hidden="true" />}
                      {feedback.kind === 'error' && <XCircleIcon className="h-7 w-7 shrink-0 text-danger-500" aria-hidden="true" />}
                      <div className="min-w-0">
                        <p dir="auto" className="truncate text-[16px] font-extrabold text-ink-900">{feedback.title}</p>
                        <p className="text-[13px] text-ink-700">{feedback.kind === 'late' ? 'Late · ' : ''}{feedback.detail}</p>
                      </div>
                    </div>
                }
                </div>

                <div>
                  <Button variant="secondary" fullWidth disabled={!canManage} icon={<CameraIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setCamera((v) => !v)}>
                    {camera ? 'Stop camera' : 'Scan with the camera'}
                  </Button>
                  {camera && <div className="mt-3"><CameraScanner onCode={(value) => submit(value, 'camera')} /></div>}
                </div>
              </CardBody>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Kpi label="In" value={String(list.length)} sub={`of ${expected}`} />
              <Kpi label="Late" value={String(late)} />
              <Kpi label="Not yet" value={String(Math.max(expected - list.length, 0))} />
            </div>
          </div>

          <Card className="lg:col-span-3">
            <CardHeader title="Today's arrivals" description="Newest first." />
            {scans.isError ?
          <ErrorState error={scans.error} onRetry={() => scans.refetch()} /> :
          scans.isLoading ?
          <CardBody><SkeletonText lines={6} /></CardBody> :
          list.length === 0 ?
          <EmptyState title="Nobody checked in yet" description="Scans appear here as students arrive." /> :

          <ul className="scrollbar-thin max-h-[560px] divide-y divide-ink-100 overflow-y-auto">
                {list.map((scan) =>
            <li key={scan._id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="w-16 shrink-0 font-mono text-[13px] font-semibold text-ink-800">{formatTime(scan.time)}</span>
                    <div className="min-w-0 flex-1">
                      <p dir="auto" className="truncate text-[13.5px] font-semibold text-ink-900">{scan.student.name}</p>
                      <p dir="auto" className="truncate text-[12px] text-ink-500">{scan.section?.name} · {scan.student.studentId} · {METHOD_LABEL[scan.method]}</p>
                    </div>
                    {scan.late && <Badge tone="warn">Late</Badge>}
                    {canManage &&
              <button type="button" aria-label={`Undo check-in of ${scan.student.name}`} onClick={() => remove.mutate(scan._id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600">
                        <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                      </button>
              }
                  </li>
            )}
              </ul>
          }
          </Card>
        </div>
      }
    </>);

}
