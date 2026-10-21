'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { NYTHOS } from '@/features/chat/nythos';
import { cn } from '@/lib/cn';
import { cssVar } from '@/lib/cssVar';
import { hashString, mulberry32 } from '@/lib/random';
import { ABOUT_CHAT } from './content';
import type { ChatEvents } from './events';

type ActivationRailProps = {
  ref: Ref<ChatEvents>;
  className?: string;
};

const LAYERS = NYTHOS.layers;
const PITCH = 6;
const DOT = 4;
// a spark fades below the draw threshold (0.08) after ~3s
const DECAY = Math.log(1 / 0.08) / 3;
const MIN_PASS_MS = 300;
const WAVE_MS = 180;
const TOPIC_EXPERTS = 3;
const TOPIC_SHARE = 0.15;

const seeded = (text: string) => mulberry32(hashString(text));

type Grid = { route(seed: string): void; pass(text: string): void; clear(): void };

export function ActivationRail({ ref, className }: ActivationRailProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grid = useRef<Grid>({ route() {}, pass() {}, clear() {} });

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!box || !canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ink = {
      hot: cssVar('--color-fg'),
      warm: cssVar('--color-fringe-b'),
      cool: cssVar('--color-fringe-r'),
      idle: cssVar('--color-line'),
    };
    let cols = 8;
    let width = 0;
    let energy = new Float32Array(cols * LAYERS);
    let queue: { at: number; i: number; e: number }[] = [];
    let salt = '';
    let position = 0;
    let lastPass = -Infinity;
    let topics: number[][] = [];
    let raf = 0;
    let last = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, LAYERS * PITCH);
      for (let layer = 0; layer < LAYERS; layer++) {
        const y = layer * PITCH;
        for (let c = 0; c < cols; c++) {
          const e = energy[layer * cols + c];
          const x = c * PITCH;
          if (e > 0.08) {
            ctx.globalAlpha = Math.min(1, 0.35 + e);
            ctx.fillStyle = e > 0.75 ? ink.hot : e > 0.4 ? ink.warm : ink.cool;
            ctx.fillRect(x, y, DOT, DOT);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = ink.idle;
            ctx.fillRect(x + 1, y + 1, 2, 2);
          }
        }
      }
    };

    const size = () => {
      width = box.clientWidth;
      const next = Math.max(8, Math.floor((width + PITCH - DOT) / PITCH));
      if (next !== cols) {
        cols = next;
        energy = new Float32Array(cols * LAYERS);
        queue = [];
      }
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = LAYERS * PITCH * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${LAYERS * PITCH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      const fade = Math.exp(-DECAY * dt);
      for (let i = 0; i < energy.length; i++) energy[i] = energy[i] > 0.02 ? energy[i] * fade : 0;
      queue = queue.filter((s) => {
        if (s.at > now) return true;
        energy[s.i] = Math.max(energy[s.i], s.e);
        return false;
      });
      draw();
      const alive = queue.length > 0 || energy.some((e) => e > 0);
      raf = alive ? requestAnimationFrame(tick) : 0;
      if (!alive) last = 0;
    };

    grid.current = {
      route(seed) {
        salt = seed;
        position = 0;
        topics = Array.from({ length: LAYERS }, (_, layer) => {
          const rand = seeded(`${salt}:topic:${layer}`);
          return Array.from({ length: TOPIC_EXPERTS }, () => Math.floor(rand() * cols));
        });
      },
      pass(text) {
        const start = performance.now();
        const at0 = position++;
        if (start - lastPass < MIN_PASS_MS) return;
        lastPass = start;
        for (let layer = 0; layer < LAYERS; layer++) {
          const rand = seeded(`${salt}:${at0}:${text}:${layer}`);
          const at = reduced ? start : start + (layer / LAYERS) * WAVE_MS;
          const fire = (c: number, e: number) => queue.push({ at, i: layer * cols + c, e });
          if (layer < NYTHOS.denseLayers) {
            for (let c = 0; c < cols; c++) if (rand() < 0.25) fire(c, 0.3 + rand() * 0.4);
            continue;
          }
          const picked = new Set<number>();
          const topic = topics[layer];
          while (picked.size < NYTHOS.activeExperts) {
            const fromTopic = topic && rand() < TOPIC_SHARE;
            picked.add(
              fromTopic ? topic[Math.floor(rand() * topic.length)] : Math.floor(rand() * NYTHOS.experts),
            );
          }
          for (const expert of picked) if (expert < cols) fire(expert, 0.55 + rand() * 0.45);
        }
        if (!raf) raf = requestAnimationFrame(tick);
      },
      clear() {
        energy.fill(0);
        queue = [];
        draw();
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      grid.current = { route() {}, pass() {}, clear() {} };
    };
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => grid.current.clear(),
    context() {},
    sent: (question) => grid.current.route(`${question}:${performance.now()}`),
    token: (e) => grid.current.pass(e.text),
    done() {},
  }));

  return (
    <aside aria-hidden="true" className={cn('text-small', className)}>
      <p className="mb-4 flex justify-between gap-3 font-medium text-fg-muted">
        <span>{ABOUT_CHAT.rails.activations}</span>
        <span className="text-fg-faint">{`${LAYERS} layers`}</span>
      </p>
      <div ref={boxRef} className="border-t border-line pt-4">
        <canvas ref={canvasRef} className="block" />
      </div>
      <p className="mt-3 flex gap-4 text-fg-faint">
        <span className="flex items-center gap-1.5">
          <span className="size-1 bg-fg" />
          Expert
        </span>
      </p>
    </aside>
  );
}
