// Seattle at night from Kerry Park, as pixel art: Queen Anne in front, the Space Needle and downtown behind,
// Rainier and the port off to the right
import { mulberry32 } from '@/lib/random';

export const COLS = 400;
export const ROWS = 168;
const GROUND = 138;
const NEEDLE = 100;
// where the Space Needle stands, as a fraction of the width
export const NEEDLE_X = NEEDLE / COLS;

const COLORS = {
  none: 'transparent',
  // the city's light pollution warms the horizon toward the site's signal violet
  sky1: '#070a16',
  sky2: '#110f28',
  sky3: '#1f1838',
  starDim: '#2b2f37',
  star: '#5b616c',
  starBright: '#d3d7de',
  moon: '#c4c9d1',
  moonShade: '#7e848f',
  moonCrater: '#a3a9b3',
  haze: '#151a2e',
  hazeEdge: '#1d2338',
  mid: '#10142a',
  // moonlight catches the left edges
  midEdge: '#232a42',
  midShade: '#090b15',
  near: '#0a0c14',
  nearEdge: '#151a29',
  // office lights: mostly warm, the brightest a cool LED white
  winDim: '#6a5230',
  win: '#d9a650',
  winBright: '#e8f0ff',
  // the Needle is floodlit, with the restaurant glowing warm under the halo
  steel: '#7a8296',
  steelLight: '#c9d2e4',
  steelShade: '#454c5e',
  needleWin: '#ffd98f',
  // Rainier by moonlight
  mountain: '#141a2a',
  mountainShade: '#0e1220',
  snow: '#5c6884',
  snowShade: '#3c455b',
  water: '#060914',
  // the city's lights broken up on the bay
  glint: '#a8803f',
  tree: '#030406',
  treeEdge: '#0a0d12',
  house: '#0b0d13',
  roof: '#151925',
  lamp: '#ffd9a0',
  // aircraft warning lights, in the site's signal red
  beacon: 'var(--color-signal-red)',
  lampGlow: '#3a2b1a',
  crane: '#22263a',
  ferry: '#1c2030',
  ferryWin: '#ffd38a',
  // the Needle dressed for the Seahawks: a green roof and a 12 flag on the mast
  hawksGreenLight: '#86e39a',
  hawksGreen: '#45c464',
  hawksGreenShade: '#278a43',
  flagBlue: '#3570bd',
  flagBlueShade: '#22508c',
  flagWhite: '#f2f4f8',
} as const;

export const PALETTE: readonly string[] = Object.values(COLORS);
const C = Object.fromEntries(Object.keys(COLORS).map((k, i) => [k, i])) as Record<
  keyof typeof COLORS,
  number
>;

// the city's coloured lights (and the floodlit roof and flag), which the game draws brighter than the
// rest of the skyline
export const LIGHTS = [
  C.win,
  C.winBright,
  C.needleWin,
  C.lamp,
  C.beacon,
  C.glint,
  C.ferryWin,
  C.hawksGreenLight,
  C.hawksGreen,
  C.hawksGreenShade,
  C.flagBlue,
  C.flagBlueShade,
  C.flagWhite,
];

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

type Light = { at: number; on: number; off: number };

export type Scene = {
  pixels: Uint8Array;
  // windows, stars and glints that switch off and back on
  twinkles: Light[];
  // aircraft warning lights that blink in step
  beacons: Light[];
  elevator: { x: number; top: number; bottom: number; color: number };
  // F is hull, w is a lit window, anything else leaves the scene showing through
  ferry: { y: number; from: number; to: number; sprite: string[]; hull: number; window: number };
  // waves from the mast; W is white, anything else blue
  flag: { x: number; y: number; sprite: string[]; blue: number; shade: number; white: number };
};

const FERRY = ['    FFFF      ', '  FFwFwFwFF   ', 'FFFFFFFFFFFFFF', ' FFFFFFFFFFFF '];

const FLAG = [
  'BBBBBBBBBBB',
  'BBBWBBWWBBB',
  'BBWWBBBBWBB',
  'BBBWBBBWBBB',
  'BBBWBBWBBBB',
  'BBWWWBWWWBB',
  'BBBBBBBBBBB',
];

let cached: Scene | null = null;

