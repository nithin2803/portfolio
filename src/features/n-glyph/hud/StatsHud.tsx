'use client';

import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { cn } from '@/lib/cn';
import { scrambleTo } from '@/lib/scramble';
import { HUD_COPY, STAT_LABELS } from '../content';
import type { SceneStats } from '../scene/createScene';
import { ControlsList } from './ControlsList';
import { formatStats } from './format';
import { PlusToggleIcon } from './PlusToggleIcon';

export type StatsHudHandle = {
  update(stats: SceneStats): void;
  toggle(): void;
  close(): void;
  // where the panel is on screen while it's open
  openRect(): DOMRect | null;
  setShown(shown: boolean): void;
};

const revealMs = (i: number) => 380 + i * 45;

export function StatsHud({ ref }: { ref?: Ref<StatsHudHandle> }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLSpanElement>(null);
  const keyRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const values = useRef<string[]>([]);
  const openRef = useRef(false);
  const rowLiveAt = useRef<number[]>([]);

  useImperativeHandle(
    ref,
    () => ({
      update(stats) {
        const f = formatStats(stats);
        values.current = f.values;
        if (miniRef.current) miniRef.current.textContent = f.mini;
        rootRef.current?.toggleAttribute('data-glitching', stats.glitching);
        if (!openRef.current) return;
        const now = performance.now();
        f.values.forEach((v, i) => {
          const el = valueRefs.current[i];
          if (el && now >= (rowLiveAt.current[i] ?? 0)) el.textContent = v;
        });
      },
      toggle: () => setOpen((o) => !o),
      close: () => setOpen(false),
      openRect: () => (openRef.current ? (panelRef.current?.getBoundingClientRect() ?? null) : null),
      setShown(v) {
        setShown(v);
        if (!v) setOpen(false);
      },
    }),
    [],
  );

  useEffect(() => {
    openRef.current = open;
    const root = rootRef.current;
    if (!open || !root) return;
    const cancels: (() => void)[] = [];
    const scramble = (el: HTMLElement | null, text: string, i: number) => {
      if (el) cancels.push(scrambleTo((v) => (el.textContent = v), text, revealMs(i)));
    };
    const [telemetry, controls] = root.querySelectorAll<HTMLElement>('[data-hud-heading]');
    scramble(telemetry, HUD_COPY.telemetry, 0);
    const start = performance.now();
    STAT_LABELS.forEach((label, i) => {
      rowLiveAt.current[i] = start + revealMs(i + 1);
      scramble(keyRefs.current[i], label, i + 1);
      scramble(valueRefs.current[i], values.current[i] ?? '', i + 1);
    });
    scramble(controls, HUD_COPY.controls, 7);
    root.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el, i) => {
      scramble(el, el.dataset.scramble ?? '', STAT_LABELS.length + 2 + i);
    });
    return () => cancels.forEach((c) => c());
  }, [open]);

  return (
    <div
      ref={rootRef}
      data-no-break
      data-open={open || undefined}
      className={cn(
        'group absolute right-edge bottom-edge z-5 flex flex-col-reverse items-end gap-2.5 text-small font-medium text-fg-muted uppercase select-none data-glitching:text-shadow-fringe',
        !shown && 'hidden',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        title={HUD_COPY.toggleTitle}
        // drop focus after a click so Space doesn't toggle twice
        onClick={(e) => {
          setOpen((o) => !o);
          e.currentTarget.blur();
        }}
        className="-my-1 -mr-1 flex cursor-pointer items-center gap-2.5 rounded-md py-1 pr-1 pl-2 transition-colors hover:bg-white/4 hover:text-fg focus-visible:bg-white/4 focus-visible:text-fg focus-visible:outline-none"
      >
        <span ref={miniRef} className="whitespace-pre tabular-nums max-hud:hidden" />
        <PlusToggleIcon open={open} />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-label={HUD_COPY.panelLabel}
        className="bracket-frame pointer-events-none w-75 px-4 pt-4 pb-3.5 opacity-0 glass-panel transition-[clip-path,opacity] duration-500 ease-wipe [clip-path:inset(100%_0_0_100%)] group-data-open:pointer-events-auto group-data-open:opacity-100 group-data-open:[clip-path:inset(0)]"
      >
        <div data-hud-heading className="mb-1.5 text-fg">
          {HUD_COPY.telemetry}
        </div>
        {STAT_LABELS.map((label, i) => (
          <div key={label} className="flex justify-between gap-3 whitespace-pre tabular-nums">
            <span ref={(el) => void (keyRefs.current[i] = el)}>{label}</span>
            <span ref={(el) => void (valueRefs.current[i] = el)} className="text-fg/90" />
          </div>
        ))}
        <div data-hud-heading className="mt-3.5 mb-1.5 text-fg">
          {HUD_COPY.controls}
        </div>
        <ControlsList />
      </div>
    </div>
  );
}
