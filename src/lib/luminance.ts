// Server-only (sharp): how light an image is, to flip dark logos and favicons for the dark page.
import sharp from 'sharp';

// below this mean luminance (0-1) an image is too dark to see on the page
export const DARK_IMAGE = 0.3;

export const luminance = (r: number, g: number, b: number) => {
  const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

// mean luminance of an image's opaque pixels
export async function imageLuminance(input: string | Buffer) {
  const { data } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    sum += luminance(data[i], data[i + 1], data[i + 2]);
    n++;
  }
  return n ? sum / n : 1;
}
