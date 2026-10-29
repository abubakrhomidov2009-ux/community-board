// Makes every logo and icon file from docs/design/logo.png. Run: node scripts/make-icons.mjs
// The logo is used as given: only cropped to its round badge, scaled, and (for icons) placed on a square.
import { copyFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SOURCE = '../docs/design/logo.png';
// The badge sits at x 1..167, y 19..185 inside the picture (white around it).
const CROP = { left: 1, top: 19, width: 167, height: 167 };
const GREEN = '#0F766E';

const circle = (size) =>
  Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 0.6}" fill="#fff"/></svg>`,
  );

/** The round badge on a transparent background, at the given size. */
async function badge(size) {
  const square = await sharp(SOURCE)
    .extract(CROP)
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return sharp(square)
    .ensureAlpha()
    .composite([{ input: circle(size), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** The badge on a solid green square (for icons that phones crop to any shape). */
async function onSquare(size, badgeRatio) {
  const inner = Math.round(size * badgeRatio);
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: GREEN },
  })
    .composite([{ input: await badge(inner), left: offset, top: offset }])
    .png()
    .toBuffer();
}

/** A .ico file that holds PNG pictures (all current browsers read it). */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = 6 + frames.length * 16;
  const entries = frames.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size;
    entry[1] = size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

copyFileSync(SOURCE, 'public/logo.png'); // the original, untouched
writeFileSync('public/logo-badge.png', await badge(167)); // trimmed round badge, real size
writeFileSync('public/icons/icon-192.png', await badge(192));
writeFileSync('public/icons/icon-512.png', await badge(512));
writeFileSync('public/icons/icon-maskable-512.png', await onSquare(512, 0.8));
writeFileSync('src/app/icon.png', await badge(48));
writeFileSync('src/app/apple-icon.png', await onSquare(180, 0.8));
writeFileSync(
  'src/app/favicon.ico',
  ico([
    { size: 32, data: await badge(32) },
    { size: 48, data: await badge(48) },
  ]),
);
console.log('icons done');
