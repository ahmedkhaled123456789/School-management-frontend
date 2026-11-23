import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightIcon,
  ClockIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayoutGridIcon,
  Loader2Icon,
  SearchIcon,
  UsersIcon,
  UsersRoundIcon,
  XIcon } from
'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { flattenNav, type NavEntry } from '../layout/navigation';
import { usePermissions } from '../../hooks/permissions';
import { useInvoices } from '../../hooks/finance';
import { useParents } from '../../hooks/parents';
import { useCurrentAcademicYear, useSections } from '../../hooks/sections';
import { useStudents } from '../../hooks/students';
import { useTeachers } from '../../hooks/teachers';
import { PERMISSIONS } from '../../lib/permissions';
import type { Role } from '../../types/common';
import { cn } from '../../utils/cn';
import { sectionLabel } from '../../utils/timetable';

interface Result {
  id: string;
  group: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: LucideIcon;
}

const RECENT_KEY = 'sms.search.recent';
const MAX_RECENT = 6;

// recents are a per-browser convenience: storage may be blocked
function loadRecent(): Result[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Array<Omit<Result, 'icon'>>).slice(0, MAX_RECENT).map((r) => ({ ...r, icon: ClockIcon })) : [];
  } catch {
    return [];
  }
}
// icons are components: store only the plain fields
const plainResult = (r: Result) => ({ id: r.id, group: r.group, title: r.title, subtitle: r.subtitle, href: r.href });

function pushRecent(result: Result) {
  try {
    const next = [plainResult(result), ...loadRecent().map(plainResult).filter((r) => r.href !== result.href)].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {

    // ignore
  }}

/** "Lev" in "Level 100" => Level 100 with "Lev" marked */
function Highlight({ text, query }: {text: string;query: string;}) {
  const index = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-accent-100 px-0.5 text-inherit">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>);

}

function useDebounced<T,>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  role: Role;
  navItems: NavEntry[];
}

