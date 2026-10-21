'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { hashString } from '@/lib/random';
import { coverSpec, paint, renderCover, type CoverBitmap, type Rgb } from './dither';

type DitherCoverProps = {
  slug: string;
  glitchOnHover?: boolean;
  className?: string;
};

const CELL_PX = 4;
const ASPECT = 10 / 16;
const GLITCH_FRAMES = 7;
const GLITCH_FRAME_MS = 45;

function tokenRgb(ctx: CanvasRenderingContext2D, token: string): Rgb {
  const value = getComputedStyle(ctx.canvas).getPropertyValue(`--color-${token}`).trim();
  ctx.fillStyle = '#000';
  ctx.fillStyle = value || '#000';
  const hex = String(ctx.fillStyle);
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

export function DitherCover({ slug, glitchOnHover = false, className }: DitherCoverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let bmp: CoverBitmap | null = null;
    let inks: readonly [Rgb, Rgb] = [
      [0, 0, 0],
      [0, 0, 0],
    ];
    let image: ImageData | null = null;
    let timer = 0;

    const draw = (tear?: (row: number) => number) => {
      if (!bmp || !image) return;
      paint(bmp, image.data, inks, tear);
      ctx.putImageData(image, 0, 0);
    };

    const build = () => {
      const w = Math.max(48, Math.round(canvas.clientWidth / CELL_PX));
      if (bmp?.width === w) return;
      const h = Math.round(w * ASPECT);
      bmp = renderCover(slug, w, h);
      canvas.width = w;
      canvas.height = h;
      inks = [tokenRgb(ctx, bmp.palette[0]), tokenRgb(ctx, bmp.palette[1])];
      image = ctx.createImageData(w, h);
      draw();
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const trigger = glitchOnHover ? (canvas.closest('a') ?? canvas) : null;
    let rand = hashString(slug);
    const next = () => (rand = (Math.imul(rand, 1664525) + 1013904223) >>> 0) / 4294967296;
    const glitch = () => {
      if (!bmp || reduced.matches) return;
      window.clearTimeout(timer);
      let frame = 0;
      const tick = () => {
        if (!bmp) return;
        if (frame++ >= GLITCH_FRAMES) return draw();
        const h = bmp.height;
        const bands = Array.from({ length: 2 + Math.floor(next() * 3) }, () => {
          const y0 = Math.floor(next() * h);
          return {
            y0,
            y1: y0 + 1 + Math.floor(next() * h * 0.18),
            dx: Math.round((next() - 0.5) * bmp!.width * 0.12),
          };
        });
        draw((y) => bands.find((b) => y >= b.y0 && y < b.y1)?.dx ?? 0);
        timer = window.setTimeout(tick, GLITCH_FRAME_MS);
      };
      tick();
    };
    trigger?.addEventListener('pointerenter', glitch);
    trigger?.addEventListener('focus', glitch);

    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
      trigger?.removeEventListener('pointerenter', glitch);
      trigger?.removeEventListener('focus', glitch);
    };
  }, [slug, glitchOnHover]);

  // paint the ground colour before the canvas draws so there's no flash
  const ground = coverSpec(slug).palette[0] === 'black' ? 'bg-black' : 'bg-cover-navy';

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('block aspect-[16/10] w-full [image-rendering:pixelated]', ground, className)}
    />
  );
}
