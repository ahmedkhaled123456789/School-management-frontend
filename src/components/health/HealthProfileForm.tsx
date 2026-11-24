import { useEffect, useRef, useState } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { BLOOD_TYPES } from '../../api/health';
import type { Allergy, BloodType, Condition, HealthProfile, HealthProfilePayload, Severity, Vaccination } from '../../types/health';
import { SEVERITY_META, VACCINATION_META, vaccinationStatus } from '../../utils/health';
import { todayKey } from '../../utils/attendance';

interface Props {
  profile: HealthProfile;
  isSaving?: boolean;
  /** parents: no blood type / medications / notes (school-held information) */
  limited?: boolean;
  onSave: (payload: HealthProfilePayload) => void;
  onCancel?: () => void;
}

const tempId = () => `new-${Math.random().toString(36).slice(2, 9)}`;
const PHONE = /^\+?[\d\s-]{7,20}$/;

function toPayload(p: HealthProfile): HealthProfilePayload {
  return {
    bloodType: p.bloodType,
    allergies: p.allergies,
    conditions: p.conditions,
    medications: p.medications ?? '',
    vaccinations: p.vaccinations,
    emergencyContact: p.emergencyContact ?? { name: '', relation: '', phone: '' },
    notes: p.notes ?? ''
  };
}

/** The checks the server makes, shown before saving. */
function problems(v: HealthProfilePayload): string[] {
  const out: string[] = [];
  const dupes = (items: Array<{name: string;}>, what: string) => {
    const seen = new Set<string>();
    items.forEach((i, n) => {
      const key = i.name.trim().toLowerCase();
      if (!key) out.push(`${what} ${n + 1} needs a name`);else
      if (seen.has(key)) out.push(`"${i.name.trim()}" is listed twice`);
      seen.add(key);
    });
  };
  dupes(v.allergies, 'Allergy');
  dupes(v.conditions, 'Condition');
  dupes(v.vaccinations, 'Vaccination');
  v.vaccinations.forEach((x) => {
    if (!x.date && !x.dueDate && x.name.trim()) out.push(`${x.name}: enter the date given or the due date`);
    if (x.date && x.date > todayKey()) out.push(`${x.name}: the date given can not be in the future`);
  });
  const c = v.emergencyContact;
  if (c && (c.name || c.phone || c.relation)) {
    if (!c.name.trim() || !c.relation.trim()) out.push('The emergency contact needs a name and a relation');
    if (!PHONE.test(c.phone.trim())) out.push('Enter a valid emergency phone number');
  }
  return out;
}

