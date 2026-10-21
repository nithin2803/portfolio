import { sprite, type Tint } from './bake';
import { mirrorX, type Grid } from './grid';

// drawn facing up; the walk is the pose and its mirror, so legs on each side alternate
const walk = (pose: Grid) => [pose, mirrorX(pose)];

export const BEETLE = sprite({
  limbs: true,
  directional: true,
  fps: 8,
  frames: walk([
    '....o.....o....',
    '.....o...o.....',
    '......ooo......',
    '.....oeleo.....',
    '.o..obbbbbo....',
    '..oobblllbbo...',
    '...oooooooooo..',
    '..obl:bob:lbooo',
    '.oobl:bob:lboo.',
    'o.obb:bob:bbo..',
    '..obs:sos:sbo..',
    'ooos::sos::so..',
    '...os:sos:so.o.',
    '....ossosso...o',
    '.....ooooo.....',
  ]),
});

export const LADYBUG = sprite({
  limbs: true,
  directional: true,
  fps: 8,
  frames: walk([
    '...o.....o...',
    '....o...o....',
    '.....ooo.....',
    '....oeaeo....',
    '.o.ooooooo...',
    '..olbbobblo.o',
    '.olabbobbalo.',
    '.ob:bbobb:bo.',
    'oo:abbobba:o.',
    '.os::sos::so.',
    'o.os:sos:so.o',
    '...ossosso...',
    '....ooooo....',
  ]),
});

export const ANT = sprite({
  limbs: true,
  directional: true,
  fps: 10,
  frames: walk([
    '..o.....o..',
    '...o...o...',
    '....ooo....',
    '...oeleo...',
    '....obo....',
    'o..obbbo...',
    '.oooblbooo.',
    '...obbbo..o',
    '..o.ooo....',
    '...obbbo...',
    '..ob:l:bo..',
    '..o:::::o..',
    '..os:s:so..',
    '...ossso...',
    '....ooo....',
  ]),
});

export const SPIDER = sprite({
  limbs: true,
  directional: true,
  fps: 8,
  frames: walk([
    '.o.........o.',
    '..o..ooo..o..',
    'o..ooeoeoo..o',
    '.oobbbbbbboo.',
    '...obl:lbo...',
    'oooob:::booo.',
    '...o:s:s:o...',
    '.oo.os:so.oo.',
    'o...ossso...o',
    '.....ooo.....',
  ]),
});

export const FLY = sprite({
  limbs: true,
  directional: true,
  fps: 14,
  frames: [
    ['...ooo...', '..oeoeo..', 'll.obo.ll', 'lll:b:lll', '.lls:sll.', '..o:s:o..', '..os:so..', '...ooo...'],
    ['...ooo...', '..oeoeo..', '...obo...', '.ll:b:ll.', 'lll:s:lll', 'll.:s:.ll', '..os:so..', '...ooo...'],
  ],
});

export const MITE = sprite({
  limbs: true,
  directional: true,
  fps: 10,
  frames: walk(['..o.o..', '.oeoeo.', 'ooblbo.', '.o:::o.', '.os:soo', '.ossso.', '..ooo..']),
});

// muted so the bugs read as colour without fighting the neon
export const BUG_TINTS = {
  amber: {
    outline: '#120c05',
    shade: '#5a3a17',
    body: '#9c6a2c',
    light: '#d39a4f',
    eye: '#f2efe8',
    accent: '#2b1a0a',
  },
  teal: {
    outline: '#061210',
    shade: '#1d4a45',
    body: '#2f7a72',
    light: '#5fb3a8',
    eye: '#f2efe8',
    accent: '#0c2422',
  },
  red: {
    outline: '#140606',
    shade: '#5c1c1c',
    body: '#9a3232',
    light: '#d0605a',
    eye: '#f2efe8',
    accent: '#1c0808',
  },
  violet: {
    outline: '#0d0816',
    shade: '#3c2a5e',
    body: '#6448a0',
    light: '#9a82d6',
    eye: '#f2efe8',
    accent: '#1b1230',
  },
  moss: {
    outline: '#0a0f06',
    shade: '#33461f',
    body: '#567536',
    light: '#8cae5c',
    eye: '#f2efe8',
    accent: '#182210',
  },
  mono: {
    outline: '#0b0c0e',
    shade: '#2e3138',
    body: '#50545d',
    light: '#8a909b',
    eye: '#f2efe8',
    accent: '#15171b',
  },
} satisfies Record<string, Tint>;

// the enemies: they cross the screen once and shoot back
export const WASP = sprite({
  limbs: true,
  directional: true,
  fps: 16,
  frames: [
    [
      '...o.....o...',
      '....o...o....',
      '.....ooo.....',
      '....oeoeo....',
      '.ll.obbbo.ll.',
      'llllobbbollll',
      '.lllo:a:olll.',
      '..ooobbbooo..',
      '....oaaao....',
      '....obbbo....',
      '....oaaao....',
      '.....obo.....',
      '......o......',
    ],
    [
      '...o.....o...',
      '....o...o....',
      '.....ooo.....',
      '....oeoeo....',
      '....obbbo....',
      '.lllobbbolll.',
      'llllo:a:ollll',
      'l.ooobbbooo.l',
      '....oaaao....',
      '....obbbo....',
      '....oaaao....',
      '.....obo.....',
      '......o......',
    ],
  ],
});

export const HORNET = sprite({
  limbs: true,
  directional: true,
  fps: 18,
  frames: [
    [
      '..o.....o..',
      '...o...o...',
      '....ooo....',
      '...oebeo...',
      'll.obbbo.ll',
      'lllobbbolll',
      '.lloaaaoll.',
      '...obbbo...',
      '...oaaao...',
      '....obo....',
      '.....o.....',
    ],
    [
      '..o.....o..',
      '...o...o...',
      '....ooo....',
      '...oebeo...',
      '...obbbo...',
      '.llobbboll.',
      'llloaaaolll',
      '...obbbo...',
      '...oaaao...',
      '....obo....',
      '.....o.....',
    ],
  ],
});

export const ENEMY_TINTS = {
  wasp: {
    outline: '#140f02',
    shade: '#8a6d1c',
    body: '#d9b23a',
    light: '#aeb8c6',
    eye: '#1a1206',
    accent: '#1a1206',
  },
  hornet: {
    outline: '#140804',
    shade: '#7a2e14',
    body: '#e0662e',
    light: '#aeb8c6',
    eye: '#1a0a04',
    accent: '#1a0a04',
  },
} satisfies Record<string, Tint>;
