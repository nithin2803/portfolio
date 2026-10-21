import { hashString, mulberry32 } from '@/lib/random';

export const DIM = 8;
const WINDOW = 128;
const STOP = new Set(
  'a an and are as at be but by for from has have i i’m in is it it’s its me my of on or so that the this to was with you your'.split(
    ' ',
  ),
);

export type Vec = Float32Array;

export type Attention = {
  weights: Float32Array;
  q: Vec;
  out: Vec;
};

const clean = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}’'-]/gu, '');

// a fixed pseudo-random vector in [-1, 1) per word
function vector(text: string, salt: string): Vec {
  const rand = mulberry32(hashString(`${salt}:${clean(text) || text}`));
  return Float32Array.from({ length: DIM }, () => rand() * 2 - 1);
}

export const keyOf = (text: string) => vector(text, 'k');
export const valueOf = (text: string) => vector(text, 'v');

export function attend(history: readonly string[]): Attention {
  const n = history.length - 1;
  const current = history[n] ?? '';
  const q = vector(current, 'q');
  const weights = new Float32Array(history.length);
  const out = new Float32Array(DIM);
  const from = Math.max(0, n - WINDOW);
  if (n <= 0) return { weights, q, out };

  const word = clean(current);
  let max = -Infinity;
  for (let j = from; j < n; j++) {
    const k = keyOf(history[j]);
    let dot = 0;
    for (let i = 0; i < DIM; i++) dot += q[i] * k[i];
    const w = clean(history[j]);
    const content = !w ? -2 : STOP.has(w) ? 0 : 0.9 * Math.min(1, w.length / 6);
    const recency = 1.3 * Math.exp(-(n - j) / 20);
    const echo = w && w === word ? 1.4 : 0;
    weights[j] = dot / Math.sqrt(DIM) + content + recency + echo;
    max = Math.max(max, weights[j]);
  }
  let z = 0;
  for (let j = from; j < n; j++) z += weights[j] = Math.exp((weights[j] - max) * 1.6);
  for (let j = from; j < n; j++) {
    weights[j] /= z;
    const v = valueOf(history[j]);
    for (let i = 0; i < DIM; i++) out[i] += weights[j] * v[i];
  }
  return { weights, q, out };
}
