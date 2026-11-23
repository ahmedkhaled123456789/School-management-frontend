import { createContext, useContext } from 'react';
import type { Branding, ThemeReport } from '../../lib/branding';

export interface BrandingContextValue {
  /** what is on screen now (the saved branding, or a live preview draft) */
  branding: Branding;
  saved: Branding;
  report: ThemeReport;
  /** show a draft everywhere without saving */
  preview: (draft: Branding) => void;
  /** save (returns false if the browser storage refused, e.g. image too large) */
  save: (next: Branding) => boolean;
  /** drop the preview, back to the saved branding */
  revert: () => void;
}

export const BrandingContext = createContext<BrandingContextValue | null>(null);

export function useBranding(): BrandingContextValue {
  const value = useContext(BrandingContext);
  if (!value) throw new Error('useBranding must be used inside <BrandingProvider>');
  return value;
}
