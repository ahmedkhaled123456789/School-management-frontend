import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Select } from '../ui/Select';
import { useRooms } from '../../hooks/sections';
import type { Ref, Section, SectionPayload } from '../../types/sections';

interface SectionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: SectionPayload) => Promise<unknown>;
  isSaving: boolean;
  classLevels: Ref[];
  teachers: Ref[];
  /** editing an existing section */
  section?: Section | null;
  /** new section: preselected level and suggested name */
  defaults?: {classLevel?: Ref;name?: string;};
}

/** Create / edit a section: name, class level, homeroom teacher, default room, capacity. */
export function SectionForm({ open, onClose, onSubmit, isSaving, classLevels, teachers, section, defaults }: SectionFormProps) {
  const rooms = useRooms();
  const [name, setName] = useState('');
  const [levelId, setLevelId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(section?.name ?? defaults?.name ?? '');
    setLevelId(section?.classLevel._id ?? defaults?.classLevel?._id ?? '');
    setTeacherId(section?.homeroomTeacher?._id ?? '');
    setRoomId(section?.room?._id ?? '');
    setCapacity(String(section?.capacity ?? 30));
    setErrors({});
  }, [open, section, defaults]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!/^[\p{L}\p{N} -]{1,12}$/u.test(name.trim())) next.name = 'Use 1–12 letters or digits, e.g. A.';
    if (!levelId) next.level = 'Choose a class level.';
    const seats = Number(capacity);
    if (!Number.isInteger(seats) || seats < 1 || seats > 100) next.capacity = 'A whole number between 1 and 100.';else
    if (section && seats < section.students.length) next.capacity = `There are already ${section.students.length} students.`;
    setErrors(next);
    if (Object.keys(next).length) return;
    const level = classLevels.find((l) => l._id === levelId) ?? section?.classLevel;
    if (!level) {
      setErrors({ level: 'This class level no longer exists.' });
      return;
    }
    const teacher = teachers.find((t) => t._id === teacherId);
    const room = rooms.data?.find((r) => r._id === roomId);
    try {
      await onSubmit({
        name: name.trim(),
        classLevel: { _id: level._id, name: level.name },
        homeroomTeacher: teacher ? { _id: teacher._id, name: teacher.name } : null,
        room: room ? { _id: room._id, name: room.name } : null,
        capacity: seats
      });
      onClose();
    } catch {

      // toast shown by the hook
    }};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={section ? `Edit ${section.classLevel.name} / ${section.name}` : 'New section'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={isSaving} onClick={submit}>{section ? 'Save changes' : 'Create section'}</Button></>}>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="sec-level"
          label="Class level"
          required
          disabled={Boolean(section?.students.length)}
          hint={section?.students.length ? 'Fixed while the section has students.' : undefined}
          error={errors.level}
          options={classLevels.map((l) => ({ value: l._id, label: l.name }))}
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)} />

        <Input id="sec-name" label="Section name" required dir="auto" placeholder="A" value={name} error={errors.name} onChange={(e) => setName(e.target.value)} />
        <div className="sm:col-span-2">
          <SearchableSelect
            id="sec-homeroom"
            label="Homeroom teacher"
            options={teachers.map((t) => ({ value: t._id, label: t.name }))}
            value={teacherId}
            onChange={setTeacherId}
            hint="Responsible for the section; sees it under My Sections." />

        </div>
        <Select
          id="sec-room"
          label="Default room"
          options={(rooms.data ?? []).map((r) => ({ value: r._id, label: `${r.name} · ${r.capacity} seats` }))}
          placeholder={rooms.isLoading ? 'Loading…' : 'No default room'}
          hint="Used for new timetable periods."
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)} />

        <Input id="sec-capacity" label="Capacity" required inputMode="numeric" value={capacity} error={errors.capacity} onChange={(e) => setCapacity(e.target.value)} />
      </div>
    </Modal>);

}
