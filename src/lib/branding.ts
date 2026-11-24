/**
 * School branding: logo, names, colors, sidebar style, corners, font and the
 * login background. Applied as CSS variables on <html>, so the whole app
 * (Tailwind primary-* / accent-* classes included) re-themes instantly.
 *
 * Stored per browser for now (frontend-only phase); the shape is ready to
 * move into the school settings on the backend.
 */
import { buildRamp, contrastRatio, hexToRgb, isHex, rgbToHex, rgbVar } from './color';

export type SidebarStyle = 'brand' | 'dark' | 'light';
export type Corners = 'sharp' | 'soft' | 'round';
export type FontChoice = 'jakarta' | 'inter' | 'cairo' | 'tajawal';

export interface Branding {
  version: 1;
  /** shown in the sidebar, the login page and the browser tab */
  appName: string;
  /** subtitle under the name, e.g. "School management" */
  tagline: string;
  /** data URL; empty = the default logo */
  logo: string;
  /** data URL; empty = the default photo */
  loginBackground: string;
  primary: string;
  accent: string;
  sidebar: SidebarStyle;
  corners: Corners;
  font: FontChoice;
}

export const DEFAULT_LOGO = '/logo.png';
export const DEFAULT_LOGIN_BACKGROUND = '/d74597ec-d7b0-43b2-85b3-78807e6ec9f3.jpg';

export const DEFAULT_BRANDING: Branding = {
  version: 1,
  appName: 'Al Shorouk American School',
  tagline: 'School management',
  logo: '',
  loginBackground: '',
  primary: '#1b4965',
  accent: '#e2a03f',
  sidebar: 'brand',
  corners: 'soft',
  font: 'jakarta'
};

export interface BrandPreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

/** Curated pairs: every primary keeps white text readable (>= 4.5:1). */
export const PRESETS: BrandPreset[] = [
{ id: 'ocean', name: 'Ocean (default)', primary: '#1b4965', accent: '#e2a03f' },
{ id: 'royal', name: 'Royal', primary: '#3730a3', accent: '#f59e0b' },
{ id: 'emerald', name: 'Emerald', primary: '#065f46', accent: '#fbbf24' },
{ id: 'crimson', name: 'Crimson', primary: '#9f1239', accent: '#fb923c' },
{ id: 'slate', name: 'Graphite', primary: '#334155', accent: '#38bdf8' },
{ id: 'teal', name: 'Teal', primary: '#0f766e', accent: '#f472b6' },
{ id: 'plum', name: 'Plum', primary: '#6b21a8', accent: '#facc15' },
{ id: 'sky', name: 'Sky', primary: '#0369a1', accent: '#a3e635' }];


export const FONTS: Record<FontChoice, {label: string;family: string;google?: string;note?: string;}> = {
  jakarta: { label: 'Plus Jakarta Sans', family: '"Plus Jakarta Sans"' },
  inter: { label: 'Inter', family: '"Inter"', google: 'Inter:wght@400;500;600;700;800' },
  cairo: { label: 'Cairo', family: '"Cairo"', google: 'Cairo:wght@400;500;600;700;800', note: 'Arabic + Latin' },
  tajawal: { label: 'Tajawal', family: '"Tajawal"', google: 'Tajawal:wght@400;500;700;800', note: 'Arabic + Latin' }
};

const CORNERS: Record<Corners, {lg: string;xl: string;xxl: string;}> = {
  sharp: { lg: '0.25rem', xl: '0.375rem', xxl: '0.5rem' },
  soft: { lg: '0.5rem', xl: '0.75rem', xxl: '1rem' },
  round: { lg: '0.75rem', xl: '1.125rem', xxl: '1.5rem' }
};

const STORAGE_KEY = 'sms.branding.v1';

