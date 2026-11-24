import { CrudResourcePage } from '../../components/admin/CrudResourcePage';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { useAdmins, useCreateAdmin, useDeleteAdmin, useUpdateAdminAccount } from '../../hooks/admins';
import { useAuth } from '../../hooks/auth';
import type { Admin } from '../../types/admin';
import { formatDate } from '../../utils/format';
import { emailField } from '../../utils/validation';

const ROLE_OPTIONS = [
{ value: 'false', label: 'Admin' },
{ value: 'true', label: 'Super Admin' }];


/** Super admins manage the other administrator accounts. */
export function AdminAdministrators() {
  const { session } = useAuth();
  const query = useAdmins();
  const create = useCreateAdmin();
  const update = useUpdateAdminAccount();
  const remove = useDeleteAdmin();
  const myId = session?.user._id;

  return <CrudResourcePage<Admin>
    title="Administrators"
    description="Admins manage the school; super admins also manage admins, staff accounts and school settings."
    entityName="Administrator"
    query={query}
    rowKey={(row) => row._id}
    searchAccessor={(row) => `${row.name ?? ''} ${row.email ?? ''} ${row.phone ?? ''}`}
    isSaving={create.isPending || update.isPending}
    isDeleting={remove.isPending}
    emptyDescription="Add an administrator account."
    columns={[
    {
      key: 'name',
      header: 'Name',
      render: (row) =>
      <span className="flex items-center gap-3 font-semibold text-ink-900">
            <Avatar image={row.image} name={row.name} size="md" />
            <span dir="auto">{row.name || '—'}</span>
            {row._id === myId && <Badge tone="neutral">You</Badge>}
          </span>

    },
    { key: 'email', header: 'Email', render: (row) => row.email || '—' },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    {
      key: 'role',
      header: 'Role',
      render: (row) => row.isSuperAdmin ? <Badge tone="accent">Super Admin</Badge> : <Badge tone="info">Admin</Badge>
    },
    { key: 'created', header: 'Added', render: (row) => formatDate(row.createdAt) }]
    }
    fields={[
    { name: 'name', label: 'Full name', type: 'text', required: true },
    { name: 'email', label: 'Email address', type: 'text', required: true, validate: (value) => emailField(value) },
    { name: 'password', label: 'Password', type: 'password', requiredOnCreate: true, hint: 'At least 6 characters. Leave blank when editing to keep it.', validate: (value) => value && value.length < 6 ? 'Password must be at least 6 characters.' : undefined },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'text' },
    { name: 'isSuperAdmin', label: 'Role', type: 'select', options: ROLE_OPTIONS, placeholder: 'Admin (default)', hint: 'You can not change your own role.' }]
    }
    toFormValues={(row) => ({
      name: row.name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      address: row.address ?? '',
      isSuperAdmin: String(Boolean(row.isSuperAdmin))
    })}
    onCreate={(values) => create.mutateAsync({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      phone: values.phone.trim(),
      address: values.address.trim() || undefined,
      isSuperAdmin: values.isSuperAdmin === 'true'
    })}
    onUpdate={(row, values) => update.mutateAsync({
      id: row._id,
      payload: {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        address: values.address.trim() || undefined,
        ...(values.password ? { password: values.password } : {}),
        // the backend refuses a change of your own role
        ...(row._id === myId ? {} : { isSuperAdmin: values.isSuperAdmin === 'true' })
      }
    })}
    onDelete={(row) => remove.mutateAsync(row._id)} />;

}
