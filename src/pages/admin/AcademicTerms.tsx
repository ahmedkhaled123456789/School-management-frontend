import React from 'react';
import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import {
  useAcademicTerms,
  useCreateAcademicTerm,
  useDeleteAcademicTerm,
  useUpdateAcademicTerm } from
'../../hooks/academicTerms';
import type { AcademicTerm } from '../../types/academicTerm';
import { truncate } from '../../utils/format';

export function AdminAcademicTerms() {
  const query = useAcademicTerms();
  const create = useCreateAcademicTerm();
  const update = useUpdateAcademicTerm();
  const remove = useDeleteAcademicTerm();

  return (
    <CrudResourcePage<AcademicTerm>
      title="Academic Terms"
      description="Terms or semesters within an academic year, used by subjects and exams."
      entityName="Academic Term"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => `${row.name} ${row.description ?? ''}`}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="Add terms such as First Term or Second Semester."
      columns={[
      {
        key: 'name',
        header: 'Term',
        render: (row) => <span className="font-semibold text-ink-900">{row.name}</span>
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => truncate(row.description, 70)
      },
      { key: 'duration', header: 'Duration', render: (row) => row.duration ?? '—' }]
      }
      fields={[
      { name: 'name', label: 'Term name', type: 'text', required: true, placeholder: 'e.g. First Term' },
      { name: 'description', label: 'Description', type: 'textarea' },
      {
        name: 'duration',
        label: 'Duration',
        type: 'text',
        placeholder: 'e.g. 3 months',
        hint: 'Defaults to 3 months on the backend when left blank.'
      }]
      }
      toFormValues={(row) => ({
        name: row.name,
        description: row.description ?? '',
        duration: row.duration ?? ''
      })}
      onCreate={(values) =>
      create.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim(),
        duration: values.duration.trim() || undefined
      })
      }
      onUpdate={(row, values) =>
      update.mutateAsync({
        id: row._id,
        payload: {
          name: values.name.trim(),
          description: values.description.trim(),
          duration: values.duration.trim() || undefined
        }
      })
      }
      onDelete={(row) => remove.mutateAsync(row._id)} />);


}