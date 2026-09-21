 import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import {
  useClassLevels,
  useCreateClassLevel,
  useDeleteClassLevel,
  useUpdateClassLevel } from
'../../hooks/classes';
import type { ClassLevel } from '../../types/classLevel';
import { countOf, truncate } from '../../utils/format';

export function AdminClassLevels() {
  const query = useClassLevels();
  const create = useCreateClassLevel();
  const update = useUpdateClassLevel();
  const remove = useDeleteClassLevel();

  return (
    <CrudResourcePage<ClassLevel>
      title="Class Levels"
      description="The progression levels students move through during their program."
      entityName="Class Level"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => `${row.name} ${row.description ?? ''}`}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="Add class levels such as Level 100 or Level 200 to organise your students."
      columns={[
      {
        key: 'name',
        header: 'Level name',
        render: (row) => <span className="font-semibold text-ink-900">{row.name}</span>
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => truncate(row.description, 70)
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (row) => row.amount ?? '—'
      },
      { key: 'students', header: 'Students', render: (row) => countOf(row.students) },
      { key: 'subjects', header: 'Subjects', render: (row) => countOf(row.subjects) },
      { key: 'teachers', header: 'Teachers', render: (row) => countOf(row.teachers) }]
      }
      fields={[
      { name: 'name', label: 'Level name', type: 'text', required: true, placeholder: 'e.g. Level 100' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: 'e.g. 5000' }]
      }
      toFormValues={(row) => ({ name: row.name, description: row.description ?? '', amount: String(row.amount ?? '') })}
      onCreate={(values) =>
      create.mutateAsync({ name: values.name.trim(), description: values.description.trim(), amount: Number(values.amount) })
      }
      onUpdate={(row, values) =>
      update.mutateAsync({
        id: row._id,
        payload: { name: values.name.trim(), description: values.description.trim(), amount: Number(values.amount) }
      })
      }
      onDelete={(row) => remove.mutateAsync(row._id)} />);


}