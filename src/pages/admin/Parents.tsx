 import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { useCreateParent, useParents, useUpdateParent } from '../../hooks/parents';
import { useStudents } from '../../hooks/students';
import type { Parent } from '../../types/parent';
import { relationLabel } from '../../utils/format';

function studentsLabel(value: Parent['student']): string {
  if (!Array.isArray(value) || value.length === 0) return '—';
  return value.map((item) => typeof item === 'string' ? relationLabel(item) : item.name ?? item.studentId ?? 'Student').join(', ');
}

export function AdminParents() {
  const query = useParents();
  const students = useStudents({ limit: 100 });
  const create = useCreateParent();
  const update = useUpdateParent();
  const studentOptions = (students.data?.items ?? []).map((student) => ({ value: student._id, label: `${student.name} (${student.studentId})` }));

  return <CrudResourcePage<Parent>
    title="Parents"
    description="Manage parent accounts and their student relationships."
    entityName="Parent"
    query={query}
    rowKey={(row) => row._id}
    searchAccessor={(row) => `${row.name ?? ''} ${row.email ?? ''} ${row.phone ?? ''} ${studentsLabel(row.student)}`}
    isSaving={create.isPending || update.isPending}
    emptyDescription="Register a parent account to connect families with students."
    columns={[
      { key: 'name', header: 'Parent name', render: (row) => <span className="font-semibold text-ink-900">{row.name || '—'}</span> },
      { key: 'email', header: 'Email', render: (row) => row.email || '—' },
      { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
      { key: 'address', header: 'Address', render: (row) => row.address || '—' },
      { key: 'occupation', header: 'Occupation', render: (row) => row.occupation || '—' },
      { key: 'students', header: 'Student(s)', render: (row) => studentsLabel(row.student) }
    ]}
    fields={[
      { name: 'name', label: 'Full name', type: 'text', required: true },
      { name: 'email', label: 'Email address', type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, hint: 'Required when registering a parent.', },
      { name: 'student', label: 'Student(s)', type: 'select', requiredOnCreate: true, options: studentOptions, hint: 'Hold Ctrl or Command to select multiple students.' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'occupation', label: 'Occupation', type: 'text' },
      { name: 'religion', label: 'Religion', type: 'text' }
    ]}
    toFormValues={(row) => ({ name: row.name ?? '', email: row.email ?? '', phone: row.phone ?? '', address: row.address ?? '', occupation: row.occupation ?? '', religion: row.religion ?? '', student: Array.isArray(row.student) ? row.student.map((item) => typeof item === 'string' ? item : item._id ?? '').filter(Boolean).join(',') : '' })}
    onCreate={(values) => create.mutateAsync({ name: values.name.trim(), email: values.email.trim(), password: values.password, student: values.student ? values.student.split(',').filter(Boolean) : [], phone: values.phone.trim() || undefined, address: values.address.trim() || undefined, occupation: values.occupation.trim() || undefined, religion: values.religion.trim() || undefined })}
    onUpdate={(row, values) => update.mutateAsync({ id: row._id, payload: { name: values.name.trim() || undefined, email: values.email.trim() || undefined, password: values.password || undefined, phone: values.phone.trim() || undefined, address: values.address.trim() || undefined, occupation: values.occupation.trim() || undefined } })}
    renderDetails={(row) => <dl className="space-y-3 text-sm">{[['Name', row.name], ['Email', row.email], ['Phone', row.phone], ['Address', row.address], ['Occupation', row.occupation], ['Religion', row.religion], ['Student(s)', studentsLabel(row.student)]].map(([label, value]) => <div key={label}><dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">{label}</dt><dd className="mt-1 text-ink-700">{String(value || '—')}</dd></div>)}</dl>}
  />;
}