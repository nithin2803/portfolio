'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { StatsHud, type StatsHudHandle } from './hud/StatsHud';
import type { NScene } from './scene/createScene';

export type NGlyphProps = { className?: string };

export function NGlyph({ className }: NGlyphProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<StatsHudHandle>(null);

  useEffect(() => {
    let scene: NScene | null = null;
    let cancelled = false; // StrictMode / fast unmount: the import may resolve after cleanup
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('./scene/createScene').then(({ createNScene }) => {
      const host = hostRef.current;
      if (cancelled || !host) return;
      scene = createNScene(host, {
        reducedMotion,
        onStats: (s) => hudRef.current?.update(s),
        onActiveChange: (v) => hudRef.current?.setShown(v),
        onHud: (a) => (a === 'toggle' ? hudRef.current?.toggle() : hudRef.current?.close()),
        hudRect: () => hudRef.current?.openRect() ?? null,
      });
    });

    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div ref={hostRef} className="absolute inset-0" />
      <StatsHud ref={hudRef} />
    </div>
  );
}
