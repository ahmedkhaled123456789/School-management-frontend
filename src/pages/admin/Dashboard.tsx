 import { Link } from 'react-router-dom';
import {
  AwardIcon,
  BookOpenIcon,
  CalendarRangeIcon,
  GraduationCapIcon,
  LayersIcon,
  ListChecksIcon,
  PlusIcon,
  UsersIcon } from
'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { AdminAnalytics } from '../../components/admin/AdminAnalytics';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useAcademicYears } from '../../hooks/academicYears';
import { useClassLevels } from '../../hooks/classes';
import { useExamResults } from '../../hooks/examResults';
import { usePrograms } from '../../hooks/programs';
import { useStudents } from '../../hooks/students';
import { useSubjects } from '../../hooks/subjects';
import { useTeachers } from '../../hooks/teachers';
import { formatDate, initials, relationLabel } from '../../utils/format';

const RECENT_PARAMS = { page: 1, limit: 5 };

export function AdminDashboard() {
  const students = useStudents(RECENT_PARAMS);
  const teachers = useTeachers(RECENT_PARAMS);
  const programs = usePrograms();
  const subjects = useSubjects();
  const classLevels = useClassLevels();
  const academicYears = useAcademicYears();
  const examResults = useExamResults();

  const recentStudents = (students.data?.items ?? []).slice(0, 5);
  const recentTeachers = (teachers.data?.items ?? []).slice(0, 5);
  const recentResults = (examResults.data?.items ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="School overview"
        description="A live snapshot of enrolment, staffing and academic structure, drawn from the records the backend exposes."
        actions={
        <>
            <Link to="/admin/students">
              <Button variant="secondary" icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>
                Add student
              </Button>
            </Link>
            <Link to="/admin/teachers">
              <Button icon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}>Add teacher</Button>
            </Link>
          </>
        } />
      

      <section aria-label="Key statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total students"
          value={students.data?.total ?? 0}
          icon={<GraduationCapIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/students"
          isLoading={students.isLoading}
          isUnavailable={students.isError} />
        
        <StatCard
          label="Total teachers"
          value={teachers.data?.total ?? 0}
          icon={<UsersIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/teachers"
          isLoading={teachers.isLoading}
          isUnavailable={teachers.isError} />
        
        <StatCard
          label="Programs"
          value={programs.data?.items.length ?? 0}
          icon={<LayersIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/programs"
          isLoading={programs.isLoading}
          isUnavailable={programs.isError} />
        
        <StatCard
          label="Subjects"
          value={subjects.data?.items.length ?? 0}
          icon={<BookOpenIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/subjects"
          isLoading={subjects.isLoading}
          isUnavailable={subjects.isError} />
        
        <StatCard
          label="Class levels"
          value={classLevels.data?.items.length ?? 0}
          icon={<ListChecksIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/classes"
          isLoading={classLevels.isLoading}
          isUnavailable={classLevels.isError} />
        
        <StatCard
          label="Academic years"
          value={academicYears.data?.items.length ?? 0}
          icon={<CalendarRangeIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/academic-years"
          isLoading={academicYears.isLoading}
          isUnavailable={academicYears.isError} />
        
        <StatCard
          label="Exam results"
          value={examResults.data?.items.length ?? 0}
          icon={<AwardIcon className="h-4 w-4" aria-hidden="true" />}
          to="/admin/exam-results"
          isLoading={examResults.isLoading}
          isUnavailable={examResults.isError}
          hint={
          examResults.data ?
          `${examResults.data.items.filter((item) => item.isPublished).length} published` :
          undefined
          } />
        
        <StatCard
          label="Attendance rate"
          value={null}
          icon={<ListChecksIcon className="h-4 w-4" aria-hidden="true" />}
          isUnavailable
          hint="No attendance endpoint exists in the API contract." />
        
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent students"
            description="Most recently returned by the students directory."
            action={
            <Link to="/admin/students" className="text-[13px] font-semibold text-primary-600 hover:underline">
                View all
              </Link>
            } />
          
          {students.isError ?
          <ErrorState error={students.error} onRetry={() => students.refetch()} /> :
          students.isLoading ?
          <CardBody className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) =>
            <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
            )}
            </CardBody> :
          recentStudents.length === 0 ?
          <EmptyState
            title="No students found"
            description="Students you register will appear here."
            action={
            <Link to="/admin/students">
                  <Button size="sm">Add student</Button>
                </Link>
            } /> :


          <ul className="divide-y divide-ink-100">
              {recentStudents.map((student) =>
            <li key={student._id}>
                  <Link
                to={`/admin/students/${student._id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-primary-50/40">
                
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[12px] font-bold text-primary-700">
                      {initials(student.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink-900">
                        {student.name}
                      </span>
                      <span className="block truncate text-[12.5px] text-ink-500">
                        {student.email}
                      </span>
                    </span>
                    <span className="hidden font-mono text-[12px] text-ink-500 sm:block">
                      {student.studentId}
                    </span>
                    {student.isSuspended ?
                <Badge tone="danger">Suspended</Badge> :
                student.isWithdrawn ?
                <Badge tone="warn">Withdrawn</Badge> :

                <Badge tone="success">Active</Badge>
                }
                  </Link>
                </li>
            )}
            </ul>
          }
        </Card>

        <Card>
          <CardHeader title="Quick actions" description="Jump straight into common tasks." />
          <CardBody className="grid gap-2">
            {[
            { label: 'Register a student', to: '/admin/students' },
            { label: 'Register a teacher', to: '/admin/teachers' },
            { label: 'Create a program', to: '/admin/programs' },
            { label: 'Add an academic term', to: '/admin/academic-terms' },
            { label: 'Publish exam results', to: '/admin/exam-results' }].
            map((action) =>
            <Link
              key={action.to + action.label}
              to={action.to}
              className="flex items-center justify-between rounded-lg border border-ink-200 px-3.5 py-2.5 text-[13.5px] font-semibold text-ink-700 transition-colors hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-700">
              
                {action.label}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent exam results"
            description="Publishing is controlled from the exam results page."
            action={
            <Link to="/admin/exam-results" className="text-[13px] font-semibold text-primary-600 hover:underline">
                Manage
              </Link>
            } />
          
          {examResults.isError ?
          <ErrorState error={examResults.error} onRetry={() => examResults.refetch()} /> :
          examResults.isLoading ?
          <CardBody className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) =>
            <Skeleton key={index} className="h-10 w-full" />
            )}
            </CardBody> :
          recentResults.length === 0 ?
          <EmptyState
            title="No exam results available"
            description="Results appear once students submit their exams." /> :


          <ul className="divide-y divide-ink-100">
              {recentResults.map((result) =>
            <li
              key={result._id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink-900">
                      {relationLabel(result.exam, 'Exam')}
                    </p>
                    <p className="text-[12.5px] text-ink-500">
                      {result.studentID ? `Student ${result.studentID}` : 'Student —'} ·{' '}
                      {formatDate(result.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold text-ink-700">
                      {result.score ?? '—'}
                    </span>
                    <Badge tone={result.status === 'Pass' ? 'success' : 'danger'}>
                      {result.status ?? 'Pending'}
                    </Badge>
                    <Badge tone={result.isPublished ? 'info' : 'neutral'}>
                      {result.isPublished ? 'Published' : 'Unpublished'}
                    </Badge>
                  </div>
                </li>
            )}
            </ul>
          }
        </Card>

        <Card>
          <CardHeader
            title="Recent teachers"
            action={
            <Link to="/admin/teachers" className="text-[13px] font-semibold text-primary-600 hover:underline">
                View all
              </Link>
            } />
          
          {teachers.isError ?
          <ErrorState error={teachers.error} onRetry={() => teachers.refetch()} /> :
          teachers.isLoading ?
          <CardBody className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) =>
            <Skeleton key={index} className="h-9 w-full" />
            )}
            </CardBody> :
          recentTeachers.length === 0 ?
          <EmptyState title="No teachers found" description="Register teaching staff to get started." /> :

          <ul className="divide-y divide-ink-100">
              {recentTeachers.map((teacher) =>
            <li key={teacher._id}>
                  <Link
                to={`/admin/teachers/${teacher._id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-primary-50/40">
                
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11.5px] font-bold text-accent-500">
                      {initials(teacher.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink-900">
                        {teacher.name}
                      </span>
                      <span className="block truncate text-[12px] text-ink-500">{teacher.email}</span>
                    </span>
                  </Link>
                </li>
            )}
            </ul>
          }
        </Card>
      </div>
      <AdminAnalytics />
    </>);

}