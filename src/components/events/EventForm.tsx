import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { AudiencePicker } from '../communication/AudiencePicker';
import { useAudienceTargets } from '../../hooks/communication';
import { useSaveEvent } from '../../hooks/events';
import { useCurrentAcademicYear } from '../../hooks/sections';
import type { Audience } from '../../types/communication';
import type { EventType, SchoolEvent } from '../../types/events';
import { todayKey } from '../../utils/attendance';
import { EVENT_TYPE_META } from '../../utils/events';
import { parseAmount } from '../../utils/money';

/** Create / edit an event (saved as a draft until published). */
export function EventForm({ initial, onClose, onSaved }: {initial?: SchoolEvent;onClose: () => void;onSaved?: (e: SchoolEvent) => void;}) {
  const year = useCurrentAcademicYear();
  const targets = useAudienceTargets(year.id);
  const save = useSaveEvent(year.id);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<EventType>(initial?.type ?? 'trip');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '13:00');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? { kind: 'everyone' });
  const [requiresConsent, setRequiresConsent] = useState(initial?.requiresConsent ?? true);
  const [consentDeadline, setConsentDeadline] = useState(initial?.consentDeadline ?? '');
  const [fee, setFee] = useState(initial ? String(initial.fee / 100) : '0');
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : '0');
  const [touched, setTouched] = useState(false);
  const paid = Boolean(initial?.payments.length);

  const feeMajor = parseAmount(fee);
  const errors = {
    title: title.trim().length < 3 ? 'At least 3 characters' : undefined,
    date: !date ? 'Choose the date' : !initial && date < todayKey() ? 'Can not be in the past' : undefined,
    endDate: endDate && endDate < date ? 'On or after the start date' : undefined,
    endTime: (!endDate || endDate === date) && endTime <= startTime ? 'After the start time' : undefined,
    location: !location.trim() ? 'Where does it take place?' : undefined,
    audience: audience.kind !== 'everyone' && !audience.targets?.length ? 'Choose at least one' : undefined,
    fee: feeMajor === null ? 'e.g. 150 or 150.50' : feeMajor > 0 && !requiresConsent ? 'Paid events need parent approval' : undefined,
    capacity: !/^\d+$/.test(capacity) ? 'A whole number (0 = unlimited)' : undefined,
    consentDeadline: requiresConsent && consentDeadline && date && consentDeadline > date ? 'On or before the event date' : undefined
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = () => {
    setTouched(true);
    if (invalid || feeMajor === null) return;
    save.mutate({
      id: initial?._id,
      payload: {
        title, type, description, date, endDate: endDate || undefined, startTime, endTime, location,
        audience: audience.kind === 'everyone' ? { kind: 'everyone' } : { ...audience, parents: true },
        requiresConsent, consentDeadline: requiresConsent && consentDeadline ? consentDeadline : undefined,
        fee: Math.round(feeMajor * 100), capacity: Number(capacity)
      }
    }, { onSuccess: (e) => {onSaved?.(e);onClose();} });
  };
  const err = (k: keyof typeof errors) => touched ? errors[k] : undefined;

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit event' : 'New event'} description={initial?.status === 'published' ? 'Families already invited see the changes.' : 'Saved as a draft: families are told when you publish it.'} size="lg"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={save.isPending} onClick={submit}>{initial ? 'Save' : 'Save draft'}</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Input id="ev-title" label="Title" required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} error={err('title')} placeholder="e.g. Trip to the Egyptian Museum" />
          <Select id="ev-type" label="Type" value={type} onChange={(e) => setType(e.target.value as EventType)} options={(Object.keys(EVENT_TYPE_META) as EventType[]).map((t) => ({ value: t, label: EVENT_TYPE_META[t].label }))} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input id="ev-date" label="Date" type="date" required min={initial ? undefined : todayKey()} value={date} onChange={(e) => setDate(e.target.value)} error={err('date')} />
          <Input id="ev-end-date" label="Ends (multi-day)" type="date" min={date || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} error={err('endDate')} />
          <Input id="ev-start" label="From" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input id="ev-end" label="To" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} error={err('endTime')} />
        </div>
        <Input id="ev-location" label="Location" required maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} error={err('location')} />
        <Textarea id="ev-desc" label="Description" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} hint="What to bring, transport, meeting point…" />
        <AudiencePicker value={audience} onChange={setAudience} kinds={['everyone', 'levels', 'sections']} levels={targets.data?.levels ?? []} sections={targets.data?.sections ?? []} error={err('audience')} />
        <div className="grid gap-3 rounded-xl border border-ink-200 p-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-700 sm:col-span-3">
            <input type="checkbox" checked={requiresConsent} onChange={(e) => setRequiresConsent(e.target.checked)} className="h-4 w-4 rounded border-ink-300" />
            Parents must approve
          </label>
          {requiresConsent && <Input id="ev-deadline" label="Reply by" type="date" max={date || undefined} value={consentDeadline} onChange={(e) => setConsentDeadline(e.target.value)} error={err('consentDeadline')} hint="Default: the event day" />}
          <Input id="ev-fee" label="Fee (EGP)" inputMode="decimal" value={fee} disabled={paid} onChange={(e) => setFee(e.target.value)} error={err('fee')} hint={paid ? 'Fees already collected' : '0 = free'} />
          <Input id="ev-capacity" label="Places" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} error={err('capacity')} hint="0 = unlimited; extra approvals join a waiting list" />
        </div>
      </div>
    </Modal>);

}
