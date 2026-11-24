import { useMemo, useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { SearchableSelect } from '../ui/SearchableSelect';
import { Textarea } from '../ui/Textarea';
import { useAddClinicVisit, useHealthProfile } from '../../hooks/health';
import type { ClinicAction } from '../../types/health';
import type { StudentRef } from '../../types/sections';
import { nowTime, todayKey } from '../../utils/attendance';
import { CLINIC_ACTION_META } from '../../utils/health';
import { cn } from '../../utils/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  /** students to pick from (this year's sections) */
  students: Array<StudentRef & {section?: string;}>;
  /** preselected student */
  student?: StudentRef;
}

/** Logs a clinic visit; the student's allergies and conditions show as soon as they are picked. */
export function ClinicVisitModal({ open, onClose, students, student: preset }: Props) {
  const [studentId, setStudentId] = useState(preset?._id ?? '');
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState(nowTime());
  const [complaint, setComplaint] = useState('');
  const [temperature, setTemperature] = useState('');
  const [action, setAction] = useState<ClinicAction>('returned');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const add = useAddClinicVisit();

  const student = useMemo(() => preset ?? students.find((s) => s._id === studentId), [preset, students, studentId]);
  const profile = useHealthProfile(student);
  const temp = temperature.trim() ? Number(temperature) : undefined;
  const errors = {
    student: !student ? 'Choose a student' : undefined,
    complaint: !complaint.trim() ? 'Describe the complaint' : undefined,
    temperature: temp !== undefined && (Number.isNaN(temp) || temp < 34 || temp > 43) ? '34–43 °C' : undefined,
    time: date === todayKey() && time > nowTime() ? 'The time is in the future' : undefined
  };
  const invalid = Object.values(errors).some(Boolean);
  const alerts = profile.data && (profile.data.allergies.length || profile.data.conditions.length) ? profile.data : null;

  const submit = () => {
    setTouched(true);
    if (invalid || !student) return;
    add.mutate(
      { student: { _id: student._id, name: student.name, studentId: student.studentId }, date, time, complaint, temperature: temp, action, notes },
      { onSuccess: onClose }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Log a clinic visit" size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={add.isPending} onClick={submit}>Save visit</Button></>}>
      <div className="space-y-3">
        {preset ?
        <p className="text-[14px] font-semibold text-ink-900">{preset.name}</p> :
        <SearchableSelect id="visit-student" label="Student" value={studentId} onChange={setStudentId} error={touched ? errors.student : undefined}
        options={students.map((s) => ({ value: s._id, label: s.name, description: [s.studentId, s.section].filter(Boolean).join(' · ') }))} />
        }
        {alerts &&
        <div role="alert" className="flex gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-[12.5px] text-ink-800">
            <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" aria-hidden="true" />
            <p>
              {alerts.allergies.map((a) => `${a.name} (${a.severity})${a.reaction ? ` — ${a.reaction}` : ''}`).join(' · ')}
              {alerts.allergies.length && alerts.conditions.length ? ' · ' : ''}
              {alerts.conditions.map((c) => c.notes ? `${c.name} — ${c.notes}` : c.name).join(' · ')}
            </p>
          </div>
        }
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input id="visit-date" label="Date" type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input id="visit-time" label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} error={touched ? errors.time : undefined} />
          <Input id="visit-temp" label="Temperature °C" inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="37.0" error={errors.temperature} />
        </div>
        <Input id="visit-complaint" label="Complaint" required maxLength={120} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Headache" error={touched ? errors.complaint : undefined} />
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-700">Outcome</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {(Object.keys(CLINIC_ACTION_META) as ClinicAction[]).map((a) =>
            <button key={a} type="button" role="radio" aria-checked={action === a} onClick={() => setAction(a)}
            className={cn('rounded-lg border px-3 py-2 text-start text-[13px] font-semibold', action === a ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-ink-200 text-ink-700 hover:bg-ink-50')}>
                {CLINIC_ACTION_META[a].label}
              </button>
            )}
          </div>
          {action === 'sent_home' && <p className="mt-1.5 text-[12.5px] text-ink-600">The student is marked <strong>excused</strong> for the rest of the day, including registers already taken for later periods.</p>}
        </fieldset>
        <Textarea id="visit-notes" label="Notes" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>);

}
