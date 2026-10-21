export function hash2(i: number, j: number, seed: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type Fbm = (x: number, y: number, octaves?: number) => number;

export function makeFbm(seed: number): Fbm {
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const g00 = hash2(xi, yi, seed);
    const g10 = hash2(xi + 1, yi, seed);
    const g01 = hash2(xi, yi + 1, seed);
    const g11 = hash2(xi + 1, yi + 1, seed);
    const a = g00 + (g10 - g00) * u;
    const b = g01 + (g11 - g01) * u;
    return a + (b - a) * v;
  };
  return (x, y, octaves = 5) => {
    let sum = 0;
    let amp = 0.5;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x, y);
      x = x * 2.03 + 7.1;
      y = y * 2.03 + 3.7;
      amp *= 0.5;
    }
    return sum;
  };
}