/** Fills missing / invalid fields with defaults (old or hand-edited data). */
export function normalizeBranding(value: unknown): Branding {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Branding>;
  const text = (s: unknown, fallback: string, max: number) => typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : fallback;
  const image = (s: unknown) => typeof s === 'string' && /^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(s) ? s : '';
  return {
    version: 1,
    appName: text(v.appName, DEFAULT_BRANDING.appName, 60),
    tagline: typeof v.tagline === 'string' ? v.tagline.slice(0, 60) : DEFAULT_BRANDING.tagline,
    logo: image(v.logo),
    loginBackground: image(v.loginBackground),
    primary: typeof v.primary === 'string' && isHex(v.primary) ? v.primary.toLowerCase() : DEFAULT_BRANDING.primary,
    accent: typeof v.accent === 'string' && isHex(v.accent) ? v.accent.toLowerCase() : DEFAULT_BRANDING.accent,
    sidebar: (['brand', 'dark', 'light'] as const).includes(v.sidebar as SidebarStyle) ? v.sidebar as SidebarStyle : DEFAULT_BRANDING.sidebar,
    corners: (['sharp', 'soft', 'round'] as const).includes(v.corners as Corners) ? v.corners as Corners : DEFAULT_BRANDING.corners,
    font: v.font && v.font in FONTS ? v.font : DEFAULT_BRANDING.font
  };
}

export function loadBranding(): Branding {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeBranding(JSON.parse(raw)) : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

/** Returns false when the browser refused (e.g. a very large image over the quota). */
export function saveBranding(branding: Branding): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    return true;
  } catch {
    return false;
  }
}

export const BRANDING_STORAGE_KEY = STORAGE_KEY;

/** What the color engine did with the picked colors (shown on the branding page). */
export interface ThemeReport {
  primaryAdjusted: boolean;
  /** white text on primary-600 */
  buttonContrast: number;
}

function loadFont(font: FontChoice) {
  const spec = FONTS[font].google;
  if (!spec) return;
  const id = `brand-font-${font}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
}

/** Applies a branding to the document: CSS variables, font, title and favicon. */
export function applyBranding(branding: Branding): ThemeReport {
  const root = document.documentElement;
  const primary = buildRamp(branding.primary, 600);
  // the accent is a highlight (marker, accent buttons with dark text): anchor it at 300
  const accent = buildRamp(branding.accent, 300, { maxAnchorLightness: 0.86 });

  // default colors: keep the hand-tuned original palette from index.css exactly
  Object.entries(primary.ramp).forEach(([step, rgb]) =>
  branding.primary === DEFAULT_BRANDING.primary ?
  root.style.removeProperty(`--primary-${step}`) :
  root.style.setProperty(`--primary-${step}`, rgbVar(rgb))
  );
  [50, 100, 200, 300, 400, 500].forEach((step) =>
  branding.accent === DEFAULT_BRANDING.accent ?
  root.style.removeProperty(`--accent-${step}`) :
  root.style.setProperty(`--accent-${step}`, rgbVar(accent.ramp[step]))
  );

  const corners = CORNERS[branding.corners];
  root.style.setProperty('--radius-lg', corners.lg);
  root.style.setProperty('--radius-xl', corners.xl);
  root.style.setProperty('--radius-2xl', corners.xxl);

  loadFont(branding.font);
  root.style.setProperty('--font-sans', `${FONTS[branding.font].family}, system-ui, -apple-system, "Segoe UI", sans-serif`);
  root.dataset.sidebar = branding.sidebar;

  document.title = branding.appName;
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  icon.href = branding.logo || DEFAULT_LOGO;

  return {
    primaryAdjusted: primary.adjusted,
    buttonContrast: Math.round(contrastRatio(primary.ramp[600], [255, 255, 255]) * 10) / 10
  };
}

/** The exact anchor shades in use (for the branding page swatches). */
export function previewRamp(hex: string, anchor = 600) {
  return Object.entries(buildRamp(hex, anchor).ramp).map(([step, rgb]) => ({ step: Number(step), hex: rgbToHex(rgb) }));
}

export const hexRgb = hexToRgb;
