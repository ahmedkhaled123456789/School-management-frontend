import { useMemo, useState } from 'react';
import { BedDoubleIcon, PlusIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Select } from '../../../components/ui/Select';
import { EmptyState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear, useSections } from '../../../hooks/sections';
import { useStudents } from '../../../hooks/students';
import { useAllocateBed, useDeleteHostelRoom, useEndAllocation, useHostelRooms, useSaveHostelRoom } from '../../../hooks/hr';
import { PERMISSIONS } from '../../../lib/permissions';
import type { HostelRoom, RoomView } from '../../../types/boarding';
import { todayKey } from '../../../utils/attendance';
import { cn } from '../../../utils/cn';
import { sectionLabel } from '../../../utils/timetable';

export function AdminHostel() {
  const rooms = useHostelRooms();
  const end = useEndAllocation();
  const remove = useDeleteHostelRoom();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [assign, setAssign] = useState<{room: RoomView;bed: number;} | null>(null);
  const [editing, setEditing] = useState<HostelRoom | 'new' | null>(null);
  const list = rooms.data ?? [];
  const beds = list.reduce((n, r) => n + r.beds, 0);
  const taken = list.reduce((n, r) => n + r.occupants.filter((o) => o.allocation).length, 0);
  const blocks = [...new Set(list.map((r) => r.block))];
  return (
    <>
      <PageHeader title="Hostel" description="Boarding rooms and beds. Boys' and girls' rooms are kept apart; parents are told the room and bed."
      breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Services' }, { label: 'Hostel' }]}
      actions={canManage ? <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing('new')}>Add room</Button> : undefined} />
      <section className="mb-5 grid grid-cols-3 gap-3">
        <Kpi label="Boarders" value={String(taken)} />
        <Kpi label="Beds free" value={String(beds - taken)} sub={`of ${beds}`} />
        <Kpi label="Rooms" value={String(list.length)} />
      </section>
      {!list.length ? <Card><EmptyState icon={<BedDoubleIcon className="h-5 w-5" aria-hidden="true" />} title="No rooms yet" description="Add rooms, or use the sample on the Canteen page." /></Card> :
      blocks.map((block) =>
      <section key={block} className="mb-5">
            <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-500">{block}</h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.filter((r) => r.block === block).map((r) =>
          <li key={r._id}>
                  <Card>
                    <CardHeader title={r.name} description={`${r.gender === 'Male' ? 'Boys' : 'Girls'} · ${r.occupants.filter((o) => o.allocation).length}/${r.beds} beds`}
              action={canManage ? <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => remove.mutate(r._id)}>Remove</Button></div> : undefined} />
                    <CardBody>
                      <ul className="space-y-1.5">
                        {r.occupants.map((o) =>
                  <li key={o.bed} className="flex items-center gap-2 text-[13px]">
                            <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md text-[12px] font-bold', o.allocation ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500')}>{o.bed}</span>
                            {o.allocation ?
                    <>
                                <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{o.allocation.student.name} <span className="font-normal text-ink-500">· {o.allocation.section}</span></span>
                                {canManage && <Button size="sm" variant="ghost" onClick={() => end.mutate(o.allocation!._id)}>Check out</Button>}
                              </> :
                    <>
                                <span className="flex-1 text-ink-400">Free</span>
                                {canManage && <Button size="sm" variant="secondary" onClick={() => setAssign({ room: r, bed: o.bed })}>Assign</Button>}
                              </>
                    }
                          </li>
                  )}
                      </ul>
                    </CardBody>
                  </Card>
                </li>
          )}
            </ul>
          </section>
      )}
      {assign && <AssignModal room={assign.room} bed={assign.bed} onClose={() => setAssign(null)} />}
      {editing && <RoomModal initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>);

}

function AssignModal({ room, bed, onClose }: {room: RoomView;bed: number;onClose: () => void;}) {
  const year = useCurrentAcademicYear();
  const sections = useSections(year.id);
  const students = useStudents({ limit: 500 });
  const allocate = useAllocateBed();
  const rooms = useHostelRooms();
  const [studentId, setStudentId] = useState('');
  const [from, setFrom] = useState(todayKey());
  const genderOf = useMemo(() => new Map((students.data?.items ?? []).map((s) => [s._id, s.gender as 'Male' | 'Female' | undefined])), [students.data]);
  // students of the room's gender who do not have a bed yet
  const boarding = useMemo(() => new Set((rooms.data ?? []).flatMap((r) => r.occupants.flatMap((o) => o.allocation ? [o.allocation.student._id] : []))), [rooms.data]);
  const options = useMemo(() => (sections.data ?? []).flatMap((s) => s.students.map((st) => ({ ...st, section: sectionLabel(s) }))).filter((st) => genderOf.get(st._id) === room.gender && !boarding.has(st._id)), [sections.data, genderOf, room.gender, boarding]);
  return (
    <Modal open onClose={onClose} title={`${room.block} ${room.name} · bed ${bed}`} description={`${room.gender === 'Male' ? 'Boys' : 'Girls'} only — the list shows matching students.`} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!studentId} isLoading={allocate.isPending} onClick={() => allocate.mutate({ studentId, gender: genderOf.get(studentId), roomId: room._id, bed, from }, { onSuccess: onClose })}>Assign</Button></>}>
      <div className="space-y-3">
        <SearchableSelect id="bed-student" label="Student" value={studentId} onChange={setStudentId} isLoading={students.isLoading} emptyMessage="Every student of this gender already has a bed" options={options.map((s) => ({ value: s._id, label: s.name, description: s.section }))} />
        <Input id="bed-from" label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
    </Modal>);

}

function RoomModal({ initial, onClose }: {initial?: HostelRoom;onClose: () => void;}) {
  const save = useSaveHostelRoom();
  const [block, setBlock] = useState(initial?.block ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [gender, setGender] = useState<'Male' | 'Female'>(initial?.gender ?? 'Male');
  const [beds, setBeds] = useState(String(initial?.beds ?? 4));
  return (
    <Modal open onClose={onClose} title={initial ? `Edit ${initial.name}` : 'Add room'} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!block.trim() || !name.trim() || !/^\d+$/.test(beds)} isLoading={save.isPending} onClick={() => save.mutate({ id: initial?._id, payload: { block, name, gender, beds: Number(beds) } }, { onSuccess: onClose })}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Input id="room-block" label="Block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="Boys block" />
        <Input id="room-name" label="Room" value={name} onChange={(e) => setName(e.target.value)} placeholder="B-103" />
        <Select id="room-gender" label="For" value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female')} options={[{ value: 'Male', label: 'Boys' }, { value: 'Female', label: 'Girls' }]} />
        <Input id="room-beds" label="Beds" inputMode="numeric" value={beds} onChange={(e) => setBeds(e.target.value)} />
      </div>
    </Modal>);

}

