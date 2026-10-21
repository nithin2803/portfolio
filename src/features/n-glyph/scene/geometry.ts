import * as THREE from 'three';
import type { SceneParams } from './config';

function extrude(shape: THREE.Shape, depth: number) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function uprightShape(height: number, width: number, tip: number) {
  const L = height / 2;
  const hw = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, -L + tip);
  s.lineTo(0, -L);
  s.lineTo(hw, -L + tip);
  s.lineTo(hw, L - tip);
  s.lineTo(0, L);
  s.lineTo(-hw, L - tip);
  s.closePath();
  return s;
}

function diagonalShape(p: SceneParams) {
  const S = p.span / 2;
  const hw = p.barWidth / 2;
  const shoulder = p.height / 2 - p.tip;
  const xl = -S + hw + p.gap;
  const xr = S - hw - p.gap;
  const run = xr - xl;
  // solve m (negative slope) for: m*run - thickness*sqrt(1+m^2) + 2*shoulder = 0
  const f = (m: number) => m * run - p.diagThickness * Math.sqrt(1 + m * m) + 2 * shoulder;
  let lo = -50;
  let hi = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  const m = (lo + hi) / 2;
  const s = new THREE.Shape();
  s.moveTo(xl, shoulder);
  s.lineTo(xr, shoulder + m * run);
  s.lineTo(xr, -shoulder);
  s.lineTo(xl, -shoulder - m * run);
  s.closePath();
  return s;
}

export type Piece = THREE.Mesh<THREE.ExtrudeGeometry, THREE.Material> & {
  userData: { base: [number, number, number] };
};

export function createPieces(p: SceneParams, material: THREE.Material): Piece[] {
  const S = p.span / 2;
  const defs: { geo: THREE.ExtrudeGeometry; base: [number, number, number] }[] = [
    { geo: extrude(uprightShape(p.height, p.barWidth, p.tip), p.depth), base: [-S, 0, 0] },
    { geo: extrude(diagonalShape(p), p.depth * 0.94), base: [0, 0, 0] },
    { geo: extrude(uprightShape(p.height, p.barWidth, p.tip), p.depth), base: [S, 0, 0] },
  ];
  return defs.map(({ geo, base }) => {
    const mesh = new THREE.Mesh(geo, material) as Piece;
    mesh.userData.base = base;
    return mesh;
  });
}
