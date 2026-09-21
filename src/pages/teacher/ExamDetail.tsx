import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PlusIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton';
import { BackendRequired, EmptyState, ErrorState } from '../../components/ui/States';
import { ExamForm } from '../../components/teacher/ExamForm';
import { QuestionCard } from '../../components/teacher/QuestionCard';
import { QuestionEditor } from '../../components/teacher/QuestionEditor';
import { useExam, useUpdateExam } from '../../hooks/exams';
import { useCreateQuestion, useQuestions, useUpdateQuestion } from '../../hooks/questions';
import type { Question } from '../../types/question';
import { formatDate } from '../../utils/format';

export function TeacherExamDetail() {
  const { examID = '' } = useParams();
  const exam = useExam(examID);
  const updateExam = useUpdateExam();
  const questions = useQuestions(examID, exam.data?.questions);
  const createQuestion = useCreateQuestion(examID);
  const updateQuestion = useUpdateQuestion(examID);

  const [isEditing, setIsEditing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);

  const items = questions.data?.items ?? [];

  if (exam.isError) {
    return (
      <>
        <PageHeader
          title="Exam"
          breadcrumbs={[
          { label: 'Teacher', to: '/teacher' },
          { label: 'My Exams', to: '/teacher/exams' },
          { label: 'Detail' }]
          } />
        
        <Card>
          <ErrorState error={exam.error} onRetry={() => exam.refetch()} />
        </Card>
      </>);

  }

  return (
    <>
      <PageHeader
        title={exam.isLoading ? 'Loading exam…' : exam.data?.name ?? 'Exam'}
        description={exam.data?.description}
        breadcrumbs={[
        { label: 'Teacher', to: '/teacher' },
        { label: 'My Exams', to: '/teacher/exams' },
        { label: exam.data?.name ?? 'Detail' }]
        }
        actions={
        !exam.isLoading &&
        <Button variant={isEditing ? 'secondary' : 'primary'} onClick={() => setIsEditing((prev) => !prev)}>
              {isEditing ? 'Cancel editing' : 'Edit details'}
            </Button>

        } />
      

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Questions"
              description={`${items.length} question${items.length === 1 ? '' : 's'} on this paper.`}
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
            
            {questions.isError ?
            <ErrorState error={questions.error} onRetry={() => questions.refetch()} /> :
            questions.isLoading ?
            <CardBody className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) =>
              <Skeleton key={index} className="h-36 w-full rounded-xl" />
              )}
              </CardBody> :
            items.length === 0 ?
            <EmptyState
              title="No questions added yet"
              description="Add questions so students can sit this exam."
              action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}>
                
                    Add question
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
          </Card>

          {isEditing &&
          <Card>
              <CardHeader title="Edit exam details" description="Sent to PUT /exams/:id." />
              <CardBody>
                <ExamForm
                initial={exam.data}
                isSaving={updateExam.isPending}
                submitLabel="Save changes"
                onCancel={() => setIsEditing(false)}
                onSubmit={async (payload) => {
                  try {
                    await updateExam.mutateAsync({ id: examID, payload });
                    setIsEditing(false);
                  } catch {

                    // Toast handled by the mutation hook.
                  }}} />
              
              </CardBody>
            </Card>
          }
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Paper details" />
            <CardBody>
              {exam.isLoading ?
              <SkeletonText lines={6} /> :

              <>
                  <Badge tone={exam.data?.examStatus === 'live' ? 'success' : 'warn'}>
                    {exam.data?.examStatus ?? 'pending'}
                  </Badge>
                  <dl className="mt-4 space-y-3 text-[13.5px]">
                    {[
                  ['Type', exam.data?.examType || '—'],
                  ['Date', formatDate(exam.data?.examDate)],
                  ['Time', exam.data?.examTime || '—'],
                  ['Duration', exam.data?.duration || '—'],
                  ['Questions', String(items.length)]].
                  map(([label, value]) =>
                  <div key={label} className="flex justify-between gap-3">
                        <dt className="text-ink-500">{label}</dt>
                        <dd className="text-right font-semibold text-ink-800">{value}</dd>
                      </div>
                  )}
                  </dl>
                </>
              }
            </CardBody>
          </Card>

          <BackendRequired
            feature="Publishing this paper to students"
            detail="Exam status transitions and student-facing question delivery are not exposed by the API contract. Result publishing is a separate admin action on each exam result."
            endpoint="GET /api/v1/students/exam/:examID" />
          
        </div>
      </div>

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