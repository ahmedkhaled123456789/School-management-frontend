import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, PartyPopperIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { BackendRequired, EmptyState } from '../../components/ui/States';
import { ExamForm } from '../../components/teacher/ExamForm';
import { QuestionCard } from '../../components/teacher/QuestionCard';
import { QuestionEditor } from '../../components/teacher/QuestionEditor';
import { useCreateExam, useExam } from '../../hooks/exams';
import { useCreateQuestion, useQuestions, useUpdateQuestion } from '../../hooks/questions';
import type { Question } from '../../types/question';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/format';

const STEPS = ['Exam information', 'Questions', 'Review', 'Save'] as const;

export function TeacherExamBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [examID, setExamID] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);

  const createExam = useCreateExam();
  const exam = useExam(examID ?? undefined);
  const questions = useQuestions(examID ?? undefined, exam.data?.questions);
  const createQuestion = useCreateQuestion(examID ?? '');
  const updateQuestion = useUpdateQuestion(examID ?? '');

  const items = questions.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Create exam"
        description="Set up the paper, write the questions, review, then save."
        breadcrumbs={[
        { label: 'Teacher', to: '/teacher' },
        { label: 'My Exams', to: '/teacher/exams' },
        { label: 'Create' }]
        } />
      

      <ol className="mb-6 grid gap-2 sm:grid-cols-4" aria-label="Exam creation progress">
        {STEPS.map((label, index) => {
          const isDone = index < step;
          const isCurrent = index === step;
          return (
            <li
              key={label}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3.5 py-3 transition-colors',
                isCurrent ?
                'border-primary-300 bg-white shadow-card' :
                isDone ?
                'border-success-100 bg-success-50' :
                'border-ink-200 bg-white/60'
              )}>
              
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold',
                  isCurrent ?
                  'bg-primary-600 text-white' :
                  isDone ?
                  'bg-success-500 text-white' :
                  'bg-ink-100 text-ink-500'
                )}>
                
                {isDone ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-[13px] font-semibold',
                  isCurrent ? 'text-ink-900' : isDone ? 'text-success-600' : 'text-ink-500'
                )}>
                
                {label}
              </span>
            </li>);

        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}>
          
          {step === 0 &&
          <Card>
              <CardHeader
              title="Exam information"
              description="Saved first so questions can be attached to the exam." />
            
              <CardBody>
                <ExamForm
                isSaving={createExam.isPending}
                submitLabel="Save and add questions"
                onCancel={() => navigate('/teacher/exams')}
                onSubmit={async (payload) => {
                  try {
                    const created = await createExam.mutateAsync(payload);
                    if (!created?._id) {
                      toast.error('The exam was created but no id was returned by the server.');
                      return;
                    }
                    setExamID(created._id);
                    toast.success('Exam created. Now add your questions.');
                    setStep(1);
                  } catch {

                    // Toast handled by the mutation hook.
                  }}} />
              
              </CardBody>
            </Card>
          }

          {step === 1 &&
          <Card>
              <CardHeader
              title="Questions"
              description={`${items.length} question${items.length === 1 ? '' : 's'} added to this paper.`}
              action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
                icon={<PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />}>
                
                    Add question
                  </Button>
              } />
            
              {items.length === 0 ?
            <EmptyState
              title="No questions added yet"
              description="Every question needs four options and one correct answer."
              action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}>
                
                      Add your first question
                    </Button>
              } /> :


            <CardBody className="space-y-4">
                  {items.map((question, index) =>
              <QuestionCard
                key={question._id}
                question={question}
                index={index + 1}
                onEdit={() => {
                  setEditing(question);
                  setEditorOpen(true);
                }} />

              )}
                </CardBody>
            }
              <div className="flex justify-between gap-2 border-t border-ink-100 px-5 py-4">
                <Button variant="secondary" onClick={() => setStep(0)} disabled>
                  Back
                </Button>
                <Button onClick={() => setStep(2)} disabled={items.length === 0}>
                  Review paper
                </Button>
              </div>
            </Card>
          }

          {step === 2 &&
          <div className="space-y-5">
              <Card>
                <CardHeader title="Review" description="Confirm the paper before saving." />
                <CardBody>
                  <dl className="grid gap-4 sm:grid-cols-3">
                    {[
                  ['Exam', exam.data?.name ?? '—'],
                  ['Type', exam.data?.examType ?? '—'],
                  ['Date', formatDate(exam.data?.examDate)],
                  ['Time', exam.data?.examTime ?? '—'],
                  ['Duration', exam.data?.duration ?? '—'],
                  ['Questions', String(items.length)]].
                  map(([label, value]) =>
                  <div key={label} className="rounded-lg bg-ink-50 px-4 py-3">
                        <dt className="text-[12px] font-bold uppercase tracking-wider text-ink-500">
                          {label}
                        </dt>
                        <dd className="mt-1 text-[14px] font-semibold text-ink-900">{value}</dd>
                      </div>
                  )}
                  </dl>
                  {exam.data?.description &&
                <p className="mt-4 text-[13.5px] leading-relaxed text-ink-600">
                      {exam.data.description}
                    </p>
                }
                </CardBody>
              </Card>

              <div className="space-y-4">
                {items.map((question, index) =>
              <QuestionCard key={question._id} question={question} index={index + 1} />
              )}
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back to questions
                </Button>
                <Button onClick={() => setStep(3)}>Save exam</Button>
              </div>
            </div>
          }

          {step === 3 &&
          <div className="space-y-5">
              <Card>
                <CardBody className="flex flex-col items-center py-12 text-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-500">
                    <PartyPopperIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-extrabold text-ink-900">Exam saved</h2>
                  <p className="mt-1 max-w-md text-[13.5px] text-ink-500">
                    {exam.data?.name} is stored with {items.length} question
                    {items.length === 1 ? '' : 's'}. Its current status is{' '}
                    <Badge tone={exam.data?.examStatus === 'live' ? 'success' : 'warn'}>
                      {exam.data?.examStatus ?? 'pending'}
                    </Badge>
                    .
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Link to={`/teacher/exams/${examID}`}>
                      <Button>Open exam</Button>
                    </Link>
                    <Link to="/teacher/exams">
                      <Button variant="secondary">Back to my exams</Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>

              <BackendRequired
              feature="Moving an exam from pending to live"
              detail="The API contract has no endpoint for changing exam status, so the paper stays in whatever status the backend assigned on creation."
              endpoint="PUT /api/v1/exams/:id (exam status transition)" />
            
            </div>
          }
        </motion.div>
      </AnimatePresence>

      <QuestionEditor
        open={editorOpen}
        initial={editing}
        isSaving={createQuestion.isPending || updateQuestion.isPending}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={(payload) =>
        editing ?
        updateQuestion.mutateAsync({ id: editing._id, payload }) :
        createQuestion.mutateAsync(payload)
        } />
      
    </>);

}