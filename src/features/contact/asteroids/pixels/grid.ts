// A sprite frame is a grid of legend characters, one string per row, drawn facing up

export type Grid = readonly string[];

const EMPTY = '.';

export function grid(rows: readonly string[]): Grid {
  const width = rows[0]?.length ?? 0;
  const bad = rows.findIndex((r) => r.length !== width);
  if (bad >= 0) throw new Error(`sprite row ${bad} is ${rows[bad].length} wide, expected ${width}`);
  return rows;
}

export const mirrorX = (g: Grid): Grid => g.map((row) => [...row].reverse().join(''));

function rotate90(g: Grid): Grid {
  const h = g.length;
  const w = g[0].length;
  return Array.from({ length: w }, (_, x) => Array.from({ length: h }, (_, y) => g[h - 1 - y][x]).join(''));
}

const at = (g: Grid, x: number, y: number) => g[y]?.[x] ?? EMPTY;

// Scale2x: doubles a grid while keeping diagonal edges smooth instead of blocky
function scale2x(g: Grid): Grid {
  const out: string[] = [];
  g.forEach((row, y) => {
    let top = '';
    let bottom = '';
    [...row].forEach((p, x) => {
      const a = at(g, x, y - 1);
      const b = at(g, x + 1, y);
      const c = at(g, x - 1, y);
      const d = at(g, x, y + 1);
      top += (c === a && c !== d && a !== b ? a : p) + (a === b && a !== c && b !== d ? b : p);
      bottom += (d === c && d !== b && c !== a ? c : p) + (b === d && b !== a && d !== c ? d : p);
    });
    out.push(top, bottom);
  });
  return out;
}

// RotSprite-style: upscale 4x, rotate 45° clockwise with nearest neighbour, sample back down
function rotate45(g: Grid): Grid {
  const big = scale2x(scale2x(g));
  const w = big[0].length;
  const h = big.length;
  const size = Math.ceil((w + h) / Math.SQRT2 / 4) * 4;
  const cx = w / 2;
  const cy = h / 2;
  const half = size / 2;
  const rows: string[] = [];
  for (let y = 0; y < size; y += 4) {
    let row = '';
    for (let x = 0; x < size; x += 4) {
      const dx = x + 2 - half;
      const dy = y + 2 - half;
      const sx = Math.floor(cx + (dx + dy) * Math.SQRT1_2);
      const sy = Math.floor(cy + (dy - dx) * Math.SQRT1_2);
      row += at(big, sx, sy);
    }
    rows.push(row);
  }
  return trim(rows);
}

function trim(g: Grid): Grid {
  const filled = (row: string) => [...row].some((c) => c !== EMPTY);
  let top = 0;
  let bottom = g.length - 1;
  while (top < bottom && !filled(g[top])) top++;
  while (bottom > top && !filled(g[bottom])) bottom--;
  const rows = g.slice(top, bottom + 1);
  const cols = rows[0].length;
  let left = 0;
  let right = cols - 1;
  const column = (x: number) => rows.some((r) => r[x] !== EMPTY);
  while (left < right && !column(left)) left++;
  while (right > left && !column(right)) right--;
  return rows.map((r) => r.slice(left, right + 1));
}

// the eight headings, clockwise from up; diagonals come from one 45° rotation, the rest are exact
export function headings(up: Grid): Grid[] {
  const diagonal = rotate45(up);
  const turns = (g: Grid, n: number) => Array.from({ length: n }).reduce<Grid>((acc) => rotate90(acc), g);
  return [0, 1, 2, 3].flatMap((n) => [turns(up, n), turns(diagonal, n)]);
}
