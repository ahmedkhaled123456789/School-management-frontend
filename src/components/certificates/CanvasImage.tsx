import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../utils/cn';

/**
 * Shows a canvas drawing as an image. `render` is re-run when `deps` change;
 * the PNG data URL is handed to `onReady` (for printing / downloading).
 */
export function CanvasImage({ render, deps, alt, className, onReady }: {
  render: () => Promise<HTMLCanvasElement>;
  deps: unknown[];
  alt: string;
  className?: string;
  onReady?: (dataUrl: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    render().
    then((canvas) => {
      if (!alive) return;
      const url = canvas.toDataURL('image/png');
      setSrc(url);
      onReady?.(url);
    }).
    catch(() => alive && setFailed(true));
    return () => {alive = false;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  if (failed) return <div className={cn('grid place-items-center rounded-lg bg-ink-50 text-[12px] text-ink-500', className)}>Could not draw</div>;
  if (!src) return <Skeleton className={cn('rounded-lg', className)} />;
  return <img src={src} alt={alt} className={cn('rounded-lg shadow-card', className)} />;
}

/** Opens a print view of the given images (ID cards: 2 per row; labels: 3 per row on A4; certificates: 1 per landscape page). */
export function printImages(images: string[], kind: 'cards' | 'certificates' | 'labels', title: string) {
  const win = window.open('', '_blank', 'noopener=no,width=900,height=700');
  if (!win) return false;
  const css = kind === 'labels' ?
  '@page{size:A4 portrait;margin:8mm}body{margin:0;display:grid;grid-template-columns:repeat(3,50mm);gap:4mm;justify-content:center}img{width:50mm;height:25mm;border:0.2mm dashed #b4c0cd;break-inside:avoid}' :
  kind === 'cards' ?
  '@page{size:A4 portrait;margin:10mm}body{margin:0;display:grid;grid-template-columns:repeat(2,85.6mm);gap:6mm;justify-content:center}img{width:85.6mm;height:54mm;border:0.2mm solid #d6dde5;border-radius:3mm;break-inside:avoid}' :
  '@page{size:A4 landscape;margin:0}body{margin:0}img{width:297mm;height:210mm;display:block;break-after:page}';
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, '')}</title><style>${css}</style></head><body>${images.map((src) => `<img src="${src}" alt="">`).join('')}</body></html>`);
  win.document.close();
  win.onload = () => {win.focus();win.print();};
  return true;
}
