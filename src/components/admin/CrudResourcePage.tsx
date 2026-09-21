import React, { useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/SearchInput';
import { Select, type SelectOption } from '../ui/Select';
import { DataTable, type Column } from '../ui/Table';
import { Textarea } from '../ui/Textarea';
import type { PaginatedResult } from '../../types/common';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'textarea' | 'select' | 'multiselect';
  required?: boolean;
  requiredOnCreate?: boolean;
  placeholder?: string;
  hint?: string;
  options?: SelectOption[];
  validate?: (value: string, values: Record<string, string>) => string | undefined;
}

export type FormValues = Record<string, string>;

interface CrudResourcePageProps<T> {
  title: string;
  description: string;
  entityName: string;
  query: UseQueryResult<PaginatedResult<T>>;
  columns: Array<Column<T>>;
  fields: FieldConfig[];
  rowKey: (row: T) => string;
  searchAccessor: (row: T) => string;
  toFormValues: (row: T) => FormValues;
  onCreate: (values: FormValues) => Promise<unknown>;
  onUpdate: (row: T, values: FormValues) => Promise<unknown>;
  onDelete?: (row: T) => Promise<unknown>;
  isSaving: boolean;
  isDeleting?: boolean;
  emptyDescription: string;
  createDisabledReason?: string;
  renderDetails?: (row: T) => React.ReactNode;
  headerExtra?: React.ReactNode;
}

function emptyValues(fields: FieldConfig[]): FormValues {
  return fields.reduce<FormValues>((accumulator, field) => {
    accumulator[field.name] = '';
    return accumulator;
  }, {});
}

export function CrudResourcePage<T>({
  title,
  description,
  entityName,
  query,
  columns,
  fields,
  rowKey,
  searchAccessor,
  toFormValues,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting,
  emptyDescription,
  createDisabledReason,
  renderDetails,
  headerExtra
}: CrudResourcePageProps<T>) {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<FormValues>(() => emptyValues(fields));
  const [errors, setErrors] = useState<FormValues>({});
  const [deleting, setDeleting] = useState<T | null>(null);
  const [viewing, setViewing] = useState<T | null>(null);

  const rows = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!search.trim()) return items;
    const needle = search.trim().toLowerCase();
    return items.filter((row) => searchAccessor(row).toLowerCase().includes(needle));
  }, [query.data, search, searchAccessor]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyValues(fields));
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setValues({ ...emptyValues(fields), ...toFormValues(row) });
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const nextErrors: FormValues = {};
    fields.forEach((field) => {
      const value = values[field.name] ?? '';
      if ((field.required || (!editing && field.requiredOnCreate)) && value.trim().length === 0) {
        nextErrors[field.name] = `${field.label} is required.`;
        return;
      }
      const custom = field.validate?.(value, values);
      if (custom) nextErrors[field.name] = custom;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      if (editing) await onUpdate(editing, values);else
      await onCreate(values);
      setFormOpen(false);
      setEditing(null);
    } catch {

      // Errors surface as toasts from the mutation hooks; keep the dialog open.
    }};

  const handleDelete = async () => {
    if (!deleting || !onDelete) return;
    try {
      await onDelete(deleting);
      setDeleting(null);
    } catch {
      setDeleting(null);
    }
  };

  const actionColumn: Column<T> = {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    render: (row) =>
    <div className="flex items-center justify-end gap-1">
        {renderDetails &&
      <Button variant="ghost" size="sm" onClick={() => setViewing(row)}>
            View
          </Button>
      }
        <Button
        variant="ghost"
        size="sm"
        onClick={() => openEdit(row)}
        icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />}>
        
          Edit
        </Button>
        {onDelete &&
      <Button
        variant="ghost"
        size="sm"
        className="text-danger-500 hover:bg-danger-50"
        onClick={() => setDeleting(row)}
        icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />}>
        
            Delete
          </Button>
      }
      </div>

  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: title }]}
        actions={
        <Button
          onClick={openCreate}
          disabled={Boolean(createDisabledReason)}
          title={createDisabledReason}
          icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
          
            New {entityName}
          </Button>
        } />
      

      {createDisabledReason &&
      <p className="mb-4 rounded-lg border border-warn-100 bg-warn-50 px-3.5 py-2.5 text-[13px] font-medium text-warn-500">
          {createDisabledReason}
        </p>
      }

      {headerExtra}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}…`} />
          <p className="text-[13px] text-ink-500">
            {query.isLoading ? 'Loading…' : `${rows.length} record${rows.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <DataTable
          columns={[...columns, actionColumn]}
          rows={rows}
          rowKey={rowKey}
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isError={query.isError}
          error={query.error}
          onRetry={() => query.refetch()}
          caption={title}
          emptyTitle={search ? `No ${title.toLowerCase()} match your search` : `No ${title.toLowerCase()} found`}
          emptyDescription={search ? 'Try a different search term.' : emptyDescription}
          emptyAction={
          !search && !createDisabledReason ?
          <Button onClick={openCreate} icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
                Add {entityName}
              </Button> :
          undefined
          } />
        
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${entityName}` : `New ${entityName}`}
        description={
        editing ?
        'Update this record. The backend rejects updates that duplicate an existing name.' :
        `Create a new ${entityName.toLowerCase()} record.`
        }
        footer={
        <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="crud-form" isLoading={isSaving}>
              {editing ? 'Save changes' : `Create ${entityName.toLowerCase()}`}
            </Button>
          </>
        }>
        
        <form id="crud-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          {fields.map((field) => {
            const shared = {
              id: field.name,
              label: field.label,
              required: field.required,
              error: errors[field.name],
              hint: field.hint,
              placeholder: field.placeholder,
              value: values[field.name] ?? ''
            };
            if (field.type === 'textarea') {
              return (
                <Textarea
                  key={field.name}
                  {...shared}
                  onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                  } />);


            }
            if (field.type === 'select' || field.type === 'multiselect') {
              return (
                <Select
                  key={field.name}
                  {...shared}
                  multiple={field.type === 'multiselect'}
                  options={field.options ?? []}
                  onChange={(event) => {
                    const value = field.type === 'multiselect'
                      ? Array.from(event.target.selectedOptions, (option) => option.value).join(',')
                      : event.target.value;
                    setValues((prev) => ({ ...prev, [field.name]: value }));
                  }} />);


            }
            return (
              <Input
                key={field.name}
                {...shared}
                type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                onChange={(event) =>
                setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                } />);


          })}
        </form>
      </Modal>

      {renderDetails &&
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={`${entityName} details`}
        footer={
        <Button variant="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
        }>
        
          {viewing && renderDetails(viewing)}
        </Modal>
      }

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${entityName.toLowerCase()}?`}
        tone="danger"
        confirmLabel="Delete"
        isLoading={Boolean(isDeleting)}
        message="This permanently removes the record from the school database. This action cannot be undone."
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete} />
      
    </>);

}