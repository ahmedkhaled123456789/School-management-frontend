import React from 'react';
import { cn } from '../../utils/cn';
import { Field, controlClasses, controlState } from './Field';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  id,
  label,
  error,
  hint,
  className,
  rows = 4,
  required,
  ...rest
}: TextareaProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(controlClasses, controlState(Boolean(error)), 'py-2 leading-relaxed', className)}
        {...rest} />
      
    </Field>);

}