import React from 'react';
import { Link } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useExamResults } from '../../hooks/examResults';
import { formatDate, relationLabel } from '../../utils/format';

export function StudentResults() {
  const query = useExamResults();
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Exam Results"
        description="Detailed marks are available only for results your school has published."
        breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'Exam Results' }]} />
      

      {query.isError ?
      <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card> :
      query.isLoading ?
      <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) =>
        <Skeleton key={index} className="h-36 w-full rounded-xl" />
        )}
        </div> :
      items.length === 0 ?
      <Card>
          <EmptyState
          title="No exam results available"
          description="Once you sit an exam and the school publishes the result, it appears here." />
        
        </Card> :

      <div className="grid gap-4 sm:grid-cols-2">
          {items.map((result) =>
        <Card key={result._id} as="article">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[15px] font-bold text-ink-900">
                    {relationLabel(result.exam, 'Exam')}
                  </h2>
                  <Badge tone={result.isPublished ? 'info' : 'neutral'}>
                    {result.isPublished ? 'Published' : 'Not published'}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-500">{formatDate(result.createdAt)}</p>

                {result.isPublished ?
            <>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[26px] font-extrabold leading-none text-ink-900">
                        {result.score ?? '—'}
                      </span>
                      <Badge tone={result.status === 'Pass' ? 'success' : 'danger'}>
                        {result.status ?? '—'}
                      </Badge>
                      {result.remarks && <Badge tone="accent">{result.remarks}</Badge>}
                    </div>
                    <div className="mt-5">
                      <Link to={`/student/results/${result._id}`}>
                        <Button variant="secondary" fullWidth>
                          View full result
                        </Button>
                      </Link>
                    </div>
                  </> :

            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-ink-50 px-3.5 py-3 text-[13px] text-ink-600">
                    <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
                    <p>
                      This result has not been published yet. Your score and answer review stay
                      hidden until the school releases it.
                    </p>
                  </div>
            }
              </CardBody>
            </Card>
        )}
        </div>
      }
    </>);

}