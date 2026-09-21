import React, { useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
 import { DataTable } from '../../components/ui/Table';
import { useExamResults, useToggleResultPublish } from '../../hooks/examResults';
import type { ExamResult } from '../../types/examResult';
import { relationLabel } from '../../utils/format';

export function AdminExamResults() {
  const query = useExamResults();
  const toggle = useToggleResultPublish();
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<ExamResult | null>(null);

  const rows = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!search.trim()) return items;
    const needle = search.trim().toLowerCase();
    return items.filter((item) =>
    `${item.studentID ?? ''} ${relationLabel(item.exam, '')}`.toLowerCase().includes(needle)
    );
  }, [query.data, search]);

  const publishedCount = (query.data?.items ?? []).filter((item) => item.isPublished).length;

  const handleToggle = async () => {
    if (!pending) return;
    try {
      await toggle.mutateAsync({ id: pending._id, publish: !pending.isPublished });
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Exam Results"
        description="Review submitted results and control which ones students can see."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Exam Results' }]} />
      

     

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student ID or exam…" />
          
          <p className="text-[13px] text-ink-500">
            {query.isLoading ?
            'Loading…' :
            `${rows.length} result${rows.length === 1 ? '' : 's'} · ${publishedCount} published`}
          </p>
        </div>

        <DataTable<ExamResult>
          caption="Exam results"
          columns={[
          {
            key: 'studentID',
            header: 'Student ID',
            render: (row) =>
            <span className="font-mono text-[12.5px] text-ink-600">{row.studentID || '—'}</span>

          },
          {
            key: 'exam',
            header: 'Exam',
            render: (row) =>
            <span className="font-semibold text-ink-900">{relationLabel(row.exam, 'Exam')}</span>

          },
          {
            key: 'score',
            header: 'Score',
            render: (row) => <span className="font-mono">{row.score ?? '—'}</span>
          },
          {
            key: 'grade',
            header: 'Grade',
            render: (row) => <span className="font-mono">{row.grade ?? '—'}</span>
          },
          {
            key: 'status',
            header: 'Pass/Fail',
            render: (row) =>
            row.status ?
            <Badge tone={row.status === 'Pass' ? 'success' : 'danger'}>{row.status}</Badge> :

            <span className="text-ink-400">—</span>

          },
          { key: 'remarks', header: 'Remarks', render: (row) => row.remarks ?? '—' },
          {
            key: 'academicTerm',
            header: 'Term',
            render: (row) => relationLabel(row.academicTerm)
          },
          {
            key: 'academicYear',
            header: 'Year',
            render: (row) => relationLabel(row.academicYear)
          },
          {
            key: 'isPublished',
            header: 'Published',
            render: (row) =>
            <Badge tone={row.isPublished ? 'info' : 'neutral'}>
                  {row.isPublished ? 'Published' : 'Hidden'}
                </Badge>

          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) =>
            <Button
              variant={row.isPublished ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setPending(row)}
              disabled={toggle.isPending}>
              
                  {row.isPublished ? 'Unpublish' : 'Publish'}
                </Button>

          }]
          }
          rows={rows}
          rowKey={(row) => row._id}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyTitle={search ? 'No results match your search' : 'No exam results available'}
          emptyDescription={
          search ?
          'Try a different student ID or exam name.' :
          'Results appear here once students submit their exams.'
          } />
        
      </Card>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.isPublished ? 'Unpublish this result?' : 'Publish this result?'}
        confirmLabel={pending?.isPublished ? 'Unpublish' : 'Publish'}
        tone={pending?.isPublished ? 'danger' : 'primary'}
        isLoading={toggle.isPending}
        message={
        pending?.isPublished ?
        'The student will immediately lose access to the detailed breakdown of this result.' :
        'The student will be able to see their score, grade, remarks and answer review for this exam.'
        }
        onCancel={() => setPending(null)}
        onConfirm={handleToggle} />
      
    </>);

}