import React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Field, controlClasses, controlState } from './Field';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

export function Select({
  id,
  label,
  options,
  error,
  hint,
  placeholder = 'Select an option',
  className,
  required,
  ...rest
}: SelectProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            controlClasses,
            controlState(Boolean(error)),
            'h-10 appearance-none pr-9',
            className
          )}
          {...rest}>
          
          <option value="">{placeholder}</option>
          {options.map((option) =>
          <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true" />
        
      </div>
    </Field>);

}