// Who is in the game: the bugs you squash and the power-ups they drop
import type { SpriteDef, Tint } from './pixels/bake';
import { ANT, BEETLE, BUG_TINTS, ENEMY_TINTS, FLY, HORNET, LADYBUG, MITE, SPIDER, WASP } from './pixels/bugs';
import { BASKETBALL, COFFEE, SHIP_IT, STAR } from './pixels/powerups';

// CSS pixels per sprite pixel, in the game and on the help card
export const PIXEL_SIZE = 3;

export type BugSize = 1 | 2 | 3;

export type Species = { name: string; art: SpriteDef; tint: Tint };

// a big bug splits into two of the next size down; size sets speed and points, and each bug is one
// of its size's species at random
export const BUGS: Record<
  BugSize,
  { species: readonly Species[]; speed: readonly [number, number]; points: number }
> = {
  3: {
    species: [
      { name: 'Beetle', art: BEETLE, tint: BUG_TINTS.amber },
      { name: 'Ladybug', art: LADYBUG, tint: BUG_TINTS.red },
    ],
    speed: [28, 60],
    points: 20,
  },
  2: {
    species: [
      { name: 'Ant', art: ANT, tint: BUG_TINTS.teal },
      { name: 'Spider', art: SPIDER, tint: BUG_TINTS.violet },
    ],
    speed: [50, 95],
    points: 50,
  },
  1: {
    species: [
      { name: 'Fly', art: FLY, tint: BUG_TINTS.mono },
      { name: 'Mite', art: MITE, tint: BUG_TINTS.moss },
    ],
    speed: [80, 140],
    points: 100,
  },
};

export type PowerKind = 'basketball' | 'coffee' | 'star' | 'shipIt';

// `seconds` 0 means it acts once on pickup; `weight` is how often it drops relative to the others
export const POWERS: Record<
  PowerKind,
  { title: string; hint: string; seconds: number; weight: number; art: SpriteDef; tint: Tint | null }
> = {
  basketball: {
    title: 'Bounce Shot',
    hint: 'Lasers bounce off the walls',
    seconds: 10,
    weight: 3,
    art: BASKETBALL.def,
    tint: BASKETBALL.tint,
  },
  coffee: {
    title: 'Caffeine Rush',
    hint: 'Fire three times as fast',
    seconds: 8,
    weight: 3,
    art: COFFEE.def,
    tint: COFFEE.tint,
  },
  // the star has no fixed tint: it cycles through the rainbow
  star: {
    title: 'Invincible',
    hint: 'Ram straight through bugs',
    seconds: 8,
    weight: 2,
    art: STAR,
    tint: null,
  },
  shipIt: {
    title: 'Ship It',
    hint: 'Instantly squash all bugs',
    seconds: 0,
    // the screen-clearer stays rare, and the engine allows one per wave
    weight: 0.5,
    art: SHIP_IT.def,
    tint: SHIP_IT.tint,
  },
};

export const POWER_KINDS = Object.keys(POWERS) as PowerKind[];

export type EnemyKind = 'wasp' | 'hornet';

// they fly across once and shoot; hornets aim, wasps spray
export const ENEMIES: Record<
  EnemyKind,
  {
    title: string;
    hint: string;
    art: SpriteDef;
    tint: Tint;
    speed: number;
    fireEvery: number;
    aims: boolean;
    points: number;
    bolt: string;
  }
> = {
  wasp: {
    title: 'Wasp',
    hint: 'It stings back',
    art: WASP,
    tint: ENEMY_TINTS.wasp,
    speed: 110,
    fireEvery: 1.6,
    aims: false,
    points: 200,
    bolt: '#f3d77a',
  },
  hornet: {
    title: 'Hornet',
    hint: 'It aims for you',
    art: HORNET,
    tint: ENEMY_TINTS.hornet,
    speed: 170,
    fireEvery: 1.1,
    aims: true,
    points: 1000,
    bolt: '#ff8a5c',
  },
};
