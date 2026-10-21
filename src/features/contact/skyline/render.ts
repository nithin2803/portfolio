import { cssVar } from '@/lib/cssVar';
import { buildScene, COLS, LIGHTS, NEEDLE_X, PALETTE, ROWS } from './scene';

// how often the city moves: a light flickers, the elevator climbs, the ferry creeps along
export const SKYLINE_TICK_MS = 120;
const FLICKERS_PER_TICK = 2;
// the share of lights allowed to be off at once
const MAX_OFF = 0.12;
const BEACON_EVERY = 14;
const FERRY_EVERY = 4;
// the flag's wave: how far it turns per tick (a full ripple every ~3s), and its pixels per column
const FLAG_WAVE_STEP = 0.25;
const FLAG_WAVE_SPACING = 0.35;

// any CSS colour, including a var(--token), packed for ImageData
function rgba(color: string) {
  if (color === 'transparent') return 0;
  const token = /^var\((--[\w-]+)\)$/.exec(color)?.[1];
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.fillStyle = token ? cssVar(token) : color;
  const hex = String(probe.fillStyle);
  if (!hex.startsWith('#')) return 0;
  const n = parseInt(hex.slice(1, 7), 16);
  // ImageData is little-endian RGBA, so the packed word reads ABGR
  return (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16);
}

// the city at one pixel per cell; callers scale `canvas` up with smoothing off
export function createSkyline() {
  const { pixels, twinkles, beacons, elevator, ferry, flag } = buildScene();
  const canvas = document.createElement('canvas');
  canvas.width = COLS;
  canvas.height = ROWS;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(COLS, ROWS);
  const out = new Uint32Array(image.data.buffer);
  const colors = PALETTE.map(rgba);
  // a second layer with only the lit pixels, for callers that dim the city but want its lights to glow
  const lights = document.createElement('canvas');
  lights.width = COLS;
  lights.height = ROWS;
  const lightsCtx = lights.getContext('2d')!;
  const lightsImage = lightsCtx.createImageData(COLS, ROWS);
  const lightsOut = new Uint32Array(lightsImage.data.buffer);
  const lightColors = new Set(LIGHTS.map((i) => colors[i]));
  const paint = () => {
    ctx.putImageData(image, 0, 0);
    for (let i = 0; i < out.length; i++) lightsOut[i] = lightColors.has(out[i]) ? out[i] : 0;
    lightsCtx.putImageData(lightsImage, 0, 0);
  };
  const lit = new Uint8Array(twinkles.length).fill(1);
  let off = 0;
  let tick = 0;
  let lift = elevator.top;
  let ferryX = ferry.from;

  for (let i = 0; i < pixels.length; i++) out[i] = colors[pixels[i]];

  const put = (x: number, y: number, c: number) => {
    out[y * COLS + x] = colors[c];
  };
  const restore = (x: number, y: number) => {
    out[y * COLS + x] = colors[pixels[y * COLS + x]];
  };
  const pingPong = (t: number, span: number) => {
    const k = t % (span * 2);
    return k < span ? k : span * 2 - k;
  };

  const drawFerry = (x0: number, show: boolean) => {
    ferry.sprite.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch !== 'F' && ch !== 'w') return;
        if (show) put(x0 + dx, ferry.y + dy, ch === 'F' ? ferry.hull : ferry.window);
        else restore(x0 + dx, ferry.y + dy);
      }),
    );
  };
  drawFerry(ferryX, true);

  // the flag ripples out from the mast: each column rides a sine wave, still at the mast and up to a
  // pixel either way at the free end, and darker where it's turning away
  let wave = 0;
  let flagPixels: number[] = [];
  const drawFlag = () => {
    for (const at of flagPixels) out[at] = colors[pixels[at]];
    flagPixels = [];
    const { x, y, sprite, blue, shade, white } = flag;
    const width = sprite[0].length;
    for (let dx = 0; dx < width; dx++) {
      const reach = dx / (width - 1);
      const phase = wave - dx * FLAG_WAVE_SPACING;
      const lift = Math.round(Math.sin(phase) * reach);
      const turning = Math.cos(phase) * reach < -0.35;
      sprite.forEach((row, dy) => {
        const at = (y + dy + lift) * COLS + x + dx;
        out[at] = colors[row[dx] === 'W' ? white : turning ? shade : blue];
        flagPixels.push(at);
      });
    }
  };
  drawFlag();

  const step = () => {
    tick += 1;
    for (let k = 0; k < FLICKERS_PER_TICK; k++) {
      const i = Math.floor(Math.random() * twinkles.length);
      const on = !lit[i];
      if (!on && off >= twinkles.length * MAX_OFF) continue;
      lit[i] = on ? 1 : 0;
      off += on ? -1 : 1;
      out[twinkles[i].at] = colors[on ? twinkles[i].on : twinkles[i].off];
    }

    const flash = tick % BEACON_EVERY < 2;
    for (const b of beacons) out[b.at] = colors[flash ? b.on : b.off];

    restore(elevator.x, lift);
    restore(elevator.x, lift + 1);
    lift = elevator.bottom - pingPong(tick, elevator.bottom - elevator.top - 1);
    put(elevator.x, lift, elevator.color);
    put(elevator.x, lift + 1, elevator.color);

    if (tick % FERRY_EVERY === 0) {
      drawFerry(ferryX, false);
      ferryX = ferry.from + pingPong(tick / FERRY_EVERY, ferry.to - ferry.from);
      drawFerry(ferryX, true);
    }
    wave += FLAG_WAVE_STEP;
    drawFlag();
    paint();
  };

  paint();
  return { canvas, lights, step };
}

// where the city sits in a box, in device pixels: whole pixels per cell, resting on the bottom,
// with the Space Needle kept at `needleAt` of the width
export function skylineLayout(width: number, height: number, needleAt = 0.3) {
  const cell = Math.max(Math.ceil(width / COLS), Math.floor(height / ROWS));
  const w = COLS * cell;
  const x = Math.round(Math.min(0, Math.max(width - w, needleAt * width - NEEDLE_X * w)));
  return { x, y: height - ROWS * cell, w, h: ROWS * cell };
}
