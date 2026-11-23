import { useBranding } from '../../hooks/branding';
import { DEFAULT_LOGO } from '../../lib/branding';
import { cn } from '../../utils/cn';

interface LogoProps {
  /** the surface the logo sits on */
  surface?: 'dark' | 'light';
  className?: string;
  imageClassName?: string;
}

/**
 * The school logo from Branding (or the default one). The default artwork is
 * light-on-dark: on a light surface it gets a dark plate so it stays visible.
 * An uploaded logo is shown as-is.
 */
export function Logo({ surface = 'dark', className, imageClassName }: LogoProps) {
  const { branding } = useBranding();
  const custom = Boolean(branding.logo);
  const image =
  <img
    src={branding.logo || DEFAULT_LOGO}
    alt={branding.appName}
    className={cn('h-14 w-auto max-w-full object-contain', imageClassName)} />;


  if (surface === 'light' && !custom) {
    return <span className={cn('inline-flex items-center rounded-xl bg-primary-800 px-3 py-2', className)}>{image}</span>;
  }
  return <span className={cn('inline-flex items-center', className)}>{image}</span>;
}
