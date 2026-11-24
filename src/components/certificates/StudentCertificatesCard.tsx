import { AwardIcon, DownloadIcon } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { SkeletonText } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { useCertificates } from '../../hooks/admissions';
import { downloadCanvas, drawIssued } from '../../lib/cards';
import { formatDay } from '../../utils/attendance';

/** A student's certificates (student portal, parent's child page) with PNG download. */
export function StudentCertificatesCard({ studentId, className }: {studentId?: string;className?: string;}) {
  const list = useCertificates(studentId, Boolean(studentId));
  return (
    <Card className={className}>
      <CardHeader title={<span className="flex items-center gap-2"><AwardIcon className="h-4 w-4 text-accent-500" aria-hidden="true" />Certificates</span>} />
      <CardBody>
        {list.isError ?
        <ErrorState error={list.error} /> :
        list.isLoading || !studentId ?
        <SkeletonText lines={3} /> :
        !list.data?.length ?
        <p className="text-[13.5px] text-ink-500">No certificates yet.</p> :

        <ul className="divide-y divide-ink-100">
            {list.data.map((c) =>
          <li key={c._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[13.5px]">
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="font-semibold text-ink-900">{c.title}</p>
                  <p className="text-[12px] text-ink-500">{formatDay(c.issuedOn, { day: 'numeric', month: 'long', year: 'numeric' })}{c.reason ? ` · ${c.reason}` : ''} · <span className="font-mono">{c.serial}</span></p>
                </div>
                <button type="button" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-600 hover:underline" onClick={async () => downloadCanvas(await drawIssued(c), `${c.title} ${c.student.name}`)}>
                  <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" />Download
                </button>
              </li>
          )}
          </ul>
        }
      </CardBody>
    </Card>);

}
