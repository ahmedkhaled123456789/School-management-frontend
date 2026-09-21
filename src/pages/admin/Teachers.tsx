import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
 import { DataTable } from '../../components/ui/Table';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useCreateTeacher, useDeleteTeacher, useTeachers } from '../../hooks/teachers';
import { useClassLevels } from '../../hooks/classes';
import { useSubjects } from '../../hooks/subjects';
import type { Teacher } from '../../types/teacher';
import { relationLabel } from '../../utils/format';
import { emailField, passwordField, requiredField, type Errors } from '../../utils/validation';

const LIMIT = 10;

interface NewTeacher {
  name: string;
  email: string;
  password: string;
  gender: string; phone: string; address: string; subject: string; religion: string; classLevels: string;
}

export function AdminTeachers() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewTeacher>({ name: '', email: '', password: '', gender: '', phone: '', address: '', subject: '', religion: '', classLevels: '' });
  const [errors, setErrors] = useState<Errors<NewTeacher>>({});

  const query = useTeachers({ page, limit: LIMIT, name: name || undefined });
  const create = useCreateTeacher();
  const remove = useDeleteTeacher();
  const classLevels = useClassLevels();
  const subjects = useSubjects();
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null);
  const items = query.data?.items ?? [];

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<NewTeacher> = {
      name: requiredField(values.name, 'Full name'),
      email: emailField(values.email),
      password: passwordField(values.password)
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.password) return;
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        gender: values.gender as 'Male' | 'Female' || undefined,
        phone: values.phone.trim() || undefined,
        address: values.address.trim() || undefined,
        subject: values.subject || undefined,
        religion: values.religion.trim() || undefined,
        classLevels: values.classLevels ? [values.classLevels] : undefined
      });
      setValues({ name: '', email: '', password: '', gender: '', phone: '', address: '', subject: '', religion: '', classLevels: '' });
      setOpen(false);
    } catch {

      // Toast handled by the mutation hook.
    }};

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Teaching staff directory, with program, subject and class-level assignments."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Teachers' }]}
        actions={
        <Button onClick={() => setOpen(true)} icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
            Register teacher
          </Button>
        } />
      
 
      

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <SearchInput
            value={name}
            onChange={(value) => {
              setName(value);
              setPage(1);
            }}
            placeholder="Search by name…" />
          
          <p className="text-[13px] text-ink-500">
            {query.isLoading ? 'Loading…' : `${query.data?.total ?? 0} teachers`}
          </p>
        </div>

        <DataTable<Teacher>
          caption="Teachers"
          columns={[
          {
            key: 'teacherId',
            header: 'Teacher ID',
            render: (row) =>
            <span className="font-mono text-[12.5px] text-ink-600">{row.teacherId || '—'}</span>

          },
          {
            key: 'name',
            header: 'Name',
            render: (row) =>
            <Link
              to={`/admin/teachers/${row._id}`}
              className="font-semibold text-ink-900 hover:text-primary-600 hover:underline">
              
                  {row.name}
                </Link>

          },
          { key: 'email', header: 'Email', render: (row) => row.email },
          { key: 'subject', header: 'Subject', render: (row) => relationLabel(row.subject, 'Unassigned') },
          { key: 'program', header: 'Program', render: (row) => relationLabel(row.program, 'Unassigned') },
          { key: 'classLevel', header: 'Class level', render: (row) => relationLabel(row.classLevel) },
          {
            key: 'academicYear',
            header: 'Academic year',
            render: (row) => relationLabel(row.academicYear)
          },
          {
            key: 'applicationStatus',
            header: 'Application',
            render: (row) =>
            <Badge
              tone={
              row.applicationStatus === 'approved' ?
              'success' :
              row.applicationStatus === 'rejected' ?
              'danger' :
              'warn'
              }>
              
                  {row.applicationStatus ?? 'pending'}
                </Badge>

          },
          {
            key: 'status',
            header: 'Status',
            render: (row) =>
            row.isSuspended ?
            <Badge tone="danger">Suspended</Badge> :
            row.isWithdrawn ?
            <Badge tone="warn">Withdrawn</Badge> :

            <Badge tone="success">Active</Badge>

          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) =>
            <div className="flex justify-end gap-1">
                  <Link to={`/admin/teachers/${row._id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                  <Link to={`/admin/teachers/${row._id}?assign=1`}>
                    <Button variant="ghost" size="sm">
                      Assign
                    </Button>
                  </Link>
                  <Button
                variant="ghost"
                size="sm"
                className="text-danger-600 hover:bg-danger-50"
                onClick={() => setPendingDelete(row)}>
                
                    Delete
                  </Button>
                </div>

          }]
          }
          rows={items}
          rowKey={(row) => row._id}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          emptyTitle={name ? 'No teachers match your search' : 'No teachers found'}
          emptyDescription={
          name ? 'Try a different name.' : 'Register your first teacher to build the staff directory.'
          }
          emptyAction={
          !name ?
          <Button onClick={() => setOpen(true)} icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
                Add teacher
              </Button> :
          undefined
          } />
        

        {(items.length > 0 || page > 1) &&
        <Pagination
          page={page}
          limit={LIMIT}
          total={query.data?.total ?? 0}
          resultCount={items.length}
          hasNext={Boolean(query.data?.next) || items.length === LIMIT}
          hasPrevious={page > 1}
          isFetching={query.isFetching}
          onPageChange={setPage} />

        }
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Register teacher"
        description="Creates a teaching account. Assignments are made from the teacher record."
        footer={
        <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-teacher" isLoading={create.isPending}>
              Create teacher
            </Button>
          </>
        }>
        
        <form id="new-teacher" onSubmit={handleCreate} noValidate className="space-y-4">
          <Input
            id="teacher-name"
            label="Full name"
            required
            value={values.name}
            error={errors.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))} />
          
          <Input
            id="teacher-email"
            label="Email address"
            type="email"
            required
            value={values.email}
            error={errors.email}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))} />
          
          <Input
            id="teacher-password"
            label="Temporary password"
            type="password"
            required
            value={values.password}
            error={errors.password}
            hint="At least 6 characters."
            onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="teacher-gender" label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} value={values.gender} onChange={(event) => setValues((prev) => ({ ...prev, gender: event.target.value }))} />
            <Input id="teacher-phone" label="Phone" value={values.phone} onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input id="teacher-address" label="Address" value={values.address} onChange={(event) => setValues((prev) => ({ ...prev, address: event.target.value }))} />
            <Select id="teacher-subject" label="Subject" options={(subjects.data?.items ?? []).map((item) => ({ value: item._id, label: item.name }))} value={values.subject} placeholder={subjects.isLoading ? 'Loading…' : 'Select subject'} onChange={(event) => setValues((prev) => ({ ...prev, subject: event.target.value }))} />
            <Select id="teacher-class-level" label="Class levels" options={(classLevels.data?.items ?? []).map((item) => ({ value: item._id, label: item.name }))} value={values.classLevels} placeholder={classLevels.isLoading ? 'Loading…' : 'Select class level'} onChange={(event) => setValues((prev) => ({ ...prev, classLevels: event.target.value }))} />
            <Input id="teacher-religion" label="Religion" value={values.religion} onChange={(event) => setValues((prev) => ({ ...prev, religion: event.target.value }))} />
          </div>
          
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this teacher?"
        message={`${pendingDelete?.name ?? 'This teacher'} will be removed permanently. Exams they created are not deleted.`}
        confirmLabel="Delete teacher"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          try {
            await remove.mutateAsync(pendingDelete._id);
            setPendingDelete(null);
          } catch {

            // Toast handled by the mutation hook.
          }}} />
      
    </>);

}