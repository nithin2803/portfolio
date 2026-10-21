export const HUD_COPY = {
  toggleTitle: 'Stats & controls (Space)',
  panelLabel: 'Scene telemetry and controls',
  telemetry: 'TELEMETRY',
  controls: 'CONTROLS',
};

export const STAT_LABELS = ['CAMERA X', 'CAMERA Y', 'CAMERA Z', 'ZOOM', 'ROTATION', 'CURSOR', 'FPS'] as const;

export type ControlInput = { icon: 'click' | 'grab' | 'pinch'; alt: string } | { key: string };
export type Control = { inputs: ControlInput[]; label: string };

export const CONTROLS: Control[] = [
  { inputs: [{ icon: 'click', alt: 'Click' }], label: 'TORNADO' },
  { inputs: [{ icon: 'grab', alt: 'Drag' }], label: 'DRAG TO ROTATE' },
  { inputs: [{ icon: 'pinch', alt: 'Pinch' }], label: 'PINCH TO ZOOM' },
  { inputs: [{ key: 'R' }], label: 'RESET' },
  { inputs: [{ key: 'SPACE' }], label: 'TOGGLE PANEL' },
];
