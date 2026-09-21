//  import { Link } from 'react-router-dom';
// import { ClipboardListIcon } from 'lucide-react';
// import { DEMO_MODE } from '../../api/client';
// import { Badge } from '../../components/ui/Badge';
// import { Button } from '../../components/ui/Button';
// import { Card, CardBody } from '../../components/ui/Card';
// import { PageHeader } from '../../components/ui/PageHeader';
// import { Skeleton } from '../../components/ui/Skeleton';
// import { BackendRequired, EmptyState, ErrorState } from '../../components/ui/States';
// import { useExams } from '../../hooks/exams';
// import { formatDate, relationLabel } from '../../utils/format';

// export function StudentExams() {
//   const query = useExams();
//   const items = query.data?.items ?? [];

//   return (
//     <>
//       <PageHeader
//         title="My Exams"
//         description="Exams scheduled for your class. Open one to begin when it is live."
//         breadcrumbs={[{ label: 'Student', to: '/student' }, { label: 'My Exams' }]} />
      

//       {DEMO_MODE ?
//       <div className="mb-5 rounded-xl border border-dashed border-accent-200 bg-accent-50/60 px-4 py-3 text-[13px] text-ink-600">
//           <span className="font-bold text-accent-500">Demo data · </span>
//           Exam papers are served locally with the correct answers stripped out, exactly as the
//           missing <span className="font-mono text-[12px]">GET /api/v1/students/exam/:examID</span>{' '}
//           endpoint must behave once the backend implements it.
//         </div> :

//       <BackendRequired
//         className="mb-5"
//         feature="Student-safe exam questions"
//         detail="Sitting an exam needs an endpoint that returns the paper and its options without the correct answers. Until it exists, starting an exam shows an integration notice instead of loading questions from a teacher-only endpoint."
//         endpoint="GET /api/v1/students/exam/:examID" />

//       }

//       {query.isError ?
//       <Card>
//           <ErrorState error={query.error} onRetry={() => query.refetch()} />
//         </Card> :
//       query.isLoading ?
//       <div className="grid gap-4 sm:grid-cols-2">
//           {Array.from({ length: 4 }).map((_, index) =>
//         <Skeleton key={index} className="h-40 w-full rounded-xl" />
//         )}
//         </div> :
//       items.length === 0 ?
//       <Card>
//           <EmptyState
//           title="No exams found"
//           description="Exams appear here once your teachers schedule them."
//           icon={<ClipboardListIcon className="h-5 w-5" aria-hidden="true" />} />
        
//         </Card> :

//       <div className="grid gap-4 sm:grid-cols-2">
//           {items.map((exam) =>
//         <Card key={exam._id} as="article">
//               <CardBody>
//                 <div className="flex items-start justify-between gap-3">
//                   <h2 className="text-[15px] font-bold text-ink-900">{exam.name}</h2>
//                   <Badge tone={exam.examStatus === 'live' ? 'success' : 'warn'}>
//                     {exam.examStatus ?? 'pending'}
//                   </Badge>
//                 </div>
//                 {exam.description &&
//             <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
//                     {exam.description}
//                   </p>
//             }
//                 <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
//                   {[
//               ['Subject', relationLabel(exam.subject)],
//               ['Type', exam.examType || '—'],
//               ['Date', formatDate(exam.examDate)],
//               ['Duration', exam.duration || '—']].
//               map(([label, value]) =>
//               <div key={label}>
//                       <dt className="text-[11.5px] font-bold uppercase tracking-wider text-ink-500">
//                         {label}
//                       </dt>
//                       <dd className="mt-0.5 font-semibold text-ink-800">{value}</dd>
//                     </div>
//               )}
//                 </dl>
//                 <div className="mt-5">
//                   <Link to={`/student/exams/${exam._id}/take`}>
//                     <Button fullWidth disabled={exam.examStatus !== 'live'}>
//                       {exam.examStatus === 'live' ? 'Start exam' : 'Not yet live'}
//                     </Button>
//                   </Link>
//                 </div>
//               </CardBody>
//             </Card>
//         )}
//         </div>
//       }
//     </>);

// }




import { Link } from 'react-router-dom';
import { ClipboardListIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useExams } from '../../hooks/exams';
import { formatDate, relationLabel } from '../../utils/format';

export function StudentExams() {
  const query = useExams();
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="My Exams"
        description="Exams scheduled for your class. Open one to begin when it is live."
        breadcrumbs={[
          { label: 'Student', to: '/student' },
          { label: 'My Exams' }
        ]}
      />

      {query.isError ? (
        <Card>
          <ErrorState
            error={query.error}
            onRetry={() => query.refetch()}
          />
        </Card>
      ) : query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-40 w-full rounded-xl"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="No exams found"
            description="Exams appear here once your teachers schedule them."
            icon={
              <ClipboardListIcon
                className="h-5 w-5"
                aria-hidden="true"
              />
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((exam) => (
            <Card key={exam._id} as="article">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[15px] font-bold text-ink-900">
                    {exam.name}
                  </h2>

                  <Badge
                    tone={
                      exam.examStatus === 'live'
                        ? 'success'
                        : 'warn'
                    }
                  >
                    {exam.examStatus ?? 'pending'}
                  </Badge>
                </div>

                {exam.description && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
                    {exam.description}
                  </p>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  {[
                    ['Subject', relationLabel(exam.subject)],
                    ['Type', exam.examType || '—'],
                    ['Date', formatDate(exam.examDate)],
                    ['Duration', exam.duration || '—']
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11.5px] font-bold uppercase tracking-wider text-ink-500">
                        {label}
                      </dt>

                      <dd className="mt-0.5 font-semibold text-ink-800">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5">
                  <Link
                    to={`/student/exams/${exam._id}/take`}
                  >
                    <Button
                      fullWidth
                      disabled={exam.examStatus !== 'live'}
                    >
                      {exam.examStatus === 'live'
                        ? 'Start exam'
                        : 'Not yet live'}
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