export function buildScene(): Scene {
  if (cached) return cached;
  const px = new Uint8Array(COLS * ROWS);
  const twinkles: Light[] = [];
  const beacons: Light[] = [];
  const rand = mulberry32(206);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const inside = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
  const set = (x: number, y: number, c: number) => {
    if (inside(x, y)) px[y * COLS + x] = c;
  };
  const get = (x: number, y: number) => (inside(x, y) ? px[y * COLS + x] : C.none);
  const rect = (x0: number, y0: number, x1: number, y1: number, c: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
  };
  const disc = (cx: number, cy: number, r: number, c: number) => {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) set(cx + x, cy + y, c);
  };
  const light = (x: number, y: number, on: number, off: number) => {
    if (!inside(x, y)) return;
    set(x, y, on);
    twinkles.push({ at: y * COLS + x, on, off });
  };
  const beacon = (x: number, y: number, off: number) => {
    set(x, y, off);
    beacons.push({ at: y * COLS + x, on: C.beacon, off });
  };

  // a faint glow over the city, banded and dithered like old pixel art
  for (let y = 0; y < GROUND; y++) {
    const v = (y / GROUND) ** 2.2 * 3;
    for (let x = 0; x < COLS; x++) {
      const band = Math.floor(v) + (v % 1 > BAYER4[(y & 3) * 4 + (x & 3)] ? 1 : 0);
      if (band) set(x, y, [C.none, C.sky1, C.sky2, C.sky3][Math.min(3, band)]);
    }
  }

  for (let i = 0; i < 150; i++) {
    const x = int(0, COLS - 1);
    const y = int(0, 84);
    const r = rand();
    if (r < 0.06) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        set(x + dx, y + dy, C.starDim);
      light(x, y, C.starBright, C.starDim);
    } else light(x, y, r < 0.4 ? C.star : C.starDim, get(x, y));
  }

  const moon = { x: 46, y: 26, r: 7 };
  disc(moon.x, moon.y, moon.r, C.moon);
  for (let y = -moon.r - 1; y <= moon.r + 1; y++)
    for (let x = -moon.r - 1; x <= moon.r + 1; x++) {
      const inMoon = get(moon.x + x, moon.y + y) === C.moon;
      const lit = (x + 3) ** 2 + (y + 1) ** 2 <= moon.r ** 2 + 4;
      if (inMoon && !lit) set(moon.x + x, moon.y + y, C.moonShade);
    }
  for (const [dx, dy] of [
    [-3, -2],
    [-1, 2],
    [-4, 1],
    [1, -4],
    [-2, -5],
  ])
    set(moon.x + dx, moon.y + dy, C.moonCrater);

  const peak = { x: 318, y: 70 };
  for (let x = 205; x < COLS; x++) {
    const d = Math.abs(x - peak.x) / 112;
    if (d > 1) continue;
    const top = Math.round(peak.y + d ** 1.45 * (GROUND - 12 - peak.y) + (rand() < 0.25 ? 1 : 0));
    const snowLine = peak.y + 13 + int(0, 2) + Math.round(d * 16) + (x % 9 < 2 ? 4 : 0);
    const shaded = x > peak.x + (x % 5 === 0 ? 1 : 0);
    for (let y = top; y < GROUND; y++) {
      const snow = y < snowLine;
      const ridge = snow && (x - peak.x) % 11 === 0 && y > top + 2;
      const rock = shaded ? C.mountainShade : C.mountain;
      set(x, y, snow ? (shaded || ridge ? C.snowShade : C.snow) : rock);
    }
  }

  rect(236, GROUND - 8, COLS - 1, GROUND + 4, C.water);
  for (let i = 0; i < 70; i++) {
    const x = int(238, COLS - 3);
    const y = int(GROUND - 7, GROUND + 3);
    light(x, y, C.glint, C.water);
    if (rand() < 0.5) light(x + 1, y, C.glint, C.water);
  }

  for (const [x, h] of [
    [352, 26],
    [378, 22],
  ]) {
    const top = GROUND - 8 - h;
    for (let y = top; y < GROUND - 8; y++) {
      const spread = Math.floor((y - top) / 6);
      set(x - spread, y, C.crane);
      set(x + 4 + spread, y, C.crane);
      if ((y - top) % 6 === 3) rect(x - spread, y, x + 4 + spread, y, C.crane);
    }
    rect(x - 20, top, x + 10, top + 1, C.crane);
    rect(x + 6, top + 2, x + 9, top + 4, C.crane);
    rect(x - 1, top - 3, x + 5, top - 1, C.crane);
    for (let y = top + 2; y < top + 14; y += 2) set(x - 18, y, C.crane);
    beacon(x + 2, top - 4, C.crane);
  }

  type Crown = 'flat' | 'antenna' | 'stepped' | 'pointed' | 'slant';
  const tones = {
    haze: { body: C.haze, edge: C.hazeEdge, shade: C.haze },
    mid: { body: C.mid, edge: C.midEdge, shade: C.midShade },
    near: { body: C.near, edge: C.nearEdge, shade: C.near },
  };
  const tower = (x0: number, w: number, top: number, crown: Crown, tone: keyof typeof tones) => {
    const { body, edge, shade } = tones[tone];
    const mid = x0 + Math.floor(w / 2);
    rect(x0, top, x0 + w - 1, GROUND, body);
    if (crown === 'stepped') {
      rect(x0 + 2, top - 3, x0 + w - 3, top - 1, body);
      rect(x0 + 4, top - 6, x0 + w - 5, top - 4, body);
    } else if (crown === 'pointed') {
      for (let i = 1; i * 2 < w; i++) rect(x0 + i, top - i, x0 + w - 1 - i, top - i, body);
      rect(mid, top - Math.floor(w / 2) - 5, mid, top, body);
    } else if (crown === 'slant') {
      for (let i = 0; i < w; i++) rect(x0 + i, top - Math.round(i * 0.7), x0 + i, top, body);
    } else if (crown === 'antenna') {
      rect(mid, top - 8, mid, top - 1, body);
      beacon(mid, top - 9, get(mid, top - 9));
    }
    for (let y = top - 12; y <= GROUND; y++) {
      if (get(x0, y) === body) set(x0, y, edge);
      if (get(x0 + w - 1, y) === body) set(x0 + w - 1, y, shade);
    }
    if (tone === 'haze') return;
    const density = 0.18 + rand() * 0.3;
    for (let y = top + 3; y < GROUND - 2; y += 3) {
      const floorLit = rand() < 0.05;
      for (let x = x0 + 2; x < x0 + w - 2; x += 2) {
        const r = rand();
        if (!floorLit && r > density) continue;
        light(x, y, r < density * 0.15 ? C.winBright : r < density * 0.6 ? C.win : C.winDim, body);
      }
    }
  };

  // downtown peaks at the Columbia Center and thins out toward the water
  const envelope = (x: number) => (x > 252 ? 0 : 20 + Math.exp(-(((x - 182) / 46) ** 2)) * 52);
  for (let x = 104; x < 256;) {
    const w = int(7, 13);
    const h = envelope(x + w / 2);
    const crown = rand() < 0.3 ? 'flat' : 'stepped';
    if (h) tower(x, w, Math.round(GROUND - h - 6 - int(0, 12)), crown, 'haze');
    x += w + int(-2, 2);
  }
  const crowns: Crown[] = ['flat', 'flat', 'antenna', 'stepped', 'slant'];
  for (let x = 106; x < 250;) {
    const w = int(6, 11);
    const h = envelope(x + w / 2) * 0.75;
    if (h) tower(x, w, Math.round(GROUND - h - int(0, 8)), crowns[int(0, 4)], 'mid');
    x += w + int(1, 4);
  }
  tower(132, 9, 72, 'flat', 'mid');
  tower(146, 10, 60, 'slant', 'mid');
  tower(160, 11, 52, 'pointed', 'mid');
  tower(178, 16, 38, 'stepped', 'mid');
  beacon(186, 31, C.mid);
  tower(200, 12, 58, 'stepped', 'mid');
  tower(215, 12, 66, 'antenna', 'mid');
  for (let x = 108; x < 244;) {
    const w = int(6, 12);
    tower(x, w, GROUND - int(10, 26), rand() < 0.7 ? 'flat' : 'antenna', 'near');
    x += w + int(2, 7);
  }
  for (let x = 0; x < 92;) {
    const w = int(7, 13);
    tower(x, w, GROUND - int(8, 24), rand() < 0.8 ? 'flat' : 'antenna', 'near');
    x += w + int(1, 5);
  }

  const n = NEEDLE;
  beacon(n, 10, C.steelLight);
  rect(n, 11, n, 25, C.steelLight);
  rect(n - 1, 24, n + 1, 26, C.steel);
  rect(n - 2, 27, n + 2, 27, C.steelLight);
  rect(n - 4, 28, n + 4, 28, C.steelLight);
  rect(n - 7, 29, n + 7, 29, C.steel);
  rect(n - 11, 30, n + 11, 31, C.steelLight);
  rect(n - 10, 32, n + 10, 32, C.steel);
  for (let x = n - 9; x <= n + 9; x += 2) light(x, 32, C.needleWin, C.steel);
  rect(n - 9, 33, n + 9, 33, C.steelShade);
  rect(n - 6, 34, n + 6, 34, C.steelShade);
  rect(n - 4, 35, n + 4, 35, C.steel);
  rect(n - 3, 36, n + 3, 36, C.steel);
  // the core pinches toward a waist, then the legs splay out to the ground
  const waist = 82;
  for (let y = 37; y <= GROUND; y++) {
    if (y < waist) {
      const half = Math.round(3 - ((y - 37) / (waist - 37)) * 1.6);
      rect(n - half, y, n + half, y, C.steel);
      set(n - half, y, C.steelLight);
      set(n + half, y, C.steelShade);
      set(n, y, C.steelShade);
    } else {
      const spread = 1 + Math.floor((y - waist) / 7);
      set(n - spread, y, C.steelLight);
      set(n + spread, y, C.steelShade);
      set(n, y, C.steel);
      if ((y - waist) % 10 === 5) rect(n - spread + 1, y, n + spread - 1, y, C.steelShade);
    }
  }
  rect(n - 7, 116, n + 7, 117, C.steelLight);
  rect(n - 6, 118, n + 6, 118, C.steelShade);
  rect(n - 9, GROUND - 1, n + 9, GROUND, C.steel);
  // the roof cone above the saucer in Seahawks green, lit from the left, with white trees around its foot
  for (let y = 27; y <= 29; y++)
    for (let x = n - 7; x <= n + 7; x++) {
      if (get(x, y) !== C.steel && get(x, y) !== C.steelLight) continue;
      const tree = y === 29 && (x - n) % 3 === 0;
      const green = x < n - 2 ? C.hawksGreenLight : x > n + 2 ? C.hawksGreenShade : C.hawksGreen;
      set(x, y, tree ? C.flagWhite : green);
    }

  for (const [x, w, h] of [
    [4, 14, 8],
    [24, 11, 7],
    [40, 16, 9],
    [60, 12, 7],
    [128, 13, 8],
    [146, 10, 6],
  ]) {
    const base = GROUND + 4;
    rect(x, base - h, x + w - 1, base + 8, C.house);
    for (let i = 0; i <= w / 2; i++) rect(x + i, base - h - i, x + w - 1 - i, base - h - i, C.roof);
    for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rand() < 0.6) light(wx, base - h + 3, C.win, C.house);
  }

  for (let x = -4; x < COLS + 4;) {
    const r = int(4, 9);
    const cy = GROUND + int(0, 6) + (x > 236 && x < 300 ? 2 : 0);
    if (x < 126 || x > 160 || rand() < 0.4) {
      disc(x, cy, r, C.tree);
      for (let i = 0; i < r * 2; i++) {
        const a = rand() * Math.PI;
        const ex = Math.round(x + Math.cos(a) * r);
        const ey = Math.round(cy - Math.sin(a) * r);
        if (get(ex, ey) === C.tree) set(ex, ey, C.treeEdge);
      }
    }
    x += int(5, 12);
  }
  rect(0, GROUND + 8, COLS - 1, ROWS - 1, C.tree);

  for (const x of [34, 84]) {
    rect(x, GROUND - 6, x, ROWS - 1, C.treeEdge);
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (dx * dx + dy * dy <= 10 && BAYER4[((dy + 4) & 3) * 4 + ((dx + 4) & 3)] < 0.6)
          set(x + dx, GROUND - 8 + dy, C.lampGlow);
    rect(x - 1, GROUND - 9, x, GROUND - 8, C.lamp);
  }

  cached = {
    pixels: px,
    twinkles,
    beacons,
    elevator: { x: n, top: 38, bottom: GROUND - 2, color: C.needleWin },
    ferry: { y: GROUND - 7, from: 246, to: 330, sprite: FERRY, hull: C.ferry, window: C.ferryWin },
    flag: { x: n + 1, y: 11, sprite: FLAG, blue: C.flagBlue, shade: C.flagBlueShade, white: C.flagWhite },
  };
  return cached;
}
