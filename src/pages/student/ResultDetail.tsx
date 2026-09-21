import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2Icon, XCircleIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState, UnauthorizedState } from '../../components/ui/States';
import { useExamResult, useExamResults } from '../../hooks/examResults';
import { cn } from '../../utils/cn';
import { relationLabel } from '../../utils/format';

export function StudentResultDetail() {
  const { resultID = '' } = useParams();
  const list = useExamResults();
  const summary = (list.data?.items ?? []).find((item) => item._id === resultID);
  const isPublished = summary?.isPublished ?? false;

  // Detailed marks are only requested once we know the result is published.
  const detail = useExamResult(resultID, isPublished);
  const result = detail.data ?? summary;

  const breadcrumbs = [
  { label: 'Student', to: '/student' },
  { label: 'Exam Results', to: '/student/results' },
  { label: 'Result' }];


  if (list.isLoading) {
    return (
      <>
        <PageHeader title="Result" breadcrumbs={breadcrumbs} />
        <Card>
          <CardBody>
            <SkeletonText lines={6} />
          </CardBody>
        </Card>
      </>);

  }

  if (!summary) {
    return (
      <>
        <PageHeader title="Result" breadcrumbs={breadcrumbs} />
        <Card>
          <EmptyState
            title="Result not found"
            description="This result is not in your results list."
            action={
            <Link to="/student/results">
                <Button>Back to results</Button>
              </Link>
            } />
          
        </Card>
      </>);

  }

  if (!isPublished) {
    return (
      <>
        <PageHeader title="Result" breadcrumbs={breadcrumbs} />
        <Card>
          <UnauthorizedState
            message="This result has not been published by your school yet, so the detailed breakdown is not available."
            action={
            <Link to="/student/results">
                <Button>Back to results</Button>
              </Link>
            } />
          
        </Card>
      </>);

  }

  if (detail.isError) {
    return (
      <>
        <PageHeader title="Result" breadcrumbs={breadcrumbs} />
        <Card>
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        </Card>
      </>);

  }

  const answers = result?.answeredQuestions ?? [];

  return (
    <>
      <PageHeader
        title={relationLabel(result?.exam, 'Exam result')}
        description="Published result, including your answer review."
        breadcrumbs={breadcrumbs} />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Score</p>
            <p className="mt-2 font-mono text-[38px] font-extrabold leading-none text-ink-900">
              {result?.score ?? '—'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={result?.status === 'Pass' ? 'success' : 'danger'}>
                {result?.status ?? '—'}
              </Badge>
              {result?.remarks && <Badge tone="accent">{result.remarks}</Badge>}
            </div>
            <dl className="mt-5 space-y-3 text-[13.5px]">
              {[
              ['Grade', result?.grade != null ? String(result.grade) : '—'],
              ['Pass mark', result?.passMark != null ? String(result.passMark) : '—'],
              ['Position', result?.position != null ? String(result.position) : '—'],
              ['Class level', relationLabel(result?.classLevel)],
              ['Academic term', relationLabel(result?.academicTerm)],
              ['Academic year', relationLabel(result?.academicYear)]].
              map(([label, value]) =>
              <div key={label} className="flex justify-between gap-3">
                  <dt className="text-ink-500">{label}</dt>
                  <dd className="text-right font-semibold text-ink-800">{value}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Answer review"
            description="How each of your answers was marked." />
          
          {detail.isLoading ?
          <CardBody>
              <SkeletonText lines={8} />
            </CardBody> :
          answers.length === 0 ?
          <EmptyState
            title="No answer breakdown available"
            description="The published result does not include a per-question review." /> :


          <CardBody>
              <ol className="space-y-2.5">
                {answers.map((answer, index) =>
              <li
                key={`${answer.question ?? 'question'}-${index}`}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3 text-[13.5px]',
                  answer.isCorrect ?
                  'border-success-500/30 bg-success-50' :
                  'border-danger-500/25 bg-danger-50'
                )}>
                
                    <span className="mt-0.5 shrink-0">
                      {answer.isCorrect ?
                  <CheckCircle2Icon
                    className="h-4 w-4 text-success-500"
                    aria-hidden="true" /> :


                  <XCircleIcon className="h-4 w-4 text-danger-500" aria-hidden="true" />
                  }
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">
                        {index + 1}. {answer.question ?? 'Question'}
                      </p>
                      <p className="mt-0.5 text-ink-600">
                        {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        {answer.correctAnswer ? ` · Correct answer: ${answer.correctAnswer}` : ''}
                      </p>
                    </div>
                  </li>
              )}
              </ol>
            </CardBody>
          }
        </Card>
      </div>
    </>);

}