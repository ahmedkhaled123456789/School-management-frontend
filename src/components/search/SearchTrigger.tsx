import { SearchIcon } from 'lucide-react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Looks like a search field; opens the command palette (also Ctrl/⌘+K or "/"). */
export function SearchTrigger({ onOpen }: {onOpen: () => void;}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search (Ctrl+K)"
      className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-ink-200 bg-ink-50/70 px-3 text-start text-[13.5px] text-ink-400 transition-colors hover:border-ink-300 hover:bg-white sm:max-w-md">

      <SearchIcon className="h-4 w-4 shrink-0 text-ink-400 group-hover:text-primary-600" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">
        <span className="sm:hidden">Search…</span>
        <span className="hidden sm:inline">Search students, teachers, invoices, pages…</span>
      </span>
      <kbd className="hidden shrink-0 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-500 sm:inline">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
    </button>);

}
