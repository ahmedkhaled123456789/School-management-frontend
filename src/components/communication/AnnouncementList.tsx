import { useState } from 'react';
import { MegaphoneIcon, PinIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { EmptyState, ErrorState } from '../ui/States';
import { useAnnouncements, useMarkAnnouncementRead, useViewer } from '../../hooks/communication';
import type { AnnouncementView } from '../../api/communication';
import { cn } from '../../utils/cn';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** Announcements for the signed-in teacher / student / parent. Opening one marks it read. */
export function AnnouncementList() {
  const { viewer, ready } = useViewer();
  const list = useAnnouncements(viewer, ready);
  const markRead = useMarkAnnouncementRead();
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (a: AnnouncementView) => {
    setOpen((cur) => cur === a._id ? null : a._id);
    if (!a.isRead) markRead.mutate(a._id);
  };

  if (list.isError) return <Card><ErrorState error={list.error} onRetry={() => list.refetch()} /></Card>;
  if (!ready || list.isLoading) return <Card className="p-5"><SkeletonText lines={5} /></Card>;
  if (!list.data?.length) return <Card><EmptyState icon={<MegaphoneIcon className="h-5 w-5" aria-hidden="true" />} title="No announcements" description="School announcements for you appear here." /></Card>;

  return (
    <ul className="space-y-3">
      {list.data.map((a) => {
        const expanded = open === a._id;
        return (
          <li key={a._id}>
            <Card className={cn(!a.isRead && 'border-primary-200')}>
              <button type="button" aria-expanded={expanded} onClick={() => toggle(a)} className="flex w-full items-start gap-3 px-5 py-4 text-start">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.isRead ? 'bg-transparent' : 'bg-primary-500')} aria-label={a.isRead ? undefined : 'Unread'} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {a.pinned && <PinIcon className="h-3.5 w-3.5 text-accent-500" aria-label="Pinned" />}
                    <span dir="auto" className={cn('text-[14.5px] text-ink-900', a.isRead ? 'font-semibold' : 'font-extrabold')}>{a.title}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-500">{a.author.name} · {when(a.createdAt)}</span>
                  {!expanded && <span dir="auto" className="mt-1 line-clamp-2 block text-[13px] text-ink-600">{a.body}</span>}
                </span>
              </button>
              {expanded && <p dir="auto" className="whitespace-pre-line border-t border-ink-100 px-5 py-4 ps-10 text-[13.5px] leading-relaxed text-ink-800">{a.body}</p>}
            </Card>
          </li>);

      })}
    </ul>);

}
