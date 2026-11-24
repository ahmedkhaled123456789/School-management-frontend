import type { LucideIcon } from 'lucide-react';
import { BusIcon, CalendarHeartIcon, PartyPopperIcon, TrophyIcon, UsersIcon, VolleyballIcon } from 'lucide-react';
import type { BadgeTone } from '../components/ui/Badge';
import type { EventStatus, EventType, SchoolEvent } from '../types/events';
import { formatDay, todayKey } from './attendance';
import { formatTime } from './timetable';
import { formatMoney } from './money';

export const EVENT_TYPE_META: Record<EventType, {label: string;icon: LucideIcon;}> = {
  trip: { label: 'Trip', icon: BusIcon },
  competition: { label: 'Competition', icon: TrophyIcon },
  celebration: { label: 'Celebration', icon: PartyPopperIcon },
  sports: { label: 'Sports day', icon: VolleyballIcon },
  meeting: { label: 'Parents meeting', icon: UsersIcon },
  other: { label: 'Other', icon: CalendarHeartIcon }
};

export const EVENT_STATUS_META: Record<EventStatus, {label: string;tone: BadgeTone;}> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Published', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' }
};

export const eventWhen = (e: Pick<SchoolEvent, 'date' | 'endDate' | 'startTime' | 'endTime'>) =>
e.endDate ?
`${formatDay(e.date)} – ${formatDay(e.endDate)}` :
`${formatDay(e.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatTime(e.startTime)} – ${formatTime(e.endTime)}`;

export const feeLabel = (minor: number) => minor ? formatMoney(minor / 100) : 'Free';

export const consentOpen = (e: SchoolEvent) => e.status === 'published' && e.requiresConsent && todayKey() <= (e.consentDeadline ?? e.date);

export const isPast = (e: Pick<SchoolEvent, 'date' | 'endDate'>) => (e.endDate ?? e.date) < todayKey();
