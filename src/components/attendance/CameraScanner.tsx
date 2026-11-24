import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOffIcon } from 'lucide-react';

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Array<{rawValue: string;}>>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: {formats: string[];}) => BarcodeDetectorLike;
  }
}

/**
 * Reads QR codes from the camera. Uses the browser's BarcodeDetector when it
 * exists (Android, macOS, ChromeOS) and the jsQR decoder elsewhere (e.g.
 * Chrome on Windows). The same code is not reported twice within `cooldownMs`.
 */
export function CameraScanner({ onCode, cooldownMs = 3000 }: {onCode: (code: string) => void;cooldownMs?: number;}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    let busy = false;
    const recent = new Map<string, number>();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;

    const report = (code: string) => {
      const now = Date.now();
      if ((recent.get(code) ?? 0) > now - cooldownMs) return;
      recent.set(code, now);
      onCodeRef.current(code);
    };

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !busy) {
        busy = true;
        try {
          if (detector) {
            const found = await detector.detect(video);
            if (found[0]?.rawValue) report(found[0].rawValue);
          } else if (ctx) {
            // decode a downscaled frame: fast enough on a laptop
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
            if (result?.data) report(result.data);
          }
        } catch {

          // a bad frame: try the next one
        } finally {busy = false;}
      }
      frame = window.setTimeout(() => requestAnimationFrame(tick), 150);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser can not use the camera. Use a barcode scanner or type the code.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        tick();
      } catch (e) {
        setError((e as Error).name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in the browser to scan with the camera.' : 'No camera found. Use a barcode scanner or type the code.');
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cooldownMs]);

  if (error) {
    return (
      <div role="alert" className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-ink-900 px-6 text-center text-[13px] text-white/80">
        <CameraOffIcon className="h-6 w-6" aria-hidden="true" />
        {error}
      </div>);

  }
  return (
    <div className="relative overflow-hidden rounded-xl bg-ink-900">
      <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" aria-label="Camera preview" />
      {/* aiming frame */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="h-2/3 w-auto aspect-square rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
      </div>
    </div>);

}
