import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Select } from '../../components/ui/Select';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/States';
import { DataTable, type Column } from '../../components/ui/Table';
import { ChildStatusBadge, ResultStatusBadge } from '../../components/parent/childDisplay';
import { childClassLabel, resultGradeLabel } from '../../utils/parentPortal';
import { useMyChild, useMyChildResults } from '../../hooks/parentPortal';
import type { ChildResult } from '../../types/parentPortal';
import { formatDate, relationLabel } from '../../utils/format';
import { ChildFees } from '../../components/parent/ChildFees';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
{ value: 'Pass', label: 'Passed only' },
{ value: 'Fail', label: 'Failed only' }];


const RESULT_COLUMNS: Array<Column<ChildResult>> = [
{
  key: 'exam',
  header: 'Exam',
  render: (row) =>
  <div className="min-w-0">
        <p dir="auto" className="font-semibold text-ink-900">{relationLabel(row.exam, 'Exam')}</p>
        <p className="text-[12px] text-ink-500">{row.exam?.examType ?? ''}</p>
      </div>

},
{ key: 'subject', header: 'Subject', render: (row) => relationLabel(row.exam?.subject) },
{ key: 'date', header: 'Date', render: (row) => formatDate(row.exam?.examDate ?? row.createdAt) },
{
  key: 'grade',
  header: 'Grade',
  render: (row) => <span className="font-mono font-bold text-ink-900">{resultGradeLabel(row)}</span>
},
{ key: 'status', header: 'Status', render: (row) => <ResultStatusBadge result={row} /> },
{
  key: 'remarks',
  header: 'Remarks',
  render: (row) => row.remarks ? <Badge tone="accent">{row.remarks}</Badge> : '—'
}];


export function ParentChildDetail() {
  const { studentId = '' } = useParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const child = useMyChild(studentId);
  const results = useMyChildResults(studentId, {
    page,
    limit: PAGE_SIZE,
    status: status || undefined
  });

  const breadcrumbs = [
  { label: 'My Children', to: '/parent' },
  { label: child.data?.name ?? 'Child' }];


  if (child.isError) {
    return (
      <>
        <PageHeader title="Child details" breadcrumbs={breadcrumbs} />
        <Card>
          <ErrorState error={child.error} />
        </Card>
      </>);

  }

  const profile = child.data;

  return (
    <>
      <PageHeader
        title={child.isLoading ? 'Loading…' : profile?.name ?? 'Child'}
        description="Enrolment details and the exam results your school has published."
        breadcrumbs={breadcrumbs} />


      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardBody>
            {child.isLoading ?
            <div className="space-y-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <SkeletonText lines={8} />
              </div> :

            <>
                <div className="flex items-center gap-3">
                  <Avatar image={profile?.image} name={profile?.name} size="lg" />
                  <div className="min-w-0">
                    <p dir="auto" className="truncate text-[15px] font-bold text-ink-900">
                      {profile?.name}
                    </p>
                    <p className="truncate font-mono text-[12px] text-ink-500">{profile?.studentId}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ChildStatusBadge child={profile} />
                  {profile?.prefectName && <Badge tone="accent">{profile.prefectName}</Badge>}
                </div>
                <dl className="mt-5 space-y-3 text-[13.5px]">
                  {[
                ['Class level', childClassLabel(profile)],
                ['Program', relationLabel(profile?.program, 'Unassigned')],
                ['Academic year', relationLabel(profile?.academicYear)],
                ['Email', profile?.email],
                ['Gender', profile?.gender],
                ['Date of birth', formatDate(profile?.dateOfBirth)],
                ['Admitted', formatDate(profile?.dateAdmitted)],
                ['Phone', profile?.phone],
                ['Address', profile?.address]].
                map(([label, value]) =>
                <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-ink-500">{label}</dt>
                      <dd dir="auto" className="min-w-0 truncate text-end font-semibold text-ink-800">
                        {value || '—'}
                      </dd>
                    </div>
                )}
                </dl>
              </>
            }
          </CardBody>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title="Published results"
            description="Only results the school has published appear here."
            action={
            <div className="w-full sm:w-48">
                <Select
                id="result-status"
                label="Filter"
                options={STATUS_OPTIONS}
                placeholder="All results"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }} />

              </div>
            } />

          <DataTable
            columns={RESULT_COLUMNS}
            rows={results.data?.items ?? []}
            rowKey={(row) => row._id}
            isLoading={results.isLoading}
            isFetching={results.isFetching}
            isError={results.isError}
            error={results.error}
            onRetry={() => results.refetch()}
            emptyTitle="No published results"
            emptyDescription="Results appear here once the school publishes them."
            skeletonRows={4} />

          {(results.data?.total ?? 0) > PAGE_SIZE &&
          <Pagination
            page={page}
            limit={PAGE_SIZE}
            total={results.data?.total ?? 0}
            resultCount={results.data?.items.length ?? 0}
            hasNext={Boolean(results.data?.next)}
            hasPrevious={Boolean(results.data?.previous)}
            onPageChange={setPage}
            isFetching={results.isFetching} />

          }
        </Card>
      </div>

      <ChildFees studentId={studentId} />
    </>);

}
