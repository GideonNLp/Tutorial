/**
 * Turns a picture chosen by the person into a small profile photo: a square, centred on the
 * upper part of portrait pictures (where faces usually are), 256 × 256 px, JPEG.
 * Everything happens in memory on the device; the original file is not kept.
 */
export const PHOTO_SIZE = 256;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type PhotoError = 'unreadable' | 'tooBig';
export type PhotoResult = { ok: true; dataUrl: string } | { ok: false; error: PhotoError };

export async function preparePhoto(file: File): Promise<PhotoResult> {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'tooBig' };
  if (file.type && !file.type.startsWith('image/')) return { ok: false, error: 'unreadable' };
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) return { ok: false, error: 'unreadable' };

    const side = Math.min(width, height);
    const x = (width - side) / 2;
    const y = (height - side) * 0.3;
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return { ok: false, error: 'unreadable' };
    // Transparent pictures would turn black in a JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, x, y, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.startsWith('data:image/jpeg') ? { ok: true, dataUrl } : { ok: false, error: 'unreadable' };
  } catch {
    return { ok: false, error: 'unreadable' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
