import { useState } from 'react';
import { EyeIcon, MegaphoneIcon, PencilIcon, PinIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { SkeletonText } from '../../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../../components/ui/States';
import { Textarea } from '../../../components/ui/Textarea';
import { AudiencePicker } from '../../../components/communication/AudiencePicker';
import type { AnnouncementView } from '../../../api/communication';
import { useAnnouncements, useAudienceTargets, useDeleteAnnouncement, useSaveAnnouncement } from '../../../hooks/communication';
import { usePermissions } from '../../../hooks/permissions';
import { useCurrentAcademicYear } from '../../../hooks/sections';
import { PERMISSIONS } from '../../../lib/permissions';
import type { Audience } from '../../../types/communication';
import { todayKey } from '../../../utils/attendance';

export function AdminAnnouncements() {
  const list = useAnnouncements({});
  const remove = useDeleteAnnouncement();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.STUDENTS_MANAGE);
  const [editing, setEditing] = useState<AnnouncementView | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementView | null>(null);
  const today = todayKey();

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Post news to the whole school, staff, parents or specific class levels and sections. Families also get an email (see SMS & Email)."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Communication' }, { label: 'Announcements' }]}
        actions={canManage ? <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setEditing('new')}>New announcement</Button> : undefined} />

      {list.isError ?
      <Card><ErrorState error={list.error} onRetry={() => list.refetch()} /></Card> :
      list.isLoading ?
      <Card className="p-5"><SkeletonText lines={6} /></Card> :
      !list.data?.length ?
      <Card><EmptyState icon={<MegaphoneIcon className="h-5 w-5" aria-hidden="true" />} title="No announcements yet" description="Announcements show in every portal they are meant for, with a notification." action={canManage ? <Button onClick={() => setEditing('new')}>Post the first one</Button> : undefined} /></Card> :

      <ul className="space-y-3">
          {list.data.map((a) => {
          const expired = a.expiresOn && a.expiresOn < today;
          return (
            <li key={a._id}>
                <Card className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        {a.pinned && <PinIcon className="h-3.5 w-3.5 text-accent-500" aria-label="Pinned" />}
                        <span dir="auto" className="text-[15px] font-bold text-ink-900">{a.title}</span>
                        {expired && <Badge tone="neutral">Ended</Badge>}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ink-500">
                        {a.audienceLabel} · {a.author.name} · {new Date(a.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        {a.expiresOn && !expired ? ` · until ${a.expiresOn}` : ''}
                      </p>
                      <p dir="auto" className="mt-2 line-clamp-3 whitespace-pre-line text-[13.5px] text-ink-700">{a.body}</p>
                    </div>
                    <span className="flex items-center gap-1 text-[12.5px] text-ink-500" title="People who opened it"><EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />{a.readCount ?? 0} read</span>
                    {canManage &&
                  <div className="flex gap-1">
                        <Button size="sm" variant="ghost" aria-label={`Edit ${a.title}`} icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setEditing(a)} />
                        <Button size="sm" variant="ghost" aria-label={`Delete ${a.title}`} icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => setDeleting(a)} />
                      </div>
                  }
                  </div>
                </Card>
              </li>);

        })}
        </ul>
      }

      {editing && <AnnouncementForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={Boolean(deleting)} title="Delete this announcement?" message="It disappears from every portal. Notifications already sent stay." confirmLabel="Delete" tone="danger"
      isLoading={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && remove.mutate(deleting._id, { onSettled: () => setDeleting(null) })} />
    </>);

}

function AnnouncementForm({ initial, onClose }: {initial?: AnnouncementView;onClose: () => void;}) {
  const year = useCurrentAcademicYear();
  const targets = useAudienceTargets(year.id);
  const save = useSaveAnnouncement();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? { kind: 'everyone' });
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [expiresOn, setExpiresOn] = useState(initial?.expiresOn ?? '');
  const [touched, setTouched] = useState(false);
  const errors = {
    title: title.trim().length < 3 ? 'At least 3 characters' : undefined,
    body: !body.trim() ? 'Write the announcement' : undefined,
    audience: (audience.kind === 'levels' || audience.kind === 'sections') && !audience.targets?.length ? 'Choose at least one' : undefined,
    expiresOn: expiresOn && expiresOn < todayKey() ? 'Today or later' : undefined
  };
  const invalid = Object.values(errors).some(Boolean);
  const submit = () => {
    setTouched(true);
    if (invalid) return;
    save.mutate({ id: initial?._id, payload: { title, body, audience, pinned, expiresOn: expiresOn || undefined } }, { onSuccess: onClose });
  };
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit announcement' : 'New announcement'} description={initial ? 'Edits do not send a new notification.' : 'Everyone in the audience gets a notification.'} size="lg"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button isLoading={save.isPending} onClick={submit}>{initial ? 'Save' : 'Post'}</Button></>}>
      <div className="space-y-4">
        <Input id="ann-title" label="Title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} error={touched ? errors.title : undefined} />
        <Textarea id="ann-body" label="Message" required rows={6} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} error={touched ? errors.body : undefined} hint={`${body.length} / 4,000`} />
        <AudiencePicker value={audience} onChange={setAudience} kinds={['everyone', 'staff', 'teachers', 'parents', 'students', 'levels', 'sections']}
        levels={targets.data?.levels ?? []} sections={targets.data?.sections ?? []} parentsToggle error={touched ? errors.audience : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="ann-expires" label="Show until (optional)" type="date" min={todayKey()} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} error={errors.expiresOn} />
          <label className="flex items-center gap-2 self-end pb-2.5 text-[13.5px] font-semibold text-ink-700">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-ink-300" />
            Pin to the top
          </label>
        </div>
      </div>
    </Modal>);

}
