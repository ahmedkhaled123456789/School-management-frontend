/**
 * Color math for theming: hex <-> OKLCH, a perceptual shade ramp from one
 * brand color, and WCAG contrast. OKLCH keeps every generated shade the same
 * hue and evenly spaced in lightness, so any picked color yields a usable scale.
 */

export type Rgb = [number, number, number];

export const isHex = (value: string) => /^#([0-9a-f]{6})$/i.test(value.trim());

export function hexToRgb(hex: string): Rgb {
  const h = hex.trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

export const rgbToHex = (rgb: Rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

export function rgbToOklch([r, g, b]: Rgb): [number, number, number] {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.sqrt(A * A + B * B), Math.atan2(B, A)];
}

function oklchToLinear(L: number, C: number, h: number): Rgb {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
  -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
  -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];

}

/** OKLCH -> sRGB, reducing chroma until the color fits the sRGB gamut. */
export function oklchToRgb(L: number, C: number, h: number): Rgb {
  let chroma = C;
  for (let i = 0; i < 40; i += 1) {
    const lin = oklchToLinear(L, chroma, h);
    if (lin.every((v) => v >= -0.0001 && v <= 1.0001)) return lin.map((v) => Math.min(255, Math.max(0, fromLinear(v)))) as Rgb;
    chroma *= 0.92;
  }
  return oklchToLinear(L, 0, h).map((v) => Math.min(255, Math.max(0, fromLinear(v)))) as Rgb;
}

export function relativeLuminance(rgb: Rgb) {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Rgb, b: Rgb) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type Ramp = Record<number, Rgb>;

// target lightness per step; the anchor step takes the brand color's own lightness
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const LIGHTNESS: Record<number, number> = { 50: 0.975, 100: 0.94, 200: 0.87, 300: 0.78, 400: 0.67, 500: 0.57, 600: 0.47, 700: 0.4, 800: 0.33, 900: 0.26 };
const CHROMA_SCALE: Record<number, number> = { 50: 0.12, 100: 0.25, 200: 0.5, 300: 0.75, 400: 0.92, 500: 1, 600: 1, 700: 0.95, 800: 0.85, 900: 0.75 };

/**
 * Ten shades of one hue. `anchor` is the step the picked color becomes
 * (600 for the main brand color: buttons and the sidebar use 600–800).
 * Very light picks are darkened at the anchor so white text stays readable.
 */
export function buildRamp(hex: string, anchor = 600, { maxAnchorLightness = 0.56 } = {}): {ramp: Ramp;adjusted: boolean;} {
  const [L0, C0, h] = rgbToOklch(hexToRgb(hex));
  const anchorL = Math.min(L0, maxAnchorLightness);
  const adjusted = anchorL !== L0;
  const shift = anchorL - LIGHTNESS[anchor];
  const ramp: Ramp = {};
  STEPS.forEach((step) => {
    const isAnchor = step === anchor;
    // light steps keep their fixed targets; dark steps follow the anchor
    // (dark steps never get lighter than the anchor, e.g. a pure black pick)
    const L = isAnchor ? anchorL : step < anchor ? Math.max(LIGHTNESS[step], anchorL + 0.02) : Math.min(anchorL, Math.max(0.12, LIGHTNESS[step] + shift));
    const C = isAnchor ? C0 : C0 * CHROMA_SCALE[step];
    ramp[step] = isAnchor && !adjusted ? hexToRgb(hex) : oklchToRgb(L, C, h);
  });
  return { ramp, adjusted };
}

export const rgbVar = (rgb: Rgb) => rgb.map((v) => Math.round(v)).join(' ');
