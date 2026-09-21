import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { BackendRequired } from '../../components/ui/States';
import { ExamRunnerView } from '../../components/student/ExamRunnerView';
import { useStudentExam } from '../../hooks/exams';
import { useWriteExam } from '../../hooks/students';
import { relationLabel } from '../../utils/format';

export function StudentExamRunner() {
  const { examID = '' } = useParams();
  const navigate = useNavigate();
  const paper = useStudentExam(examID);
  const submit = useWriteExam(examID);
  const [submitted, setSubmitted] = useState(false);

  if (paper.isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-canvas">
        <Loader2Icon className="h-6 w-6 animate-spin text-primary-600" aria-hidden="true" />
        <p className="text-[13.5px] font-semibold text-ink-500">Preparing your exam…</p>
      </div>);

  }

  if (submitted) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas px-6 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-500">
          <CheckCircle2Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-extrabold text-ink-900">Exam submitted</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-500">
          Your answers have been sent for marking. Your result becomes visible once the school
          publishes it.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/student/results">
            <Button>View my results</Button>
          </Link>
          <Link to="/student/exams">
            <Button variant="secondary">Back to my exams</Button>
          </Link>
        </div>
      </div>);

  }

  // Expected until the student-safe exam endpoint ships.
  if (paper.isError || !paper.data) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-canvas px-5 py-10">
        <div className="w-full max-w-lg">
          <BackendRequired
            feature="Loading this exam for a student"
            detail="The exam interface is fully built and wired to a student-safe endpoint, but the backend does not expose one yet. It must return the exam and its questions with options — and must never include correctAnswer. Teacher and admin question endpoints are deliberately not used here."
            endpoint="GET /api/v1/students/exam/:examID" />
          
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/student/exams">
              <Button variant="secondary">Back to my exams</Button>
            </Link>
            <Button variant="ghost" onClick={() => paper.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      </div>);

  }

  return (
    <ExamRunnerView
      exam={paper.data.exam}
      questions={paper.data.questions}
      subjectLabel={relationLabel(paper.data.exam.subject, 'Subject')}
      isSubmitting={submit.isPending}
      onExit={() => navigate('/student/exams')}
      onSubmit={async (answers) => {
        if (submit.isPending) return;
        try {
          await submit.mutateAsync(answers);
          setSubmitted(true);
          toast.success('Exam submitted successfully.');
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }} />);


}