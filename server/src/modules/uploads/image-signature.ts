export type ImageKind = 'jpeg' | 'png' | 'webp';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MIME_BY_KIND: Record<ImageKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Reads the first bytes of the file (its "signature") to see what it really is, whatever its name says. */
export function detectImageKind(buffer: Buffer): ImageKind | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg';
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (
    buffer.length >= 8 &&
    png.every((byte, index) => buffer[index] === byte)
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/** True when the declared type is allowed and the real content matches it. */
export function isAllowedImage(mimetype: string, buffer: Buffer): boolean {
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) return false;
  const kind = detectImageKind(buffer);
  return kind !== null && MIME_BY_KIND[kind] === mimetype;
}
