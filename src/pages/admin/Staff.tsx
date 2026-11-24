import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { useCreateStaff, useDeleteStaff, useStaff, useUpdateStaff } from '../../hooks/staff';
import { STAFF_ROLE_LABEL, STAFF_ROLE_OPTIONS } from '../../lib/permissions';
import type { StaffMember, StaffMemberRole } from '../../types/staff';
import { emailField } from '../../utils/validation';

const STATUS_OPTIONS = [
{ value: 'true', label: 'Active' },
{ value: 'false', label: 'Disabled (can not sign in)' }];


const ROLE_HINT: Record<StaffMemberRole, string> = {
  accountant: 'fees, expenses (and the finance module); reads students and class levels',
  registrar: 'registers students and parents, links families',
  hr: 'manages teachers'
};

/** Super admins create staff accounts and pick their role. */
export function AdminStaff() {
  const query = useStaff();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const remove = useDeleteStaff();

  return <CrudResourcePage<StaffMember>
    title="Staff"
    description="Staff sign in from the Admin login and only see the sections their role allows."
    entityName="Staff member"
    query={query}
    rowKey={(row) => row._id}
    searchAccessor={(row) => `${row.name} ${row.email} ${row.role} ${row.phone ?? ''}`}
    isSaving={create.isPending || update.isPending}
    isDeleting={remove.isPending}
    emptyDescription="Add an accountant, registrar or HR account."
    columns={[
    {
      key: 'name',
      header: 'Name',
      render: (row) =>
      <span className="flex items-center gap-3 font-semibold text-ink-900">
            <Avatar image={row.image} name={row.name} size="md" />
            <span dir="auto">{row.name}</span>
          </span>

    },
    { key: 'email', header: 'Email', render: (row) => row.email },
    {
      key: 'role',
      header: 'Role',
      render: (row) =>
      <span title={ROLE_HINT[row.role]}>
            <Badge tone="info">{STAFF_ROLE_LABEL[row.role] ?? row.role}</Badge>
          </span>

    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => row.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' }]
    }
    fields={[
    { name: 'name', label: 'Full name', type: 'text', required: true },
    { name: 'email', label: 'Email address', type: 'text', required: true, validate: (value) => emailField(value) },
    { name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, hint: 'At least 6 characters. Leave blank when editing to keep it.', validate: (value) => value && value.length < 6 ? 'Password must be at least 6 characters.' : undefined },
    { name: 'phone', label: 'Phone', type: 'text' },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: STAFF_ROLE_OPTIONS,
      hint: 'Accountant: finance. Registrar: students & parents. HR: teachers.'
    },
    { name: 'isActive', label: 'Status', type: 'select', options: STATUS_OPTIONS, placeholder: 'Active (default)' }]
    }
    toFormValues={(row) => ({
      name: row.name,
      email: row.email,
      phone: row.phone ?? '',
      role: row.role,
      isActive: String(row.isActive)
    })}
    onCreate={(values) => create.mutateAsync({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      phone: values.phone.trim() || undefined,
      role: values.role as StaffMemberRole,
      isActive: values.isActive !== 'false'
    })}
    onUpdate={(row, values) => update.mutateAsync({
      id: row._id,
      payload: {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        role: values.role as StaffMemberRole,
        isActive: values.isActive !== 'false',
        ...(values.password ? { password: values.password } : {})
      }
    })}
    onDelete={(row) => remove.mutateAsync(row._id)} />;

}
