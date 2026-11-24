import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/**
 * A QR code drawn as one SVG path (crisp at any size, prints well).
 * Error correction "M" survives a scuffed card.
 */
export function QrCode({ value, size = 160, label }: {value: string;size?: number;label: string;}) {
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 8 }; // 4-module quiet zone on each side
  }, [value]);

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${count} ${count}`} width={size} height={size} shapeRendering="crispEdges" className="rounded-md bg-white">
      <rect width={count} height={count} fill="#fff" />
      <path d={path} fill="#0f1b2b" />
    </svg>);

}
