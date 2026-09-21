import React from 'react';
import { cn } from '../../utils/cn';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink-700">
        {label}
        {required && <span className="ml-1 text-danger-500">*</span>}
      </label>
      {children}
      {error ?
      <p id={`${id}-error`} role="alert" className="text-[12.5px] font-medium text-danger-500">
          {error}
        </p> :
      hint ?
      <p className="text-[12.5px] text-ink-500">{hint}</p> :
      null}
    </div>);

}

export const controlClasses =
'w-full rounded-lg border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500';

export function controlState(hasError?: boolean): string {
  return hasError ?
  'border-danger-500 focus:border-danger-500' :
  'border-ink-200 hover:border-ink-300 focus:border-primary-500';
}