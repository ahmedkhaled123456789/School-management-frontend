import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, LogOutIcon, MenuIcon, XIcon } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/auth';
import type { Role } from '../../types/common';
import { cn } from '../../utils/cn';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  ROLE_LABEL,
  filterNav,
  isNavGroup,
  type NavEntry,
  type NavGroup,
  type NavItem } from
'./navigation';
import { usePermissions } from '../../hooks/permissions';
import { useBranding } from '../../hooks/branding';
import { PERMISSIONS } from '../../lib/permissions';
import { CommandPalette } from '../search/CommandPalette';
import { SearchTrigger } from '../search/SearchTrigger';
import { NotificationBell } from '../communication/NotificationBell';
import { UserMenu } from './UserMenu';
import { STAFF_ROLE_LABEL, type StaffRole } from '../../lib/permissions';

interface DashboardShellProps {
  role: Role;
  navItems: NavEntry[];
}

const OPEN_SECTIONS_KEY = 'sms.nav.open';

// remembered open sections are a per-browser convenience; storage may be blocked
function loadOpenSections(): string[] {
  try {
    const raw = window.localStorage.getItem(OPEN_SECTIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveOpenSections(ids: string[]) {
  try {
    window.localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(ids));
  } catch {

    // ignore: the sidebar still works, it just will not remember
  }}

/**
 * The sliding "current page" marker (a shared layoutId) is desktop only:
 * inside the mobile drawer it kept AnimatePresence from ever unmounting the
 * closed drawer, leaving an invisible overlay that blocked every tap.
 */
const AnimatedMarkerContext = createContext(true);

const isUnder = (pathname: string, item: NavItem) =>
item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

function NavLinkItem({
  item,
  onNavigate,
  nested




}: {item: NavItem;onNavigate?: () => void;nested?: boolean;}) {
  const animateMarker = useContext(AnimatedMarkerContext);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
      cn(
        'group relative flex items-center gap-3 rounded-lg px-3 font-semibold transition-colors',
        nested ? 'py-2 text-[13px]' : 'py-2.5 text-[13.5px]',
        isActive ? 'sb-item-active' : 'sb-item'
      )
      }>

      {({ isActive }) =>
      <>
          {isActive && (
        animateMarker ?
        <motion.span
          layoutId="nav-active"
          className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-accent-300"
          transition={{ type: 'spring', stiffness: 500, damping: 38 }} /> :

        <span className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-accent-300" />)

        }
          <item.icon className={cn('shrink-0', nested ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.module &&
        <span className="sb-soon shrink-0 rounded-full px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide">Soon</span>
        }
        </>
      }
    </NavLink>);

}

function NavSection({
  group,
  open,
  containsActive,
  onToggle,
  onNavigate






}: {group: NavGroup;open: boolean;containsActive: boolean;onToggle: () => void;onNavigate?: () => void;}) {
  const panelId = `nav-section-${group.id}`;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'sb-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-[13.5px] font-semibold transition-colors',
          containsActive && '!text-[color:var(--sb-text)]'
        )}>

        <group.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        {containsActive && !open &&
        <span className="h-1.5 w-1.5 rounded-full bg-accent-300" aria-hidden="true" />
        }
        <ChevronDownIcon
          className={cn('h-4 w-4 shrink-0 opacity-70 transition-transform duration-200', open && 'rotate-180')}
          aria-hidden="true" />

      </button>
      <AnimatePresence initial={false}>
        {open &&
        <motion.div
          id={panelId}
          key="panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="overflow-hidden">

            <div className="sb-border ms-5 mt-0.5 space-y-0.5 border-s ps-2 pb-1">
              {group.children.map((item) =>
            <NavLinkItem key={item.to} item={item} onNavigate={onNavigate} nested />
            )}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}

function NavList({
  items,
  onNavigate,
  scope




}: {items: NavEntry[];onNavigate?: () => void;scope: 'desktop' | 'mobile';}) {
  const { pathname } = useLocation();
  const [openIds, setOpenIds] = useState<string[]>(loadOpenSections);

  const activeGroupId = useMemo(() => {
    const group = items.find(
      (entry): entry is NavGroup =>
      isNavGroup(entry) && entry.children.some((item) => isUnder(pathname, item))
    );
    return group?.id;
  }, [items, pathname]);

  // the section holding the current page always opens
  useEffect(() => {
    if (activeGroupId && !openIds.includes(activeGroupId)) {
      setOpenIds((prev) => [...prev, activeGroupId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  useEffect(() => saveOpenSections(openIds), [openIds]);

  const toggle = (id: string) =>
  setOpenIds((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);

  return (
    <AnimatedMarkerContext.Provider value={scope === 'desktop'}>
    <nav className="space-y-0.5 px-3" aria-label="Primary">
      {items.map((entry) =>
      isNavGroup(entry) ?
      <NavSection
        key={entry.id}
        group={entry}
        open={openIds.includes(entry.id)}
        containsActive={entry.id === activeGroupId}
        onToggle={() => toggle(entry.id)}
        onNavigate={onNavigate} /> :


      <NavLinkItem key={entry.to} item={entry} onNavigate={onNavigate} />

      )}
    </nav>
    </AnimatedMarkerContext.Provider>);

}

function Brand() {
  const { branding } = useBranding();
  return (
    <div className="px-5 pb-4 pt-5">
      <Logo surface={branding.sidebar === 'light' ? 'light' : 'dark'} imageClassName="h-14" />
      <p dir="auto" className="mt-2.5 truncate text-[13.5px] font-bold leading-tight" title={branding.appName}>{branding.appName}</p>
      {branding.tagline && <p dir="auto" className="sb-label truncate text-[11.5px]">{branding.tagline}</p>}
    </div>);

}

export function DashboardShell({ role, navItems }: DashboardShellProps) {
  const { session, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  // Ctrl/Cmd + K anywhere, "/" when not typing: open search
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' || event.key === '/' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const displayName = session?.user.name || session?.user.email || ROLE_LABEL[role];
  const { can, staffRole } = usePermissions();
  // admin portal: only show the sections this user may use
  const visibleItems = useMemo(() => filterNav(navItems, can), [navItems, can]);
  const roleLabel = staffRole ? STAFF_ROLE_LABEL[staffRole as StaffRole] ?? staffRole : role;

  return (
    <div className="flex min-h-full w-full bg-canvas">
      {/* Desktop sidebar */}
      <aside className="sb sb-border sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e lg:flex print:hidden">
        <Brand />
        <div className="scrollbar-thin flex-1 overflow-y-auto pb-6">
          <p className="sb-label px-6 pb-2 pt-1 text-[10.5px] font-bold uppercase tracking-[0.14em]">
            {ROLE_LABEL[role]}
          </p>
          <NavList items={visibleItems} scope="desktop" />
        </div>
        <div className="sb-border border-t p-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="sb-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors">
            
            <LogOutIcon className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen &&
        // keyed motion child so AnimatePresence tracks the drawer's exit
        <motion.div
          key="mobile-nav"
          className="fixed inset-0 z-40 lg:hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1, transition: { duration: 0.25 } }}>
            <motion.div
            className="absolute inset-0 bg-ink-900/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)} />
          
            <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            className="sb relative flex h-full w-72 flex-col"
            aria-label="Navigation menu">
            
              <div className="flex items-center justify-between pe-3">
                <Brand />
                <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="sb-item rounded-lg p-2">
                
                  <XIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto pb-6">
                <NavList items={visibleItems} onNavigate={() => setMobileOpen(false)} scope="mobile" />
              </div>
              <div className="sb-border border-t p-3">
                <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setConfirmLogout(true);
                }}
                className="sb-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold">
                
                  <LogOutIcon className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </motion.div>
        }
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden">
            
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <SearchTrigger onOpen={() => setSearchOpen(true)} />
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <UserMenu
              name={displayName}
              roleLabel={roleLabel}
              image={session?.user.image}
              profileHref={`/${role}/profile`}
              brandingHref={role === 'admin' && can(PERMISSIONS.SETTINGS_MANAGE) ? '/admin/branding' : undefined}
              onSignOut={() => setConfirmLogout(true)} />
            
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} role={role} navItems={visibleItems} />

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        message="You will be returned to the sign-in screen and all cached data will be cleared from this device."
        confirmLabel="Sign out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          signOut();
        }} />
      
    </div>);

}