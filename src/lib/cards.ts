/**
 * Canvas drawings for printable documents: ID cards (CR80, 85.6 × 54 mm at
 * 300 dpi) and certificates (A4 landscape at ~170 dpi). Everything comes from
 * the Branding settings: logo, school name, main / accent colors and font.
 */
import qrcode from 'qrcode-generator';
import { DEFAULT_LOGO, FONTS, loadBranding } from './branding';
import type { Certificate } from '../types/certificates';
import { formatDay } from '../utils/attendance';

export interface CardTheme {
  schoolName: string;
  tagline: string;
  logo: string;
  primary: string;
  accent: string;
  font: string;
}

export function currentTheme(): CardTheme {
  const b = loadBranding();
  return { schoolName: b.appName, tagline: b.tagline, logo: b.logo || DEFAULT_LOGO, primary: b.primary, accent: b.accent, font: FONTS[b.font].family };
}

/** Same-origin / data URLs only, so the canvas stays exportable; null when it fails. */
export function loadImage(src?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 4000);
    img.onload = () => {window.clearTimeout(timer);resolve(img);};
    img.onerror = () => {window.clearTimeout(timer);resolve(null);};
    img.src = src;
  });
}

async function ensureFont(family: string) {
  try {
    await Promise.all([document.fonts.load(`700 40px ${family}`), document.fonts.load(`400 40px ${family}`)]);
  } catch {

    // fall back to the system font
  }}

const isRtl = (text: string) => /[֐-ࣿ]/.test(text);

/** Draws text shrinking the size until it fits `maxWidth`. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, size: number, weight: number, family: string, min = 14) {
  let s = size;
  ctx.direction = isRtl(text) ? 'rtl' : 'ltr';
  do {
    ctx.font = `${weight} ${s}px ${family}, system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 2;
  } while (s > min);
  ctx.fillText(text, x, y, maxWidth);
  ctx.direction = 'ltr';
}

function drawQr(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, dark = '#0f1b2b') {
  const qr = qrcode(0, 'M');
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const cell = size / (n + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (qr.isDark(r, c)) ctx.fillRect(x + (c + 1) * cell, y + (r + 1) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* --------------------------------- ID card --------------------------------- */

export interface IdCardData {
  name: string;
  /** student / staff code: printed and encoded in the QR */
  code: string;
  role: 'Student' | 'Teacher' | 'Staff';
  /** "Level 100 / A" or the subject / job */
  line?: string;
  photo?: string;
  validUntil: string;
}

export const ID_CARD_SIZE = { width: 1012, height: 638 };

