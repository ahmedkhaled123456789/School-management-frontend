import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, LogOutIcon, PaletteIcon, UserCogIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../utils/cn';

interface UserMenuProps {
  name: string;
  roleLabel: string;
  image?: string;
  profileHref: string;
  /** shown only to roles that may edit the branding */
  brandingHref?: string;
  onSignOut: () => void;
}

/** Avatar button with a small menu: profile, branding, sign out. Keyboard friendly. */
export function UserMenu({ name, roleLabel, image, profileHref, brandingHref, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // focus the first item for keyboard users
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-[13.5px] font-semibold text-ink-700 hover:bg-ink-50 focus-visible:bg-ink-50';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl py-1 pe-2 ps-1 transition-colors hover:bg-ink-100">

        <Avatar image={image} name={name} size="md" />
        <span className="hidden text-start sm:block">
          <span dir="auto" className="block max-w-[160px] truncate text-[13px] font-bold leading-tight text-ink-900">{name}</span>
          <span className="block text-[11.5px] capitalize leading-tight text-ink-500">{roleLabel}</span>
        </span>
        <ChevronDownIcon className={cn('hidden h-4 w-4 text-ink-400 transition-transform sm:block', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          key="menu"
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className="absolute end-0 top-full z-40 mt-2 w-60 origin-top-right rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop">

            <div className="border-b border-ink-100 px-3 pb-2.5 pt-1.5">
              <p dir="auto" className="truncate text-[13.5px] font-bold text-ink-900">{name}</p>
              <p className="text-[12px] capitalize text-ink-500">{roleLabel}</p>
            </div>
            <div className="py-1">
              <Link role="menuitem" to={profileHref} onClick={() => setOpen(false)} className={item}>
                <UserCogIcon className="h-4 w-4 text-ink-400" aria-hidden="true" />My profile
              </Link>
              {brandingHref &&
            <Link role="menuitem" to={brandingHref} onClick={() => setOpen(false)} className={item}>
                  <PaletteIcon className="h-4 w-4 text-ink-400" aria-hidden="true" />Branding
                </Link>
            }
            </div>
            <div className="border-t border-ink-100 pt-1">
              <button role="menuitem" type="button" onClick={() => {setOpen(false);onSignOut();}} className={cn(item, 'text-danger-600')}>
                <LogOutIcon className="h-4 w-4" aria-hidden="true" />Sign out
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}
