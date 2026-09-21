import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { cn } from '../../utils/cn';
import type { OptionKey, StudentQuestion } from '../../types/question';
import type { Exam } from '../../types/exam';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

function minutesFromDuration(duration?: string): number {
  const match = duration?.match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 30;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface ExamRunnerViewProps {
  exam: Exam;
  questions: StudentQuestion[];
  subjectLabel: string;
  isSubmitting: boolean;
  onSubmit: (answers: string[]) => void;
  onExit: () => void;
}

/**
 * Distraction-free exam interface. It only ever receives question text and options —
 * the correct answer never reaches this component.
 */
export function ExamRunnerView({
  exam,
  questions,
  subjectLabel,
  isSubmitting,
  onSubmit,
  onExit
}: ExamRunnerViewProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => minutesFromDuration(exam.duration) * 60);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => previous > 0 ? previous - 1 : 0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question._id]).length,
    [questions, answers]
  );
  const allAnswered = answeredCount === questions.length && questions.length > 0;
  const question = questions[current];
  const progress = questions.length > 0 ? answeredCount / questions.length * 100 : 0;

  const handleSubmit = () => {
    // The backend requires exactly one answer per question, in order.
    onSubmit(questions.map((item) => answers[item._id]));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-extrabold text-ink-900">{exam.name}</h1>
            <p className="truncate text-[12.5px] text-ink-500">
              {subjectLabel} · {questions.length} question{questions.length === 1 ? '' : 's'}
            </p>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[14px] font-semibold tabular-nums',
              secondsLeft <= 60 ? 'bg-danger-50 text-danger-600' : 'bg-ink-100 text-ink-700'
            )}
            role="timer"
            aria-live="off">
            
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {formatClock(secondsLeft)}
          </div>
          <Button variant="ghost" size="sm" onClick={onExit} disabled={isSubmitting}>
            Exit
          </Button>
        </div>
        <div className="h-1 w-full bg-ink-100">
          <motion.div
            className="h-full bg-primary-600"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
          
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">
          Question {current + 1} of {questions.length} · {answeredCount} answered
        </p>

        <AnimatePresence mode="wait">
          <motion.section
            key={question?._id ?? current}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.16 }}
            className="rounded-xl border border-ink-200/80 bg-white p-5 shadow-card sm:p-7"
            aria-live="polite">
            
            <h2 className="text-[16px] font-semibold leading-relaxed text-ink-900 sm:text-[17px]">
              {question?.question}
            </h2>

            <fieldset className="mt-5 space-y-2.5">
              <legend className="sr-only">Answer options</legend>
              {OPTION_KEYS.map((key) => {
                const value = question?.[`option${key}` as keyof StudentQuestion] as string;
                const isSelected = answers[question?._id ?? ''] === key;
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-[14px] transition-colors',
                      isSelected ?
                      'border-primary-500 bg-primary-50 text-ink-900' :
                      'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50'
                    )}>
                    
                    <input
                      type="radio"
                      name={`question-${question?._id}`}
                      className="sr-only"
                      checked={isSelected}
                      onChange={() =>
                      setAnswers((prev) => ({ ...prev, [question._id]: key }))
                      } />
                    
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold',
                        isSelected ?
                        'border-primary-600 bg-primary-600 text-white' :
                        'border-ink-300 text-ink-500'
                      )}>
                      
                      {key}
                    </span>
                    <span className="font-medium">{value}</span>
                  </label>);

              })}
            </fieldset>
          </motion.section>
        </AnimatePresence>

        <nav aria-label="Question navigation" className="mt-6">
          <p className="mb-2 text-[12.5px] font-semibold text-ink-500">Jump to question</p>
          <ol className="flex flex-wrap gap-2">
            {questions.map((item, index) => {
              const isAnswered = Boolean(answers[item._id]);
              const isCurrent = index === current;
              return (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => setCurrent(index)}
                    aria-current={isCurrent ? 'true' : undefined}
                    aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}`}
                    className={cn(
                      'h-9 w-9 rounded-lg border text-[13px] font-bold transition-colors',
                      isCurrent ?
                      'border-primary-600 bg-primary-600 text-white' :
                      isAnswered ?
                      'border-success-500/40 bg-success-50 text-success-600' :
                      'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
                    )}>
                    
                    {index + 1}
                  </button>
                </li>);

            })}
          </ol>
        </nav>
      </main>

      <footer className="sticky bottom-0 border-t border-ink-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="secondary"
            disabled={current === 0 || isSubmitting}
            onClick={() => setCurrent((prev) => Math.max(0, prev - 1))}
            icon={<ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />}>
            
            Previous
          </Button>
          <p className="order-last w-full text-center text-[12.5px] text-ink-500 sm:order-none sm:w-auto">
            {questions.length - answeredCount === 0 ?
            'All questions answered' :
            `${questions.length - answeredCount} unanswered`}
          </p>
          {current === questions.length - 1 ?
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!allAnswered || isSubmitting}
            isLoading={isSubmitting}
            title={allAnswered ? undefined : 'Answer every question before submitting.'}>
            
              Submit exam
            </Button> :

          <Button
            disabled={isSubmitting}
            onClick={() => setCurrent((prev) => Math.min(questions.length - 1, prev + 1))}>
            
              Next
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
        </div>
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit your exam?"
        confirmLabel="Submit exam"
        isLoading={isSubmitting}
        message={`You have answered all ${questions.length} questions. Once submitted you cannot change your answers.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleSubmit();
        }} />
      
    </div>);

}