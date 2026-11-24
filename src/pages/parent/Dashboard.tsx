import { Link } from 'react-router-dom';
import { ArrowRightIcon, AwardIcon, UsersIcon } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { ChildStatusBadge, ResultStatusBadge } from '../../components/parent/childDisplay';
import { childClassLabel, resultGradeLabel } from '../../utils/parentPortal';
import { useAuth } from '../../hooks/auth';
import { useMyChildren } from '../../hooks/parentPortal';
import { FamilyTodo } from '../../components/communication/FamilyTodo';
import type { ParentChild } from '../../types/parentPortal';
import { formatDate, relationLabel } from '../../utils/format';

function ChildCard({ child }: {child: ParentChild;}) {
  const latest = child.latestPublishedResult;
  return (
    <Card as="article" className="flex flex-col">
      <CardBody className="flex-1">
        <div className="flex items-center gap-3">
          <Avatar image={child.image} name={child.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 dir="auto" className="truncate text-[16px] font-bold text-ink-900">
              {child.name}
            </h2>
            <p className="truncate font-mono text-[12px] text-ink-500">{child.studentId}</p>
          </div>
          <ChildStatusBadge child={child} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
          {[
          ['Class level', childClassLabel(child)],
          ['Program', relationLabel(child.program, 'Unassigned')],
          ['Academic year', relationLabel(child.academicYear)],
          ['Admitted', formatDate(child.dateAdmitted)]].
          map(([label, value]) =>
          <div key={label} className="rounded-lg bg-ink-50 px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</dt>
              <dd dir="auto" className="mt-0.5 truncate font-semibold text-ink-800">
                {value}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-4 rounded-lg border border-ink-100 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            <AwardIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Latest published result
          </p>
          {latest ?
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p dir="auto" className="truncate text-[14px] font-semibold text-ink-900">
                  {relationLabel(latest.exam, 'Exam')}
                </p>
                <p className="text-[12px] text-ink-500">
                  {relationLabel(latest.exam?.subject, '')}
                  {latest.exam?.subject ? ' · ' : ''}
                  {formatDate(latest.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[15px] font-bold text-ink-900">
                  {resultGradeLabel(latest)}
                </span>
                <ResultStatusBadge result={latest} />
              </div>
            </div> :

          <p className="mt-2 text-[13px] text-ink-500">No published results yet.</p>
          }
        </div>
      </CardBody>
      <div className="border-t border-ink-100 px-5 py-3">
        <Link to={`/parent/children/${child._id}`}>
          <Button
            variant="secondary"
            fullWidth
            icon={<ArrowRightIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />}>
            View details &amp; results
          </Button>
        </Link>
      </div>
    </Card>);

}

export function ParentDashboard() {
  const { session } = useAuth();
  const query = useMyChildren();
  const children = query.data?.items ?? [];
  const firstName = session?.user.name?.split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hello, ${firstName}` : 'My children'}
        description="Your children's enrolment details and their latest published exam results." />
      <FamilyTodo />


      {query.isError ?
      <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card> :
      query.isLoading ?
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 2 }).map((_, index) =>
        <Card key={index}>
              <CardBody className="space-y-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <SkeletonText lines={5} />
              </CardBody>
            </Card>
        )}
        </div> :
      children.length === 0 ?
      <Card>
          <EmptyState
          icon={<UsersIcon className="h-5 w-5" aria-hidden="true" />}
          title="No children linked to your account"
          description="Please contact the school office to link your children to your parent account." />

        </Card> :

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {children.map((child) =>
        <ChildCard key={child._id} child={child} />
        )}
        </div>
      }
    </>);

}
