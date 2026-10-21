// DEFAULTS are hand-tuned values from the prototype — change deliberately.

export const BG_MODES = [
  'blueprint',
  'terrain',
  'contours',
  'grid',
  'stars',
  'rain',
  'pulse',
  'scan',
  'none',
] as const;
export type BgMode = (typeof BG_MODES)[number];

export const DEFAULTS = {
  height: 4.4,
  span: 2.4,
  barWidth: 0.85,
  depth: 0.8,
  tip: 0.6,
  gap: 0,
  diagThickness: 0.6,
  lean: -0.15, // radians
  scale: 0.64,
  restRotX: 0.12,
  restRotY: -0.26,
  tiltX: 0.15,
  tiltY: 0.71,
  bob: 0.115,
  keyLight: 2.8,
  fillLight: 0.45,
  ambient: 0.1,
  roughness: 0.4,
  cell: 8, // CSS px per dot
  dotScale: 0.62,
  minLum: 0.035,
  brightness: 1.0,
  bgMode: 'blueprint' as BgMode,
  gridBrightness: 0.5,
  gridLine: 1.0,
  gridSize: 1.0,
  gridMajorEvery: 5,
  gridWall: true,
  camOrbit: 0.35,
  bgStrength: 0.3,
  bgScale: 0.0035,
  bgSpeed: 1.0,
  bgLevels: 4,
  bgWarp: 0.9,
  rippleStrength: 0,
  rippleRadius: 14,
  rippleFreq: 0,
  baseGlitch: 0.06,
  idleMin: 0.2, // seconds
  idleMax: 4.0,
  idleStrength: 0.6,
  hoverGlitch: 0.71,
  clickGlitch: 1.0,
  slices: 46,
  sliceShift: 0.12,
  rgbSplit: 1.0,
  blocks: 0,
  scanlines: 0.25,
  introDuration: 2.4,
  introSpins: 3,
  introScatter: 1.0,
};

export type SceneParams = typeof DEFAULTS;

export const REDUCED_MOTION_OVERRIDES: Partial<SceneParams> = {
  introSpins: 0,
  introScatter: 0,
  idleStrength: 0,
  bob: 0,
};

export function resolveParams(reducedMotion: boolean): SceneParams {
  return reducedMotion ? { ...DEFAULTS, ...REDUCED_MOTION_OVERRIDES } : DEFAULTS;
}

export const GLYPH_MAX_Y = 1.35; // ~77°
export const GLYPH_MAX_X = 0.7; // ~40°
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 2.6;

// keep in sync with --color-black
export const SCENE_BG = 0x000000;

export const CAMERA = { fov: 30, position: [0, 0.8, 15], target: [0, 0.2, 0] } as const;

type Pose = { pos: [number, number, number]; rot: [number, number, number] };
export const INTRO_POSE: Pose[] = [
  { pos: [-5.0, 2.6, -3.0], rot: [1.4, 2.2, -1.1] },
  { pos: [0.6, -3.4, 3.2], rot: [-1.8, 1.1, 2.4] },
  { pos: [4.7, 1.8, -2.4], rot: [0.9, -2.0, 1.7] },
];
