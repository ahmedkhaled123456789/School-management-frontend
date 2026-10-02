/** Default profile picture for every user (served from /public). */
export const DEFAULT_AVATAR = '/ahmed.jpeg';

/** Largest file the user may pick before we resize it in the browser. */
export const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024;

export function avatarSrc(image?: string | null): string {
  return image && image.trim() ? image : DEFAULT_AVATAR;
}

/**
 * Center-crops the picked image to a square and resizes it, returning a small
 * JPEG data URL (~20KB) that is stored directly on the user record.
 */
export function fileToAvatarDataUrl(file: File, size = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'));
      return;
    }
    if (file.size > MAX_AVATAR_FILE_BYTES) {
      reject(new Error('The image is too large (max 8MB).'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Your browser cannot process images.'));
        return;
      }
      // white background so transparent PNGs don't turn black as JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read.'));
    };
    img.src = url;
  });
}
