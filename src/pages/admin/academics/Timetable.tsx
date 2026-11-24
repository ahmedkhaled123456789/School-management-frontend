import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CopyIcon, EraserIcon, PrinterIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { Select } from '../../../components/ui/Select';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { MockDataNotice, NoAcademicYear } from '../../../components/sections/Notices';
import { EntryEditor } from '../../../components/timetable/EntryEditor';
import { TimetableGrid, type GridPerspective } from '../../../components/timetable/TimetableGrid';
import {
  useClearSectionTimetable,
  useCopyTimetable,
  useCurrentAcademicYear,
  useDeleteEntry,
  useRooms,
  useSaveEntry,
  useSchoolDay,
  useSchoolDirectory,
  useSections,
  useTimetable } from
'../../../hooks/sections';
import type { Period, TimetableEntry, WeekDay } from '../../../types/sections';
import { cn } from '../../../utils/cn';
import { loadByTeacher, sectionLabel } from '../../../utils/timetable';

const PERSPECTIVES: Array<{value: GridPerspective;label: string;}> = [
{ value: 'section', label: 'Section' },
{ value: 'teacher', label: 'Teacher' },
{ value: 'room', label: 'Room' }];


export function AdminTimetable() {
  const year = useCurrentAcademicYear();
  const schoolDay = useSchoolDay();
  const sections = useSections(year.id);
  const rooms = useRooms();
  const directory = useSchoolDirectory();
  const all = useTimetable({ academicYear: year.id });
  const save = useSaveEntry(year.id);
  const remove = useDeleteEntry();
  const clear = useClearSectionTimetable();
  const copy = useCopyTimetable(year.id);

  // the view lives in the URL (?section= / ?teacher= / ?room=) so links and reloads keep it
  const [params, setParams] = useSearchParams();
  const perspective: GridPerspective = params.get('teacher') !== null ? 'teacher' : params.get('room') !== null ? 'room' : 'section';
  const selectedId = params.get(perspective) ?? '';
  const choose = (next: GridPerspective, id = '') => setParams({ [next]: id }, { replace: true });

  const [editing, setEditing] = useState<{day: WeekDay;period: Period;entry?: TimetableEntry;} | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFrom, setCopyFrom] = useState('');
  const [clearOpen, setClearOpen] = useState(false);

  const yearEntries = useMemo(() => all.data ?? [], [all.data]);
  const section = (sections.data ?? []).find((s) => s._id === selectedId);
  const visible = useMemo(
    () => yearEntries.filter((e) => perspective === 'section' ? e.section._id === selectedId : perspective === 'teacher' ? e.teacher._id === selectedId : e.room?._id === selectedId),
    [yearEntries, perspective, selectedId]
  );
  const loads = useMemo(() => loadByTeacher(yearEntries), [yearEntries]);
  const teachingSlots = (schoolDay.data?.days.length ?? 0) * (schoolDay.data?.periods.filter((p) => !p.isBreak).length ?? 0);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Academics' }, { label: 'Timetable' }];
  if (!year.isLoading && !year.id) return <><PageHeader title="Timetable" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;

  const pickerOptions =
  perspective === 'section' ?
  (sections.data ?? []).map((s) => ({ value: s._id, label: sectionLabel(s), description: `${s.students.length} students` })) :
  perspective === 'teacher' ?
  directory.teachers.map((t) => ({ value: t._id, label: t.name, description: `${loads.get(t._id) ?? 0} periods/wk${t.subjectName ? ` · ${t.subjectName}` : ''}` })) :
  (rooms.data ?? []).map((r) => ({ value: r._id, label: r.name, description: `${r.capacity} seats` }));
  const selectedName = pickerOptions.find((o) => o.value === selectedId)?.label;

  const loading = schoolDay.isLoading || sections.isLoading || all.isLoading;
  const error = schoolDay.error ?? sections.error ?? all.error;

  return (
    <>
      <PageHeader
        title="Timetable"
        description={`Weekly periods per section${year.name ? ` · ${year.name}` : ''}. A teacher, a section or a room can never be in two places at once.`}
        breadcrumbs={breadcrumbs}
        actions={<Link to="/admin/academics/school-day" className="print:hidden"><Button variant="secondary">School day &amp; periods</Button></Link>} />

      <div className="print:hidden"><MockDataNotice /></div>

      <Card className="mb-5 print:hidden">
        <CardBody className="flex flex-wrap items-end gap-3">
          <div role="radiogroup" aria-label="View by" className="flex rounded-lg bg-ink-100 p-1">
            {PERSPECTIVES.map((p) =>
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={perspective === p.value}
              onClick={() => choose(p.value)}
              className={cn('rounded-md px-3.5 py-1.5 text-[13px] font-semibold', perspective === p.value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>

                {p.label}
              </button>
            )}
          </div>
          <div className="min-w-[220px] flex-1">
            <SearchableSelect
              id="tt-picker"
              label={`Choose a ${perspective}`}
              options={pickerOptions}
              value={selectedId}
              onChange={(id) => choose(perspective, id)} />

          </div>
          {perspective === 'section' && section &&
          <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<CopyIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => {setCopyFrom('');setCopyOpen(true);}}>Copy from…</Button>
              <Button variant="secondary" disabled={!visible.length} icon={<EraserIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setClearOpen(true)}>Clear week</Button>
            </div>
          }
          {selectedId && <Button variant="ghost" icon={<PrinterIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>Print</Button>}
        </CardBody>
      </Card>

      {error ?
      <Card><ErrorState error={error} /></Card> :
      loading || !schoolDay.data ?
      <Card><CardBody><SkeletonText lines={8} /></CardBody></Card> :
      (sections.data ?? []).length === 0 ?
      <Card><EmptyState title="No sections yet" description="Create sections first (or build the demo), then plan their week." action={<Link to="/admin/academics/sections"><Button>Go to Sections</Button></Link>} /></Card> :
      !selectedId ?
      <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Sections" description="Choose one to plan its week." />
            <ul className="divide-y divide-ink-100">
              {(sections.data ?? []).map((s) => {
              const count = yearEntries.filter((e) => e.section._id === s._id).length;
              return (
                <li key={s._id}>
                    <button type="button" onClick={() => choose('section', s._id)} className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-start hover:bg-ink-50">
                      <span dir="auto" className="font-semibold text-ink-900">{sectionLabel(s)}</span>
                      <span className="text-[12.5px] text-ink-500">{count} / {teachingSlots} periods{count < teachingSlots ? ` · ${teachingSlots - count} free` : ''}</span>
                    </button>
                  </li>);

            })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Teacher load" description="Teaching periods per week." />
            <ul className="divide-y divide-ink-100">
              {[...directory.teachers].sort((a, b) => (loads.get(b._id) ?? 0) - (loads.get(a._id) ?? 0)).map((t) => {
              const count = loads.get(t._id) ?? 0;
              return (
                <li key={t._id}>
                    <button type="button" onClick={() => choose('teacher', t._id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-start hover:bg-ink-50">
                      <span dir="auto" className="min-w-0 flex-1 truncate font-semibold text-ink-900">{t.name}</span>
                      <span className="w-28"><span className="block h-1.5 rounded-full bg-ink-100"><span className={cn('block h-1.5 rounded-full', count > 24 ? 'bg-warn-500' : 'bg-primary-500')} style={{ width: `${Math.min(count / Math.max(teachingSlots, 1), 1) * 100}%` }} /></span></span>
                      <span className="w-10 text-end font-mono text-[12.5px] text-ink-600">{count}</span>
                    </button>
                  </li>);

            })}
            </ul>
          </Card>
        </div> :

      <Card>
          <CardHeader
          title={selectedName ?? 'Timetable'}
          description={
          perspective === 'section' ?
          `${visible.length} of ${teachingSlots} periods planned · click a cell to ${visible.length ? 'edit or ' : ''}add a period` :
          `${visible.length} period(s) a week · read only here, edit from the section view`
          }
          action={perspective === 'teacher' && (loads.get(selectedId) ?? 0) > 24 ? <Badge tone="warn">Heavy load</Badge> : undefined} />

          <CardBody>
            <TimetableGrid
            schoolDay={schoolDay.data}
            entries={visible}
            perspective={perspective}
            highlightNow
            onCellClick={(day, period, entry) => {
              if (perspective === 'section') setEditing({ day, period, entry });else
              if (entry) choose('section', entry.section._id);
            }} />

          </CardBody>
        </Card>
      }

      {editing && section && schoolDay.data &&
      <EntryEditor
        open
        onClose={() => setEditing(null)}
        section={section}
        day={editing.day}
        period={editing.period}
        entry={editing.entry}
        yearEntries={yearEntries}
        schoolDay={schoolDay.data}
        subjects={directory.subjects}
        teachers={directory.teachers}
        rooms={rooms.data ?? []}
        isSaving={save.isPending}
        isDeleting={remove.isPending}
        onSave={(values) => save.mutateAsync({ id: editing.entry?._id, payload: { section: { _id: section._id, name: sectionLabel(section) }, day: editing.day, periodId: editing.period._id, ...values } })}
        onDelete={() => editing.entry ? remove.mutateAsync(editing.entry._id) : Promise.resolve()} />
      }

      <Modal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        title={`Copy a week into ${section ? sectionLabel(section) : ''}`}
        description="Same subjects and teachers, this section's room. Periods that would clash are skipped and listed."
        footer={
        <>
            <Button variant="secondary" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button disabled={!copyFrom} isLoading={copy.isPending} onClick={async () => {
            if (!section) return;
            try {
              const result = await copy.mutateAsync({ from: copyFrom, to: section._id });
              if (!result.skipped.length) setCopyOpen(false);else
              setCopyFrom(''); // keep open to show what was skipped
            } catch {/* toast */}
          }}>Copy</Button>
          </>
        }>

        <Select
          id="copy-from"
          label="Copy from"
          options={(sections.data ?? []).filter((s) => s._id !== section?._id).map((s) => ({ value: s._id, label: `${sectionLabel(s)} · ${yearEntries.filter((e) => e.section._id === s._id).length} periods` }))}
          value={copyFrom}
          onChange={(e) => setCopyFrom(e.target.value)} />

        {copy.data && copy.data.skipped.length > 0 &&
        <div className="mt-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink-500">Skipped ({copy.data.skipped.length})</p>
            <ul className="scrollbar-thin mt-1 max-h-40 space-y-1 overflow-y-auto text-[12.5px] text-danger-600">
              {copy.data.skipped.map((reason, i) => <li key={i}>{reason}</li>)}
            </ul>
          </div>
        }
      </Modal>

      <ConfirmDialog
        open={clearOpen}
        title={`Clear the week of ${section ? sectionLabel(section) : 'this section'}?`}
        message={`All ${visible.length} period(s) are removed. Teachers and rooms become free in those periods.`}
        confirmLabel="Clear week"
        tone="danger"
        isLoading={clear.isPending}
        onCancel={() => setClearOpen(false)}
        onConfirm={async () => {
          if (!section) return;
          try {await clear.mutateAsync(section._id);} catch {/* toast */}
          setClearOpen(false);
        }} />

    </>);

}
