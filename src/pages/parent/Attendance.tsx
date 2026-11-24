import { useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { StudentAttendanceCard } from '../../components/attendance/StudentAttendanceCard';
import { HealthSummaryCard } from '../../components/health/HealthSummaryCard';
import { useMyChildren } from '../../hooks/parentPortal';
import { cn } from '../../utils/cn';

/** Attendance and health of the parent's children, one child at a time. */
export function ParentAttendancePage() {
  const children = useMyChildren();
  const list = children.data?.items ?? [];
  const [params, setParams] = useSearchParams();
  const child = list.find((c) => c._id === params.get('child')) ?? list[0];
  const firstName = child?.name.split(' ')[0] ?? 'Your child';

  return (
    <>
      <PageHeader title="Attendance" description="Period-by-period attendance, absence alerts and health information." breadcrumbs={[{ label: 'Parent', to: '/parent' }, { label: 'Attendance' }]} />
      {children.isError ?
      <Card><ErrorState error={children.error} onRetry={() => children.refetch()} /></Card> :
      children.isLoading ?
      <Card><CardBody><SkeletonText lines={6} /></CardBody></Card> :
      !child ?
      <Card><EmptyState title="No children linked" description="Ask the school to link your children to your account." /></Card> :

      <>
          {list.length > 1 &&
        <div role="tablist" aria-label="Child" className="mb-4 inline-flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
              {list.map((c) =>
          <button key={c._id} type="button" role="tab" aria-selected={c._id === child._id} onClick={() => setParams({ child: c._id }, { replace: true })}
          className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', c._id === child._id ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                  {c.name}
                </button>
          )}
            </div>
        }
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StudentAttendanceCard studentId={child._id} who={firstName} title={`${firstName}'s attendance`} className="mt-0" />
            </div>
            <HealthSummaryCard student={{ _id: child._id, name: child.name, studentId: child.studentId }} mode="parent" />
          </div>
        </>
      }
    </>);

}