export async function renderIdCard(data: IdCardData, theme = currentTheme()): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = ID_CARD_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await ensureFont(theme.font);
  const [logo, photo] = await Promise.all([loadImage(theme.logo), loadImage(data.photo)]);
  const f = theme.font;

  // card + header band
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.fill();
  ctx.save();
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.clip();
  ctx.fillStyle = theme.primary;
  ctx.fillRect(0, 0, W, 170);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 170, W, 12);
  ctx.fillRect(0, H - 18, W, 18);
  ctx.restore();

  if (logo) drawContain(ctx, logo, 36, 28, 170, 114);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  fitText(ctx, theme.schoolName, 230, 70, W - 270, 44, 800, f, 22);
  ctx.globalAlpha = 0.8;
  fitText(ctx, `${data.role} ID card`, 230, 122, W - 270, 28, 600, f);
  ctx.globalAlpha = 1;

  // photo
  const px = 48;
  const py = 222;
  const ps = 250;
  ctx.save();
  roundRect(ctx, px, py, ps, ps * 1.2, 24);
  ctx.clip();
  if (photo) {
    const side = Math.min(photo.naturalWidth, photo.naturalHeight / 1.2);
    ctx.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side * 1.2) / 2, side, side * 1.2, px, py, ps, ps * 1.2);
  } else {
    ctx.fillStyle = '#eaeef2';
    ctx.fillRect(px, py, ps, ps * 1.2);
    ctx.fillStyle = theme.primary;
    ctx.textAlign = 'center';
    ctx.font = `800 96px ${f}, system-ui, sans-serif`;
    ctx.fillText(initials(data.name), px + ps / 2, py + ps * 0.6);
    ctx.textAlign = 'start';
  }
  ctx.restore();

  // details
  const tx = 340;
  const tw = W - tx - 250;
  ctx.fillStyle = '#0f1b2b';
  fitText(ctx, data.name, tx, 262, tw, 52, 800, f, 24);
  ctx.fillStyle = '#44576b';
  if (data.line) fitText(ctx, data.line, tx, 322, tw, 32, 600, f);
  ctx.fillStyle = '#5d7186';
  ctx.font = `600 24px ${f}, system-ui, sans-serif`;
  ctx.fillText('ID', tx, 392);
  ctx.fillStyle = '#0f1b2b';
  ctx.font = `700 38px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillText(data.code, tx, 432);
  ctx.fillStyle = '#5d7186';
  ctx.font = `600 24px ${f}, system-ui, sans-serif`;
  ctx.fillText(`Valid until ${data.validUntil}`, tx, 500);

  drawQr(ctx, data.code, W - 236, 300, 200);
  ctx.strokeStyle = '#d6dde5';
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 236, 300, 200, 200);
  return canvas;
}

/* ------------------------------- certificate ------------------------------- */

export interface CertificateData {
  serial: string;
  /** "Certificate of Achievement" */
  heading: string;
  title: string;
  studentName: string;
  reason?: string;
  date: string;
  signer: {name: string;title: string;};
  verifyUrl: string;
  revoked?: boolean;
}

export const CERTIFICATE_SIZE = { width: 2000, height: 1414 };

export async function renderCertificate(data: CertificateData, theme = currentTheme()): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = CERTIFICATE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await ensureFont(theme.font);
  const logo = await loadImage(theme.logo);
  const f = theme.font;
  const cx = W / 2;

  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, W, H);
  // frames
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 28;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(84, 84, W - 168, H - 168);
  // corner ornaments
  ctx.fillStyle = theme.accent;
  [[84, 84], [W - 84, 84], [84, H - 84], [W - 84, H - 84]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  if (logo) {
    // the default logo is light-on-dark: give it a plate; an uploaded logo is drawn as-is
    if (theme.logo === DEFAULT_LOGO) {
      ctx.fillStyle = theme.primary;
      roundRect(ctx, cx - 170, 140, 340, 170, 24);
      ctx.fill();
    }
    drawContain(ctx, logo, cx - 150, 152, 300, 146);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.primary;
  fitText(ctx, theme.schoolName.toUpperCase(), cx, 380, W - 400, 44, 700, f, 24);

  ctx.fillStyle = '#0f1b2b';
  fitText(ctx, data.heading, cx, 500, W - 400, 96, 800, f, 40);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(cx - 160, 535, 320, 8);

  ctx.fillStyle = '#5d7186';
  fitText(ctx, 'This certificate is proudly presented to', cx, 640, W - 400, 40, 500, f);
  ctx.fillStyle = theme.primary;
  fitText(ctx, data.studentName, cx, 770, W - 360, 110, 800, f, 48);
  ctx.strokeStyle = '#b4c0cd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 600, 810);
  ctx.lineTo(cx + 600, 810);
  ctx.stroke();

  ctx.fillStyle = '#0f1b2b';
  fitText(ctx, data.title, cx, 900, W - 400, 54, 700, f, 28);
  if (data.reason) {
    ctx.fillStyle = '#44576b';
    fitText(ctx, data.reason, cx, 975, W - 440, 40, 500, f, 22);
  }

  // date + signature
  ctx.strokeStyle = '#0f1b2b';
  ctx.lineWidth = 3;
  [[460, data.date, 'Date'], [W - 820, data.signer.name, data.signer.title]].forEach(([x, top, bottom]) => {
    const xx = x as number;
    ctx.beginPath();
    ctx.moveTo(xx - 220, 1150);
    ctx.lineTo(xx + 220, 1150);
    ctx.stroke();
    ctx.fillStyle = '#0f1b2b';
    fitText(ctx, String(top), xx, 1130, 440, 40, 700, f, 20);
    ctx.fillStyle = '#5d7186';
    fitText(ctx, String(bottom), xx, 1198, 440, 32, 500, f, 18);
  });

  // verification: QR with the code centred under it, clear of the signature
  const qx = W - 390;
  drawQr(ctx, data.verifyUrl, qx, 990, 190);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f1b2b';
  ctx.font = `700 24px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillText(data.serial, qx + 95, 1218);
  ctx.fillStyle = '#5d7186';
  ctx.font = `500 20px ${f}, system-ui, sans-serif`;
  ctx.fillText('Scan or enter the code to verify', qx + 95, 1250);

  if (data.revoked) {
    ctx.save();
    ctx.translate(cx, H / 2);
    ctx.rotate(-0.35);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(208, 59, 59, 0.28)';
    ctx.font = `900 240px ${f}, system-ui, sans-serif`;
    ctx.fillText('REVOKED', 0, 80);
    ctx.restore();
  }
  ctx.textAlign = 'start';
  return canvas;
}

export const CERTIFICATE_HEADING: Record<string, string> = {
  achievement: 'Certificate of Achievement',
  attendance: 'Certificate of Attendance',
  completion: 'Certificate of Completion',
  conduct: 'Certificate of Good Conduct',
  participation: 'Certificate of Participation'
};

/** Saves a canvas as a PNG file. */
export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${fileName.replace(/[^\w\- ]+/g, '').trim() || 'document'}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const verifyUrl = (serial: string) => `${window.location.origin}/verify?code=${serial}`;

/** Draws an issued certificate exactly as it was issued (with REVOKED when it was). */
export function drawIssued(c: Certificate) {
  return renderCertificate({
    serial: c.serial,
    heading: CERTIFICATE_HEADING[c.type],
    title: c.title,
    studentName: c.student.name,
    reason: c.reason,
    date: formatDay(c.issuedOn, { day: 'numeric', month: 'long', year: 'numeric' }),
    signer: c.signer,
    verifyUrl: verifyUrl(c.serial),
    revoked: Boolean(c.revoked)
  });
}

/* ------------------------------- spine label ------------------------------- */

export const SPINE_LABEL_SIZE = { width: 600, height: 300 };

/** A book copy label: QR + barcode + short title + shelf (prints 50 × 25 mm). */
export async function renderSpineLabel(data: {barcode: string;title: string;shelf: string;}, theme = currentTheme()): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = SPINE_LABEL_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await ensureFont(theme.font);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = theme.primary;
  ctx.fillRect(0, 0, W, 14);
  drawQr(ctx, data.barcode, 20, 40, 230);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f1b2b';
  ctx.font = `700 40px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillText(data.barcode, 270, 100);
  fitText(ctx, data.title, 270, 160, W - 290, 30, 700, theme.font, 16);
  ctx.fillStyle = '#5d7186';
  fitText(ctx, `Shelf ${data.shelf} · ${theme.schoolName}`, 270, 210, W - 290, 24, 500, theme.font, 14);
  return canvas;
}
