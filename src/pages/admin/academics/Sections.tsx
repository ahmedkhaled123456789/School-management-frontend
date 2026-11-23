import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DoorOpenIcon, PencilIcon, PlusIcon, ShuffleIcon, SparklesIcon, Trash2Icon, UserIcon, UsersIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { SectionForm } from '../../../components/sections/SectionForm';
import { MockDataNotice, NoAcademicYear } from '../../../components/sections/Notices';
import {
  useCreateSection,
  useCurrentAcademicYear,
  useDeleteSection,
  useDistributeStudents,
  useGenerateDemo,
  useResetMockData,
  useSchoolDirectory,
  useSections,
  useTimetable,
  useUpdateSection } from
'../../../hooks/sections';
import type { Ref, Section } from '../../../types/sections';
import { cn } from '../../../utils/cn';

/** Next free letter for a level: A, B, C… */
function nextName(sections: Section[]): string {
  const used = new Set(sections.map((s) => s.name.toUpperCase()));
  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return '';
}

function SeatBar({ used, capacity }: {used: number;capacity: number;}) {
  const ratio = capacity ? Math.min(used / capacity, 1) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12px] text-ink-500">
        <span>{used} / {capacity} seats</span>
        {used >= capacity && <span className="font-semibold text-danger-500">Full</span>}
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-ink-100" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={capacity}>
        <div className={cn('h-1.5 rounded-full', ratio >= 1 ? 'bg-danger-500' : ratio > 0.85 ? 'bg-warn-500' : 'bg-primary-500')} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>);

}

