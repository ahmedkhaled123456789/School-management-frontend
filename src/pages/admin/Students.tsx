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
import { useCreateStudent, useDeleteStudent, useStudents } from '../../hooks/students';
import { useClassLevels } from '../../hooks/classes';
import type { Student } from '../../types/student';
import { relationLabel } from '../../utils/format';
import { emailField, passwordField, requiredField, type Errors } from '../../utils/validation';

const LIMIT = 10;

interface NewStudent {
  name: string;
  email: string;
  password: string;
  admissionDate: string; phone: string; address: string; gender: string;
  fatherOccupation: string; dateOfBirth: string; motherName: string; fatherName: string;
  religion: string; status: string; classLevels: string; fatherEmail: string;
}

export function AdminStudents() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewStudent>({
    name: '', email: '', password: '', admissionDate: '', phone: '', address: '', gender: '',
    fatherOccupation: '', dateOfBirth: '', motherName: '', fatherName: '', religion: '',
    status: 'true', classLevels: '', fatherEmail: ''
  });
  const [errors, setErrors] = useState<Errors<NewStudent>>({});

  const query = useStudents({ page, limit: LIMIT, name: name || undefined });
  const create = useCreateStudent();
  const remove = useDeleteStudent();
  const classLevels = useClassLevels();
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const items = query.data?.items ?? [];

  const handleSearch = (value: string) => {
    setName(value);
    setPage(1);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<NewStudent> = {
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
        admissionDate: values.admissionDate || undefined, phone: values.phone.trim() || undefined,
        address: values.address.trim() || undefined, gender: values.gender as 'Male' | 'Female' || undefined,
        fatherOccupation: values.fatherOccupation.trim() || undefined, dateOfBirth: values.dateOfBirth || undefined,
        motherName: values.motherName.trim() || undefined, fatherName: values.fatherName.trim() || undefined,
        religion: values.religion.trim() || undefined, status: values.status === 'true',
        classLevels: values.classLevels ? [values.classLevels] : undefined,
        fatherEmail: values.fatherEmail.trim() || undefined
      });
      setValues({ name: '', email: '', password: '', admissionDate: '', phone: '', address: '', gender: '', fatherOccupation: '', dateOfBirth: '', motherName: '', fatherName: '', religion: '', status: 'true', classLevels: '', fatherEmail: '' });
      setOpen(false);
    } catch {

      // Toast already surfaced by the mutation hook.
    }};

  return (
    <>
      <PageHeader
        title="Students"
        description="Search the student directory, register new students and manage their academic placement."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Students' }]}
        actions={
        <Button onClick={() => setOpen(true)} icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
            Register student
          </Button>
        } />
      

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <SearchInput value={name} onChange={handleSearch} placeholder="Search by name…" />
          <p className="text-[13px] text-ink-500">
            {query.isLoading ? 'Loading…' : `${query.data?.total ?? 0} students`}
          </p>
        </div>

        <DataTable<Student>
          caption="Students"
          columns={[
          {
            key: 'studentId',
            header: 'Student ID',
            render: (row) =>
            <span className="font-mono text-[12.5px] text-ink-600">{row.studentId || '—'}</span>

          },
          {
            key: 'name',
            header: 'Name',
            render: (row) =>
            <Link
              to={`/admin/students/${row._id}`}
              className="font-semibold text-ink-900 hover:text-primary-600 hover:underline">
              
                  {row.name}
                </Link>

          },
          { key: 'email', header: 'Email', render: (row) => row.email },
          { key: 'program', header: 'Program', render: (row) => relationLabel(row.program, 'Unassigned') },
          {
            key: 'currentClassLevel',
            header: 'Current class',
            render: (row) => row.currentClassLevel || '—'
          },
          {
            key: 'academicYear',
            header: 'Academic year',
            render: (row) => relationLabel(row.academicYear)
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
            key: 'graduation',
            header: 'Graduation',
            render: (row) =>
            row.isGraduated ? <Badge tone="info">Graduated</Badge> : <Badge>In progress</Badge>
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) =>
            <div className="flex justify-end gap-1">
                  <Link to={`/admin/students/${row._id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                  <Link to={`/admin/students/${row._id}?edit=1`}>
                    <Button variant="ghost" size="sm">
                      Edit
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
          emptyTitle={name ? 'No students match your search' : 'No students found'}
          emptyDescription={
          name ?
          'Try a different name, or clear the search to see everyone.' :
          'Register your first student to build the directory.'
          }
          emptyAction={
          !name ?
          <Button onClick={() => setOpen(true)} icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
                Add student
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
        title="Register student"
        description="Creates a student account. Academic placement is assigned afterwards from the student record."
        footer={
        <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="new-student" isLoading={create.isPending}>
              Create student
            </Button>
          </>
        }>
        
        <form id="new-student" onSubmit={handleCreate} noValidate className="space-y-4">
          <Input
            id="student-name"
            label="Full name"
            required
            value={values.name}
            error={errors.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))} />
          
          <Input
            id="student-email"
            label="Email address"
            type="email"
            required
            value={values.email}
            error={errors.email}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))} />
          
          <Input
            id="student-password"
            label="Temporary password"
            type="password"
            required
            value={values.password}
            error={errors.password}
            hint="At least 6 characters. The student can change this from their profile."
            onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="student-admission-date" label="Admission date" type="date" value={values.admissionDate} onChange={(event) => setValues((prev) => ({ ...prev, admissionDate: event.target.value }))} />
            <Input id="student-date-of-birth" label="Date of birth" type="date" value={values.dateOfBirth} onChange={(event) => setValues((prev) => ({ ...prev, dateOfBirth: event.target.value }))} />
            <Input id="student-phone" label="Phone" value={values.phone} onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input id="student-address" label="Address" value={values.address} onChange={(event) => setValues((prev) => ({ ...prev, address: event.target.value }))} />
            <Select id="student-gender" label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} value={values.gender} onChange={(event) => setValues((prev) => ({ ...prev, gender: event.target.value }))} />
            <Select id="student-status" label="Status" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} value={values.status} onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value }))} />
            <Select id="student-class-level" label="Class level" options={(classLevels.data?.items ?? []).map((item) => ({ value: item._id, label: item.name }))} value={values.classLevels} placeholder={classLevels.isLoading ? 'Loading…' : 'Select class level'} onChange={(event) => setValues((prev) => ({ ...prev, classLevels: event.target.value }))} />
            <Input id="student-religion" label="Religion" value={values.religion} onChange={(event) => setValues((prev) => ({ ...prev, religion: event.target.value }))} />
            <Input id="student-father-name" label="Father name" value={values.fatherName} onChange={(event) => setValues((prev) => ({ ...prev, fatherName: event.target.value }))} />
            <Input id="student-father-email" label="Father email" type="email" value={values.fatherEmail} onChange={(event) => setValues((prev) => ({ ...prev, fatherEmail: event.target.value }))} />
            <Input id="student-father-occupation" label="Father occupation" value={values.fatherOccupation} onChange={(event) => setValues((prev) => ({ ...prev, fatherOccupation: event.target.value }))} />
            <Input id="student-mother-name" label="Mother name" value={values.motherName} onChange={(event) => setValues((prev) => ({ ...prev, motherName: event.target.value }))} />
          </div>
          
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this student?"
        message={`${pendingDelete?.name ?? 'This student'} will be removed permanently, along with their place in the directory.`}
        confirmLabel="Delete student"
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