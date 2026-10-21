'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { createSkyline, SKYLINE_TICK_MS, skylineLayout } from './render';

type PixelSkylineProps = {
  // keeps the Space Needle at this fraction of the width
  needleAt?: number;
  // where the city starts and finishes fading out to the right, as fractions of the width
  fade?: readonly [number, number];
  label: string;
  id?: string;
  className?: string;
};

export function PixelSkyline({
  needleAt = 0.3,
  fade = [0.45, 0.95],
  label,
  id,
  className,
}: PixelSkylineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fadeFrom, fadeTo] = fade;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const sky = createSkyline();
    let timer = 0;

    const draw = () => {
      const { width, height } = canvas;
      const at = skylineLayout(width, height, needleAt);
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sky.canvas, at.x, at.y, at.w, at.h);
      const out = ctx.createLinearGradient(fadeFrom * width, 0, fadeTo * width, 0);
      out.addColorStop(0, 'rgb(0 0 0 / 0)');
      out.addColorStop(1, 'rgb(0 0 0 / 1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = out;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    };

    const ro = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * devicePixelRatio);
      canvas.height = Math.round(height * devicePixelRatio);
      draw();
    });
    ro.observe(canvas);

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (!entry.isIntersecting || still) return;
      timer = window.setInterval(() => {
        sky.step();
        draw();
      }, SKYLINE_TICK_MS);
    });
    io.observe(canvas);
    return () => {
      ro.disconnect();
      io.disconnect();
      clearInterval(timer);
    };
  }, [needleAt, fadeFrom, fadeTo]);

  return <canvas ref={canvasRef} id={id} role="img" aria-label={label} className={cn('block', className)} />;
}
