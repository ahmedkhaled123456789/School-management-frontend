import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulseIcon, PencilIcon, PhoneIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { useClinicVisits, useHealthProfile, useSaveHealthProfile } from '../../hooks/health';
import type { StudentRef } from '../../types/sections';
import { formatDay } from '../../utils/attendance';
import { CLINIC_ACTION_META, SEVERITY_META, VACCINATION_META, isEmptyProfile, vaccinationStatus } from '../../utils/health';
import { HealthProfileForm } from './HealthProfileForm';

interface Props {
  student?: StudentRef;
  /** admin: link to the full record; parent: edit in place */
  mode: 'admin' | 'parent' | 'student';
  className?: string;
}

/** Allergies, conditions, vaccinations and recent clinic visits for one student. */
export function HealthSummaryCard({ student, mode, className }: Props) {
  const profile = useHealthProfile(student);
  const visits = useClinicVisits({ studentId: student?._id }, Boolean(student?._id));
  const save = useSaveHealthProfile();
  const [editing, setEditing] = useState(false);
  const p = profile.data;

  return (
    <Card className={className}>
      <CardHeader
        title={<span className="flex items-center gap-2"><HeartPulseIcon className="h-4 w-4 text-danger-500" aria-hidden="true" />Health</span>}
        description={p?.updatedAt ? `Updated ${new Date(p.updatedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}${p.updatedBy ? ` by ${p.updatedBy.name}` : ''}` : undefined}
        action={
        mode === 'admin' && student ? <Link to={`/admin/health/${student._id}`} className="text-[13px] font-semibold text-primary-600 hover:underline">Open record</Link> :
        mode === 'parent' && p ? <Button size="sm" variant="secondary" icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEditing(true)}>Update</Button> :
        undefined
        } />
      <CardBody className="space-y-4 text-[13px]">
        {profile.isError ?
        <ErrorState error={profile.error} /> :
        !p ?
        <SkeletonText lines={4} /> :
        isEmptyProfile(p) ?
        <p className="text-ink-500">No health information recorded{mode === 'parent' ? '. Add allergies, conditions and an emergency contact so the school can act quickly.' : '.'}</p> :

        <>
            <div>
              <h3 className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Allergies</h3>
              {p.allergies.length ?
            <ul className="space-y-1.5">
                  {p.allergies.map((a) =>
              <li key={a._id} className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink-900">{a.name}</span>
                      <Badge tone={SEVERITY_META[a.severity].tone}>{SEVERITY_META[a.severity].label}</Badge>
                      {a.reaction && <span className="w-full text-[12px] text-ink-500">{a.reaction}</span>}
                    </li>
              )}
                </ul> :
            <p className="text-ink-500">None known.</p>}
            </div>
            {p.conditions.length > 0 &&
          <div>
                <h3 className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Conditions</h3>
                <ul className="space-y-1">{p.conditions.map((c) => <li key={c._id}><span className="font-semibold text-ink-900">{c.name}</span>{c.notes && <span className="text-ink-500"> · {c.notes}</span>}</li>)}</ul>
              </div>
          }
            {p.vaccinations.length > 0 &&
          <div>
                <h3 className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Vaccinations</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {p.vaccinations.map((v) => {
                const s = vaccinationStatus(v);
                return <li key={v._id}><Badge tone={VACCINATION_META[s].tone}>{v.name} · {VACCINATION_META[s].label}</Badge></li>;
              })}
                </ul>
              </div>
          }
            {p.emergencyContact &&
          <p className="flex items-center gap-2 text-ink-700"><PhoneIcon className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />{p.emergencyContact.name} ({p.emergencyContact.relation}) · <a href={`tel:${p.emergencyContact.phone.replace(/\s/g, '')}`} className="font-semibold text-primary-600 hover:underline">{p.emergencyContact.phone}</a></p>
          }
            {mode === 'admin' && p.bloodType && <p className="text-ink-700">Blood type <strong>{p.bloodType}</strong></p>}
          </>
        }

        {mode !== 'student' && (visits.data?.length ?? 0) > 0 &&
        <div>
            <h3 className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Recent clinic visits</h3>
            <ul className="space-y-1">
              {visits.data!.slice(0, 3).map((v) =>
            <li key={v._id} className="flex flex-wrap items-center gap-2">
                  <span className="text-ink-600">{formatDay(v.date)} {v.time}</span>
                  <span className="font-semibold text-ink-900">{v.complaint}</span>
                  <Badge tone={CLINIC_ACTION_META[v.action].tone}>{CLINIC_ACTION_META[v.action].label}</Badge>
                </li>
            )}
            </ul>
          </div>
        }
      </CardBody>

      {mode === 'parent' && p && student &&
      <Modal open={editing} onClose={() => setEditing(false)} title={`Health record · ${student.name}`} description="The school nurse and your child's teachers see allergies and conditions." size="lg">
          <HealthProfileForm profile={p} limited isSaving={save.isPending} onCancel={() => setEditing(false)}
        onSave={(payload) => save.mutate({ student, payload }, { onSuccess: () => setEditing(false) })} />
        </Modal>
      }
    </Card>);

}
