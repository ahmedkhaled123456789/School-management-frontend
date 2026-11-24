import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2Icon, CircleDashedIcon } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { NoAcademicYear } from '../../components/sections/Notices';
import { RegisterSheet } from '../../components/attendance/RegisterSheet';
import { useRegisterDraft, useRegisters, useSaveRegister } from '../../hooks/attendance';
import { useHealthAlerts } from '../../hooks/health';
import { usePermissions } from '../../hooks/permissions';
import { useCurrentAcademicYear, useSchoolDay, useTimetable } from '../../hooks/sections';
import { useTeacherProfile } from '../../hooks/teachers';
import { PERMISSIONS } from '../../lib/permissions';
import { dateFromKey, formatDay, todayKey } from '../../utils/attendance';
import { cn } from '../../utils/cn';
import { formatTime, toMinutes, weekDayOf } from '../../utils/timetable';

/**
 * Take / correct one lesson's register: /admin/attendance/register and
 * /teacher/attendance/register, both with ?section=&date=&period=.
 */
export function RegisterPage() {
  const { pathname } = useLocation();
  const portal = pathname.startsWith('/teacher') ? 'teacher' : 'admin';
  const [params] = useSearchParams();
  const sectionId = params.get('section') ?? '';
  const date = params.get('date') ?? todayKey();
  const periodId = params.get('period') ?? '';

  const year = useCurrentAcademicYear();
  const profile = useTeacherProfile();
  const teacherId = portal === 'teacher' ? profile.data?._id : undefined;
  const { can } = usePermissions();
  const schoolDay = useSchoolDay();
  const draft = useRegisterDraft(year.id, sectionId, date, periodId, teacherId, portal === 'admin' || Boolean(teacherId));
  const save = useSaveRegister(year.id, teacherId);
  const ids = useMemo(() => draft.data?.marks.map((m) => m.student._id) ?? [], [draft.data]);
  const alerts = useHealthAlerts(ids);

  // the section's lessons that day, to move between registers
  const lessons = useTimetable({ academicYear: year.id, section: sectionId }, Boolean(sectionId));
  const taken = useRegisters({ academicYear: year.id, sectionId, date }, Boolean(sectionId));
  const dayLessons = useMemo(() => {
    const day = weekDayOf(dateFromKey(date));
    const order = new Map(schoolDay.data?.periods.map((p, i) => [p._id, i]) ?? []);
    return (lessons.data ?? []).
    filter((l) => l.day === day && (portal === 'admin' || !teacherId || l.teacher._id === teacherId)).
    sort((a, b) => (order.get(a.periodId) ?? 0) - (order.get(b.periodId) ?? 0));
  }, [lessons.data, date, schoolDay.data, portal, teacherId]);

  // opened without a period (e.g. from a section row): go to the first lesson still to take
  const navigate = useNavigate();
  useEffect(() => {
    if (periodId || !dayLessons.length || !taken.data) return;
    const next = dayLessons.find((l) => !taken.data.some((r) => r.periodId === l.periodId)) ?? dayLessons[0];
    navigate(`?section=${sectionId}&date=${date}&period=${next.periodId}`, { replace: true });
  }, [periodId, dayLessons, taken.data, sectionId, date, navigate]);
  const noLessons = !periodId && lessons.isSuccess && schoolDay.isSuccess && dayLessons.length === 0;

  const home = portal === 'admin' ? '/admin/attendance' : '/teacher/attendance';
  const breadcrumbs = [
  { label: portal === 'admin' ? 'Admin' : 'Teacher', to: `/${portal}` },
  { label: 'Attendance', to: `${home}?date=${date}` },
  { label: 'Register' }];

  const title = draft.data ? `${draft.data.section.name} · ${draft.data.periodLabel}` : 'Register';
  const now = toMinutes(`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);

  if (!year.isLoading && !year.id) return <><PageHeader title="Register" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  return (
    <>
      <PageHeader
        title={title}
        description={draft.data ? `${draft.data.subject.name} · ${draft.data.teacher.name} · ${formatDay(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · starts ${formatTime(draft.data.periodStart)}` : formatDay(date)}
        breadcrumbs={breadcrumbs} />

      {dayLessons.length > 1 &&
      <nav aria-label="Lessons this day" className="scrollbar-thin relative mb-4 flex gap-2 overflow-x-auto pb-1">
          {dayLessons.map((lesson) => {
          const period = schoolDay.data?.periods.find((p) => p._id === lesson.periodId);
          const done = taken.data?.some((r) => r.periodId === lesson.periodId);
          const current = lesson.periodId === periodId;
          const future = date > todayKey() || date === todayKey() && period && toMinutes(period.start) > now;
          return (
            <Link
              key={lesson._id}
              to={`?section=${sectionId}&date=${date}&period=${lesson.periodId}`}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold',
                current ? 'border-primary-600 bg-primary-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                future && !current && 'opacity-50'
              )}>
                {done ? <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleDashedIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                {period?.label ?? 'Period'} · {lesson.subject.name}
                <span className="sr-only">{done ? '(taken)' : '(not taken)'}</span>
              </Link>);

        })}
        </nav>
      }

      {noLessons ?
      <Card><ErrorState error={new Error('This section has no lessons on this day.')} /></Card> :
      draft.isError ?
      <Card><ErrorState error={draft.error} onRetry={() => draft.refetch()} /></Card> :
      !draft.data ?
      <Card><CardBody><SkeletonText lines={10} /></CardBody></Card> :

      <RegisterSheet
        draft={draft.data}
        alerts={alerts.data}
        canOverrideLock={portal === 'admin' && can(PERMISSIONS.STUDENTS_MANAGE)}
        viewOnly={portal === 'admin' && !can(PERMISSIONS.STUDENTS_MANAGE)}
        isSaving={save.isPending}
        onSave={(marks) => save.mutateAsync({ date, sectionId, periodId, marks })} />

      }
    </>);

}
