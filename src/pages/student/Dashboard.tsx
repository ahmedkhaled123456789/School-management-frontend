import React from 'react';
import { Link } from 'react-router-dom';
import { AwardIcon, CalendarDaysIcon, ClipboardListIcon, UserIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useExamResults } from '../../hooks/examResults';
import { useStudentProfile } from '../../hooks/students';
import { formatDate, relationLabel } from '../../utils/format';

export function StudentDashboard() {
  const profile = useStudentProfile();
  const results = useExamResults();

  const items = results.data?.items ?? [];
  const published = items.filter((item) => item.isPublished);
  const passed = published.filter((item) => item.status === 'Pass').length;

  return (
    <>
      <PageHeader
        title={profile.data?.name ? `Hello, ${profile.data.name.split(' ')[0]}` : 'My dashboard'}
        description="Your enrolment details and published exam results."
        actions={
        <Link to="/student/exams">
            <Button icon={<ClipboardListIcon className="h-4 w-4" aria-hidden="true" />}>
              My exams
            </Button>
          </Link>
        } />
      

      {(profile.data?.isSuspended || profile.data?.isWithdrawn) &&
      <div
        role="alert"
        className="mb-5 rounded-xl border border-danger-100 bg-danger-50 px-4 py-3 text-[13.5px] font-semibold text-danger-600">
        
          Your account is currently {profile.data?.isSuspended ? 'suspended' : 'withdrawn'}. Exam
          access is enforced by the school office.
        </div>
      }

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published results"
          value={published.length}
          icon={<AwardIcon className="h-4 w-4" aria-hidden="true" />}
          to="/student/results"
          isLoading={results.isLoading}
          isUnavailable={results.isError} />
        
        <StatCard
          label="Exams passed"
          value={passed}
          icon={<ClipboardListIcon className="h-4 w-4" aria-hidden="true" />}
          isLoading={results.isLoading}
          isUnavailable={results.isError} />
        
        <StatCard
          label="Current class"
          value={profile.data?.currentClassLevel ?? '—'}
          icon={<CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />}
          isLoading={profile.isLoading}
          isUnavailable={profile.isError} />
        
        <StatCard
          label="Program"
          value={relationLabel(profile.data?.program, 'Unassigned')}
          icon={<UserIcon className="h-4 w-4" aria-hidden="true" />}
          to="/student/profile"
          isLoading={profile.isLoading}
          isUnavailable={profile.isError} />
        
      </section>

      <Card className="mt-6">
        <CardHeader
          title="Recent results"
          description="Only results your school has published are shown."
          action={
          <Link to="/student/results" className="text-[13px] font-semibold text-primary-600 hover:underline">
              View all
            </Link>
          } />
        
        {results.isError ?
        <ErrorState error={results.error} onRetry={() => results.refetch()} /> :
        results.isLoading ?
        <CardBody className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) =>
          <Skeleton key={index} className="h-12 w-full" />
          )}
          </CardBody> :
        published.length === 0 ?
        <EmptyState
          title="No exam results available"
          description="Results appear here once your school publishes them." /> :


        <ul className="divide-y divide-ink-100">
            {published.slice(0, 5).map((result) =>
          <li key={result._id}>
                <Link
              to={`/student/results/${result._id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-primary-50/40">
              
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink-900">
                      {relationLabel(result.exam, 'Exam')}
                    </p>
                    <p className="text-[12.5px] text-ink-500">{formatDate(result.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[14px] font-bold text-ink-800">
                      {result.score ?? '—'}
                    </span>
                    <Badge tone={result.status === 'Pass' ? 'success' : 'danger'}>
                      {result.status ?? '—'}
                    </Badge>
                  </div>
                </Link>
              </li>
          )}
          </ul>
        }
      </Card>
    </>);

}