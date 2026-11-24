import { LibraryBigIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { overdueDays } from '../../api/library';
import { useLibrarySettings, useLoans, useRenewLoan } from '../../hooks/services';
import { formatDay } from '../../utils/attendance';
import { formatMoney } from '../../utils/money';

/** A student's books and fines. Students may renew; parents only look. */
export function StudentLibraryCard({ studentId, canRenew, className }: {studentId?: string;canRenew?: boolean;className?: string;}) {
  const loans = useLoans('all', studentId, Boolean(studentId));
  const settings = useLibrarySettings();
  const renew = useRenewLoan(studentId);
  const open = (loans.data ?? []).filter((l) => !l.returnedOn);
  const fines = (loans.data ?? []).filter((l) => l.fine > 0 && !l.finePaid && !l.fineWaived);
  const max = settings.data?.maxRenewals ?? 1;
  return (
    <Card className={className}>
      <CardHeader title={<span className="flex items-center gap-2"><LibraryBigIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />Library</span>}
      description={settings.data ? `Up to ${settings.data.maxLoansStudent} books for ${settings.data.loanDays} days · late fee ${formatMoney(settings.data.finePerDay / 100)} a day` : undefined} />
      <CardBody>
        {loans.isError ?
        <ErrorState error={loans.error} /> :
        loans.isLoading || !studentId ?
        <SkeletonText lines={3} /> :

        <div className="space-y-3">
            {open.length === 0 && <p className="text-[13.5px] text-ink-500">No books borrowed right now.</p>}
            {open.length > 0 &&
          <ul className="divide-y divide-ink-100">
                {open.map((l) => {
              const late = overdueDays(l);
              return (
                <li key={l._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13.5px]">
                      <div className="min-w-0 flex-1">
                        <p dir="auto" className="font-semibold text-ink-900">{l.title}</p>
                        <p className="text-[12px] text-ink-500">Borrowed {formatDay(l.loanedOn)} · due {formatDay(l.dueOn, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      </div>
                      {late ? <Badge tone="danger">{late} day(s) late</Badge> : <Badge tone="success">On time</Badge>}
                      {canRenew && !late && l.renewals < max && <Button size="sm" variant="secondary" isLoading={renew.isPending && renew.variables === l._id} onClick={() => renew.mutate(l._id)}>Renew</Button>}
                    </li>);

            })}
              </ul>
          }
            {fines.length > 0 &&
          <p role="alert" className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-[13px] text-danger-600">
                Unpaid fines: {formatMoney(fines.reduce((s, l) => s + l.fine, 0) / 100)} — pay at the library desk. New books can not be borrowed until then.
              </p>
          }
          </div>
        }
      </CardBody>
    </Card>);

}
