import React from 'react';
import { CheckCircle2Icon, PencilIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import type { Question } from '../../types/question';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit?: () => void;
}

export function QuestionCard({ question, index, onEdit }: QuestionCardProps) {
  return (
    <article className="rounded-xl border border-ink-200/80 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-[12.5px] font-bold text-white">
            {index}
          </span>
          <h3 className="text-[14.5px] font-semibold leading-relaxed text-ink-900">
            {question.question}
          </h3>
        </div>
        {onEdit &&
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          icon={<PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />}>
          
            Edit
          </Button>
        }
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {OPTION_KEYS.map((key) => {
          const value = question[`option${key}` as keyof Question] as string | undefined;
          const isCorrect = Boolean(value) && question.correctAnswer === value;
          return (
            <li
              key={key}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]',
                isCorrect ?
                'border-success-500/40 bg-success-50 text-success-600' :
                'border-ink-200 text-ink-600'
              )}>
              
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  isCorrect ? 'bg-success-500 text-white' : 'bg-ink-100 text-ink-600'
                )}>
                
                {isCorrect ? <CheckCircle2Icon className="h-3 w-3" aria-hidden="true" /> : key}
              </span>
              <span className="truncate">{value || '—'}</span>
            </li>);

        })}
      </ul>
    </article>);

}