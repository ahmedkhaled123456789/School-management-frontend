import { Badge } from '../ui/Badge';
import { STATUS_META, type DayStatus } from '../../utils/attendance';
import { cn } from '../../utils/cn';

/** Attendance status as text + color (never color alone). */
export function StatusBadge({ status, className }: {status: DayStatus;className?: string;}) {
  return <Badge tone={STATUS_META[status].tone} className={className}>{STATUS_META[status].label}</Badge>;
}

/** Small colored dot + label legend for calendars and charts. */
export function StatusLegend({ statuses = ['present', 'late', 'partial', 'absent', 'excused'], className }: {statuses?: DayStatus[];className?: string;}) {
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-600', className)}>
      {statuses.map((s) =>
      <li key={s} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_META[s].color }} aria-hidden="true" />
          {STATUS_META[s].label}
        </li>
      )}
    </ul>);

}
