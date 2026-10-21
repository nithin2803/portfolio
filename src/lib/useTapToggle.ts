'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

type Handlers = {
  onOn?(): void;
  onOff?(): void;
};

// touch has no hover: a tap toggles data-active, and a tap anywhere else clears it
export function useTapToggle(ref: RefObject<HTMLElement | null>, handlers: Handlers = {}) {
  const onOn = useEffectEvent(() => handlers.onOn?.());
  const onOff = useEffectEvent(() => handlers.onOff?.());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const active = el.contains(e.target as Node) && !el.hasAttribute('data-active');
      if (active === el.hasAttribute('data-active')) return;
      el.toggleAttribute('data-active', active);
      if (active) onOn();
      else onOff();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [ref]);
}
