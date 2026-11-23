import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeftIcon, PencilIcon, SearchIcon, Trash2Icon, UserMinusIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { SectionForm } from '../../../components/sections/SectionForm';
import { TimetableGrid } from '../../../components/timetable/TimetableGrid';
import {
  useAddStudents,
  useDeleteSection,
  useMoveStudent,
  useRemoveStudent,
  useSchoolDay,
  useSchoolDirectory,
  useSection,
  useSections,
  useTimetable,
  useUpdateSection } from
'../../../hooks/sections';
import type { StudentRef } from '../../../types/sections';
import { sectionLabel } from '../../../utils/timetable';
import { toast } from 'sonner';

export function AdminSectionDetail() {
  const { sectionId = '' } = useParams();
  const navigate = useNavigate();
  const query = useSection(sectionId);
  const section = query.data;
  const directory = useSchoolDirectory();
  const yearSections = useSections(section?.academicYear ?? '');
  const schoolDay = useSchoolDay();
  const timetable = useTimetable({ academicYear: section?.academicYear ?? '', section: sectionId }, Boolean(section));
  const add = useAddStudents();
  const remove = useRemoveStudent();
  const move = useMoveStudent();
  const update = useUpdateSection();
  const destroy = useDeleteSection();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState<StudentRef | null>(null);
  const [moving, setMoving] = useState<StudentRef | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const label = section ? sectionLabel(section) : 'Section';
  const seatsLeft = section ? Math.max(section.capacity - section.students.length, 0) : 0;
  const knownStudents = useMemo(() => new Set(Object.values(directory.studentsByLevel).flat().map((s) => s._id)), [directory.studentsByLevel]);

  // where every student of the year sits (to show "in 1/B" next to busy students)
  const seatOf = useMemo(() => {
    const map = new Map<string, string>();
    (yearSections.data ?? []).forEach((s) => s.students.forEach((st) => map.set(st._id, sectionLabel(s))));
    return map;
  }, [yearSections.data]);

  const candidates = useMemo(() => {
    if (!section) return [];
    const needle = search.trim().toLowerCase();
    return (directory.studentsByLevel[section.classLevel._id] ?? []).
    filter((st) => !section.students.some((x) => x._id === st._id)).
    filter((st) => !needle || `${st.name} ${st.studentId ?? ''}`.toLowerCase().includes(needle)).
    sort((a, b) => Number(seatOf.has(a._id)) - Number(seatOf.has(b._id)) || a.name.localeCompare(b.name));
  }, [section, directory.studentsByLevel, search, seatOf]);

  const otherSections = (yearSections.data ?? []).filter((s) => section && s._id !== section._id && s.classLevel._id === section.classLevel._id);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Sections', to: '/admin/academics/sections' }, { label }];
  if (query.isError) return <><PageHeader title="Section" breadcrumbs={breadcrumbs} /><Card><ErrorState error={query.error} /></Card></>;
  if (!section) return <><PageHeader title="Loading…" breadcrumbs={breadcrumbs} /><Card><CardBody><SkeletonText lines={8} /></CardBody></Card></>;

  const togglePick = (id: string) => {
    if (!picked.has(id) && picked.size >= seatsLeft) {
      toast.error(seatsLeft ? `Only ${seatsLeft} seat(s) left in ${label}.` : `${label} is full. Raise its capacity first.`);
      return;
    }
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);else next.add(id);
      return next;
    });
  };

  const addPicked = async () => {
    const students = candidates.filter((st) => picked.has(st._id));
    try {
      await add.mutateAsync({ sectionId: section._id, students });
      toast.success(`${students.length} student(s) added to ${label}.`);
      setPicked(new Set());
    } catch {/* toast */}
  };

  return (
    <>
      <PageHeader
        title={label}
        description={`${section.students.length} of ${section.capacity} seats · homeroom: ${section.homeroomTeacher?.name ?? 'none'} · room: ${section.room?.name ?? 'none'}`}
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <Link to={`/admin/academics/timetable?section=${section._id}`}><Button variant="secondary">Edit timetable</Button></Link>
            <Button variant="secondary" icon={<PencilIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="ghost" className="text-danger-500 hover:bg-danger-50" icon={<Trash2Icon className="h-4 w-4" aria-hidden="true" />} onClick={() => setDeleting(true)}>Delete</Button>
          </>
        } />


      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={`Students (${section.students.length})`} description={seatsLeft ? `${seatsLeft} seat(s) left` : 'The section is full'} />
          {section.students.length === 0 ?
          <CardBody><p className="text-[13.5px] text-ink-500">No students yet. Add them from the list.</p></CardBody> :

          <ol className="divide-y divide-ink-100">
              {section.students.map((student, index) =>
            <li key={student._id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="w-6 text-end font-mono text-[12px] text-ink-400">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/admin/students/${student._id}`} dir="auto" className="block truncate text-[13.5px] font-semibold text-primary-600 hover:underline">{student.name}</Link>
                    <p className="font-mono text-[12px] text-ink-500">{student.studentId}</p>
                  </div>
                  {!directory.isLoading && !knownStudents.has(student._id) &&
              <span title="Withdrawn, moved to another level, or deleted"><Badge tone="warn">Not in current records</Badge></span>
              }
                  <Button size="sm" variant="ghost" icon={<ArrowRightLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />} disabled={!otherSections.length} title={otherSections.length ? undefined : 'No other section in this level'} onClick={() => {setMoving(student);setMoveTo('');}}>
                    Move
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger-500 hover:bg-danger-50" aria-label={`Remove ${student.name}`} icon={<UserMinusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setRemoving(student)} />
                </li>
            )}
            </ol>
          }
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Add students" description={`Students currently in ${section.classLevel.name}.`} />
          <CardBody className="space-y-3">
            <label className="relative block">
              <span className="sr-only">Search students</span>
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or student ID…" className="h-10 w-full rounded-lg border border-ink-200 ps-9 pe-3 text-sm focus:border-primary-500" />
            </label>
            {directory.isLoading ?
            <SkeletonText lines={4} /> :
            candidates.length === 0 ?
            <p className="text-[13px] text-ink-500">{search ? 'No match.' : 'Every student of this level is in this section.'}</p> :

            <ul className="scrollbar-thin max-h-80 space-y-1 overflow-y-auto">
                {candidates.map((student) => {
                const elsewhere = seatOf.get(student._id);
                return (
                  <li key={student._id}>
                      <label className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${elsewhere ? 'opacity-60' : 'cursor-pointer hover:bg-ink-50'}`}>
                        <input type="checkbox" disabled={Boolean(elsewhere)} checked={picked.has(student._id)} onChange={() => togglePick(student._id)} />
                        <span className="min-w-0 flex-1">
                          <span dir="auto" className="block truncate text-[13.5px] font-semibold text-ink-800">{student.name}</span>
                          <span className="font-mono text-[11.5px] text-ink-500">{student.studentId}</span>
                        </span>
                        {elsewhere && <Badge tone="neutral">in {elsewhere}</Badge>}
                      </label>
                    </li>);

              })}
              </ul>
            }
            <Button fullWidth disabled={!picked.size} isLoading={add.isPending} onClick={addPicked}>
              {picked.size ? `Add ${picked.size} student(s)` : 'Select students to add'}
            </Button>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Weekly timetable"
          description={`${timetable.data?.length ?? 0} period(s) a week`}
          action={<Link to={`/admin/academics/timetable?section=${section._id}`} className="text-[13px] font-semibold text-primary-600 hover:underline">Edit</Link>} />

        <CardBody>
          {schoolDay.data && timetable.data ?
          <TimetableGrid schoolDay={schoolDay.data} entries={timetable.data} perspective="section" /> :
          <SkeletonText lines={6} />}
        </CardBody>
      </Card>

      <SectionForm
        open={editing}
        onClose={() => setEditing(false)}
        section={section}
        classLevels={directory.classLevels}
        teachers={directory.teachers}
        isSaving={update.isPending}
        onSubmit={(payload) => update.mutateAsync({ id: section._id, payload })} />


      <Modal
        open={Boolean(moving)}
        onClose={() => setMoving(null)}
        title={`Move ${moving?.name ?? 'student'}`}
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setMoving(null)}>Cancel</Button>
            <Button disabled={!moveTo} isLoading={move.isPending} onClick={async () => {
            if (!moving) return;
            try {await move.mutateAsync({ from: section._id, studentId: moving._id, to: moveTo });setMoving(null);} catch {/* toast */}
          }}>Move</Button>
          </>
        }>

        <Select
          id="move-to"
          label={`To another ${section.classLevel.name} section`}
          options={otherSections.map((s) => ({ value: s._id, label: `${sectionLabel(s)} · ${s.students.length}/${s.capacity}${s.students.length >= s.capacity ? ' (full)' : ''}` }))}
          value={moveTo}
          onChange={(e) => setMoveTo(e.target.value)} />

      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name ?? 'student'} from ${label}?`}
        message="The student goes back to “without a section” and can be added to any section of the level."
        confirmLabel="Remove"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {await remove.mutateAsync({ sectionId: section._id, studentId: removing._id });} catch {/* toast */}
          setRemoving(null);
        }} />


      <ConfirmDialog
        open={deleting}
        title={`Delete ${label}?`}
        message={`${section.students.length} student(s) go back to “without a section”${timetable.data?.length ? ` and ${timetable.data.length} timetable period(s) are removed` : ''}.`}
        confirmLabel="Delete section"
        tone="danger"
        isLoading={destroy.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          try {await destroy.mutateAsync(section._id);navigate('/admin/academics/sections');} catch {/* toast */}
          setDeleting(false);
        }} />

    </>);

}
