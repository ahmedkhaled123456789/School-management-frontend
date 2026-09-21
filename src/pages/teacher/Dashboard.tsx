import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardListIcon, FileQuestionIcon, PlusIcon, RadioIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useExams } from '../../hooks/exams';
import { useTeacherProfile } from '../../hooks/teachers';
import { formatDate, relationLabel } from '../../utils/format';

export function TeacherDashboard() {
  const exams = useExams();
  const profile = useTeacherProfile();

  const items = exams.data?.items ?? [];
  const live = items.filter((exam) => exam.examStatus === 'live').length;
  const questionTotal = items.reduce((total, exam) => total + (exam.questions?.length ?? 0), 0);

  return (
    <>
      <PageHeader
        title={profile.data?.name ? `Welcome back, ${profile.data.name.split(' ')[0]}` : 'Teaching overview'}
        description="Everything you have created, plus quick access to the exam builder."
        actions={
        <Link to="/teacher/exams/new">
            <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>Create exam</Button>
          </Link>
        } />
      

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Exams"
          value={items.length}
          icon={<ClipboardListIcon className="h-4 w-4" aria-hidden="true" />}
          to="/teacher/exams"
          isLoading={exams.isLoading}
          isUnavailable={exams.isError} />
        
        <StatCard
          label="Live exams"
          value={live}
          icon={<RadioIcon className="h-4 w-4" aria-hidden="true" />}
          isLoading={exams.isLoading}
          isUnavailable={exams.isError} />
        
        <StatCard
          label="Questions written"
          value={questionTotal}
          icon={<FileQuestionIcon className="h-4 w-4" aria-hidden="true" />}
          to="/teacher/questions"
          isLoading={exams.isLoading}
          isUnavailable={exams.isError} />
        
        <StatCard
          label="Students reached"
          value={null}
          icon={<ClipboardListIcon className="h-4 w-4" aria-hidden="true" />}
          isUnavailable
          hint="No teacher-scoped student count exists in the API contract." />
        
      </section>

      <Card className="mt-6">
        <CardHeader
          title="Your exams"
          description="Most recent first, as returned by the exams endpoint."
          action={
          <Link to="/teacher/exams" className="text-[13px] font-semibold text-primary-600 hover:underline">
              View all
            </Link>
          } />
        
        {exams.isError ?
        <ErrorState error={exams.error} onRetry={() => exams.refetch()} /> :
        exams.isLoading ?
        <CardBody className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) =>
          <Skeleton key={index} className="h-12 w-full" />
          )}
          </CardBody> :
        items.length === 0 ?
        <EmptyState
          title="No exams found"
          description="Build your first exam paper with the guided exam creator."
          action={
          <Link to="/teacher/exams/new">
                <Button>Create exam</Button>
              </Link>
          } /> :


        <ul className="divide-y divide-ink-100">
            {items.slice(0, 6).map((exam) =>
          <li key={exam._id}>
                <Link
              to={`/teacher/exams/${exam._id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-primary-50/40">
              
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink-900">{exam.name}</p>
                    <p className="text-[12.5px] text-ink-500">
                      {relationLabel(exam.subject, 'Subject —')} · {formatDate(exam.examDate)} ·{' '}
                      {exam.questions?.length ?? 0} questions
                    </p>
                  </div>
                  <Badge tone={exam.examStatus === 'live' ? 'success' : 'warn'}>
                    {exam.examStatus ?? 'pending'}
                  </Badge>
                </Link>
              </li>
          )}
          </ul>
        }
      </Card>
    </>);

}