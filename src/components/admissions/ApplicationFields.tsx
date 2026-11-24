import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { ApplicationPayload } from '../../types/admissions';
import type { Ref } from '../../types/sections';
import { applicationErrors } from '../../utils/admissions';
import { todayKey } from '../../utils/attendance';

interface Props {
  value: ApplicationPayload;
  onChange: (v: ApplicationPayload) => void;
  levels: Ref[];
  showErrors: boolean;
}

/** Child + guardian fields; used by the office form and the public application page. */
export function ApplicationFields({ value, onChange, levels, showErrors }: Props) {
  const errors = showErrors ? applicationErrors(value) : {};
  const child = (patch: Partial<ApplicationPayload['applicant']>) => onChange({ ...value, applicant: { ...value.applicant, ...patch } });
  const guardian = (patch: Partial<ApplicationPayload['guardian']>) => onChange({ ...value, guardian: { ...value.guardian, ...patch } });
  return (
    <div className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[13px] font-bold uppercase tracking-wide text-ink-500">The child</legend>
        <Input id="app-name" label="Full name" required maxLength={80} value={value.applicant.name} onChange={(e) => child({ name: e.target.value })} error={errors.name} autoComplete="off" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input id="app-dob" label="Date of birth" type="date" required max={todayKey()} value={value.applicant.dateOfBirth} onChange={(e) => child({ dateOfBirth: e.target.value })} error={errors.dateOfBirth} />
          <Select id="app-gender" label="Gender" value={value.applicant.gender} onChange={(e) => child({ gender: e.target.value as 'Male' | 'Female' })} options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
          <Select id="app-level" label="Applying for" required value={value.classLevel._id} placeholder={levels.length ? 'Choose a class level' : 'No class levels open'} error={errors.classLevel}
          onChange={(e) => onChange({ ...value, classLevel: levels.find((l) => l._id === e.target.value) ?? { _id: '', name: '' } })}
          options={levels.map((l) => ({ value: l._id, label: l.name }))} />
        </div>
        <Input id="app-school" label="Previous school (optional)" maxLength={100} value={value.applicant.previousSchool ?? ''} onChange={(e) => child({ previousSchool: e.target.value })} />
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[13px] font-bold uppercase tracking-wide text-ink-500">Parent or guardian</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <Input id="app-gname" label="Full name" required maxLength={80} value={value.guardian.name} onChange={(e) => guardian({ name: e.target.value })} error={errors.guardianName} />
          <Input id="app-relation" label="Relation" required maxLength={30} value={value.guardian.relation} onChange={(e) => guardian({ relation: e.target.value })} error={errors.relation} placeholder="Mother" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="app-phone" label="Phone" type="tel" required value={value.guardian.phone} onChange={(e) => guardian({ phone: e.target.value })} error={errors.phone} placeholder="+20 10 1234 5678" />
          <Input id="app-email" label="Email" type="email" required value={value.guardian.email} onChange={(e) => guardian({ email: e.target.value })} error={errors.email} hint="Updates about the application are sent here." />
        </div>
      </fieldset>
    </div>);

}
