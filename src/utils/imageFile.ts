/**
 * Reads an image file into a data URL, scaled down to fit a box.
 * PNG keeps transparency (logos); JPEG is used for photos (backgrounds).
 * SVG is kept as-is when small (it scales without loss).
 */
export async function readImageFile(
file: File,
{ maxWidth, maxHeight, format, maxBytes }: {maxWidth: number;maxHeight: number;format: 'png' | 'jpeg';maxBytes: number;})
: Promise<string> {
  if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
    throw new Error('Use a PNG, JPG, WEBP or SVG image.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('The image is larger than 10 MB.');

  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });

  if (file.type === 'image/svg+xml') {
    if (original.length > maxBytes) throw new Error('This SVG is too large; export a smaller one or use PNG.');
    return original;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This image could not be opened.'));
    img.src = original;
  });
  const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser can not process images.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let result = canvas.toDataURL(`image/${format}`, 0.85);
  // photos: lower the quality until the size fits
  for (let quality = 0.75; format === 'jpeg' && result.length > maxBytes && quality >= 0.45; quality -= 0.1) {
    result = canvas.toDataURL('image/jpeg', quality);
  }
  if (result.length > maxBytes) throw new Error('The image is still too large after resizing. Try a simpler or smaller image.');
  return result;
}
