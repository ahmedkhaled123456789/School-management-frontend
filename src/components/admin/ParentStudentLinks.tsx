import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LinkIcon, UnlinkIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SearchableSelect, type SearchableOption } from '../ui/SearchableSelect';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import {
  useLinkStudentToParent,
  useParent,
  useParents,
  useUnlinkStudentFromParent } from
'../../hooks/parents';
import { useStudents } from '../../hooks/students';
import type { StudentParentRef } from '../../types/student';

interface LinkedItem {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  to?: string;
}

/** List of linked records with an inline two-step "Unlink" (no nested modal). */
function LinkedList({
  items,
  emptyText,
  pendingId,
  onUnlink





}: {items: LinkedItem[];emptyText: string;pendingId?: string;onUnlink?: (id: string) => void;}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="text-[13px] text-ink-500">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-ink-100 rounded-lg border border-ink-100">
      {items.map((item) =>
      <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
          <Avatar image={item.image} name={item.title} size="sm" />
          <div className="min-w-0 flex-1">
            {item.to ?
          <Link to={item.to} dir="auto" className="block truncate text-[13.5px] font-semibold text-primary-600 hover:underline">
                {item.title}
              </Link> :

          <p dir="auto" className="truncate text-[13.5px] font-semibold text-ink-900">{item.title}</p>
          }
            {item.subtitle && <p className="truncate text-[12px] text-ink-500">{item.subtitle}</p>}
          </div>
          {!onUnlink ? null : confirmId === item.id ?
        <div className="flex items-center gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
              <Button
            size="sm"
            variant="danger"
            isLoading={pendingId === item.id}
            onClick={() => {
              onUnlink(item.id);
              setConfirmId(null);
            }}>
                Confirm unlink
              </Button>
            </div> :

        <Button
          size="sm"
          variant="ghost"
          isLoading={pendingId === item.id}
          icon={<UnlinkIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => setConfirmId(item.id)}>
              Unlink
            </Button>
        }
        </li>
      )}
    </ul>);

}

/** Searchable picker + "Link" button. */
function LinkPicker({
  id,
  label,
  options,
  onLink,
  isLinking,
  isLoading,
  onSearchChange,
  hint









}: {id: string;label: string;options: SearchableOption[];onLink: (value: string) => Promise<unknown>;isLinking: boolean;isLoading?: boolean;onSearchChange?: (query: string) => void;hint?: string;}) {
  const [selected, setSelected] = useState('');

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <SearchableSelect
          id={id}
          label={label}
          options={options}
          value={selected}
          onChange={setSelected}
          onSearchChange={onSearchChange}
          isLoading={isLoading}
          hint={hint} />

      </div>
      <Button
        className="sm:mb-[22px]"
        disabled={!selected}
        isLoading={isLinking}
        icon={<LinkIcon className="h-4 w-4" aria-hidden="true" />}
        onClick={() =>
        onLink(selected).then(
          () => setSelected(''),
          () => undefined // toast handled by the mutation hook
        )
        }>
        Link
      </Button>
    </div>);

}

const idOf = (value: string | {_id?: string;}) => typeof value === 'string' ? value : value._id ?? '';

/* -------------------------------------------------------------------------- */
/* Admin > Student detail: the student's parents                               */
/* -------------------------------------------------------------------------- */

