import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable } from '../../components/ui/Table';
import { useExams } from '../../hooks/exams';
import type { Exam } from '../../types/exam';
import { formatDate, relationLabel } from '../../utils/format';

export function TeacherExams() {
  const query = useExams();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!search.trim()) return items;
    const needle = search.trim().toLowerCase();
    return items.filter((exam) => exam.name.toLowerCase().includes(needle));
  }, [query.data, search]);

  return (
    <>
      <PageHeader
        title="My Exams"
        description="Every exam paper you have created, with its question count and schedule."
        breadcrumbs={[{ label: 'Teacher', to: '/teacher' }, { label: 'My Exams' }]}
        actions={
        <Link to="/teacher/exams/new">
            <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>Create exam</Button>
          </Link>
        } />
      

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search exams…" />
          <p className="text-[13px] text-ink-500">
            {query.isLoading ? 'Loading…' : `${rows.length} exam${rows.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <DataTable<Exam>
          caption="Exams"
          columns={[
          {
            key: 'name',
            header: 'Exam',
            render: (row) =>
            <Link
              to={`/teacher/exams/${row._id}`}
              className="font-semibold text-ink-900 hover:text-primary-600 hover:underline">
              
                  {row.name}
                </Link>

          },
          { key: 'subject', header: 'Subject', render: (row) => relationLabel(row.subject) },
          { key: 'classLevel', header: 'Class level', render: (row) => relationLabel(row.classLevel) },
          { key: 'examType', header: 'Type', render: (row) => row.examType ?? '—' },
          { key: 'examDate', header: 'Date', render: (row) => formatDate(row.examDate) },
          { key: 'duration', header: 'Duration', render: (row) => row.duration ?? '—' },
          {
            key: 'questions',
            header: 'Questions',
            render: (row) =>
            <span className="font-mono">{row.questions?.length ?? 0}</span>

          },
          {
            key: 'examStatus',
            header: 'Status',
            render: (row) =>
            <Badge tone={row.examStatus === 'live' ? 'success' : 'warn'}>
                  {row.examStatus ?? 'pending'}
                </Badge>

          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) =>
            <Link to={`/teacher/exams/${row._id}`}>
                  <Button variant="ghost" size="sm">
                    Open
                  </Button>
                </Link>

          }]
          }
          rows={rows}
          rowKey={(row) => row._id}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyTitle={search ? 'No exams match your search' : 'No exams found'}
          emptyDescription={
          search ? 'Try a different exam name.' : 'Create your first exam to get started.'
          }
          emptyAction={
          !search ?
          <Link to="/teacher/exams/new">
                <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>Create exam</Button>
              </Link> :
          undefined
          } />
        
      </Card>
    </>);

}