export function AdminSections() {
  const year = useCurrentAcademicYear();
  const directory = useSchoolDirectory();
  const sections = useSections(year.id);
  const timetable = useTimetable({ academicYear: year.id });
  const create = useCreateSection(year.id);
  const update = useUpdateSection();
  const remove = useDeleteSection();
  const distribute = useDistributeStudents(year.id);
  const generate = useGenerateDemo();
  const reset = useResetMockData();

  const [form, setForm] = useState<{open: boolean;section?: Section | null;defaults?: {classLevel?: Ref;name?: string;};}>({ open: false });
  const [deleting, setDeleting] = useState<Section | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const all = useMemo(() => sections.data ?? [], [sections.data]);
  const seated = useMemo(() => new Set(all.flatMap((s) => s.students.map((st) => st._id))), [all]);
  const periodsBySection = useMemo(() => {
    const map = new Map<string, number>();
    (timetable.data ?? []).forEach((e) => map.set(e.section._id, (map.get(e.section._id) ?? 0) + 1));
    return map;
  }, [timetable.data]);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Academics' }, { label: 'Sections' }];

  if (!year.isLoading && !year.id) {
    return <><PageHeader title="Sections" breadcrumbs={breadcrumbs} /><NoAcademicYear /></>;
  }

  const loading = sections.isLoading || directory.isLoading || year.isLoading;
  const totalStudents = Object.values(directory.studentsByLevel).reduce((sum, list) => sum + list.length, 0);

  return (
    <>
      <PageHeader
        title="Sections"
        description={`Each class level is split into sections (classes) with a homeroom teacher, a room and a roster${year.name ? ` · ${year.name}` : ''}.`}
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <Link to="/admin/academics/timetable"><Button variant="secondary">Timetable</Button></Link>
            <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setForm({ open: true })}>New section</Button>
          </>
        } />

      <MockDataNotice onReset={() => setConfirmReset(true)} />

      {sections.isError || directory.error ?
      <Card><ErrorState error={sections.error ?? directory.error} onRetry={() => {sections.refetch();directory.refetch();}} /></Card> :
      loading ?
      <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div> :

      <>
          {all.length === 0 &&
        <Card className="mb-5 border-primary-200 bg-primary-50/40">
              <CardBody className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-[15px] font-bold text-ink-900">No sections for {year.name || 'this year'} yet</p>
                  <p className="mt-1 text-[13.5px] text-ink-600">
                    Build a complete demo from your real data in one click: sections for every class level
                    with your {totalStudents} students seated, homeroom teachers, rooms and a clash-free weekly timetable
                    from your {directory.subjects.length} subjects and {directory.teachers.length} teachers. Or create sections one by one.
                  </p>
                </div>
                <Button
              icon={<SparklesIcon className="h-4 w-4" aria-hidden="true" />}
              isLoading={generate.isPending}
              disabled={!directory.classLevels.length}
              onClick={() => generate.mutate({
                academicYear: year.id,
                classLevels: directory.classLevels,
                studentsByLevel: directory.studentsByLevel,
                teachers: directory.teachers,
                subjects: directory.subjects
              })}>
                  Build demo from my data
                </Button>
              </CardBody>
            </Card>
        }

          {directory.classLevels.length === 0 ?
        <Card><EmptyState title="No class levels" description="Create class levels first; sections split them into classes." /></Card> :

        <div className="grid items-start gap-5 xl:grid-cols-2">
              {directory.classLevels.map((level) => {
            const levelSections = all.filter((s) => s.classLevel._id === level._id);
            const levelStudents = directory.studentsByLevel[level._id] ?? [];
            const unassigned = levelStudents.filter((st) => !seated.has(st._id));
            const freeSeats = levelSections.reduce((sum, s) => sum + Math.max(s.capacity - s.students.length, 0), 0);
            return (
              <Card key={level._id} as="section">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
                      <div>
                        <h2 dir="auto" className="text-[16px] font-bold text-ink-900">{level.name}</h2>
                        <p className="text-[12.5px] text-ink-500">
                          {levelStudents.length} student(s) · {levelSections.length} section(s)
                          {unassigned.length > 0 && <span className="font-semibold text-warn-500"> · {unassigned.length} without a section</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {unassigned.length > 0 && levelSections.length > 0 &&
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<ShuffleIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                      disabled={freeSeats === 0}
                      title={freeSeats === 0 ? 'All sections are full' : undefined}
                      isLoading={distribute.isPending && distribute.variables?.classLevelId === level._id}
                      onClick={() => distribute.mutate({ classLevelId: level._id, students: unassigned })}>

                            Seat {unassigned.length} evenly
                          </Button>
                    }
                        <Button size="sm" variant="ghost" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setForm({ open: true, defaults: { classLevel: level, name: nextName(levelSections) } })}>
                          Add section
                        </Button>
                      </div>
                    </div>
                    <CardBody>
                      {levelSections.length === 0 ?
                  <p className="text-[13.5px] text-ink-500">No sections yet. Add one to seat the {levelStudents.length} student(s) of this level.</p> :

                  <div className="grid gap-3 sm:grid-cols-2">
                          {levelSections.map((section) =>
                    <article key={section._id} className="rounded-xl border border-ink-200/80 p-4 transition-colors hover:border-primary-200">
                              <div className="flex items-start justify-between gap-2">
                                <Link to={`/admin/academics/sections/${section._id}`} className="min-w-0">
                                  <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-500">Section</p>
                                  <p dir="auto" className="truncate text-[20px] font-extrabold text-primary-700 hover:underline">{level.name} / {section.name}</p>
                                </Link>
                                <Badge tone={periodsBySection.get(section._id) ? 'info' : 'neutral'}>{periodsBySection.get(section._id) ?? 0} periods/wk</Badge>
                              </div>
                              <dl className="mt-3 space-y-1.5 text-[13px] text-ink-600">
                                <div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" /><dt className="sr-only">Homeroom</dt><dd dir="auto" className="truncate">{section.homeroomTeacher?.name ?? <span className="text-warn-500">No homeroom teacher</span>}</dd></div>
                                <div className="flex items-center gap-2"><DoorOpenIcon className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" /><dt className="sr-only">Room</dt><dd dir="auto" className="truncate">{section.room?.name ?? 'No default room'}</dd></div>
                                <div className="flex items-center gap-2"><UsersIcon className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" /><dt className="sr-only">Students</dt><dd>{section.students.length} student(s)</dd></div>
                              </dl>
                              <div className="mt-3"><SeatBar used={section.students.length} capacity={section.capacity} /></div>
                              <div className="mt-3 flex flex-wrap gap-1 border-t border-ink-100 pt-2.5">
                                <Link to={`/admin/academics/sections/${section._id}`}><Button size="sm" variant="ghost">Roster</Button></Link>
                                <Link to={`/admin/academics/timetable?section=${section._id}`}><Button size="sm" variant="ghost">Timetable</Button></Link>
                                <Button size="sm" variant="ghost" aria-label={`Edit ${section.name}`} icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setForm({ open: true, section })}>Edit</Button>
                                <Button size="sm" variant="ghost" aria-label={`Delete ${section.name}`} className="text-danger-500 hover:bg-danger-50" icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setDeleting(section)} />
                              </div>
                            </article>
                    )}
                        </div>
                  }
                    </CardBody>
                  </Card>);

          })}
            </div>
        }
        </>
      }

      <SectionForm
        open={form.open}
        onClose={() => setForm({ open: false })}
        section={form.section}
        defaults={form.defaults}
        classLevels={directory.classLevels}
        teachers={directory.teachers}
        isSaving={create.isPending || update.isPending}
        onSubmit={(payload) => form.section ? update.mutateAsync({ id: form.section._id, payload }) : create.mutateAsync(payload)} />


      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting ? `${deleting.classLevel.name} / ${deleting.name}` : 'section'}?`}
        message={
        <>
            Its {deleting?.students.length ?? 0} student(s) go back to “without a section”
            {periodsBySection.get(deleting?._id ?? '') ? <> and its <strong>{periodsBySection.get(deleting?._id ?? '')} timetable period(s)</strong> are removed</> : null}.
          </>
        }
        confirmLabel="Delete section"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {await remove.mutateAsync(deleting._id);} catch {/* toast */}
          setDeleting(null);
        }} />


      <ConfirmDialog
        open={confirmReset}
        title="Clear all demo data?"
        message="Sections, rooms, the school day and the timetable stored in this browser are removed. Real students, teachers and subjects are not touched."
        confirmLabel="Clear demo data"
        tone="danger"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {reset();setConfirmReset(false);}} />

    </>);

}
