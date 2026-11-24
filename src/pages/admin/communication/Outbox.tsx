import { useMemo, useState } from 'react';
import { MailIcon, MessageSquareTextIcon, SendIcon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Kpi } from '../../../components/reports/charts';
import { useCommSettings, useOutbox, useUpdateCommSettings } from '../../../hooks/communication';
import { usePermissions } from '../../../hooks/permissions';
import { PERMISSIONS } from '../../../lib/permissions';
import type { Channel, CommSettings, NotificationKind } from '../../../types/communication';
import { cn } from '../../../utils/cn';

const KIND_LABEL: Record<NotificationKind, string> = { absence: 'Absence', clinic: 'Clinic', announcement: 'Announcement', event: 'Event', message: 'Message', admission: 'Admission', certificate: 'Certificate', library: 'Library', transport: 'Transport', hr: 'HR', canteen: 'Canteen' };

const SETTINGS: Array<{key: keyof CommSettings;label: string;hint: string;channel: Channel;}> = [
{ key: 'smsAbsence', label: 'Absence SMS', hint: 'Parents get an SMS the first time their child is marked absent in a day.', channel: 'sms' },
{ key: 'smsClinic', label: 'Clinic SMS', hint: 'Parents get an SMS when the clinic sends their child home or to a doctor.', channel: 'sms' },
{ key: 'emailAnnouncements', label: 'Announcement emails', hint: 'Announcements meant for families are also emailed.', channel: 'email' },
{ key: 'emailEvents', label: 'Event emails', hint: 'Published and cancelled events are emailed to the families invited.', channel: 'email' }];


/**
 * What the school would send by SMS / email. Sending for real needs a
 * provider on the server; until then every message is logged here.
 */
export function AdminOutbox() {
  const outbox = useOutbox();
  const settings = useCommSettings();
  const update = useUpdateCommSettings();
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.SETTINGS_MANAGE);
  const [channel, setChannel] = useState<'all' | Channel>('all');
  const rows = useMemo(() => (outbox.data ?? []).filter((o) => channel === 'all' || o.channel === channel), [outbox.data, channel]);
  const count = (c: Channel) => (outbox.data ?? []).filter((o) => o.channel === c && o.status === 'sent').length;

  return (
    <>
      <PageHeader title="SMS & Email" description="Every message the school sends to families, and which automatic messages are on." breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Communication' }, { label: 'SMS & Email' }]} />
      <p className="mb-5 rounded-xl border border-accent-100 bg-accent-50 px-4 py-2.5 text-[13px] text-accent-500">
        <strong>Preview.</strong> Real SMS and email need a sending provider on the server. Until it is connected, messages are recorded here exactly as they would be sent.
      </p>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section aria-label="Totals" className="grid grid-cols-3 gap-3">
            <Kpi label="SMS" value={String(count('sms'))} sub="sent" />
            <Kpi label="Email" value={String(count('email'))} sub="sent" />
            <Kpi label="Skipped" value={String((outbox.data ?? []).filter((o) => o.status === 'skipped').length)} sub="turned off" />
          </section>
          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
              <h2 className="text-[15px] font-bold text-ink-900">Messages</h2>
              <div role="radiogroup" aria-label="Channel" className="flex gap-1 rounded-lg bg-ink-100 p-1">
                {(['all', 'sms', 'email'] as const).map((c) =>
                <button key={c} type="button" role="radio" aria-checked={channel === c} onClick={() => setChannel(c)}
                className={cn('rounded-md px-2.5 py-1 text-[12.5px] font-semibold', channel === c ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
                    {c === 'all' ? 'All' : c.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
            {outbox.isError ?
            <ErrorState error={outbox.error} /> :
            outbox.isLoading ?
            <CardBody><SkeletonText lines={6} /></CardBody> :
            rows.length === 0 ?
            <EmptyState icon={<SendIcon className="h-5 w-5" aria-hidden="true" />} title="Nothing sent yet" description="Absences, clinic visits, announcements and events create messages here." /> :

            <ul className="scrollbar-thin max-h-[620px] divide-y divide-ink-100 overflow-y-auto">
                {rows.map((o) =>
              <li key={o._id} className="flex gap-3 px-5 py-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-600">
                      {o.channel === 'sms' ? <MessageSquareTextIcon className="h-4 w-4" aria-label="SMS" /> : <MailIcon className="h-4 w-4" aria-label="Email" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span dir="auto" className="font-semibold text-ink-900">{o.to}</span>
                        <Badge tone="neutral">{KIND_LABEL[o.kind]}</Badge>
                        {o.status === 'skipped' ? <Badge tone="warn">Skipped</Badge> : <Badge tone="success">Sent</Badge>}
                      </p>
                      {o.subject && <p dir="auto" className="mt-0.5 text-[13px] font-semibold text-ink-700">{o.subject}</p>}
                      <p dir="auto" className="mt-0.5 line-clamp-2 whitespace-pre-line text-[12.5px] text-ink-600">{o.body}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-400">{new Date(o.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{o.reason ? ` · ${o.reason}` : ''}{o.channel === 'sms' ? ` · ${o.body.length}/160` : ''}</p>
                    </div>
                  </li>
              )}
              </ul>
            }
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Automatic messages" description={canEdit ? 'Turn each one on or off.' : 'Ask a super admin to change these.'} />
          <CardBody className="space-y-4">
            {!settings.data ?
            <SkeletonText lines={4} /> :
            SETTINGS.map((s) =>
            <label key={s.key} className="flex items-start gap-3">
                <input type="checkbox" role="switch" className="mt-0.5 h-4 w-4 rounded border-ink-300" disabled={!canEdit || update.isPending}
              checked={settings.data![s.key]} onChange={(e) => update.mutate({ ...settings.data!, [s.key]: e.target.checked })} />
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink-900">{s.label} <span className="text-[11px] font-bold uppercase text-ink-400">{s.channel}</span></span>
                  <span className="block text-[12.5px] text-ink-500">{s.hint}</span>
                </span>
              </label>
            )}
          </CardBody>
        </Card>
      </div>
    </>);

}
