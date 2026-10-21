import type { SceneStats } from '../scene/createScene';

const signed = (v: number, digits = 3) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(digits);

export function formatStats(s: SceneStats): { values: string[]; mini: string } {
  const fps = s.fps.toFixed(0).padStart(3, '0');
  const cursor = `${signed(s.cursor[0], 2)} ${signed(s.cursor[1], 2)}`;
  return {
    values: [
      signed(s.camera[0]),
      signed(s.camera[1]),
      signed(s.camera[2]),
      `${s.zoom.toFixed(2)}X`,
      `${signed(s.rotation[0], 1)}° ${signed(s.rotation[1], 1)}°`,
      cursor,
      fps,
    ],
    mini: `CUR ${cursor}   ${fps} FPS`,
  };
}