/** Edits a student's health profile (allergies, conditions, vaccinations, emergency contact). */
export function HealthProfileForm({ profile, isSaving, limited, onSave, onCancel }: Props) {
  const [value, setValue] = useState<HealthProfilePayload>(() => toPayload(profile));
  const [showErrors, setShowErrors] = useState(false);
  // take a newer server copy only while the user has not started editing
  // (a refetch must never wipe rows being typed)
  const edited = useRef(false);
  useEffect(() => {
    if (!edited.current) setValue(toPayload(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile._id, profile.updatedAt]);
  const errors = problems(value);
  const set = <K extends keyof HealthProfilePayload,>(key: K, v: HealthProfilePayload[K]) => {
    edited.current = true;
    setValue((prev) => ({ ...prev, [key]: v }));
  };

  const listEditor = <T extends {_id: string;},>(key: 'allergies' | 'conditions' | 'vaccinations', items: T[], blank: () => T) => ({
    add: () => set(key, [...items, blank()] as never),
    remove: (id: string) => set(key, items.filter((i) => i._id !== id) as never),
    patch: (id: string, p: Partial<T>) => set(key, items.map((i) => i._id === id ? { ...i, ...p } : i) as never)
  });
  const allergies = listEditor<Allergy>('allergies', value.allergies, () => ({ _id: tempId(), name: '', severity: 'mild' }));
  const conditions = listEditor<Condition>('conditions', value.conditions, () => ({ _id: tempId(), name: '' }));
  const vaccines = listEditor<Vaccination>('vaccinations', value.vaccinations, () => ({ _id: tempId(), name: '' }));

  const submit = () => {
    if (errors.length) return setShowErrors(true);
    const strip = <T extends {_id: string;},>(items: T[]) => items.map((i) => i._id.startsWith('new-') ? { ...i, _id: '' } : i);
    onSave({ ...value, allergies: strip(value.allergies), conditions: strip(value.conditions), vaccinations: strip(value.vaccinations) });
  };

  const section = 'space-y-2.5 rounded-xl border border-ink-200 p-4';
  const heading = 'text-[13px] font-bold text-ink-900';

  return (
    <form onSubmit={(e) => {e.preventDefault();submit();}} className="space-y-4" noValidate>
      <fieldset className={section}>
        <legend className={`${heading} px-1`}>Allergies</legend>
        {value.allergies.length === 0 && <p className="text-[12.5px] text-ink-500">No known allergies.</p>}
        {value.allergies.map((a, i) =>
        <div key={a._id} className="grid gap-2 sm:grid-cols-[1fr_140px_1.4fr_auto]">
            <Input id={`allergy-${i}`} label="Allergy" value={a.name} maxLength={60} onChange={(e) => allergies.patch(a._id, { name: e.target.value })} placeholder="e.g. Peanuts" />
            <Select id={`allergy-sev-${i}`} label="Severity" value={a.severity} onChange={(e) => allergies.patch(a._id, { severity: e.target.value as Severity })}
          options={(Object.keys(SEVERITY_META) as Severity[]).map((s) => ({ value: s, label: SEVERITY_META[s].label }))} />
            <Input id={`allergy-react-${i}`} label="Reaction / what to do" value={a.reaction ?? ''} maxLength={160} onChange={(e) => allergies.patch(a._id, { reaction: e.target.value })} />
            <button type="button" aria-label={`Remove allergy ${a.name || i + 1}`} onClick={() => allergies.remove(a._id)} className="self-end rounded-lg p-2.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        )}
        <Button variant="ghost" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={allergies.add}>Add allergy</Button>
      </fieldset>

      <fieldset className={section}>
        <legend className={`${heading} px-1`}>Conditions</legend>
        {value.conditions.length === 0 && <p className="text-[12.5px] text-ink-500">None recorded.</p>}
        {value.conditions.map((c, i) =>
        <div key={c._id} className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
            <Input id={`cond-${i}`} label="Condition" value={c.name} maxLength={60} onChange={(e) => conditions.patch(c._id, { name: e.target.value })} placeholder="e.g. Asthma" />
            <Input id={`cond-notes-${i}`} label="Notes for staff" value={c.notes ?? ''} onChange={(e) => conditions.patch(c._id, { notes: e.target.value })} />
            <button type="button" aria-label={`Remove condition ${c.name || i + 1}`} onClick={() => conditions.remove(c._id)} className="self-end rounded-lg p-2.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        )}
        <Button variant="ghost" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={conditions.add}>Add condition</Button>
      </fieldset>

      <fieldset className={section}>
        <legend className={`${heading} px-1`}>Vaccinations</legend>
        {value.vaccinations.length === 0 && <p className="text-[12.5px] text-ink-500">None recorded.</p>}
        {value.vaccinations.map((v, i) => {
          const status = v.name.trim() && (v.date || v.dueDate) ? vaccinationStatus(v) : null;
          return (
            <div key={v._id} className="grid items-end gap-2 sm:grid-cols-[1fr_150px_150px_110px_auto]">
              <Input id={`vac-${i}`} label="Vaccine" value={v.name} maxLength={60} onChange={(e) => vaccines.patch(v._id, { name: e.target.value })} placeholder="e.g. MMR" />
              <Input id={`vac-date-${i}`} label="Given on" type="date" max={todayKey()} value={v.date ?? ''} onChange={(e) => vaccines.patch(v._id, { date: e.target.value || undefined })} />
              <Input id={`vac-due-${i}`} label="Next dose due" type="date" value={v.dueDate ?? ''} onChange={(e) => vaccines.patch(v._id, { dueDate: e.target.value || undefined })} />
              <div className="pb-2.5">{status && <Badge tone={VACCINATION_META[status].tone}>{VACCINATION_META[status].label}</Badge>}</div>
              <button type="button" aria-label={`Remove vaccine ${v.name || i + 1}`} onClick={() => vaccines.remove(v._id)} className="rounded-lg p-2.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600"><Trash2Icon className="h-4 w-4" aria-hidden="true" /></button>
            </div>);

        })}
        <Button variant="ghost" size="sm" icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={vaccines.add}>Add vaccination</Button>
      </fieldset>

      <fieldset className={section}>
        <legend className={`${heading} px-1`}>Emergency contact</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input id="ec-name" label="Name" value={value.emergencyContact?.name ?? ''} onChange={(e) => set('emergencyContact', { ...value.emergencyContact!, name: e.target.value })} />
          <Input id="ec-rel" label="Relation" value={value.emergencyContact?.relation ?? ''} onChange={(e) => set('emergencyContact', { ...value.emergencyContact!, relation: e.target.value })} placeholder="e.g. Mother" />
          <Input id="ec-phone" label="Phone" type="tel" value={value.emergencyContact?.phone ?? ''} onChange={(e) => set('emergencyContact', { ...value.emergencyContact!, phone: e.target.value })} placeholder="+20 10 1234 5678" />
        </div>
      </fieldset>

      {!limited &&
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <Select id="blood" label="Blood type" value={value.bloodType ?? ''} placeholder="Unknown" onChange={(e) => set('bloodType', (e.target.value || undefined) as BloodType | undefined)}
        options={BLOOD_TYPES.map((b) => ({ value: b, label: b }))} />
          <Textarea id="meds" label="Regular medication" rows={2} maxLength={300} value={value.medications ?? ''} onChange={(e) => set('medications', e.target.value)} />
          <div className="sm:col-span-2"><Textarea id="hnotes" label="Notes (staff only)" rows={2} maxLength={500} value={value.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
      }

      {showErrors && errors.length > 0 &&
      <ul role="alert" className="list-disc space-y-0.5 rounded-lg border border-danger-100 bg-danger-50 py-2.5 pe-3 ps-7 text-[13px] text-danger-600">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      }

      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" isLoading={isSaving}>Save health record</Button>
      </div>
    </form>);

}
