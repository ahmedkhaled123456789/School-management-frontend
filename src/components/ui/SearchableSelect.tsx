import React, { useEffect, useMemo, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Field, controlClasses, controlState } from './Field';

export interface SearchableOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  id: string;
  label: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  /** When given, filtering happens on the server (debounced); otherwise options are filtered locally. */
  onSearchChange?: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 50;

/** Accessible combobox: type to search, arrows to move, Enter to pick, Escape to close. */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  onSearchChange,
  isLoading,
  placeholder = 'Type to search…',
  emptyMessage = 'No matches found',
  hint,
  error,
  disabled
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState('');
  const listId = `${id}-listbox`;

  // parent cleared the value (e.g. after a successful link)
  useEffect(() => {
    if (!value) setSelectedLabel('');
  }, [value]);

  useEffect(() => {
    if (!onSearchChange) return undefined;
    const timer = window.setTimeout(() => onSearchChange(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query, onSearchChange]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list =
    onSearchChange || !needle ?
    options :
    options.filter((option) =>
    `${option.label} ${option.description ?? ''}`.toLowerCase().includes(needle)
    );
    return list.slice(0, MAX_VISIBLE);
  }, [options, query, onSearchChange]);

  useEffect(() => {
    setActive(0);
  }, [query, options]);

  const pick = (option: SearchableOption) => {
    onChange(option.value);
    setSelectedLabel(option.label);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((prev) => Math.min(prev + 1, Math.max(visible.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (visible[active]) pick(visible[active]);
    } else if (event.key === 'Escape' && open) {
      // keep a surrounding modal open, only close the list
      event.stopPropagation();
      setOpen(false);
    }
  };

  const activeId = open && visible[active] ? `${id}-option-${active}` : undefined;

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true" />

        <input
          id={id}
          type="text"
          role="combobox"
          dir="auto"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          placeholder={selectedLabel || placeholder}
          value={open ? query : selectedLabel}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={cn(controlClasses, controlState(Boolean(error)), 'h-10 ps-9 pe-9')} />

        {value && !disabled &&
        <button
          type="button"
          aria-label="Clear selection"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange('');
            setSelectedLabel('');
            setQuery('');
          }}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600">

            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        }

        {open &&
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="scrollbar-thin absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink-200 bg-white py-1 shadow-pop">

            {isLoading ?
          <li className="px-3 py-2 text-[13px] text-ink-500">Loading…</li> :
          visible.length === 0 ?
          <li className="px-3 py-2 text-[13px] text-ink-500">{emptyMessage}</li> :

          visible.map((option, index) =>
          <li
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={option.value === value}
            // mousedown fires before the input blur closes the list
            onMouseDown={(event) => {
              event.preventDefault();
              pick(option);
            }}
            onMouseEnter={() => setActive(index)}
            className={cn(
              'cursor-pointer px-3 py-2 text-start',
              index === active ? 'bg-primary-50' : 'bg-white',
              option.value === value && 'font-semibold'
            )}>

                  <p dir="auto" className="truncate text-[13.5px] text-ink-900">{option.label}</p>
                  {option.description &&
            <p dir="auto" className="truncate text-[12px] text-ink-500">{option.description}</p>
            }
                </li>
          )
          }
          </ul>
        }
      </div>
    </Field>);

}
