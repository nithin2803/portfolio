import { grid, headings, type Grid } from './grid';

// Legend roles shared by every sprite; a tint decides what colour each role becomes
//   .  empty        o  outline     b  body       s  shade      l  light
//   :  body
//   e  eye          a  accent      w  white
export type Tint = {
  outline: string;
  shade: string;
  body: string;
  light: string;
  eye: string;
  accent: string;
};

export type SpriteDef = {
  frames: Grid[];
  fps: number;
  // turns to face where it is going; otherwise it is always drawn upright
  directional: boolean;
  // outline pixels that don't touch the body (legs, antennae) take the body colour, so they
  // show up against the dark sky instead of disappearing with the outline
  limbs: boolean;
};

export type Pixel = { x: number; y: number; color: string };
type Frame = { sx: number; sy: number; w: number; h: number; pixels: Pixel[] };

// one sprite in one tint, every heading and frame drawn once into a strip
export type Baked = { canvas: HTMLCanvasElement; cell: number; fps: number; frames: Frame[][] };

const WHITE = '#f2f4f8';

export function sprite(def: {
  frames: readonly (readonly string[])[];
  fps?: number;
  directional?: boolean;
  limbs?: boolean;
}): SpriteDef {
  return {
    frames: def.frames.map(grid),
    fps: def.fps ?? 0,
    directional: def.directional ?? false,
    limbs: def.limbs ?? false,
  };
}

const INSIDE = 'bsl:eaw';

// an outline pixel with no body pixel among its eight neighbours is part of a leg or antenna
function isLimb(g: Grid, x: number, y: number) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if (INSIDE.includes(g[y + dy]?.[x + dx] ?? '.')) return false;
  return true;
}

function colorOf(ch: string, tint: Tint): string | null {
  switch (ch) {
    case 'o':
      return tint.outline;
    case 'b':
    case ':':
      return tint.body;
    case 's':
      return tint.shade;
    case 'l':
      return tint.light;
    case 'e':
      return tint.eye;
    case 'a':
      return tint.accent;
    case 'w':
      return WHITE;
    default:
      return null;
  }
}

// `cell` is device pixels per sprite pixel; keep it a whole number so every pixel is the same size
export function bake(def: SpriteDef, tint: Tint, cell: number): Baked {
  const views = def.frames.map((f) => (def.directional ? headings(f) : [f]));
  const dirs = views[0].length;
  const cols = def.frames.length;
  const w = Math.max(...views.flat().map((g) => g[0].length));
  const h = Math.max(...views.flat().map((g) => g.length));
  const canvas = document.createElement('canvas');
  canvas.width = cols * w * cell;
  canvas.height = dirs * h * cell;
  const ctx = canvas.getContext('2d')!;

  const frames: Frame[][] = Array.from({ length: dirs }, (_, d) =>
    views.map((dirViews, f) => {
      const g = dirViews[d];
      const sx = f * w * cell;
      const sy = d * h * cell;
      const pixels: Pixel[] = [];
      g.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          const limb = def.limbs && ch === 'o' && isLimb(g, x, y);
          const color = limb ? tint.body : colorOf(ch, tint);
          if (!color) return;
          ctx.fillStyle = color;
          ctx.fillRect(sx + x * cell, sy + y * cell, cell, cell);
          pixels.push({ x: x - g[0].length / 2, y: y - g.length / 2, color });
        }),
      );
      return { sx, sy, w: g[0].length * cell, h: g.length * cell, pixels };
    }),
  );
  return { canvas, cell, fps: def.fps, frames };
}

// heading index for a velocity: 0 is up, counting clockwise in eighths
export function headingOf(vx: number, vy: number) {
  const turn = (Math.atan2(vx, -vy) / (Math.PI * 2) + 1) % 1;
  return Math.round(turn * 8) % 8;
}

export function frameAt(baked: Baked, seconds: number) {
  const count = baked.frames[0].length;
  if (!baked.fps) return 0;
  const n = Math.floor(seconds * baked.fps) % count;
  return n < 0 ? n + count : n;
}

// draws centred on (x, y) in device pixels, snapped to the sprite's own pixel grid
export function draw(
  ctx: CanvasRenderingContext2D,
  baked: Baked,
  { x, y, heading = 0, frame = 0 }: { x: number; y: number; heading?: number; frame?: number },
) {
  const f = baked.frames[heading % baked.frames.length][frame];
  const dx = Math.round((x - f.w / 2) / baked.cell) * baked.cell;
  const dy = Math.round((y - f.h / 2) / baked.cell) * baked.cell;
  ctx.drawImage(baked.canvas, f.sx, f.sy, f.w, f.h, dx, dy, f.w, f.h);
}

export const pixelsOf = (baked: Baked, heading = 0, frame = 0) =>
  baked.frames[heading % baked.frames.length][frame].pixels;
