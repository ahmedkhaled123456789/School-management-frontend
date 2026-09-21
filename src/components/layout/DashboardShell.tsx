import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOutIcon, MenuIcon, XIcon } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../hooks/auth';
import type { Role } from '../../types/common';
import { cn } from '../../utils/cn';
import { initials } from '../../utils/format';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ROLE_LABEL, type NavItem } from './navigation';

interface DashboardShellProps {
  role: Role;
  navItems: NavItem[];
}

function NavList({ items, onNavigate }: {items: NavItem[];onNavigate?: () => void;}) {
  return (
    <nav className="space-y-0.5 px-3" aria-label="Primary">
      {items.map((item) =>
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
          isActive ?
          'bg-white/10 text-white' :
          'text-primary-100/70 hover:bg-white/5 hover:text-white'
        )
        }>
        
          {({ isActive }) =>
        <>
              {isActive &&
          <motion.span
            layoutId="nav-active"
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-300"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }} />

          }
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </>
        }
        </NavLink>
      )}
    </nav>);

}

function Brand() {
  return (
    <div className="px-5 py-5">
      <Logo imageClassName="h-12" />
    </div>);

}

export function DashboardShell({ role, navItems }: DashboardShellProps) {
  const { session, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const displayName = session?.user.name || session?.user.email || ROLE_LABEL[role];

  return (
    <div className="flex min-h-full w-full bg-canvas">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-primary-800 lg:flex">
        <Brand />
        <div className="scrollbar-thin flex-1 overflow-y-auto pb-6">
          <p className="px-6 pb-2 pt-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary-300">
            {ROLE_LABEL[role]}
          </p>
          <NavList items={navItems} />
        </div>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-primary-100/80 transition-colors hover:bg-white/5 hover:text-white">
            
            <LogOutIcon className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen &&
        <div className="fixed inset-0 z-40 lg:hidden">
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
            className="relative flex h-full w-72 flex-col bg-primary-800"
            aria-label="Navigation menu">
            
              <div className="flex items-center justify-between pr-3">
                <Brand />
                <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-primary-200 hover:bg-white/10 hover:text-white">
                
                  <XIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="scrollbar-thin flex-1 overflow-y-auto pb-6">
                <NavList items={navItems} onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="border-t border-white/10 p-3">
                <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setConfirmLogout(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-primary-100/80 hover:bg-white/5 hover:text-white">
                
                  <LogOutIcon className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </div>
        }
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden">
            
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink-500">
              {ROLE_LABEL[role]} workspace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-[13px] font-bold text-ink-900">
                {displayName}
              </p>
              <p className="text-[11.5px] capitalize text-ink-500">{role}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-[13px] font-bold text-white">
              {initials(session?.user.name || session?.user.email)}
            </span>
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmLogout(true)}
              className="hidden sm:inline-flex"
              icon={<LogOutIcon className="h-3.5 w-3.5" aria-hidden="true" />}>
              
              Sign out
            </Button> */}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

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