export function StudentParentsCard({
  studentId,
  parents,
  isLoading,
  readOnly = false





}: {studentId: string;parents?: Array<string | StudentParentRef>;isLoading?: boolean;readOnly?: boolean;}) {
  const allParents = useParents();
  const link = useLinkStudentToParent();
  const unlink = useUnlinkStudentFromParent();

  const linked = useMemo(
    () => (parents ?? []).filter((item): item is StudentParentRef => typeof item === 'object'),
    [parents]
  );
  const linkedIds = useMemo(() => new Set((parents ?? []).map(idOf)), [parents]);

  const options = useMemo<SearchableOption[]>(
    () =>
    (allParents.data?.items ?? []).
    filter((parent) => !linkedIds.has(parent._id)).
    map((parent) => ({
      value: parent._id,
      label: parent.name ?? parent.email ?? 'Parent',
      description: [parent.email, parent.phone].filter(Boolean).join(' · ')
    })),
    [allParents.data, linkedIds]
  );

  return (
    <Card>
      <CardHeader
        title="Parents / guardians"
        description="Linked parents can see this student's profile and published results in the parent portal." />

      <CardBody className="space-y-4">
        {isLoading ?
        <SkeletonText lines={3} /> :

        <LinkedList
          items={linked.map((parent) => ({
            id: parent._id,
            title: parent.name ?? 'Parent',
            subtitle: [parent.parentId, parent.email, parent.phone].filter(Boolean).join(' · '),
            image: parent.image
          }))}
          emptyText="No parent is linked to this student yet."
          pendingId={unlink.isPending ? unlink.variables?.parentId : undefined}
          onUnlink={readOnly ? undefined : (parentId) => unlink.mutate({ parentId, studentId })} />

        }
        {readOnly ? null : allParents.isError ?
        <ErrorState error={allParents.error} onRetry={() => allParents.refetch()} className="py-6" /> :

        <LinkPicker
          id={`link-parent-${studentId}`}
          label="Link a parent"
          options={options}
          isLoading={allParents.isLoading}
          isLinking={link.isPending}
          hint="Search by name, email or phone."
          onLink={(parentId) => link.mutateAsync({ parentId, studentId })} />

        }
      </CardBody>
    </Card>);

}

/* -------------------------------------------------------------------------- */
/* Admin > Parents > View: the parent's children                               */
/* -------------------------------------------------------------------------- */

export function ParentStudentsManager({ parentId, readOnly = false }: {parentId: string;readOnly?: boolean;}) {
  // fetch the parent itself so the list refreshes after every link / unlink
  const parent = useParent(parentId);
  const [search, setSearch] = useState('');
  const students = useStudents({ name: search || undefined, limit: 20 });
  const link = useLinkStudentToParent();
  const unlink = useUnlinkStudentFromParent();

  const linked = useMemo(
    () =>
    (parent.data?.student ?? []).filter(
      (item): item is {_id?: string;name?: string;studentId?: string;} => typeof item === 'object'
    ),
    [parent.data]
  );
  const linkedIds = useMemo(() => new Set((parent.data?.student ?? []).map(idOf)), [parent.data]);

  const options = useMemo<SearchableOption[]>(
    () =>
    (students.data?.items ?? []).
    filter((student) => !linkedIds.has(student._id)).
    map((student) => ({
      value: student._id,
      label: student.name,
      description: [student.studentId, student.email].filter(Boolean).join(' · ')
    })),
    [students.data, linkedIds]
  );

  if (parent.isError) {
    return <ErrorState error={parent.error} onRetry={() => parent.refetch()} className="py-6" />;
  }

  return (
    <section className="mt-6 space-y-3 border-t border-ink-100 pt-5" aria-label="Linked students">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Linked students</h3>
      {parent.isLoading ?
      <SkeletonText lines={2} /> :

      <LinkedList
        items={linked.map((student) => ({
          id: student._id ?? '',
          title: student.name ?? student.studentId ?? 'Student',
          subtitle: student.studentId,
          to: student._id ? `/admin/students/${student._id}` : undefined
        }))}
        emptyText="No students linked to this parent yet."
        pendingId={unlink.isPending ? unlink.variables?.studentId : undefined}
        onUnlink={readOnly ? undefined : (studentId) => unlink.mutate({ parentId, studentId })} />

      }
      {!readOnly &&
      <LinkPicker
        id={`link-student-${parentId}`}
        label="Link a student"
        options={options}
        onSearchChange={setSearch}
        isLoading={students.isFetching}
        isLinking={link.isPending}
        hint="Search students by name."
        onLink={(studentId) => link.mutateAsync({ parentId, studentId })} />
      }
    </section>);

}
