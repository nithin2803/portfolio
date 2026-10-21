'use client';

import { useEffect, useRef } from 'react';
import { prepareDecode } from '@/lib/scramble';
import { HEADLINE_DECODE, HEADLINE_ID } from './content';
import { HeadlineSentence } from './HeadlineSentence';

const FADE_LEAD_MS = 200;
const SETTLE_MS = 700;

export function HeroHeadline() {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { delay, duration } = HEADLINE_DECODE;
    const decoder = prepareDecode(el);
    decoder.start({ delay, duration });
    let settle = 0;
    const fadeIn = window.setTimeout(() => {
      el.dataset.in = '';
      settle = window.setTimeout(() => (el.dataset.settled = ''), SETTLE_MS);
    }, delay - FADE_LEAD_MS);
    return () => {
      clearTimeout(fadeIn);
      clearTimeout(settle);
      decoder.cancel();
    };
  }, []);

  return (
    <h1
      id={HEADLINE_ID}
      ref={ref}
      className="pointer-events-none fixed bottom-edge left-edge z-5 max-w-[calc(100vw-var(--spacing-edge)*2-260px)] text-hero font-normal text-balance text-fg-soft opacity-0 transition-opacity duration-600 data-in:opacity-100 data-settled:transition-none max-hud:max-w-[calc(100vw-var(--spacing-edge)*2-48px)]"
    >
      <HeadlineSentence focusable />
    </h1>
  );
}
