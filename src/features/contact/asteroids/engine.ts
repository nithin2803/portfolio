import { cssVar } from '@/lib/cssVar';
import { easeInOutCubic } from '@/lib/math';
import { createSkyline, SKYLINE_TICK_MS, skylineLayout } from '../skyline/render';
import { COLS, ROWS } from '../skyline/scene';
import {
  BUGS,
  ENEMIES,
  PIXEL_SIZE,
  POWER_KINDS,
  POWERS,
  type BugSize,
  type EnemyKind,
  type PowerKind,
} from './cast';
import { bake, draw as drawPixels, frameAt, headingOf, pixelsOf, type Baked } from './pixels/bake';
import { starTint } from './pixels/powerups';
import { createPost } from './post';
import { SHIP_R, SHIP_TAIL, SHIP_WINGTIPS, shipMask, shipSprite, softDot, type Sprite } from './sprites';

export type Input = { left: boolean; right: boolean; thrust: boolean; fire: boolean };
export type Point = { x: number; y: number };
// where the send icon sits: its centre, which way it points, and how wide it is on screen
export type Pose = Point & { angle: number; size: number };
export type Box = { left: number; top: number; width: number; height: number };
export type Booster = { core: string; mid: string; tail: string };
// the signal ramp the laser tails shimmer through
export type Iris = readonly string[];
export const irisColors = (): Iris =>
  ['ice', 'blue', 'violet', 'red'].map((c) => cssVar(`--color-signal-${c}`));
export type GameHooks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onWave: (wave: number) => void;
  // a power-up starting, or null when the active one runs out
  onPower: (kind: PowerKind | null) => void;
  // the ship has arrived and the first wave is out
  onLaunched: () => void;
  onOver: () => void;
  onLanded: () => void;
};

type Body = Point & { vx: number; vy: number };
type Bug = Body & { size: BugSize; species: number; r: number; flash: number; phase: number };
type Shot = Body & { life: number; bounces: number };
type Pickup = Body & { kind: PowerKind; life: number };
type Particle = Body & {
  kind: 'spark' | 'dust' | 'ring' | 'flash' | 'text' | 'glint';
  life: number;
  max: number;
  size: number;
  text?: string;
  color?: string;
};
// a pixel knocked off a squashed bug
type Bit = Body & { color: string; life: number; max: number };
type Enemy = Body & {
  kind: EnemyKind;
  r: number;
  baseY: number;
  age: number;
  cooldown: number;
  phase: number;
};
// a stinger: a short pixel bolt that fades out like the lasers
type Bolt = Body & { color: string; life: number };
type Star = Point & { depth: number; phase: number };

const RENDER_SCALE_MAX = 1.5;
const TURN = 4.3;
// turning eases in gently and settles fast, per second: a tap nudges a few degrees, holding reaches
// full TURN, and letting go stops the ship without drifting on
const TURN_EASE = { in: 8, out: 25 };
const THRUST = 440;
const DRAG = 0.5;
const MAX_V = 580;
const SHOT_V = 840;
const SHOT_LIFE = 0.8;
const SHOT_TRAIL = 34;
// shots fade out over their last stretch instead of vanishing
const SHOT_FADE_S = 0.3;
const FIRE_EVERY = 0.15;
const MAX_SHOTS = 8;
const LIVES = 3;
const RESPAWN_S = 1.6;
const SHIELD_S = 2.6;
// the shield blinks, faster and faster, for its last second
const SHIELD_BLINK_S = 1;
// how fast the shielded ship cycles through the rainbow, in degrees a second
const SHIELD_HUE_SPEED = 720;
const SHIELD_GLINTS_PER_S = 24;
const EXHAUST_V = 240;
const EXHAUST_LIFE = 0.38;
const EXHAUST_WIDTH = 7;
// a gap this wide between exhaust points means the ship wrapped, so the ribbon breaks
const EXHAUST_BREAK = 60;
const WAVE_PAUSE_S = 1.8;
const TWEEN_S = 0.8;
const SAFE_SPAWN = 240;
const MAX_PARTICLES = 700;
const MAX_BITS = 900;
const SKYLINE_ALPHA = 0.38;
// the city stays dim behind the game, but its windows, beacons and lamps glow in colour
const SKYLINE_LIGHTS_ALPHA = 0.9;
const SPLIT_REST = 0.0035;
// how hard each event tears the screen, from 0 to 1
const GLITCH = { launch: 0.7, wave: 0.35, death: 1, over: 1, shipIt: 0.8 };
// bugs veer a little as they go, in radians a second
const WANDER = 0.9;
const DROP_CHANCE = 0.1;
const PICKUP_LIFE = 9;
// a pickup blinks for its last seconds before it disappears
const PICKUP_BLINK_S = 2.5;
const PICKUP_REACH = 24;
// pickups stay this far inside the screen (more at the top, clear of the HUD) so none hide at an edge
const PICKUP_INSET = { side: 72, top: 120, bottom: 72 };
const COFFEE_FIRE_EVERY = FIRE_EVERY / 3;
const COFFEE_MAX_SHOTS = 20;
const BANK_SHOT_BOUNCES = 2;
const BANK_SHOT_LIFE = 1.4;
const STAR_HUES = 12;
// enemies start showing up from this wave, one at a time, every so often
const ENEMY_FROM_WAVE = 2;
const HORNET_FROM_WAVE = 5;
const ENEMY_EVERY_S = [18, 28] as const;
// how far the enemy bobs up and down as it crosses, and how fast
const ENEMY_WOBBLE = { height: 34, speed: 2.2 };
const ENEMY_DROP_CHANCE = 0.4;
// a chevron blinks at the edge this long before an enemy flies in from there
const ENEMY_WARNING_S = 1.2;
const CHEVRON = ['xx...', '.xx..', '..xx.', '.xx..', 'xx...'];
const CHEVRON_INSET = 18;
// a hornet aims, give or take this much (radians)
const HORNET_SPREAD = 0.12;
const BOLT_V = 300;
const BOLT_LIFE = 1.8;
const BOLT_FADE_S = 0.3;
// cells in a stinger's streak, head first
const BOLT_CELLS = 3;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function pickPower(allowShipIt: boolean): PowerKind {
  const kinds = allowShipIt ? POWER_KINDS : POWER_KINDS.filter((k) => k !== 'shipIt');
  const total = kinds.reduce((sum, k) => sum + POWERS[k].weight, 0);
  let roll = Math.random() * total;
  return kinds.find((k) => (roll -= POWERS[k].weight) < 0) ?? 'coffee';
}

