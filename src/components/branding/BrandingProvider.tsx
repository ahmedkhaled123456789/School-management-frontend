import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BrandingContext } from '../../hooks/branding';
import { BRANDING_STORAGE_KEY, applyBranding, loadBranding, saveBranding, type Branding, type ThemeReport } from '../../lib/branding';

/** Holds the school branding and keeps the document themed with it. */
export function BrandingProvider({ children }: {children: React.ReactNode;}) {
  const [saved, setSaved] = useState<Branding>(loadBranding);
  const [draft, setDraft] = useState<Branding | null>(null);
  const branding = draft ?? saved;
  const [report, setReport] = useState<ThemeReport>(() => applyBranding(branding));

  useEffect(() => {
    setReport(applyBranding(branding));
  }, [branding]);

  // another tab saved a new branding
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === BRANDING_STORAGE_KEY) setSaved(loadBranding());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const preview = useCallback((next: Branding) => setDraft(next), []);
  const revert = useCallback(() => setDraft(null), []);
  const save = useCallback((next: Branding) => {
    if (!saveBranding(next)) return false;
    setSaved(next);
    setDraft(null);
    return true;
  }, []);

  const value = useMemo(() => ({ branding, saved, report, preview, save, revert }), [branding, saved, report, preview, save, revert]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
