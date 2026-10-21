'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';
import { clamp01, easeInOutCubic } from '@/lib/math';

const LAND_AT = 0.22;
const START_AT = 0.04;

type Handlers = {
  onJoin(): void;
  onLeave(): void;
};

export function useHeroJoin(lead: RefObject<HTMLElement | null>, heroId: string, handlers: Handlers) {
  const onJoin = useEffectEvent(handlers.onJoin);
  const onLeave = useEffectEvent(handlers.onLeave);

  useEffect(() => {
    const target = lead.current;
    const hero = document.getElementById(heroId);
    if (!target) return;
    if (!hero) {
      target.toggleAttribute('data-joined', true);
      onJoin();
      return () => {
        target.toggleAttribute('data-joined', false);
      };
    }

    hero.style.transformOrigin = '0 0';
    let joined = false;

    const update = () => {
      const vh = window.innerHeight;
      const leadTop = target.getBoundingClientRect().top;
      const endY = Math.max(1, window.scrollY + leadTop - vh * LAND_AT);
      const startY = Math.min(vh * START_AT, endY * 0.5);
      const p = clamp01((window.scrollY - startY) / (endY - startY));

      if (p >= 1) {
        target.toggleAttribute('data-joined', true);
        hero.style.visibility = 'hidden';
        if (!joined) {
          joined = true;
          onJoin();
        }
        return;
      }
      if (joined) {
        joined = false;
        onLeave();
      }
      target.toggleAttribute('data-joined', false);
      hero.style.visibility = '';
      if (p <= 0) {
        hero.style.transform = '';
        return;
      }

      // offsetLeft/Top ignore transforms, so this is the hero's resting spot
      const e = easeInOutCubic(p);
      const to = target.getBoundingClientRect();
      const scale =
        parseFloat(getComputedStyle(target).fontSize) / parseFloat(getComputedStyle(hero).fontSize);
      const dx = to.left - hero.offsetLeft;
      const dy = to.top - hero.offsetTop;
      hero.style.transform = `translate(${dx * e}px, ${dy * e}px) scale(${1 + (scale - 1) * e})`;
    };

    let alive = true;
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.fonts?.ready.then(() => alive && update());
    update();

    return () => {
      alive = false;
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      hero.style.transform = '';
      hero.style.transformOrigin = '';
      hero.style.visibility = '';
      target.toggleAttribute('data-joined', false);
    };
  }, [lead, heroId]);
}
