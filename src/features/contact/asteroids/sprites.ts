// Detailed art drawn once into offscreen canvases, so a frame only has to copy and rotate them

export type Sprite = { canvas: HTMLCanvasElement; half: number };

export const SHIP_R = 18;

// hull outline in units of SHIP_R, nose along +x
export const SHIP_HULL = [
  [1.15, 0],
  [0.55, -0.18],
  [0.1, -0.3],
  [-0.35, -0.95],
  [-0.62, -0.95],
  [-0.5, -0.38],
  [-0.78, -0.3],
  [-0.78, 0.3],
  [-0.5, 0.38],
  [-0.62, 0.95],
  [-0.35, 0.95],
  [0.1, 0.3],
  [0.55, 0.18],
] as const;

export const SHIP_TAIL = -0.82;
export const SHIP_WINGTIPS = [
  [-0.5, -0.95],
  [-0.5, 0.95],
] as const;

function surface(size: number, scale: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.ceil(size * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.translate(size / 2, size / 2);
  return { canvas, ctx };
}

const path = (ctx: CanvasRenderingContext2D, pts: readonly (readonly number[])[], k: number) => {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
  ctx.closePath();
};

export function shipSprite(scale: number): Sprite {
  const r = SHIP_R;
  const size = r * 3;
  const { canvas, ctx } = surface(size, scale);

  path(ctx, SHIP_HULL, r);
  ctx.fillStyle = '#16181c';
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#23262c';
  ctx.fillRect(-r, -r, 2 * r, r);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.18)';
  ctx.lineWidth = 0.8;
  for (const [x0, y0, x1, y1] of [
    [0.7, 0, -0.75, 0],
    [0.05, -0.3, -0.45, -0.85],
    [0.05, 0.3, -0.45, 0.85],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x0 * r, y0 * r);
    ctx.lineTo(x1 * r, y1 * r);
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(0.62 * r, 0);
  ctx.lineTo(0.22 * r, -0.12 * r);
  ctx.lineTo(0.22 * r, 0.12 * r);
  ctx.closePath();
  ctx.fillStyle = '#d9dde4';
  ctx.fill();

  ctx.fillStyle = '#d9dde4';
  for (const sy of [-1, 1]) ctx.fillRect(-0.88 * r, sy * 0.15 * r - 0.06 * r, 0.1 * r, 0.12 * r);

  path(ctx, SHIP_HULL, r);
  ctx.strokeStyle = '#f2f4f8';
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  return { canvas, half: size / 2 };
}

// the hull as a solid white shape with a little bleed, for tinting the whole ship at once
export function shipMask(scale: number): Sprite {
  const r = SHIP_R;
  const size = r * 3;
  const { canvas, ctx } = surface(size, scale);
  path(ctx, SHIP_HULL, r);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
  return { canvas, half: size / 2 };
}

// a soft round blob, scaled and tinted by alpha for dust and glows
export function softDot(scale: number, color: string): Sprite {
  const size = 32;
  const { canvas, ctx } = surface(size, scale);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  return { canvas, half: size / 2 };
}
