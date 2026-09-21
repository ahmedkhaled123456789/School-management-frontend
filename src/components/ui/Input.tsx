import React from 'react';
import { cn } from '../../utils/cn';
import { Field, controlClasses, controlState } from './Field';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ id, label, error, hint, className, required, ...rest }: InputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(controlClasses, controlState(Boolean(error)), 'h-10', className)}
        {...rest} />
      
    </Field>);

}