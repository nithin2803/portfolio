'use client';

import { useId, useRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import { cn } from '@/lib/cn';
import { sliceShift, splitShift, useGlitch } from '@/lib/useGlitch';
import { ChannelSplit, setSplit } from './ChannelSplit';

const BANDS = 8;
// neighbouring slices overlap by a pixel so no seam shows between them
const OVERLAP_PX = 1;

type GlitchTextProps<T extends ElementType> = {
  children: string;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'children' | 'as'>;

// Text with the hero's glitch, like the N mark's: hovering or focusing it slices it into bands that jump
// sideways and pulls its colour channels apart. The text itself stays in place for layout and screen readers;
// the slices are copies drawn over it only during a burst.
export function GlitchText<T extends ElementType = 'span'>({
  children,
  as,
  className,
  ...rest
}: GlitchTextProps<T>) {
  const Tag: ElementType = as ?? 'span';
  const ref = useRef<HTMLElement>(null);
  const id = useId().replace(/[^\w-]/g, '');

  useGlitch(ref, ({ glitch, on, reroll }) => {
    const el = ref.current;
    if (!el) return;
    const layer = el.querySelector<HTMLElement>('[data-glitching]')!;
    el.querySelector<HTMLElement>('[data-calm]')!.style.visibility = on ? 'hidden' : '';
    layer.style.display = on ? '' : 'none';
    // translucent text would show doubled where neighbouring slices overlap, so the slices are drawn
    // opaque and the whole layer takes the text's opacity instead
    const [r, g, b, a = 1] = getComputedStyle(el)
      .color.match(/[\d.]+/g)!
      .map(Number);
    layer.style.color = `rgb(${r} ${g} ${b})`;
    layer.style.opacity = String(a);
    const height = el.offsetHeight;
    if (reroll)
      for (const band of el.querySelectorAll<HTMLElement>('[data-band]'))
        band.style.transform = `translateX(${(sliceShift(glitch) * height).toFixed(2)}px)`;
    setSplit(el, on ? Math.max(1, splitShift(glitch) * height) : 0);
  });

  return (
    <Tag ref={ref} className={cn('relative inline-block', className)} {...rest}>
      <span data-calm>{children}</span>
      <span
        data-glitching
        data-no-scramble
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ display: 'none', filter: `url(#${id}-split)` }}
      >
        {Array.from({ length: BANDS }, (_, i) => (
          <span
            key={i}
            className="absolute inset-0"
            style={{
              clipPath: `inset(calc(${(i * 100) / BANDS}% - ${OVERLAP_PX}px) 0 calc(${100 - ((i + 1) * 100) / BANDS}% - ${OVERLAP_PX}px) 0)`,
            }}
          >
            <span data-band className="block">
              {children}
            </span>
          </span>
        ))}
      </span>
      <svg aria-hidden="true" className="absolute size-0">
        <ChannelSplit id={`${id}-split`} />
      </svg>
    </Tag>
  );
}
