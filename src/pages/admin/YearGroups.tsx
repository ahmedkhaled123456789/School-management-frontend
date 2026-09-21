import React, { useMemo } from 'react';
import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { useAcademicYears } from '../../hooks/academicYears';
import {
  useCreateYearGroup,
  useDeleteYearGroup,
  useUpdateYearGroup,
  useYearGroups } from
'../../hooks/yearGroups';
import type { YearGroup } from '../../types/yearGroup';
import { relationLabel } from '../../utils/format';

export function AdminYearGroups() {
  const query = useYearGroups();
  const years = useAcademicYears();
  const create = useCreateYearGroup();
  const update = useUpdateYearGroup();
  const remove = useDeleteYearGroup();

  const yearOptions = useMemo(
    () => (years.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
    [years.data]
  );

  return (
    <CrudResourcePage<YearGroup>
      title="Year Groups"
      description="Graduating cohorts tied to an academic year."
      entityName="Year Group"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => row.name}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="Create a year group to organise students by graduating cohort."
      columns={[
      {
        key: 'name',
        header: 'Year group',
        render: (row) => <span className="font-semibold text-ink-900">{row.name}</span>
      },
      {
        key: 'academicYear',
        header: 'Academic year',
        render: (row) => {
          const label = relationLabel(row.academicYear, '');
          if (label) return label;
          const match = yearOptions.find((option) => option.value === row.academicYear);
          return match?.label ?? '—';
        }
      }]
      }
      fields={[
      { name: 'name', label: 'Year group name', type: 'text', required: true, placeholder: 'e.g. Class of 2027' },
      {
        name: 'academicYear',
        label: 'Academic year',
        type: 'select',
        required: true,
        options: yearOptions,
        hint: yearOptions.length === 0 ? 'Create an academic year first.' : undefined
      }]
      }
      toFormValues={(row) => ({
        name: row.name,
        academicYear: typeof row.academicYear === 'string' ? row.academicYear : ''
      })}
      onCreate={(values) =>
      create.mutateAsync({ name: values.name.trim(), academicYear: values.academicYear })
      }
      onUpdate={(row, values) =>
      update.mutateAsync({
        id: row._id,
        payload: { name: values.name.trim(), academicYear: values.academicYear }
      })
      }
      onDelete={(row) => remove.mutateAsync(row._id)} />);


}