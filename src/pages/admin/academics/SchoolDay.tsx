import { useEffect, useState } from 'react';
import { CoffeeIcon, PlusIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/States';
import { MockDataNotice } from '../../../components/sections/Notices';
import { previewSchoolDayChange } from '../../../api/sections';
import { defaultSchoolDay } from '../../../api/mock/db';
import { useSchoolDay, useUpdateSchoolDay } from '../../../hooks/sections';
import type { Period, SchoolDay } from '../../../types/sections';
import { cn } from '../../../utils/cn';
import { ALL_DAYS, DAY_LABEL, toMinutes, validateSchoolDay } from '../../../utils/timetable';

const pad = (n: number) => String(n).padStart(2, '0');
const addMinutes = (time: string, minutes: number) => {
  const total = Math.min((Number.isNaN(toMinutes(time)) ? 480 : toMinutes(time)) + minutes, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

export function AdminSchoolDay() {
  const query = useSchoolDay();
  const update = useUpdateSchoolDay();
  const [draft, setDraft] = useState<SchoolDay | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [orphanCount, setOrphanCount] = useState(0);

  useEffect(() => {
    if (query.data && !draft) setDraft(query.data);
  }, [query.data, draft]);

  const breadcrumbs = [{ label: 'Admin', to: '/admin' }, { label: 'Timetable', to: '/admin/academics/timetable' }, { label: 'School day' }];
  if (query.isError) return <><PageHeader title="School day" breadcrumbs={breadcrumbs} /><Card><ErrorState error={query.error} /></Card></>;
  if (!draft) return <><PageHeader title="School day" breadcrumbs={breadcrumbs} /><Card><CardBody><SkeletonText lines={8} /></CardBody></Card></>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(query.data);
  const teaching = draft.periods.filter((p) => !p.isBreak).length;

  const setPeriod = (index: number, patch: Partial<Period>) =>
  setDraft((prev) => prev && { ...prev, periods: prev.periods.map((p, i) => i === index ? { ...p, ...patch } : p) });

  const addRow = (isBreak: boolean) => setDraft((prev) => {
    if (!prev) return prev;
    const last = prev.periods[prev.periods.length - 1];
    const start = last ? addMinutes(last.end, 5) : '08:00';
    const count = prev.periods.filter((p) => !p.isBreak).length;
    // empty _id: the store assigns one on save
    return { ...prev, periods: [...prev.periods, { _id: '', label: isBreak ? 'Break' : `Period ${count + 1}`, start, end: addMinutes(start, isBreak ? 20 : 45), isBreak }] };
  });

  const save = async (removeOrphans = false) => {
    const found = validateSchoolDay(draft);
    setProblems(found);
    if (found.length) return;
    if (!removeOrphans) {
      const orphans = await previewSchoolDayChange(draft);
      if (orphans) {
        setOrphanCount(orphans);
        return;
      }
    }
    try {
      const saved = await update.mutateAsync({ schoolDay: draft, removeOrphans });
      setDraft(saved);
      setOrphanCount(0);
    } catch {/* toast */}
  };

  return (
    <>
      <PageHeader
        title="School day"
        description="The days the school teaches and the bell schedule every timetable uses."
        breadcrumbs={breadcrumbs}
        actions={
        <>
            <Button variant="ghost" icon={<RotateCcwIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => {setDraft(defaultSchoolDay());setProblems([]);}}>Default (Sun–Thu, 7 periods)</Button>
            <Button variant="secondary" disabled={!dirty} onClick={() => {setDraft(query.data ?? null);setProblems([]);}}>Discard</Button>
            <Button disabled={!dirty} isLoading={update.isPending} onClick={() => save()}>Save</Button>
          </>
        } />

      <MockDataNotice />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="School days" description={`${draft.days.length} day(s) × ${teaching} periods = ${draft.days.length * teaching} slots a week`} />
          <CardBody className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => {
              const on = draft.days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDraft({ ...draft, days: on ? draft.days.filter((d) => d !== day) : [...draft.days, day] })}
                  className={cn('rounded-full px-4 py-2 text-[13px] font-semibold transition-colors', on ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500 hover:text-ink-800')}>

                  {DAY_LABEL[day]}
                </button>);

            })}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Bell schedule" description="Rows in time order. Breaks can not hold lessons." />
          <CardBody className="space-y-2">
            {draft.periods.map((period, index) =>
            <div key={period._id || `new-${index}`} className={cn('flex flex-wrap items-end gap-2 rounded-lg p-2', period.isBreak && 'bg-ink-50')}>
                <div className="min-w-[140px] flex-1">
                  <Input id={`pd-label-${index}`} label={index === 0 ? 'Label' : ' '} dir="auto" value={period.label} onChange={(e) => setPeriod(index, { label: e.target.value })} />
                </div>
                <div className="w-28"><Input id={`pd-start-${index}`} label={index === 0 ? 'Start' : ' '} type="time" value={period.start} onChange={(e) => setPeriod(index, { start: e.target.value })} /></div>
                <div className="w-28"><Input id={`pd-end-${index}`} label={index === 0 ? 'End' : ' '} type="time" value={period.end} onChange={(e) => setPeriod(index, { end: e.target.value })} /></div>
                <label className="flex h-10 items-center gap-1.5 text-[12.5px] text-ink-600">
                  <input type="checkbox" checked={period.isBreak} onChange={(e) => setPeriod(index, { isBreak: e.target.checked })} />
                  <CoffeeIcon className="h-3.5 w-3.5" aria-hidden="true" />Break
                </label>
                <Button variant="ghost" size="sm" aria-label={`Remove ${period.label}`} onClick={() => setDraft({ ...draft, periods: draft.periods.filter((_, i) => i !== index) })}>
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="secondary" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => addRow(false)}>Add period</Button>
              <Button size="sm" variant="secondary" icon={<CoffeeIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => addRow(true)}>Add break</Button>
            </div>
            {problems.length > 0 &&
            <ul role="alert" className="space-y-1 rounded-lg border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            }
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={orphanCount > 0}
        title="Remove timetable periods?"
        message={`${orphanCount} planned period(s) are on days or periods you removed (or turned into breaks). Saving removes them from the timetable.`}
        confirmLabel={`Save and remove ${orphanCount}`}
        tone="danger"
        isLoading={update.isPending}
        onCancel={() => setOrphanCount(0)}
        onConfirm={() => save(true)} />

    </>);

}
