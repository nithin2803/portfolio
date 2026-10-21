import { clamp } from '@/lib/math';
import { GLYPH_MAX_X, GLYPH_MAX_Y, ZOOM_MAX, ZOOM_MIN, type SceneParams } from './config';

export type InputState = {
  mouse: { x: number; y: number; inside: boolean };
  view: { zoomT: number; yawT: number; pitchT: number };
};

export type HudAction = 'toggle' | 'close';

type PointerHandlers = {
  onMove: (x: number, y: number, u: number, v: number) => void;
  onLeave: () => void;
};

const IGNORE = 'a, button, input, textarea, select, label, [data-no-break]';
// keyboard: only stand down while typing (a focused button shouldn't swallow R / Space)
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const closest = (t: EventTarget | null, sel: string) => (t instanceof Element ? t.closest(sel) : null);

// the cursor anywhere in the window, in the host's coordinates
export function bindPointer(host: HTMLElement, h: PointerHandlers, signal: AbortSignal) {
  window.addEventListener(
    'pointermove',
    (e) => {
      const r = host.getBoundingClientRect();
      const u = clamp((e.clientX - r.left) / r.width, 0, 1);
      const v = clamp((e.clientY - r.top) / r.height, 0, 1);
      h.onMove(u * 2 - 1, v * 2 - 1, u, 1 - v);
    },
    { signal },
  );
  window.addEventListener(
    'pointerout',
    (e) => {
      if (!e.relatedTarget) h.onLeave();
    },
    { signal },
  );
  window.addEventListener('blur', h.onLeave, { signal });
}

export function clampView(view: InputState['view'], p: SceneParams) {
  view.zoomT = clamp(view.zoomT, ZOOM_MIN, ZOOM_MAX);
  view.yawT = clamp(view.yawT, -GLYPH_MAX_Y - p.restRotY, GLYPH_MAX_Y - p.restRotY);
  view.pitchT = clamp(view.pitchT, -GLYPH_MAX_X - p.restRotX, GLYPH_MAX_X - p.restRotX);
}

type HeroControls = {
  state: InputState;
  params: SceneParams;
  isActive: () => boolean;
  click: (x: number, y: number) => void;
  reset: () => void;
  onHud: (action: HudAction) => void;
};

export function bindHeroControls(c: HeroControls, signal: AbortSignal) {
  const { view } = c.state;

  window.addEventListener(
    'keydown',
    (e) => {
      if (!c.isActive() || closest(e.target, TYPING) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'r') c.reset();
      else if (e.code === 'Space') {
        e.preventDefault();
        c.onHud('toggle');
      } else if (key === 'escape') c.onHud('close');
    },
    { signal },
  );

  // trackpad pinch arrives as ctrl+wheel; plain scrolling is left to the page
  window.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey || !c.isActive() || closest(e.target, IGNORE)) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      view.zoomT *= Math.exp(dy * 0.01);
      clampView(view, c.params);
    },
    { passive: false, signal },
  );

  let drag: { x: number; y: number; moved: boolean } | null = null;
  const endDrag = () => {
    drag = null;
    document.body.style.cursor = '';
  };
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || !c.isActive() || closest(e.target, IGNORE)) return;
      drag = { x: e.clientX, y: e.clientY, moved: false };
    },
    { signal },
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        document.body.style.cursor = 'grabbing';
      }
      if (drag.moved) {
        view.yawT += dx * 0.006;
        view.pitchT += dy * 0.004;
        clampView(view, c.params);
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    },
    { signal },
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      if (drag && !drag.moved) c.click(e.clientX, e.clientY);
      endDrag();
    },
    { signal },
  );
  window.addEventListener('pointercancel', endDrag, { signal });
  window.addEventListener('blur', endDrag, { signal });
  signal.addEventListener('abort', endDrag);
}
