import { hash2, makeFbm } from './noise';

export type Field = (u: number, v: number) => number;
export type Duotone = readonly [string, string];

export type FieldSpec = {
  name: string;
  make: (seed: number, rnd: () => number) => Field;
  palette: Duotone;
  lo: number;
  hi: number;
};

const ASPECT = 1.6;
const between = (rnd: () => number, a: number, b: number) => a + (b - a) * rnd();

export const FIELDS: readonly FieldSpec[] = [
  {
    name: 'dunes',
    palette: ['cover-navy', 'cover-blue'],
    lo: 0.2,
    hi: 0.9,
    make: (seed, rnd) => {
      const fbm = makeFbm(seed);
      const freq = between(rnd, 7, 11);
      return (u, v) => 0.5 + 0.5 * Math.sin((v * freq + fbm(u * 3, v * 3) * 4) * Math.PI) * (0.4 + v * 0.6);
    },
  },
  {
    name: 'orb',
    palette: ['black', 'fg'],
    lo: 0.05,
    hi: 0.85,
    make: (seed, rnd) => {
      const fbm = makeFbm(seed);
      const cx = between(rnd, 0.35, 0.65);
      const cy = between(rnd, 0.4, 0.55);
      const r = between(rnd, 0.24, 0.32);
      return (u, v) => {
        const x = (u - cx) * ASPECT;
        const y = v - cy;
        const d = Math.hypot(x, y);
        const sky = 0.02 + 0.22 * v * v + 0.08 * fbm(u * 5, v * 5);
        if (d > r) return sky + 0.25 * Math.exp(-(d - r) * 18);
        const nz = Math.sqrt(Math.max(0, 1 - (d / r) ** 2));
        const light = Math.max(0, -0.55 * (x / r) - 0.6 * (y / r) + 0.58 * nz);
        return 0.06 + 0.95 * light ** 1.2;
      };
    },
  },
  {
    name: 'signal',
    palette: ['cover-navy', 'fg'],
    lo: 0.1,
    hi: 0.8,
    make: (seed, rnd) => {
      const fbm = makeFbm(seed);
      const lines = Math.round(between(rnd, 4, 6));
      const gap = 0.6 / (lines - 1);
      return (u, v) => {
        let t = 0;
        for (let k = 0; k < lines; k++) {
          const y = 0.2 + k * gap + 0.06 * Math.sin(u * (6 + k * 2) + k) * (1 + fbm(u * 2, k));
          t += Math.exp(-((v - y) ** 2) / 0.0006);
        }
        return Math.min(1, 0.08 + t * 0.9 + 0.12 * fbm(u * 8, v * 8));
      };
    },
  },
  {
    name: 'bars',
    palette: ['black', 'cover-blue'],
    lo: 0,
    hi: 1,
    make: (seed, rnd) => {
      const fbm = makeFbm(seed);
      const n = Math.round(between(rnd, 5, 8));
      const flip = rnd() < 0.5;
      return (u, v) => {
        const jitter = fbm(v * 10, 0) > 0.55 ? 0.03 * Math.sin(v * 80) : 0;
        const i = Math.min(n - 1, Math.floor((u + jitter) * n));
        const level = 0.88 - (0.78 * i) / (n - 1);
        if (v < 0.7) return flip ? 1 - level : level;
        if (v < 0.82) return 0.1 + 0.8 * u;
        return 0.05 + 0.2 * fbm(u * 20, v * 20);
      };
    },
  },
  {
    name: 'terrain',
    palette: ['cover-navy', 'cover-blue'],
    lo: 0.08,
    hi: 0.7,
    make: (seed) => {
      const fbm = makeFbm(seed);
      return (u, v) => {
        const h = fbm(u * 2.2, v * 2.2 + 3);
        const line = Math.abs(Math.sin((h * 34 * Math.PI) / 2));
        const contour = 1 - Math.min(1, line / 0.12);
        return 0.04 + 0.12 * h + 0.9 * contour * (0.4 + h);
      };
    },
  },
  {
    name: 'rings',
    palette: ['cover-navy', 'cover-ice'],
    lo: 0.25,
    hi: 0.85,
    make: (seed, rnd) => {
      const fbm = makeFbm(seed);
      const cx = between(rnd, 0.2, 0.8);
      const cy = between(rnd, 0.3, 0.7);
      return (u, v) => {
        const d = Math.hypot(u - cx, v - cy);
        return 0.5 + 0.5 * Math.cos(d * 60 - fbm(u * 3, v * 3) * 6) * Math.exp(-d * 1.8);
      };
    },
  },
  {
    name: 'static',
    palette: ['black', 'cover-steel'],
    lo: 0.2,
    hi: 0.9,
    make: (seed) => {
      const fbm = makeFbm(seed);
      return (u, v) => {
        const band = 0.5 + 0.5 * Math.sin(v * 30 + fbm(0, v * 6) * 8);
        const grain = hash2(Math.floor(u * 4096), Math.floor(v * 4096), seed);
        return 0.15 + 0.6 * band * fbm(u * 6 + v * 2, v * 40) + 0.2 * grain;
      };
    },
  },
  {
    name: 'bloom',
    palette: ['cover-navy', 'cover-red'],
    lo: 0,
    hi: 1,
    make: (seed, rnd) => {
      const fbm = makeFbm(seed);
      const petals = Math.round(between(rnd, 5, 9));
      const cx = between(rnd, 0.35, 0.65);
      return (u, v) => {
        const x = u - cx;
        const y = v - 0.5;
        const a = Math.atan2(y, x);
        const r = Math.hypot(x, y);
        const p = 0.5 + 0.5 * Math.cos(a * petals + fbm(u * 2, v * 2) * 3);
        return Math.max(0, 1 - r / (0.18 + 0.2 * p)) ** 0.8 * 0.95 + 0.05;
      };
    },
  },
];
