'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

// pointerleave is skipped when content moves out from under a still cursor (scroll, transforms, hiding)
export function useStaleHover(ref: RefObject<HTMLElement | null>, onStale: () => void) {
  const stale = useEffectEvent(onStale);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (el && !el.matches(':hover') && !el.contains(document.activeElement)) stale();
      });
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) check();
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('blur', check);
    window.addEventListener('pointerout', onOut);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', check);
      window.removeEventListener('blur', check);
      window.removeEventListener('pointerout', onOut);
      document.removeEventListener('visibilitychange', check);
    };
  }, [ref]);
}
