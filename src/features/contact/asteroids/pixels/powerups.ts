import { sprite, type SpriteDef, type Tint } from './bake';

export type PowerUpArt = { def: SpriteDef; tint: Tint };

export const BASKETBALL: PowerUpArt = {
  def: sprite({
    frames: [
      [
        '...ooooo...',
        '..olbsbbo..',
        '.olbbsbbbo.',
        '.osbbsbbso.',
        'obbsbsbsbbo',
        'ossssssssso',
        'obbsbsbsbbo',
        '.osbbsbbso.',
        '.obbbsbbbo.',
        '..obbsbbo..',
        '...ooooo...',
      ],
    ],
  }),
  tint: {
    outline: '#1a0d05',
    shade: '#3a1a08',
    body: '#d9772b',
    light: '#f3a35b',
    eye: '#f3a35b',
    accent: '#3a1a08',
  },
};

export const COFFEE: PowerUpArt = {
  def: sprite({
    fps: 4,
    frames: [
      [
        '...w...w...',
        '....w...w..',
        '...w...w...',
        '...........',
        '.ooooooo...',
        '.osssssoo..',
        '.obbbbbo.o.',
        '.olbbbbo.o.',
        '.olbbbbooo.',
        '.obbbbbo...',
        '..obbbo....',
        '...ooo.....',
      ],
      [
        '....w...w..',
        '...w...w...',
        '....w...w..',
        '...........',
        '.ooooooo...',
        '.osssssoo..',
        '.obbbbbo.o.',
        '.olbbbbo.o.',
        '.olbbbbooo.',
        '.obbbbbo...',
        '..obbbo....',
        '...ooo.....',
      ],
    ],
  }),
  tint: {
    outline: '#1d1610',
    shade: '#6b4426',
    body: '#e6e1d8',
    light: '#ffffff',
    eye: '#ffffff',
    accent: '#6b4426',
  },
};

const STAR_GRID = [
  '.....o.....',
  '....olo....',
  '....olo....',
  'ooooobooooo',
  '.olbbbbbbo.',
  '..obababo..',
  '...obbbo...',
  '..obbobbo..',
  '..obo.obo..',
  '.obo...obo.',
  '.oo.....oo.',
];

export const STAR = sprite({ frames: [STAR_GRID] });

// the star cycles through these, a whole Mario Kart rainbow
export const starTint = (hue: number): Tint => ({
  outline: `hsl(${hue} 70% 22%)`,
  shade: `hsl(${hue} 80% 42%)`,
  body: `hsl(${hue} 95% 60%)`,
  light: `hsl(${hue} 100% 84%)`,
  eye: '#111',
  accent: '#111',
});

// "ship it" clears every bug on screen
export const SHIP_IT: PowerUpArt = {
  def: sprite({
    fps: 2,
    frames: [
      [
        '......o......',
        '......oaa....',
        '......oaaa...',
        '......o......',
        '....ooooo....',
        '....obwbo....',
        'ooooooooooooo',
        '.olbbbbbbbbo.',
        '..ossssssso..',
        '...ooooooo...',
      ],
      [
        '......o......',
        '......oaaa...',
        '......oaa....',
        '......o......',
        '....ooooo....',
        '....obwbo....',
        'ooooooooooooo',
        '.olbbbbbbbbo.',
        '..ossssssso..',
        '...ooooooo...',
      ],
    ],
  }),
  tint: {
    outline: '#101418',
    shade: '#8a909b',
    body: '#e6e8ec',
    light: '#ffffff',
    eye: '#3ef2ff',
    accent: '#c4302b',
  },
};
