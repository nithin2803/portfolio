'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

// the hero N's glitch (n-glyph scene/config.ts): bursts every 0.2-4s at 0.6 strength (0.71 on hover) that
// fade at 6/s, with the slices re-rolled 18 times a second
const IDLE_MIN_S = 0.2;
const IDLE_MAX_S = 4;
const IDLE_STRENGTH = 0.6;
const HOVER_STRENGTH = 0.71;
const DECAY = 6;
const EASE = 18;
const TICKS_PER_S = 18;
const SLICE_CHANCE = 0.35;
// sizes as a share of the glitching thing's height
const SLICE_SHIFT = 0.44;

export type GlitchFrame = {
  // the burst's strength, 0-1
  glitch: number;
  on: boolean;
  // the slices should be shuffled this frame
  reroll: boolean;
};

// how far one slice jumps sideways this tick, as a share of the height (0 for most slices)
export const sliceShift = (glitch: number) =>
  Math.random() < SLICE_CHANCE * glitch ? (Math.random() - 0.5) * SLICE_SHIFT * glitch : 0;

// how far the colour channels pull apart, as a share of the height
export const splitShift = (glitch: number) => 0.008 + 0.044 * glitch;

type Options = {
  // also glitch on its own every few seconds, not only when hovered or focused
  idle?: boolean;
  // hovering or focusing the element's parent (a link around a mark) sets it off, rather than the element
  onParent?: boolean;
};

// Glitch bursts like the hero N's. `draw` runs every frame of a burst and once more as it settles; between
// bursts nothing runs.
export function useGlitch(
  ref: RefObject<Element | null>,
  draw: (frame: GlitchFrame) => void,
  { idle = false, onParent = false }: Options = {},
) {
  const drawFrame = useEffectEvent(draw);

  useEffect(() => {
    const trigger = onParent ? ref.current?.parentElement : ref.current;
    if (!trigger) return;
    let glitch = 0;
    let kick = 0;
    let tick = -1;
    let last = 0;
    let raf = 0;
    let idleTimer = 0;

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      kick *= Math.exp(-DECAY * dt);
      glitch += (kick - glitch) * (1 - Math.exp(-EASE * dt));
      const nowTick = Math.floor((now / 1000) * TICKS_PER_S);
      const on = glitch > 0.02;
      drawFrame({ glitch, on, reroll: nowTick !== tick });
      tick = nowTick;
      if (on || kick > 0.02) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
        last = 0;
        glitch = 0;
      }
    };
    const burst = (strength: number) => {
      kick = Math.max(kick, strength);
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onHover = () => burst(HOVER_STRENGTH);
    trigger.addEventListener('pointerenter', onHover);
    trigger.addEventListener('focusin', onHover);

    // with reduced motion it still glitches when asked to, but never on its own
    const scheduleIdle = () => {
      const wait = IDLE_MIN_S + Math.random() * (IDLE_MAX_S - IDLE_MIN_S);
      idleTimer = window.setTimeout(() => {
        if (!document.hidden) burst(IDLE_STRENGTH * (0.6 + Math.random() * 0.4));
        scheduleIdle();
      }, wait * 1000);
    };
    if (idle && !matchMedia('(prefers-reduced-motion: reduce)').matches) scheduleIdle();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      trigger.removeEventListener('pointerenter', onHover);
      trigger.removeEventListener('focusin', onHover);
    };
  }, [ref, idle, onParent]);
}
