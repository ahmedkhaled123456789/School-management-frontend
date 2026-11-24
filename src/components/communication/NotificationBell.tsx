import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AwardIcon, BellIcon, BriefcaseIcon, BusIcon, UtensilsIcon, LibraryBigIcon, CalendarCheckIcon, CheckCheckIcon, MegaphoneIcon, MessagesSquareIcon, PartyPopperIcon, StethoscopeIcon, UserPlusIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMarkNotificationsRead, useNotifications, useViewer } from '../../hooks/communication';
import type { NotificationKind } from '../../types/communication';
import { cn } from '../../utils/cn';

const ICON: Record<NotificationKind, LucideIcon> = {
  announcement: MegaphoneIcon,
  message: MessagesSquareIcon,
  absence: CalendarCheckIcon,
  clinic: StethoscopeIcon,
  event: PartyPopperIcon,
  admission: UserPlusIcon,
  certificate: AwardIcon,
  library: LibraryBigIcon,
  transport: BusIcon,
  hr: BriefcaseIcon,
  canteen: UtensilsIcon
};

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Bell with unread count; the panel lists the latest notifications for this user. */
export function NotificationBell() {
  const { role, viewer, ready } = useViewer();
  const list = useNotifications(viewer, ready);
  const markRead = useMarkNotificationsRead(viewer);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent) => {if (!ref.current?.contains(e.target as Node)) setOpen(false);};
    const onKey = (e: KeyboardEvent) => {if (e.key === 'Escape') setOpen(false);};
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!role) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2.5 text-ink-600 transition-colors hover:bg-ink-100">
        <BellIcon className="h-5 w-5" aria-hidden="true" />
        {unread > 0 &&
        <span className="absolute end-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger-500 px-1 text-[10.5px] font-bold text-white ring-2 ring-white" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        }
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          role="dialog"
          aria-label="Notifications"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-[380px]">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-[14px] font-bold text-ink-900">Notifications</p>
              <button type="button" disabled={!unread} onClick={() => markRead.mutate('all')} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-600 hover:underline disabled:text-ink-300 disabled:no-underline">
                <CheckCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />Mark all read
              </button>
            </div>
            {items.length === 0 ?
          <p className="px-4 py-10 text-center text-[13px] text-ink-500">{list.isLoading || !ready ? 'Loading…' : 'You are all caught up.'}</p> :

          <ul className="scrollbar-thin max-h-[60vh] divide-y divide-ink-100 overflow-y-auto">
                {items.map((n) => {
              const Icon = ICON[n.kind];
              return (
                <li key={n._id}>
                      <button
                    type="button"
                    onClick={() => {
                      if (!n.isRead) markRead.mutate([n._id]);
                      setOpen(false);
                      const href = n.href[role];
                      if (href) navigate(href);
                    }}
                    className={cn('flex w-full gap-3 px-4 py-3 text-start hover:bg-ink-50', !n.isRead && 'bg-primary-50/50')}>
                        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', n.kind === 'absence' || n.kind === 'clinic' ? 'bg-danger-50 text-danger-600' : 'bg-primary-50 text-primary-600')}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span dir="auto" className={cn('block text-[13px] leading-snug text-ink-900', !n.isRead && 'font-bold')}>{n.title}</span>
                          <span dir="auto" className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-500">{n.body}</span>
                          <span className="mt-0.5 block text-[11.5px] text-ink-400">{ago(n.createdAt)}</span>
                        </span>
                        {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" aria-label="Unread" />}
                      </button>
                    </li>);

            })}
              </ul>
          }
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}
