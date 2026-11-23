import { Link } from 'react-router-dom';
import { CalendarCogIcon, FlaskConicalIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/States';
import { usePermissions } from '../../hooks/permissions';
import { PERMISSIONS } from '../../lib/permissions';

/** Tells admins these pages run on demo data stored in this browser. */
export function MockDataNotice({ onReset }: {onReset?: () => void;}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-100 bg-accent-50 px-4 py-2.5 text-[13px] text-accent-500">
      <p className="flex items-center gap-2">
        <FlaskConicalIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Preview feature.</strong> Sections, rooms and the timetable are stored in this browser until the backend
          endpoints are ready. Students, teachers and subjects are your real data.
        </span>
      </p>
      {onReset &&
      <Button size="sm" variant="ghost" icon={<RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={onReset}>
          Reset demo data
        </Button>
      }
    </div>);

}

/** Sections/timetable are per academic year: ask to set the current one. */
export function NoAcademicYear() {
  const { can } = usePermissions();
  return (
    <Card>
      <EmptyState
        icon={<CalendarCogIcon className="h-5 w-5" aria-hidden="true" />}
        title="No current academic year"
        description="Sections and timetables belong to an academic year. Choose the current one in School Settings."
        action={can(PERMISSIONS.SETTINGS_MANAGE) ? <Link to="/admin/settings"><Button>Open School Settings</Button></Link> : undefined} />

    </Card>);

}
