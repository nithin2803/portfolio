import { cn } from '@/lib/cn';

// a pocket version of the Needle in the contact skyline, in the brighter end of its steel ramp
const SPRITE = [
  '......B......',
  '......L......',
  '......L......',
  '......L......',
  '......L......',
  '.....SSS.....',
  '....LLLLL....',
  '..SSSSSSSSS..',
  'LLLLLLLLLLLLL',
  '.SWSWSWSWSWS.',
  '..DDDDDDDDD..',
  '....SSSSS....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LDD.....',
  '.....LSD.....',
  '.....LSD.....',
  '.....LSD.....',
  '....L.S.D....',
  '....L.S.D....',
  '....LDDDD....',
  '...L..S..D...',
  '...L..S..D...',
  '...L..S..D...',
  '..L...S...D..',
  '..L...S...D..',
];

const COLORS: Record<string, string> = {
  B: '#e1e4ea',
  W: '#e1e4ea',
  L: '#b4bac5',
  S: '#6d7481',
  D: '#3f4550',
};

// one rect per run of same-coloured cells
const RUNS = SPRITE.flatMap((row, y) =>
  [...row.matchAll(/([^.])\1*/g)].map((m) => ({ x: m.index, y, w: m[0].length, fill: COLORS[m[1]] })),
);

export function SpaceNeedle({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SPRITE[0].length} ${SPRITE.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={cn('inline-block', className)}
    >
      {RUNS.map(({ x, y, w, fill }) => (
        <rect key={`${x},${y}`} x={x} y={y} width={w} height={1} fill={fill} />
      ))}
    </svg>
  );
}