// `canvas` gets the glowing layer (finished on the GPU when it can be); `pixels` stays crisp on top
export function createGame(
  canvas: HTMLCanvasElement,
  pixels: HTMLCanvasElement,
  {
    booster,
    iris,
    font,
    skyline,
    still,
    hooks,
  }: {
    booster: Booster;
    iris: Iris;
    font: string;
    // the section's skyline on screen, so the game's city lands exactly where it was
    skyline: Box | null;
    still: boolean;
    hooks: GameHooks;
  },
) {
  const post = createPost(canvas);
  const frame = post ? document.createElement('canvas') : canvas;
  const ctx = frame.getContext('2d')!;
  const px = pixels.getContext('2d')!;
  const input: Input = { left: false, right: false, thrust: false, fire: false };
  const sky = createSkyline();
  let w = 0;
  let h = 0;
  let scale = 1;
  let cell = PIXEL_SIZE;
  let art = {} as {
    ship: Sprite;
    mask: Sprite;
    tint: HTMLCanvasElement;
    white: Sprite;
    grey: Sprite;
    nebula: HTMLCanvasElement;
    bugs: Record<BugSize, Baked[]>;
    powers: Record<Exclude<PowerKind, 'star'>, Baked>;
    stars: Baked[];
    enemies: Record<EnemyKind, Baked>;
  };
  let stars: Star[] = [];
  let skyBox: Box = { left: 0, top: 0, width: 0, height: 0 };

  // the same layout the section uses, so the city doesn't jump when the game takes over;
  // without the section to match, it spans the screen along the bottom
  const placeSkyline = (): Box => {
    const dpr = devicePixelRatio;
    const box = skyline ?? { left: 0, top: 0, width: w, height: h };
    const at = skyline
      ? skylineLayout(box.width * dpr, box.height * dpr)
      : { x: 0, y: (h - (w * ROWS) / COLS) * dpr, w: w * dpr, h: ((w * ROWS) / COLS) * dpr };
    return { left: box.left + at.x / dpr, top: box.top + at.y / dpr, width: at.w / dpr, height: at.h / dpr };
  };

  const ship = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, scale: 1, alive: true, shield: 0 };
  let bugs: Bug[] = [];
  let shots: Shot[] = [];
  let pickups: Pickup[] = [];
  let particles: Particle[] = [];
  let bits: Bit[] = [];
  let enemies: Enemy[] = [];
  let bolts: Bolt[] = [];
  let nextEnemy = rand(...ENEMY_EVERY_S);
  let incoming: { kind: EnemyKind; fromLeft: boolean; baseY: number; left: number } | null = null;
  let paused = false;
  let exhaust: (Body & { age: number; streak: number })[] = [];
  let power: { kind: PowerKind; left: number } | null = null;
  let streak = 0;
  let shipItThisWave = false;
  let thrusting = false;
  let phase: 'launch' | 'play' | 'over' | 'land' = 'launch';
  let tween: { from: typeof ship; to: Point & { angle: number; scale: number }; t: number } | null = null;
  let presence = 0;
  let fade = 1;
  let score = 0;
  let lives = LIVES;
  let wave = 0;
  let cooldown = 0;
  let respawn = 0;
  let nextWave = 0;
  let shake = 0;
  let shakeX = 0;
  let shakeY = 0;
  let split = 0;
  let glitch = 0;
  let clock = 0;
  let skyClock = 0;
  let frameId = 0;
  let last = 0;

  const powered = (kind: PowerKind) => power?.kind === kind;
  const endPower = () => {
    if (!power) return;
    power = null;
    hooks.onPower(null);
  };

  const nebula = () => {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w / 4);
    c.height = Math.ceil(h / 4);
    const g = c.getContext('2d')!;
    for (let i = 0; i < 6; i++) {
      const x = rand(0, c.width);
      const y = rand(0, c.height * 0.7);
      const r = rand(c.width * 0.15, c.width * 0.4);
      const blob = g.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, `rgb(150 158 175 / ${rand(0.04, 0.09)})`);
      blob.addColorStop(1, 'transparent');
      g.fillStyle = blob;
      g.fillRect(0, 0, c.width, c.height);
    }
    const band = g.createLinearGradient(0, c.height * 0.2, c.width, c.height * 0.6);
    band.addColorStop(0, 'transparent');
    band.addColorStop(0.5, 'rgb(200 206 220 / 0.035)');
    band.addColorStop(1, 'transparent');
    g.fillStyle = band;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    scale = Math.min(devicePixelRatio, RENDER_SCALE_MAX);
    cell = Math.round(PIXEL_SIZE * scale);
    frame.width = pixels.width = Math.round(w * scale);
    frame.height = pixels.height = Math.round(h * scale);
    post?.resize(frame.width, frame.height);
    const pixelArt = (size: BugSize) => BUGS[size].species.map((s) => bake(s.art, s.tint, cell));
    const powerArt = (kind: Exclude<PowerKind, 'star'>) => bake(POWERS[kind].art, POWERS[kind].tint!, cell);
    art = {
      ship: shipSprite(scale),
      mask: shipMask(scale),
      tint: document.createElement('canvas'),
      white: softDot(scale, 'rgb(255 255 255 / 0.95)'),
      grey: softDot(scale, 'rgb(190 196 208 / 0.4)'),
      nebula: nebula(),
      bugs: { 1: pixelArt(1), 2: pixelArt(2), 3: pixelArt(3) },
      powers: { basketball: powerArt('basketball'), coffee: powerArt('coffee'), shipIt: powerArt('shipIt') },
      enemies: {
        wasp: bake(ENEMIES.wasp.art, ENEMIES.wasp.tint, cell),
        hornet: bake(ENEMIES.hornet.art, ENEMIES.hornet.tint, cell),
      },
      stars: Array.from({ length: STAR_HUES }, (_, i) =>
        bake(POWERS.star.art, starTint((i * 360) / STAR_HUES), cell),
      ),
    };
    skyBox = placeSkyline();
    stars = Array.from({ length: Math.round((w * h) / 7000) }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      depth: rand(0.15, 1) ** 2,
      phase: rand(0, Math.PI * 2),
    }));
  };

  const wrap = (b: Point, r: number) => {
    if (b.x < -r) b.x += w + r * 2;
    else if (b.x > w + r) b.x -= w + r * 2;
    if (b.y < -r) b.y += h + r * 2;
    else if (b.y > h + r) b.y -= h + r * 2;
  };

  const emit = (p: Partial<Particle> & Pick<Particle, 'kind' | 'x' | 'y' | 'life'>) => {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({ vx: 0, vy: 0, size: 1, max: p.life, ...p });
  };

  const scatter = (at: Point, speed: number) => {
    const a = rand(0, Math.PI * 2);
    const v = rand(speed * 0.25, speed);
    return { x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v };
  };

  const explode = (at: Body, size: number, r: number) => {
    for (let i = 0; i < 10 + size * 12; i++)
      emit({ kind: 'spark', ...scatter(at, 180 + size * 90), life: rand(0.25, 0.8) });
    for (let i = 0; i < 3 + size * 3; i++) {
      const p = scatter(at, 40 + size * 15);
      p.vx += at.vx * 0.4;
      p.vy += at.vy * 0.4;
      emit({ kind: 'dust', ...p, life: rand(0.8, 1.5), size: r * rand(0.6, 1.2) });
    }
    emit({ kind: 'ring', x: at.x, y: at.y, life: 0.45, size: r * 2.6 });
    emit({ kind: 'flash', x: at.x, y: at.y, life: 0.12, size: r * 2.2 });
    shake = Math.min(18, shake + size * 3);
    split += 0.004 * size;
  };

  // a sprite's own pixels fly apart, keeping their colours
  const burst = (baked: Baked, bug: Body & { phase: number }) => {
    const size = cell / scale;
    for (const p of pixelsOf(baked, headingOf(bug.vx, bug.vy), frameAt(baked, clock + bug.phase))) {
      if (bits.length >= MAX_BITS) bits.shift();
      const dist = Math.hypot(p.x, p.y) || 1;
      const v = rand(60, 200);
      const life = rand(0.6, 1.1);
      bits.push({
        x: bug.x + p.x * size,
        y: bug.y + p.y * size,
        vx: bug.vx * 0.5 + (p.x / dist) * v,
        vy: bug.vy * 0.5 + (p.y / dist) * v,
        color: p.color,
        life,
        max: life,
      });
    }
  };

  const makeBug = (size: BugSize, at: Point): Bug => {
    const { speed } = BUGS[size];
    const species = Math.floor(Math.random() * art.bugs[size].length);
    const baked = art.bugs[size][species];
    const dir = rand(0, Math.PI * 2);
    const v = rand(speed[0], speed[1]);
    const { w: bw, h: bh } = baked.frames[0][0];
    return {
      x: at.x,
      y: at.y,
      vx: Math.cos(dir) * v,
      vy: Math.sin(dir) * v,
      size,
      species,
      r: (Math.max(bw, bh) / scale / 2) * 0.85,
      flash: 0,
      phase: rand(0, 1),
    };
  };

  const award = (points: number, at: Point) => {
    score += points;
    hooks.onScore(score);
    emit({ kind: 'text', x: at.x, y: at.y, vy: -40, life: 0.9, size: 10, text: `+${points}` });
  };

  const drop = (at: Body, chance: number) => {
    if (Math.random() >= chance) return;
    const kind = pickPower(!shipItThisWave);
    if (kind === 'shipIt') shipItThisWave = true;
    pickups.push({
      x: Math.min(w - PICKUP_INSET.side, Math.max(PICKUP_INSET.side, at.x)),
      y: Math.min(h - PICKUP_INSET.bottom, Math.max(PICKUP_INSET.top, at.y)),
      vx: at.vx * 0.2,
      vy: at.vy * 0.2,
      kind,
      life: PICKUP_LIFE,
    });
  };

  // `byPlayer` false when a stinger got it: no points, no drop
  const squash = (bug: Bug, from: Body | null, byPlayer = true) => {
    bug.r = 0;
    burst(art.bugs[bug.size][bug.species], bug);
    explode(bug, bug.size, bug.size * 14);
    if (byPlayer) {
      award(BUGS[bug.size].points, bug);
      drop(bug, DROP_CHANCE);
    }
    if (bug.size === 1) return [];
    return [0, 1].map(() => {
      const child = makeBug((bug.size - 1) as BugSize, bug);
      if (from) {
        child.vx += from.vx * 0.05;
        child.vy += from.vy * 0.05;
      }
      child.flash = 1;
      return child;
    });
  };

  const spawnWave = () => {
    wave += 1;
    shipItThisWave = false;
    hooks.onWave(wave);
    if (wave > 1) glitch = Math.max(glitch, GLITCH.wave);
    for (let i = 0; i < Math.min(3 + wave, 11); i++) {
      let at: Point;
      do at = { x: rand(0, w), y: rand(0, h) };
      while (Math.hypot(at.x - ship.x, at.y - ship.y) < SAFE_SPAWN);
      bugs.push(makeBug(3, at));
    }
  };

  const warnEnemy = () => {
    incoming = {
      kind: wave >= HORNET_FROM_WAVE && Math.random() < 0.5 ? 'hornet' : 'wasp',
      fromLeft: Math.random() < 0.5,
      baseY: rand(h * 0.18, h * 0.7),
      left: ENEMY_WARNING_S,
    };
  };

  const spawnEnemy = ({ kind, fromLeft, baseY }: NonNullable<typeof incoming>) => {
    const baked = art.enemies[kind];
    const r = (Math.max(baked.frames[0][0].w, baked.frames[0][0].h) / scale / 2) * 0.85;
    const { speed, fireEvery } = ENEMIES[kind];
    enemies.push({
      kind,
      r,
      x: fromLeft ? -r : w + r,
      y: baseY,
      baseY,
      vx: fromLeft ? speed : -speed,
      vy: 0,
      age: 0,
      cooldown: fireEvery * 0.6,
      phase: rand(0, 1),
    });
  };

  const swat = (e: Enemy) => {
    e.r = 0;
    burst(art.enemies[e.kind], e);
    explode(e, 2, 30);
    award(ENEMIES[e.kind].points, e);
    drop(e, ENEMY_DROP_CHANCE);
  };

  const killShip = () => {
    ship.alive = false;
    endPower();
    lives -= 1;
    hooks.onLives(lives);
    explode(ship, 3, 40);
    shake = 22;
    split += 0.02;
    glitch = GLITCH.death;
    if (lives > 0) respawn = RESPAWN_S;
    else {
      phase = 'over';
      glitch = GLITCH.over;
      hooks.onOver();
    }
  };

  const resetShip = () => {
    Object.assign(ship, {
      x: w / 2,
      y: h / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      spin: 0,
      alive: true,
      shield: SHIELD_S,
    });
  };

  const fly = (to: Point & { angle: number; scale: number }) => {
    tween = { from: { ...ship }, to, t: still ? 1 : 0 };
  };

  const collect = (kind: PowerKind) => {
    hooks.onPower(kind);
    emit({
      kind: 'text',
      x: ship.x,
      y: ship.y - SHIP_R * 1.6,
      vy: -30,
      life: 1.4,
      size: 11,
      text: POWERS[kind].title,
    });
    if (kind === 'shipIt') {
      bugs = bugs.flatMap((b) => {
        squash(b, null);
        return [];
      });
      emit({ kind: 'ring', x: ship.x, y: ship.y, life: 0.7, size: Math.hypot(w, h) * 0.6 });
      glitch = GLITCH.shipIt;
      shake = 20;
      split += 0.02;
      return;
    }
    power = { kind, left: POWERS[kind].seconds };
    if (kind === 'star') ship.shield = POWERS.star.seconds;
  };

  const step = (dt: number) => {
    clock += dt;
    skyClock += dt * 1000;
    if (skyClock > SKYLINE_TICK_MS) {
      skyClock = 0;
      if (!still) sky.step();
    }
    shake *= Math.exp(-7 * dt);
    split *= Math.exp(-5 * dt);
    glitch *= Math.exp(-4 * dt);

    if (tween) {
      tween.t = Math.min(1, tween.t + dt / TWEEN_S);
      const k = easeInOutCubic(tween.t);
      const { from, to } = tween;
      ship.x = from.x + (to.x - from.x) * k;
      ship.y = from.y + (to.y - from.y) * k;
      ship.angle = from.angle + (to.angle - from.angle) * k;
      ship.scale = from.scale + (to.scale - from.scale) * k;
      presence = phase === 'launch' ? k : 1 - k;
      if (tween.t === 1) {
        tween = null;
        if (phase === 'launch') {
          phase = 'play';
          ship.shield = SHIELD_S;
          spawnWave();
          hooks.onLaunched();
        } else if (phase === 'land') hooks.onLanded();
      }
    }
    if (phase === 'land') fade = Math.max(0, fade - dt / TWEEN_S);

    if (power) {
      power.left -= dt;
      if (power.left <= 0) endPower();
    }

    if (phase === 'play' && ship.alive) {
      const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const ease = turn ? TURN_EASE.in : TURN_EASE.out;
      ship.spin += (turn * TURN - ship.spin) * Math.min(1, ease * dt);
      ship.angle += ship.spin * dt;
      const cos = Math.cos(ship.angle);
      const sin = Math.sin(ship.angle);
      if (input.thrust) {
        ship.vx += cos * THRUST * dt;
        ship.vy += sin * THRUST * dt;
        const x = ship.x + cos * SHIP_TAIL * SHIP_R;
        const y = ship.y + sin * SHIP_TAIL * SHIP_R;
        const prev = exhaust[exhaust.length - 1];
        if (!thrusting || (prev && Math.hypot(prev.x - x, prev.y - y) > EXHAUST_BREAK)) streak += 1;
        exhaust.push({ x, y, vx: ship.vx - cos * EXHAUST_V, vy: ship.vy - sin * EXHAUST_V, age: 0, streak });
      }
      thrusting = input.thrust;
      if (turn && Math.random() < 0.5) {
        const [lx, ly] = SHIP_WINGTIPS[turn > 0 ? 0 : 1];
        emit({
          kind: 'spark',
          x: ship.x + (cos * lx - sin * ly) * SHIP_R,
          y: ship.y + (sin * lx + cos * ly) * SHIP_R,
          vx: ship.vx - sin * turn * 90,
          vy: ship.vy + cos * turn * 90,
          life: 0.12,
        });
      }
      const v = Math.hypot(ship.vx, ship.vy);
      if (v > MAX_V) {
        ship.vx *= MAX_V / v;
        ship.vy *= MAX_V / v;
      }
      ship.shield = Math.max(0, ship.shield - dt);
      if (ship.shield > 0 && Math.random() < SHIELD_GLINTS_PER_S * dt) {
        const a = rand(0, Math.PI * 2);
        const d = rand(0.6, 1.4) * SHIP_R;
        emit({
          kind: 'glint',
          x: ship.x + Math.cos(a) * d,
          y: ship.y + Math.sin(a) * d,
          vx: ship.vx * 0.6,
          vy: ship.vy * 0.6,
          life: rand(0.25, 0.45),
          size: rand(3, 6),
          color: `hsl(${(clock * SHIELD_HUE_SPEED + rand(0, 360)) % 360} 100% 72%)`,
        });
      }
      cooldown -= dt;
      const caffeinated = powered('coffee');
      const maxShots = caffeinated ? COFFEE_MAX_SHOTS : MAX_SHOTS;
      if (input.fire && cooldown <= 0 && shots.length < maxShots) {
        cooldown = caffeinated ? COFFEE_FIRE_EVERY : FIRE_EVERY;
        const nose = SHIP_R * 1.15;
        const x = ship.x + cos * nose;
        const y = ship.y + sin * nose;
        const bank = powered('basketball');
        shots.push({
          x,
          y,
          vx: ship.vx + cos * SHOT_V,
          vy: ship.vy + sin * SHOT_V,
          life: bank ? BANK_SHOT_LIFE : SHOT_LIFE,
          bounces: bank ? BANK_SHOT_BOUNCES : 0,
        });
        emit({ kind: 'flash', x, y, life: 0.07, size: 16 });
      }
    }
    if (phase === 'play' || phase === 'over') {
      const drag = Math.exp(-DRAG * dt);
      ship.vx *= drag;
      ship.vy *= drag;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      wrap(ship, SHIP_R);
    }

    for (const s of stars) {
      s.x -= (6 + ship.vx * 0.04) * s.depth * dt;
      s.y -= ship.vy * 0.04 * s.depth * dt;
      wrap(s, 0);
    }
    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      // bank shots ricochet off the edges instead of wrapping
      if (s.bounces > 0 && (s.x < 0 || s.x > w)) {
        s.vx = -s.vx;
        s.x = Math.min(w, Math.max(0, s.x));
        s.bounces -= 1;
      }
      if (s.bounces > 0 && (s.y < 0 || s.y > h)) {
        s.vy = -s.vy;
        s.y = Math.min(h, Math.max(0, s.y));
        s.bounces -= 1;
      }
      wrap(s, 0);
    }
    for (const b of bugs) {
      const veer = rand(-1, 1) * WANDER * dt;
      const vx = b.vx * Math.cos(veer) - b.vy * Math.sin(veer);
      b.vy = b.vx * Math.sin(veer) + b.vy * Math.cos(veer);
      b.vx = vx;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.flash = Math.max(0, b.flash - dt * 2.5);
      wrap(b, b.r);
    }
    for (const p of pickups) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      // drift around inside the inset box, bouncing off its walls
      if (p.x < PICKUP_INSET.side || p.x > w - PICKUP_INSET.side) p.vx = -p.vx;
      if (p.y < PICKUP_INSET.top || p.y > h - PICKUP_INSET.bottom) p.vy = -p.vy;
    }
    pickups = pickups.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.kind === 'spark' ? 0.92 : 0.97;
      p.vx *= drag;
      p.vy *= drag;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const b of bits) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 0.95;
      b.vy *= 0.95;
      b.life -= dt;
    }
    bits = bits.filter((b) => b.life > 0);
    for (const e of exhaust) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.age += dt;
    }
    exhaust = exhaust.filter((e) => e.age < EXHAUST_LIFE);

    if (phase === 'play' && wave >= ENEMY_FROM_WAVE && !enemies.length && !incoming) {
      nextEnemy -= dt;
      if (nextEnemy <= 0) {
        nextEnemy = rand(...ENEMY_EVERY_S);
        warnEnemy();
      }
    }
    if (incoming) {
      incoming.left -= dt;
      if (incoming.left <= 0) {
        if (phase === 'play') spawnEnemy(incoming);
        incoming = null;
      }
    }
    for (const e of enemies) {
      e.age += dt;
      e.x += e.vx * dt;
      const y = e.baseY + Math.sin(e.age * ENEMY_WOBBLE.speed) * ENEMY_WOBBLE.height;
      e.vy = (y - e.y) / (dt || 1);
      e.y = y;
      e.cooldown -= dt;
      if (e.cooldown <= 0 && phase === 'play') {
        const { fireEvery, aims, bolt } = ENEMIES[e.kind];
        e.cooldown = fireEvery;
        const a =
          aims && ship.alive
            ? Math.atan2(ship.y - e.y, ship.x - e.x) + rand(-HORNET_SPREAD, HORNET_SPREAD)
            : rand(0, Math.PI * 2);
        bolts.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * BOLT_V,
          vy: Math.sin(a) * BOLT_V,
          color: bolt,
          life: BOLT_LIFE,
        });
      }
    }
    // they cross once: gone when they leave the far side
    enemies = enemies.filter((e) => e.r > 0 && e.x > -e.r * 2 && e.x < w + e.r * 2);
    for (const b of bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      wrap(b, 0);
    }

    if (phase !== 'play' && phase !== 'over') {
      shots = shots.filter((s) => s.life > 0);
      return;
    }

    const children: Bug[] = [];
    for (const b of bugs) {
      const hit = shots.find((s) => s.life > 0 && Math.hypot(s.x - b.x, s.y - b.y) < b.r);
      if (!hit) continue;
      hit.life = 0;
      children.push(...squash(b, hit));
    }
    for (const bolt of bolts) {
      const bug = bugs.find((b) => b.r > 0 && Math.hypot(bolt.x - b.x, bolt.y - b.y) < b.r);
      if (!bug) continue;
      bolt.life = 0;
      children.push(...squash(bug, bolt, false));
    }
    bugs = bugs.filter((b) => b.r > 0).concat(children);
    for (const e of enemies) {
      const hit = shots.find((s) => s.life > 0 && Math.hypot(s.x - e.x, s.y - e.y) < e.r);
      if (!hit) continue;
      hit.life = 0;
      swat(e);
    }
    enemies = enemies.filter((e) => e.r > 0);
    shots = shots.filter((s) => s.life > 0);

    if (phase !== 'play' || !ship.alive) {
      if (!ship.alive && respawn > 0) {
        respawn -= dt;
        if (respawn <= 0) resetShip();
      }
    } else {
      const reach = pickups.find((p) => Math.hypot(p.x - ship.x, p.y - ship.y) < PICKUP_REACH);
      if (reach) {
        reach.life = 0;
        collect(reach.kind);
      }
      const touching = bugs.filter(
        (b) => Math.hypot(b.x - ship.x, b.y - ship.y) < b.r * 0.85 + SHIP_R * 0.55,
      );
      const rammed = enemies.filter((e) => Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + SHIP_R * 0.55);
      const stung = bolts.find((b) => b.life > 0 && Math.hypot(b.x - ship.x, b.y - ship.y) < SHIP_R * 0.6);
      if (powered('star')) {
        // a star ploughs straight through bugs and enemies alike
        const spawned = touching.flatMap((b) => squash(b, ship));
        bugs = bugs.filter((b) => b.r > 0).concat(spawned);
        rammed.forEach(swat);
        enemies = enemies.filter((e) => e.r > 0);
        if (stung) stung.life = 0;
      } else if ((touching.length || rammed.length || stung) && !ship.shield) {
        if (stung) stung.life = 0;
        killShip();
      }
    }
    bolts = bolts.filter((b) => b.life > 0);
    if (phase === 'play' && !bugs.length) {
      nextWave = nextWave || WAVE_PAUSE_S;
      nextWave -= dt;
      if (nextWave <= 0) {
        nextWave = 0;
        spawnWave();
      }
    }
  };

  const sprite = (s: Sprite, x: number, y: number, size: number) => {
    ctx.drawImage(s.canvas, x - size / 2, y - size / 2, size, size);
  };

  const drawBackdrop = () => {
    ctx.globalAlpha = presence;
    const drift = Math.sin(clock * 0.05) * 20;
    ctx.drawImage(art.nebula, drift - 20, 0, w + 40, h);
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      const twinkle = 0.65 + 0.35 * Math.sin(clock * 2 + s.phase);
      ctx.globalAlpha = presence * (0.15 + 0.75 * s.depth) * twinkle;
      const size = s.depth > 0.6 ? 1.6 : 1;
      ctx.fillRect(s.x, s.y, size, size);
    }
    ctx.globalAlpha = presence * SKYLINE_ALPHA;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sky.canvas, skyBox.left, skyBox.top, skyBox.width, skyBox.height);
    ctx.globalAlpha = presence * SKYLINE_LIGHTS_ALPHA;
    ctx.drawImage(sky.lights, skyBox.left, skyBox.top, skyBox.width, skyBox.height);
    ctx.imageSmoothingEnabled = true;
  };

  // the exhaust as one ribbon, narrowing and cooling from white through the booster colours
  const drawExhaust = () => {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < exhaust.length; i++) {
      const a = exhaust[i - 1];
      const b = exhaust[i];
      if (a.streak !== b.streak) continue;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const wa = (EXHAUST_WIDTH / 2) * (1 - a.age / EXHAUST_LIFE);
      const wb = (EXHAUST_WIDTH / 2) * (1 - b.age / EXHAUST_LIFE);
      const t = a.age / EXHAUST_LIFE;
      ctx.globalAlpha = (1 - t) * fade;
      ctx.fillStyle = t < 0.2 ? booster.core : t < 0.55 ? booster.mid : booster.tail;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * wa, a.y + ny * wa);
      ctx.lineTo(b.x + nx * wb, b.y + ny * wb);
      ctx.lineTo(b.x - nx * wb, b.y - ny * wb);
      ctx.lineTo(a.x - nx * wa, a.y - ny * wa);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  // the whole ship cycles through the rainbow while it can't be hurt, like a Mario Kart star
  const drawShield = () => {
    const left = ship.shield;
    if (left <= 0 || phase !== 'play') return;
    if (left < SHIELD_BLINK_S && Math.sin(clock * (14 + (SHIELD_BLINK_S - left) * 40)) < 0) return;
    const { canvas: mask, half } = art.mask;
    const tint = art.tint;
    if (tint.width !== mask.width) tint.width = tint.height = mask.width;
    const t = tint.getContext('2d')!;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, tint.width, tint.height);
    t.drawImage(mask, 0, 0);
    t.globalCompositeOperation = 'source-in';
    const hue = clock * SHIELD_HUE_SPEED;
    const band = t.createLinearGradient(0, 0, tint.width, tint.height);
    for (let i = 0; i <= 6; i++) band.addColorStop(i / 6, `hsl(${(hue + i * 60) % 360} 100% 66%)`);
    t.fillStyle = band;
    t.fillRect(0, 0, tint.width, tint.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.9;
    ctx.drawImage(tint, -half, -half, half * 2, half * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  const drawShip = () => {
    if (!ship.alive) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.scale(ship.scale, ship.scale);
    const r = SHIP_R;
    if (input.thrust && phase === 'play') {
      ctx.globalCompositeOperation = 'lighter';
      const x0 = SHIP_TAIL * r;
      const tail = r * rand(1.6, 2.6);
      const layers = [
        { width: 0.42, length: 1, from: booster.mid, to: booster.tail },
        { width: 0.18, length: 0.55, from: '#ffffff', to: booster.core },
      ];
      for (const { width, length, from, to } of layers) {
        const end = x0 - tail * length;
        const flame = ctx.createLinearGradient(x0, 0, end, 0);
        flame.addColorStop(0, from);
        flame.addColorStop(0.5, to);
        flame.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.moveTo(x0, -r * width);
        ctx.quadraticCurveTo(x0 - tail * length * 0.4, -r * width * 0.8, end, 0);
        ctx.quadraticCurveTo(x0 - tail * length * 0.4, r * width * 0.8, x0, r * width);
        ctx.fillStyle = flame;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const { canvas: hull, half } = art.ship;
    ctx.drawImage(hull, -half, -half, half * 2, half * 2);
    drawShield();
    if (Math.sin(clock * 7) > 0.2) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [lx, ly] of SHIP_WINGTIPS) sprite(art.white, lx * r, ly * r, 6);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  };

  const drawShot = (s: Shot) => {
    ctx.globalAlpha = fade * Math.min(1, s.life / SHOT_FADE_S);
    const v = Math.hypot(s.vx, s.vy);
    const tx = s.x - (s.vx / v) * SHOT_TRAIL;
    const ty = s.y - (s.vy / v) * SHOT_TRAIL;
    const trail = ctx.createLinearGradient(s.x, s.y, tx, ty);
    trail.addColorStop(0, '#ffffff');
    iris.forEach((c, i) => trail.addColorStop(0.15 + (i / iris.length) * 0.7, c));
    trail.addColorStop(1, 'transparent');
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    sprite(art.white, s.x, s.y, 9);
  };

  const pickupVisible = (p: Pickup) => p.life > PICKUP_BLINK_S || Math.sin(p.life * 20) > 0;
  const bob = (p: Pickup) => p.y + Math.sin(clock * 3 + p.x) * 3;

  const drawParticle = (p: Particle) => {
    const k = p.life / p.max;
    ctx.globalAlpha = k * fade;
    switch (p.kind) {
      case 'spark':
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
        break;
      case 'dust':
        sprite(art.grey, p.x, p.y, p.size * (2 - k));
        break;
      case 'flash':
        sprite(art.white, p.x, p.y, p.size * (1.5 - k * 0.5));
        break;
      case 'ring':
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * k;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - k ** 2), 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'glint': {
        const s = p.size * k;
        ctx.fillStyle = p.color!;
        ctx.fillRect(p.x - s, p.y - 0.6, s * 2, 1.2);
        ctx.fillRect(p.x - 0.6, p.y - s, 1.2, s * 2);
        break;
      }
      case 'text':
        ctx.fillStyle = '#ffffff';
        ctx.font = `${p.size}px ${font}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text!, p.x, p.y);
        break;
    }
  };

  // the crisp layer works in device pixels so every sprite pixel lands on the grid
  const drawPixelLayer = () => {
    px.setTransform(1, 0, 0, 1, 0, 0);
    px.clearRect(0, 0, pixels.width, pixels.height);
    px.imageSmoothingEnabled = false;
    px.translate(Math.round(shakeX * scale), Math.round(shakeY * scale));
    px.globalAlpha = fade;
    for (const b of bugs) {
      const baked = art.bugs[b.size][b.species];
      const at = {
        x: b.x * scale,
        y: b.y * scale,
        heading: headingOf(b.vx, b.vy),
        frame: frameAt(baked, clock + b.phase),
      };
      drawPixels(px, baked, at);
      if (b.flash > 0) {
        px.globalCompositeOperation = 'lighter';
        px.globalAlpha = b.flash * fade;
        drawPixels(px, baked, at);
        px.globalCompositeOperation = 'source-over';
        px.globalAlpha = fade;
      }
    }
    for (const p of pickups) {
      if (!pickupVisible(p)) continue;
      const baked = p.kind === 'star' ? art.stars[Math.floor(clock * 12) % STAR_HUES] : art.powers[p.kind];
      drawPixels(px, baked, { x: p.x * scale, y: bob(p) * scale, frame: frameAt(baked, clock) });
    }
    if (incoming && Math.sin(clock * 18) > 0) {
      px.globalAlpha = fade;
      px.fillStyle = ENEMIES[incoming.kind].bolt;
      const { fromLeft, baseY } = incoming;
      const x0 = Math.round(((fromLeft ? CHEVRON_INSET : w - CHEVRON_INSET) * scale) / cell) * cell;
      const y0 = Math.round((baseY * scale) / cell) * cell;
      CHEVRON.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== 'x') return;
          // points inward, the way the enemy will fly
          const dx = (fromLeft ? x : row.length - 1 - x) - Math.floor(row.length / 2);
          px.fillRect(x0 + dx * cell, y0 + (y - Math.floor(CHEVRON.length / 2)) * cell, cell, cell);
        }),
      );
    }
    for (const e of enemies) {
      const baked = art.enemies[e.kind];
      drawPixels(px, baked, {
        x: e.x * scale,
        y: e.y * scale,
        heading: headingOf(e.vx, e.vy),
        frame: frameAt(baked, clock + e.phase),
      });
    }
    for (const b of bolts) {
      const v = Math.hypot(b.vx, b.vy) || 1;
      px.fillStyle = b.color;
      for (let i = 0; i < BOLT_CELLS; i++) {
        px.globalAlpha = Math.min(1, b.life / BOLT_FADE_S) * (1 - i / BOLT_CELLS) * fade;
        const x = Math.round(((b.x - (b.vx / v) * i * (cell / scale)) * scale) / cell) * cell;
        const y = Math.round(((b.y - (b.vy / v) * i * (cell / scale)) * scale) / cell) * cell;
        px.fillRect(x, y, cell, cell);
      }
    }
    for (const b of bits) {
      px.globalAlpha = (b.life / b.max) * fade;
      px.fillStyle = b.color;
      const x = Math.round((b.x * scale) / cell) * cell;
      const y = Math.round((b.y * scale) / cell) * cell;
      px.fillRect(x, y, cell, cell);
    }
    px.globalAlpha = 1;
  };

  const draw = () => {
    shakeX = shake > 0.2 ? rand(-shake, shake) : 0;
    shakeY = shake > 0.2 ? rand(-shake, shake) : 0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(shakeX, shakeY);
    drawBackdrop();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade;
    shots.forEach(drawShot);
    for (const p of particles) {
      ctx.globalCompositeOperation = p.kind === 'text' ? 'source-over' : 'lighter';
      drawParticle(p);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    drawExhaust();
    drawShip();
    post?.render(frame, { time: clock, split: SPLIT_REST + split, presence, glitch });
    drawPixelLayer();
  };

  const loop = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!paused) step(dt);
    draw();
    frameId = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener('resize', resize);

  return {
    input,
    // flies the ship out of the send icon to the centre, then starts the first wave
    launch(from: Pose) {
      Object.assign(ship, {
        x: from.x,
        y: from.y,
        angle: from.angle,
        scale: from.size / (SHIP_R * 2),
        alive: true,
      });
      fly({ x: w / 2, y: h / 2, angle: -Math.PI / 2, scale: 1 });
      if (!still) glitch = GLITCH.launch;
      last = performance.now();
      frameId = requestAnimationFrame(loop);
    },
    // freezes play (for the help card) while still drawing the frozen frame
    pause(on: boolean) {
      paused = on;
      Object.assign(input, { left: false, right: false, thrust: false, fire: false });
    },
    restart() {
      incoming = null;
      enemies = [];
      bolts = [];
      nextEnemy = rand(...ENEMY_EVERY_S);
      bugs = [];
      shots = [];
      pickups = [];
      bits = [];
      exhaust = [];
      endPower();
      score = 0;
      lives = LIVES;
      wave = 0;
      hooks.onScore(score);
      hooks.onLives(lives);
      // keys let go during Game Over never reached the game, so whatever was held when the ship died
      // would carry into the new round: spinning or thrusting with nothing pressed
      Object.assign(input, { left: false, right: false, thrust: false, fire: false });
      resetShip();
      phase = 'play';
      spawnWave();
    },
    // flies the ship back into the send icon while everything else fades away
    land(to: Pose) {
      if (phase === 'land') return;
      if (!ship.alive) Object.assign(ship, { x: w / 2, y: h / 2, alive: true });
      ship.shield = 0;
      endPower();
      input.thrust = false;
      phase = 'land';
      const angle = ship.angle + wrapAngle(to.angle - ship.angle);
      fly({ x: to.x, y: to.y, angle, scale: to.size / (SHIP_R * 2) });
    },
    dispose() {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      post?.dispose();
    },
  };
}

export type Game = ReturnType<typeof createGame>;
