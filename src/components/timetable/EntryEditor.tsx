import { useEffect, useMemo, useState } from 'react';
import { AlertTriangleIcon, CheckCircle2Icon, Trash2Icon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Select } from '../ui/Select';
import type { Period, Ref, Room, SchoolDay, Section, TimetableEntry, WeekDay } from '../../types/sections';
import { DAY_LABEL, findConflicts, periodRange, sectionLabel } from '../../utils/timetable';

interface EntryEditorProps {
  open: boolean;
  onClose: () => void;
  section: Section;
  day: WeekDay;
  period: Period;
  /** the period being edited (absent = new) */
  entry?: TimetableEntry;
  /** every entry of the academic year, for clash checks */
  yearEntries: TimetableEntry[];
  schoolDay: SchoolDay;
  subjects: Ref[];
  teachers: Array<Ref & {subjectName?: string;}>;
  rooms: Room[];
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (values: {subject: Ref;teacher: Ref;room: Ref | null;}) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}

const sameText = (a?: string, b?: string) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

export function EntryEditor(props: EntryEditorProps) {
  const { open, onClose, section, day, period, entry, yearEntries, schoolDay, subjects, teachers, rooms, isSaving, isDeleting, onSave, onDelete } = props;
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubjectId(entry?.subject._id ?? '');
    setTeacherId(entry?.teacher._id ?? '');
    setRoomId(entry?.room?._id ?? section.room?._id ?? '');
  }, [open, entry, section]);

  const sectionRef = { _id: section._id, name: sectionLabel(section) };
  const subject = subjects.find((s) => s._id === subjectId);
  const teacher = teachers.find((t) => t._id === teacherId);
  const room = rooms.find((r) => r._id === roomId);

  // who/what is already busy in this exact slot (other sections)
  const slotEntries = useMemo(
    () => yearEntries.filter((e) => e._id !== entry?._id && e.day === day && e.periodId === period._id && e.section._id !== section._id),
    [yearEntries, entry, day, period, section]
  );
  const load = useMemo(() => {
    const map = new Map<string, number>();
    yearEntries.forEach((e) => map.set(e.teacher._id, (map.get(e.teacher._id) ?? 0) + 1));
    return map;
  }, [yearEntries]);

  // free teachers first, then the ones teaching this subject, then by load
  const teacherOptions = useMemo(() => {
    return [...teachers].
    map((t) => {
      const busy = slotEntries.find((e) => e.teacher._id === t._id);
      const fits = sameText(t.subjectName, subject?.name);
      const details = [
      busy ? `Busy: ${busy.section.name}` : null,
      t.subjectName ? `Teaches ${t.subjectName}` : null,
      `${load.get(t._id) ?? 0} periods/wk`].
      filter(Boolean).join(' · ');
      return { t, busy: Boolean(busy), fits, option: { value: t._id, label: `${t.name}${busy ? ' (busy)' : fits ? ' ★' : ''}`, description: details } };
    }).
    sort((a, b) => Number(a.busy) - Number(b.busy) || Number(b.fits) - Number(a.fits) || a.t.name.localeCompare(b.t.name)).
    map((x) => x.option);
  }, [teachers, slotEntries, subject, load]);

  const roomOptions = rooms.map((r) => {
    const busy = slotEntries.find((e) => e.room?._id === r._id);
    return { value: r._id, label: `${r.name} · ${r.capacity} seats${busy ? ` (busy: ${busy.section.name})` : ''}` };
  });

  const conflicts = teacher ?
  findConflicts(
    { day, periodId: period._id, section: sectionRef, teacher: { _id: teacher._id, name: teacher.name }, room: room ? { _id: room._id, name: room.name } : null },
    yearEntries,
    schoolDay,
    entry?._id
  ) :
  [];
  const seatWarning = room && room.capacity < section.students.length ? `${room.name} has ${room.capacity} seats for ${section.students.length} students.` : null;
  const canSave = Boolean(subject && teacher) && conflicts.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${sectionLabel(section)} · ${DAY_LABEL[day]}`}
      description={`${period.label} · ${periodRange(period)}`}
      footer={
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            {entry &&
          <Button variant="ghost" className="text-danger-500 hover:bg-danger-50" isLoading={isDeleting} icon={<Trash2Icon className="h-4 w-4" aria-hidden="true" />} onClick={async () => {try {await onDelete();onClose();} catch {/* toast */}}}>
                Clear period
              </Button>
          }
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
            disabled={!canSave}
            isLoading={isSaving}
            onClick={async () => {
              if (!subject || !teacher) return;
              try {
                await onSave({ subject: { _id: subject._id, name: subject.name }, teacher: { _id: teacher._id, name: teacher.name }, room: room ? { _id: room._id, name: room.name } : null });
                onClose();
              } catch {/* toast */}
            }}>

              Save
            </Button>
          </div>
        </div>
      }>

      <div className="space-y-4">
        <Select id="entry-subject" label="Subject" required options={subjects.map((s) => ({ value: s._id, label: s.name }))} placeholder="Choose a subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} />
        <SearchableSelect
          id="entry-teacher"
          label="Teacher"
          options={teacherOptions}
          value={teacherId}
          onChange={setTeacherId}
          hint="★ teaches this subject · busy teachers are listed last." />

        <Select id="entry-room" label="Room" options={roomOptions} placeholder="No room" value={roomId} onChange={(e) => setRoomId(e.target.value)} />

        {conflicts.length > 0 ?
        <ul role="alert" className="space-y-1 rounded-lg border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600">
            {conflicts.map((c) =>
          <li key={c.kind} className="flex gap-2"><AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{c.message}</li>
          )}
          </ul> :
        subject && teacher ?
        <p className="flex items-center gap-2 text-[13px] font-medium text-success-600"><CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />No clashes. The teacher and the room are free.</p> :
        null}
        {seatWarning && <p className="text-[13px] font-medium text-warn-500">{seatWarning}</p>}
        {subject && teacher?.subjectName && !sameText(teacher.subjectName, subject.name) &&
        <p className="text-[12.5px] text-ink-500">Note: {teacher.name}'s main subject is {teacher.subjectName}.</p>
        }
      </div>
    </Modal>);

}
