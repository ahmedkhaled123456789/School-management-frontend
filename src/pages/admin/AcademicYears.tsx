import React from 'react';
import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { Badge } from '../../components/ui/Badge';
import {
  useAcademicYears,
  useCreateAcademicYear,
  useDeleteAcademicYear,
  useUpdateAcademicYear } from
'../../hooks/academicYears';
import type { AcademicYear } from '../../types/academicYear';
import { yearField } from '../../utils/validation';

export function AdminAcademicYears() {
  const query = useAcademicYears();
  const create = useCreateAcademicYear();
  const update = useUpdateAcademicYear();
  const remove = useDeleteAcademicYear();

  return (
    <CrudResourcePage<AcademicYear>
      title="Academic Years"
      description="Define the school calendar years that students, teachers and exams are attached to."
      entityName="Academic Year"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => row.name}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="Add an academic year to begin scheduling terms, cohorts and exams."
      columns={[
      {
        key: 'name',
        header: 'Academic year',
        render: (row) => <span className="font-semibold text-ink-900">{row.name}</span>
      },
      { key: 'fromYear', header: 'Start', render: (row) => row.fromYear ?? '—' },
      { key: 'toYear', header: 'End', render: (row) => row.toYear ?? '—' },
      {
        key: 'isCurrent',
        header: 'Current',
        render: (row) =>
        row.isCurrent ? <Badge tone="success">Current</Badge> : <Badge>Archived</Badge>
      }]
      }
      fields={[
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. 2025/2026' },
      {
        name: 'fromYear',
        label: 'From year',
        type: 'text',
        required: true,
        placeholder: '2025',
        validate: (value) => yearField(value, 'From year')
      },
      {
        name: 'toYear',
        label: 'To year',
        type: 'text',
        required: true,
        placeholder: '2026',
        validate: (value, values) => {
          const invalid = yearField(value, 'To year');
          if (invalid) return invalid;
          if (values.fromYear && Number(value) < Number(values.fromYear)) {
            return 'To year must be the same as or after the from year.';
          }
          return undefined;
        }
      }]
      }
      toFormValues={(row) => ({
        name: row.name,
        fromYear: row.fromYear ? String(new Date(row.fromYear).getFullYear() || row.fromYear) : '',
        toYear: row.toYear ? String(new Date(row.toYear).getFullYear() || row.toYear) : ''
      })}
      onCreate={(values) =>
      create.mutateAsync({
        name: values.name.trim(),
        fromYear: values.fromYear.trim(),
        toYear: values.toYear.trim()
      })
      }
      onUpdate={(row, values) =>
      update.mutateAsync({
        id: row._id,
        payload: {
          name: values.name.trim(),
          fromYear: values.fromYear.trim(),
          toYear: values.toYear.trim()
        }
      })
      }
      onDelete={(row) => remove.mutateAsync(row._id)} />);


}