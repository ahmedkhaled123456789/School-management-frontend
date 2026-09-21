import React from 'react';
import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { Badge } from '../../components/ui/Badge';
import {
  useCreateProgram,
  useDeleteProgram,
  usePrograms,
  useUpdateProgram } from
'../../hooks/programs';
import type { Program } from '../../types/program';
import { countOf, truncate } from '../../utils/format';

export function AdminPrograms() {
  const query = usePrograms();
  const create = useCreateProgram();
  const update = useUpdateProgram();
  const remove = useDeleteProgram();

  return (
    <CrudResourcePage<Program>
      title="Programs"
      description="Academic programs offered by the school, with their enrolled cohorts and subjects."
      entityName="Program"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => `${row.name} ${row.description ?? ''}`}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="Create your first program to start assigning subjects, teachers and students."
      columns={[
      {
        key: 'name',
        header: 'Name',
        render: (row) => <span className="font-semibold text-ink-900">{row.name}</span>
      },
      {
        key: 'code',
        header: 'Code',
        render: (row) =>
        row.code ?
        <span className="font-mono text-[12.5px] text-ink-600">{row.code}</span> :

        <span className="text-ink-400">—</span>

      },
      { key: 'description', header: 'Description', render: (row) => truncate(row.description, 60) },
      { key: 'duration', header: 'Duration', render: (row) => row.duration ?? '—' },
      { key: 'teachers', header: 'Teachers', render: (row) => countOf(row.teachers) },
      { key: 'students', header: 'Students', render: (row) => countOf(row.students) },
      { key: 'subjects', header: 'Subjects', render: (row) => countOf(row.subjects) }]
      }
      fields={[
      { name: 'name', label: 'Program name', type: 'text', required: true, placeholder: 'e.g. General Science' },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'What this program covers…'
      }]
      }
      toFormValues={(row) => ({ name: row.name, description: row.description ?? '' })}
      onCreate={(values) =>
      create.mutateAsync({ name: values.name.trim(), description: values.description.trim() })
      }
      onUpdate={(row, values) =>
      update.mutateAsync({
        id: row._id,
        payload: { name: values.name.trim(), description: values.description.trim() }
      })
      }
      onDelete={(row) => remove.mutateAsync(row._id)}
      renderDetails={(row) =>
      <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Name</dt>
            <dd className="mt-1 font-semibold text-ink-900">{row.name}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">
              Description
            </dt>
            <dd className="mt-1 leading-relaxed text-ink-600">{row.description || '—'}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{countOf(row.teachers)} teachers</Badge>
            <Badge tone="info">{countOf(row.students)} students</Badge>
            <Badge tone="info">{countOf(row.subjects)} subjects</Badge>
            {row.duration && <Badge tone="neutral">{row.duration}</Badge>}
          </div>
        </dl>
      } />);


}