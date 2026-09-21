import React, { useEffect, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../utils/cn';
import type { OptionKey, Question, QuestionPayload } from '../../types/question';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

const EMPTY: QuestionPayload = {
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctAnswer: ''
};

type FieldErrors = Partial<Record<keyof QuestionPayload, string>>;

interface QuestionEditorProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: QuestionPayload) => Promise<unknown>;
  isSaving: boolean;
  initial?: Question | null;
  index?: number;
}

/** Reusable editor for a four-option multiple-choice question. Teacher/admin only. */
export function QuestionEditor({
  open,
  onClose,
  onSubmit,
  isSaving,
  initial,
  index
}: QuestionEditorProps) {
  const [values, setValues] = useState<QuestionPayload>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues(
      initial ?
      {
        question: initial.question ?? '',
        optionA: initial.optionA ?? '',
        optionB: initial.optionB ?? '',
        optionC: initial.optionC ?? '',
        optionD: initial.optionD ?? '',
        correctAnswer: initial.correctAnswer ?? ''
      } :
      EMPTY
    );
  }, [open, initial]);

  const optionValue = (key: OptionKey) => values[`option${key}` as keyof QuestionPayload] as string;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (!values.question.trim()) nextErrors.question = 'Question text is required.';
    OPTION_KEYS.forEach((key) => {
      if (!optionValue(key).trim()) {
        nextErrors[`option${key}` as keyof QuestionPayload] = `Option ${key} is required.`;
      }
    });
    if (!values.correctAnswer.trim()) nextErrors.correctAnswer = 'Select the correct answer.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onSubmit({
        question: values.question.trim(),
        optionA: values.optionA.trim(),
        optionB: values.optionB.trim(),
        optionC: values.optionC.trim(),
        optionD: values.optionD.trim(),
        correctAnswer: values.correctAnswer.trim()
      });
      onClose();
    } catch {

      // Toast handled upstream.
    }};

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? `Edit question ${index ? `#${index}` : ''}` : 'Add question'}
      description="Four options, one correct answer. The correct answer is never sent to students."
      footer={
      <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="question-form" isLoading={isSaving}>
            {initial ? 'Save question' : 'Add question'}
          </Button>
        </>
      }>
      
      <form id="question-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <Textarea
          id="question"
          label="Question"
          required
          rows={3}
          value={values.question}
          error={errors.question}
          placeholder="What is the capital of…"
          onChange={(event) => setValues((prev) => ({ ...prev, question: event.target.value }))} />
        

        <div className="grid gap-4 sm:grid-cols-2">
          {OPTION_KEYS.map((key) =>
          <Input
            key={key}
            id={`option-${key}`}
            label={`Option ${key}`}
            required
            value={optionValue(key)}
            error={errors[`option${key}` as keyof QuestionPayload]}
            onChange={(event) =>
            setValues((prev) => ({ ...prev, [`option${key}`]: event.target.value }))
            } />

          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink-700">
            Correct answer <span className="text-danger-500">*</span>
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {OPTION_KEYS.map((key) => {
              const value = optionValue(key);
              const isSelected = values.correctAnswer === value && value !== '';
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!value}
                  onClick={() => setValues((prev) => ({ ...prev, correctAnswer: value }))}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    isSelected ?
                    'border-success-500 bg-success-50 text-success-600' :
                    'border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50'
                  )}>
                  
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
                      isSelected ?
                      'border-success-500 bg-success-500 text-white' :
                      'border-ink-300 text-ink-500'
                    )}>
                    
                    {isSelected ? <CheckIcon className="h-3 w-3" aria-hidden="true" /> : key}
                  </span>
                  <span className="truncate">{value || `Fill option ${key}`}</span>
                </button>);

            })}
          </div>
          {errors.correctAnswer &&
          <p role="alert" className="mt-2 text-[12.5px] font-medium text-danger-500">
              {errors.correctAnswer}
            </p>
          }
        </fieldset>
      </form>
    </Modal>);

}