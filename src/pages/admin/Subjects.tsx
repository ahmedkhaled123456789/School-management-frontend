import React, { useMemo } from 'react';
import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { useAcademicTerms } from '../../hooks/academicTerms';
import { useTeachers } from '../../hooks/teachers';
import {
  useCreateSubject,
  useDeleteSubject,
  useSubjects,
  useUpdateSubject } from
'../../hooks/subjects';
import type { Subject } from '../../types/subject';
import { relationLabel } from '../../utils/format';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
  (day) => ({ value: day, label: day })
);

export function AdminSubjects() {
  const query = useSubjects();
  const terms = useAcademicTerms();
  const teachers = useTeachers({ page: 1, limit: 100 });
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const remove = useDeleteSubject();

  const termOptions = useMemo(
    () => (terms.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
    [terms.data]
  );
  const teacherOptions = useMemo(
    () => (teachers.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
    [teachers.data]
  );

  return (
    <CrudResourcePage<Subject>
      title="Subjects"
      description="Subjects taught across the school, with the teacher, room and academic term they belong to."
      entityName="Subject"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => `${row.name} ${row.classes ?? ''} ${row.day ?? ''}`}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="No subjects have been created yet."
      columns={[
      {
        key: 'name',
        header: 'Name',
        render: (row) => <span className="font-semibold text-ink-900">{row.name}</span>
      },
      { key: 'day', header: 'Day', render: (row) => row.day || '—' },
      { key: 'classes', header: 'Class / room', render: (row) => row.classes || '—' },
      {
        key: 'teacher',
        header: 'Teacher',
        render: (row) => relationLabel(row.teacher, 'Unassigned')
      },
      {
        key: 'academicTerm',
        header: 'Academic Term',
        render: (row) => relationLabel(row.academicTerm)
      },
      { key: 'duration', header: 'Duration', render: (row) => row.duration ?? '—' }]
      }
      fields={[
      {
        name: 'name',
        label: 'Subject name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Mathematics'
      },
      { name: 'day', label: 'Day', type: 'select', options: DAYS },
      { name: 'classes', label: 'Class / room', type: 'text', placeholder: 'e.g. Room 101' },
      {
        name: 'teacher',
        label: 'Teacher',
        type: 'select',
        options: teacherOptions,
        hint: teacherOptions.length === 0 ? 'No teachers exist yet.' : undefined
      },
      {
        name: 'academicTerm',
        label: 'Academic term',
        type: 'select',
        options: termOptions,
        hint: termOptions.length === 0 ? 'No academic terms exist yet.' : undefined
      }]
      }
      toFormValues={(row) => ({
        name: row.name,
        day: row.day ?? '',
        classes: row.classes ?? '',
        teacher: typeof row.teacher === 'string' ? row.teacher : (row.teacher as any)?._id ?? '',
        academicTerm:
        typeof row.academicTerm === 'string' ?
        row.academicTerm :
        (row.academicTerm as any)?._id ?? ''
      })}
      onCreate={(values) =>
      create.mutateAsync({
        name: values.name.trim(),
        day: values.day || undefined,
        classes: values.classes.trim() || undefined,
        teacher: values.teacher || undefined,
        academicTerm: values.academicTerm || undefined
      })
      }
      onUpdate={(row, values) =>
      update.mutateAsync({
        id: row._id,
        payload: {
          name: values.name.trim(),
          day: values.day || undefined,
          classes: values.classes.trim() || undefined,
          teacher: values.teacher || undefined,
          academicTerm: values.academicTerm || undefined
        }
      })
      }
      onDelete={(row) => remove.mutateAsync(row._id)} />);


}