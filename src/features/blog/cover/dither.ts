import { BAYER8, type Rgb } from '@/lib/dither';
import { FIELDS, type Duotone } from './fields';
import { hashString, mulberry32 } from '@/lib/random';

export type CoverBitmap = {
  width: number;
  height: number;
  bits: Uint8Array;
  palette: Duotone;
};

const smooth = (x: number, lo: number, hi: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

export function coverSpec(slug: string) {
  return FIELDS[hashString(slug) % FIELDS.length];
}

export function renderCover(slug: string, width: number, height: number): CoverBitmap {
  const seed = hashString(slug);
  const rnd = mulberry32(seed);
  const spec = coverSpec(slug);
  const field = spec.make(seed, rnd);
  const bits = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const lum = smooth(field(x / width, v), spec.lo, spec.hi);
      bits[y * width + x] = lum > BAYER8[(y & 7) * 8 + (x & 7)] ? 1 : 0;
    }
  }
  return { width, height, bits, palette: spec.palette };
}

export function paint(
  bmp: CoverBitmap,
  out: Uint8ClampedArray,
  [ground, ink]: readonly [Rgb, Rgb],
  tear?: (row: number) => number,
) {
  const { width, height, bits } = bmp;
  for (let y = 0; y < height; y++) {
    const shift = tear ? tear(y) : 0;
    for (let x = 0; x < width; x++) {
      const sx = (((x - shift) % width) + width) % width;
      const c = bits[y * width + sx] ? ink : ground;
      const i = (y * width + x) * 4;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = 255;
    }
  }
}

export type { Rgb };
