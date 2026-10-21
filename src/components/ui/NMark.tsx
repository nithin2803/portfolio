import { cn } from '@/lib/cn';

// The hero's 3D N as a flat block letter: its pointed uprights and diagonal (n-glyph scene/geometry.ts
// defaults), extruded up and to the right, with the same lean
type Point = readonly [number, number];

const upright = (x: number): Point[] => [
  [x - 0.425, -1.6],
  [x, -2.2],
  [x + 0.425, -1.6],
  [x + 0.425, 1.6],
  [x, 2.2],
  [x - 0.425, 1.6],
];
const FACES: Point[][] = [
  upright(-1.2),
  [
    [-0.775, -1.6],
    [0.775, 0.57],
    [0.775, 1.6],
    [-0.775, -0.57],
  ],
  upright(1.2),
];
const DEPTH: Point = [0.42, -0.3];

const points = (pts: readonly Point[]) => pts.map(([x, y]) => `${x},${y}`).join(' ');
const FRONT = FACES.map(points);
// one quad per edge, joining the front face to the back one
const SIDES = FACES.flatMap((face) =>
  face.map((a, i) => {
    const b = face[(i + 1) % face.length];
    return points([a, b, [b[0] + DEPTH[0], b[1] + DEPTH[1]], [a[0] + DEPTH[0], a[1] + DEPTH[1]]]);
  }),
);

export const N_MARK_VIEW = { x: -1.9, y: -2.64, width: 4.26, height: 5.04 } as const;
export const nMarkViewBox = `${N_MARK_VIEW.x} ${N_MARK_VIEW.y} ${N_MARK_VIEW.width} ${N_MARK_VIEW.height}`;
// `size` is the width; the letter is taller than it is wide
export const nMarkHeight = (size: number) => Math.round((size * N_MARK_VIEW.height) / N_MARK_VIEW.width);

export function NMarkShape() {
  return (
    <g transform="rotate(8.6)">
      {SIDES.map((pts) => (
        <polygon key={pts} points={pts} fill="var(--color-n-shade)" />
      ))}
      {FRONT.map((pts) => (
        <polygon key={pts} points={pts} fill="var(--color-n-lit)" />
      ))}
    </g>
  );
}

export function NMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={nMarkViewBox}
      width={size}
      height={nMarkHeight(size)}
      aria-hidden="true"
      className={cn('block overflow-visible', className)}
    >
      <NMarkShape />
    </svg>
  );
}