export function CommandPalette({ open, onClose, role, navItems }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<Result[]>([]);
  const q = useDebounced(query.trim(), 250);
  const { can } = usePermissions();

  // what this user may search (admin portal only; other portals search their pages)
  const admin = role === 'admin';
  const allow = {
    students: admin && can(PERMISSIONS.STUDENTS_READ),
    teachers: admin && can(PERMISSIONS.TEACHERS_MANAGE),
    finance: admin && can(PERMISSIONS.FINANCE_MANAGE),
    sections: admin && can(PERMISSIONS.ACADEMICS_MANAGE)
  };
  const searching = open && q.length >= 2;
  const students = useStudents({ name: q, limit: 6 }, searching && allow.students);
  const teachers = useTeachers({ name: q, limit: 6 }, searching && allow.teachers);
  const parents = useParents(searching && allow.students);
  const invoices = useInvoices({ q, limit: 6 }, searching && allow.finance);
  const year = useCurrentAcademicYear();
  const sections = useSections(searching && allow.sections ? year.id : '');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setRecent(loadRecent());
    // focus after the open animation starts
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const pages = useMemo(() => flattenNav(navItems), [navItems]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const out: Array<{name: string;items: Result[];loading?: boolean;}> = [];
    if (!needle) {
      if (recent.length) out.push({ name: 'Recent', items: recent });
      out.push({ name: 'Go to', items: pages.slice(0, 8).map((p) => ({ id: `page-${p.to}`, group: 'Pages', title: p.label, subtitle: p.module ? `Coming soon · ${p.to}` : p.to, href: p.to, icon: p.icon })) });
      return out;
    }
    const pageHits = pages.filter((p) => p.label.toLowerCase().includes(needle)).slice(0, 6);
    if (pageHits.length) out.push({ name: 'Pages', items: pageHits.map((p) => ({ id: `page-${p.to}`, group: 'Pages', title: p.label, subtitle: p.module ? `Coming soon · ${p.to}` : p.to, href: p.to, icon: p.icon })) });
    if (needle.length < 2) return out;
    if (allow.students) {
      out.push({
        name: 'Students',
        loading: students.isFetching,
        items: (students.data?.items ?? []).map((s) => ({ id: `stu-${s._id}`, group: 'Students', title: s.name, subtitle: [s.studentId, s.email].filter(Boolean).join(' · '), href: `/admin/students/${s._id}`, icon: GraduationCapIcon }))
      });
      const parentHits = (parents.data?.items ?? []).filter((p) => `${p.name ?? ''} ${p.email ?? ''} ${p.phone ?? ''}`.toLowerCase().includes(needle)).slice(0, 5);
      out.push({
        name: 'Parents',
        loading: parents.isFetching,
        items: parentHits.map((p) => ({ id: `par-${p._id}`, group: 'Parents', title: p.name ?? 'Parent', subtitle: [p.email, p.phone].filter(Boolean).join(' · '), href: '/admin/parents', icon: UsersRoundIcon }))
      });
    }
    if (allow.teachers) {
      out.push({
        name: 'Teachers',
        loading: teachers.isFetching,
        items: (teachers.data?.items ?? []).map((t) => ({ id: `tea-${t._id}`, group: 'Teachers', title: t.name, subtitle: [t.teacherId, t.email].filter(Boolean).join(' · '), href: `/admin/teachers/${t._id}`, icon: UsersIcon }))
      });
    }
    if (allow.finance) {
      out.push({
        name: 'Invoices',
        loading: invoices.isFetching,
        items: (invoices.data?.items ?? []).map((i) => ({ id: `inv-${i._id}`, group: 'Invoices', title: i.invoiceNumber, subtitle: `${i.studentName ?? ''} · ${i.status.replace('_', ' ')}`, href: `/admin/finance/invoices/${i._id}`, icon: FileTextIcon }))
      });
    }
    if (allow.sections) {
      const hits = (sections.data ?? []).filter((s) => sectionLabel(s).toLowerCase().includes(needle)).slice(0, 5);
      out.push({
        name: 'Sections',
        loading: sections.isFetching,
        items: hits.map((s) => ({ id: `sec-${s._id}`, group: 'Sections', title: sectionLabel(s), subtitle: `${s.students.length} students · ${s.homeroomTeacher?.name ?? 'no homeroom teacher'}`, href: `/admin/academics/sections/${s._id}`, icon: LayoutGridIcon }))
      });
    }
    return out.filter((g) => g.items.length || g.loading);
  }, [query, recent, pages, allow.students, allow.teachers, allow.finance, allow.sections, students.data, students.isFetching, parents.data, parents.isFetching, teachers.data, teachers.isFetching, invoices.data, invoices.isFetching, sections.data, sections.isFetching]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const loading = groups.some((g) => g.loading) || query.trim() !== q && query.trim().length >= 2;

  useEffect(() => {
    if (active >= flat.length) setActive(Math.max(flat.length - 1, 0));
  }, [flat.length, active]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    pushRecent(result);
    onClose();
    navigate(result.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => flat.length ? (i + 1) % flat.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => flat.length ? (i - 1 + flat.length) % flat.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(flat[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let index = -1;
  const activeId = flat[active] ? `cmd-${flat[active].id}` : undefined;

  return createPortal(
    <AnimatePresence>
      {open &&
      <motion.div key="palette" className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[10vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          onKeyDown={onKeyDown}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">

            <div className="flex items-center gap-3 border-b border-ink-100 px-4">
              {loading ? <Loader2Icon className="h-5 w-5 animate-spin text-primary-600" aria-hidden="true" /> : <SearchIcon className="h-5 w-5 text-ink-400" aria-hidden="true" />}
              <input
              ref={inputRef}
              value={query}
              onChange={(e) => {setQuery(e.target.value);setActive(0);}}
              placeholder={admin ? 'Search students, teachers, parents, invoices, pages…' : 'Search pages…'}
              role="combobox"
              aria-expanded="true"
              aria-controls="cmd-results"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              dir="auto"
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 outline-none focus-visible:outline-none placeholder:text-ink-400" />

              {query &&
            <button type="button" aria-label="Clear" onClick={() => {setQuery('');inputRef.current?.focus();}} className="rounded-md p-1 text-ink-400 hover:bg-ink-100">
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </button>
            }
              <kbd className="rounded-md border border-ink-200 px-1.5 py-0.5 text-[11px] font-semibold text-ink-500">Esc</kbd>
            </div>

            <div ref={listRef} id="cmd-results" role="listbox" aria-label="Results" className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
              {groups.length === 0 ?
            <p className="px-3 py-10 text-center text-[13.5px] text-ink-500">
                  {query.trim().length < 2 ? 'Keep typing…' : <>No results for “<span dir="auto">{query.trim()}</span>”.</>}
                </p> :

            groups.map((group) =>
            <div key={group.name} role="group" aria-label={group.name} className="mb-1">
                    <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                      {group.name}
                      {group.loading && <Loader2Icon className="h-3 w-3 animate-spin" aria-hidden="true" />}
                    </p>
                    {group.items.map((item) => {
                index += 1;
                const i = index;
                const isActive = i === active;
                return (
                  <div
                    key={item.id}
                    id={`cmd-${item.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-index={i}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(item)}
                    className={cn('flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5', isActive ? 'bg-primary-50' : 'hover:bg-ink-50')}>

                          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', isActive ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-500')}>
                            <item.icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span dir="auto" className="block truncate text-[14px] font-semibold text-ink-900"><Highlight text={item.title} query={query.trim()} /></span>
                            {item.subtitle && <span dir="auto" className="block truncate text-[12px] text-ink-500"><Highlight text={item.subtitle} query={query.trim()} /></span>}
                          </span>
                          {isActive ?
                    <CornerDownLeftIcon className="h-4 w-4 shrink-0 text-primary-600" aria-hidden="true" /> :
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-300 rtl:rotate-180" aria-hidden="true" />}
                        </div>);

              })}
                  </div>
            )
            }
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-100 bg-ink-50/60 px-4 py-2 text-[11.5px] text-ink-500">
              <span><kbd className="font-sans font-semibold">↑ ↓</kbd> move</span>
              <span><kbd className="font-sans font-semibold">Enter</kbd> open</span>
              <span><kbd className="font-sans font-semibold">Esc</kbd> close</span>
              {!admin && <span className="ms-auto">Records search is available in the admin portal.</span>}
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>,
    document.body
  );
}
