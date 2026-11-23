import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CrudResourcePage } from '../../../components/admin/CrudResourcePage';
import { MockDataNotice } from '../../../components/sections/Notices';
import { useCreateRoom, useCurrentAcademicYear, useDeleteRoom, useRooms, useSchoolDay, useTimetable, useUpdateRoom } from '../../../hooks/sections';
import type { Room, RoomType } from '../../../types/sections';
import type { PaginatedResult } from '../../../types/common';
import type { UseQueryResult } from '@tanstack/react-query';

const TYPE_OPTIONS: Array<{value: RoomType;label: string;}> = [
{ value: 'classroom', label: 'Classroom' },
{ value: 'lab', label: 'Lab' },
{ value: 'hall', label: 'Hall' },
{ value: 'gym', label: 'Gym' },
{ value: 'other', label: 'Other' }];

const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label])) as Record<RoomType, string>;

export function AdminRooms() {
  const rooms = useRooms();
  const year = useCurrentAcademicYear();
  const timetable = useTimetable({ academicYear: year.id });
  const schoolDay = useSchoolDay();
  const create = useCreateRoom();
  const update = useUpdateRoom();
  const remove = useDeleteRoom();

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    (timetable.data ?? []).forEach((e) => {if (e.room) map.set(e.room._id, (map.get(e.room._id) ?? 0) + 1);});
    return map;
  }, [timetable.data]);
  const slotsPerWeek = (schoolDay.data?.days.length ?? 0) * (schoolDay.data?.periods.filter((p) => !p.isBreak).length ?? 0);

  // CrudResourcePage expects a paginated query: adapt the plain list
  const query = useMemo(
    () => ({ ...rooms, data: rooms.data ? { items: rooms.data, total: rooms.data.length, results: rooms.data.length } : undefined }) as unknown as UseQueryResult<PaginatedResult<Room>>,
    [rooms]
  );

  const toPayload = (values: Record<string, string>) => ({
    name: values.name.trim(),
    type: (values.type || 'classroom') as RoomType,
    capacity: Number(values.capacity),
    notes: values.notes.trim()
  });

  return (
    <CrudResourcePage<Room>
      title="Rooms"
      description="Classrooms, labs and halls. The timetable never books one room twice in the same period."
      entityName="Room"
      query={query}
      rowKey={(row) => row._id}
      searchAccessor={(row) => `${row.name} ${TYPE_LABEL[row.type]} ${row.notes ?? ''}`}
      isSaving={create.isPending || update.isPending}
      isDeleting={remove.isPending}
      emptyDescription="Add classrooms and labs, or build the demo from the Sections page."
      headerExtra={<MockDataNotice />}
      columns={[
      { key: 'name', header: 'Room', render: (row) => <span dir="auto" className="font-semibold text-ink-900">{row.name}</span> },
      { key: 'type', header: 'Type', render: (row) => TYPE_LABEL[row.type] },
      { key: 'capacity', header: 'Seats', align: 'right', render: (row) => row.capacity },
      {
        key: 'usage',
        header: 'Used',
        render: (row) => {
          const used = usage.get(row._id) ?? 0;
          return used ?
          <Link to={`/admin/academics/timetable?room=${row._id}`} className="text-primary-600 hover:underline">{used} / {slotsPerWeek} periods a week</Link> :
          <span className="text-ink-400">Free all week</span>;
        }
      },
      { key: 'notes', header: 'Notes', render: (row) => <span dir="auto">{row.notes || '—'}</span> }]
      }
      fields={[
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Room 104' },
      { name: 'type', label: 'Type', type: 'select', options: TYPE_OPTIONS, placeholder: 'Classroom (default)' },
      { name: 'capacity', label: 'Seats', type: 'number', required: true, validate: (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500 ? undefined : 'A whole number between 1 and 500.' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Projector, smart board…' }]
      }
      toFormValues={(row) => ({ name: row.name, type: row.type, capacity: String(row.capacity), notes: row.notes ?? '' })}
      onCreate={(values) => create.mutateAsync(toPayload(values))}
      onUpdate={(row, values) => update.mutateAsync({ id: row._id, payload: toPayload(values) })}
      onDelete={(row) => remove.mutateAsync(row._id)} />);


}
