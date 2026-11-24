import { Link } from 'react-router-dom';
import { MessagesSquareIcon, PartyPopperIcon } from 'lucide-react';
import { useThreads, useViewer } from '../../hooks/communication';
import { useFamilyEvents } from '../../hooks/events';
import { consentOpen } from '../../utils/events';

/** Parent home: what needs an answer (event approvals, unread messages). Renders nothing when all is done. */
export function FamilyTodo() {
  const { viewer, ready } = useViewer();
  const events = useFamilyEvents(viewer, ready);
  const threads = useThreads(viewer, ready);
  const toApprove = (events.data ?? []).reduce((n, f) => n + (consentOpen(f.event) ? f.students.filter((s) => !s.response).length : 0), 0);
  const unread = (threads.data ?? []).reduce((n, t) => n + t.unread.parent, 0);
  if (!toApprove && !unread) return null;
  const item = 'flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50 px-4 py-2.5 text-[13.5px] font-semibold text-primary-800 hover:bg-primary-100';
  return (
    <div className="mb-5 flex flex-wrap gap-3" role="status">
      {toApprove > 0 && <Link to="/parent/events" className={item}><PartyPopperIcon className="h-4 w-4" aria-hidden="true" />{toApprove} event approval{toApprove > 1 ? 's' : ''} waiting for you</Link>}
      {unread > 0 && <Link to="/parent/messages" className={item}><MessagesSquareIcon className="h-4 w-4" aria-hidden="true" />{unread} unread message{unread > 1 ? 's' : ''} from teachers</Link>}
    </div>);

}
