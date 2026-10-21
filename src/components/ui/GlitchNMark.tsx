'use client';

import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { sliceShift, splitShift, useGlitch } from '@/lib/useGlitch';
import { ChannelSplit, setSplit } from './ChannelSplit';
import { N_MARK_VIEW, nMarkHeight, NMarkShape, nMarkViewBox } from './NMark';

const BANDS = 12;
const BAND_HEIGHT = N_MARK_VIEW.height / BANDS;
// The slices are masks rather than clip paths: a clip cuts each shape on its own, so the grey sides hidden
// under the white front bleed through along every slice edge as a line, while a mask cuts the whole drawn
// slice at once. Neighbouring slices overlap by this many screen pixels so no seam shows between them.
const OVERLAP_PX = 1.5;

type GlitchNMarkProps = {
  size?: number;
  // also glitch on its own every few seconds, not only when hovered or focused
  idle?: boolean;
  className?: string;
};

// The N mark with the hero's glitch. It glitches when its parent (the link or box around it) is hovered or
// focused.
export function GlitchNMark({ size = 22, idle = false, className }: GlitchNMarkProps) {
  const ref = useRef<SVGSVGElement>(null);
  const id = useId().replace(/[^\w-]/g, '');
  const unitsPerPx = N_MARK_VIEW.width / size;
  const overlap = OVERLAP_PX * unitsPerPx;

  useGlitch(
    ref,
    ({ glitch, on, reroll }) => {
      const svg = ref.current;
      if (!svg) return;
      svg.querySelector<SVGGElement>('[data-calm]')!.style.display = on ? 'none' : '';
      svg.querySelector<SVGGElement>('[data-glitching]')!.style.display = on ? '' : 'none';
      if (reroll)
        for (const band of svg.querySelectorAll('[data-band]'))
          band.setAttribute(
            'transform',
            `translate(${(sliceShift(glitch) * N_MARK_VIEW.height).toFixed(3)} 0)`,
          );
      // at least a pixel, so it shows at nav size
      setSplit(svg, on ? Math.max(unitsPerPx, splitShift(glitch) * N_MARK_VIEW.height) : 0);
    },
    { idle, onParent: true },
  );

  return (
    <svg
      ref={ref}
      viewBox={nMarkViewBox}
      width={size}
      height={nMarkHeight(size)}
      aria-hidden="true"
      className={cn('block overflow-visible', className)}
    >
      <defs>
        <ChannelSplit id={`${id}-split`} />
        {Array.from({ length: BANDS }, (_, i) => (
          <mask
            key={i}
            id={`${id}-band-${i}`}
            maskUnits="userSpaceOnUse"
            x={N_MARK_VIEW.x - 2}
            y={N_MARK_VIEW.y - 1}
            width={N_MARK_VIEW.width + 4}
            height={N_MARK_VIEW.height + 2}
          >
            <rect
              x={N_MARK_VIEW.x - 2}
              y={N_MARK_VIEW.y + i * BAND_HEIGHT - overlap}
              width={N_MARK_VIEW.width + 4}
              height={BAND_HEIGHT + 2 * overlap}
              fill="#fff"
            />
          </mask>
        ))}
      </defs>
      <g data-calm>
        <NMarkShape />
      </g>
      <g data-glitching filter={`url(#${id}-split)`} style={{ display: 'none' }}>
        {Array.from({ length: BANDS }, (_, i) => (
          <g key={i} mask={`url(#${id}-band-${i})`}>
            <g data-band>
              <NMarkShape />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}
