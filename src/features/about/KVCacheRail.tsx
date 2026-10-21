'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { cn } from '@/lib/cn';
import { cssVar } from '@/lib/cssVar';
import { ABOUT_CHAT } from './content';
import type { ChatEvents, TokenEvent } from './events';
import { DIM, keyOf, valueOf, type Vec } from './model';

type KVCacheRailProps = {
  ref: Ref<ChatEvents>;
  className?: string;
};

const ROWS = 6;
const ROW_H = 16;
const HEAD_H = 18;
const GAP = 12;
const LABEL_W = 54;
const COL_GAP = 8;
const MIN_BAR = 20;
const SWEEP_MS = 120;
const HEIGHT = HEAD_H + ROWS * ROW_H + GAP + 2 * ROW_H;

type Row = { text: string; k: Vec; v: Vec; target: number; shown: number };
type Frame = { push(e: TokenEvent): void; clear(): void };

export function KVCacheRail({ ref, className }: KVCacheRailProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const frame = useRef<Frame>({ push() {}, clear() {} });

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!box || !canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ink = {
      r: cssVar('--color-fringe-r'),
      b: cssVar('--color-fringe-b'),
      fg: cssVar('--color-fg'),
      muted: cssVar('--color-fg-muted'),
      faint: cssVar('--color-fg-faint'),
      line: cssVar('--color-line'),
    };
    const font = `11px ${getComputedStyle(document.body).fontFamily}`;
    let width = 240;
    let rows: Row[] = [];
    let q: { text: string; vec: Vec } | null = null;
    let out: Vec | null = null;
    let sweepStart = -Infinity;
    let raf = 0;

    const cols = () => {
      const cell = Math.max(
        3,
        Math.min(7, Math.floor((width - LABEL_W - 2 * COL_GAP - MIN_BAR) / (2 * DIM))),
      );
      const vecW = cell * DIM;
      const barW = width - LABEL_W - 2 * vecW - 2 * COL_GAP;
      const k = LABEL_W;
      const bar = k + vecW + COL_GAP;
      const v = bar + barW + COL_GAP;
      return { cell, k, bar, barW, v };
    };

    const vec = (x: number, y: number, values: Vec, glow = 1) => {
      const { cell } = cols();
      for (let i = 0; i < DIM; i++) {
        const val = values[i];
        ctx.globalAlpha = Math.min(1, (0.15 + Math.abs(val) * 0.85) * glow);
        ctx.fillStyle = val >= 0 ? ink.b : ink.r;
        ctx.fillRect(x + i * cell, y + 4, cell - 1, cell - 1);
      }
      ctx.globalAlpha = 1;
    };

    const text = (s: string, x: number, y: number, color: string, max = LABEL_W - 8) => {
      ctx.fillStyle = color;
      let label = s;
      while (label.length > 1 && ctx.measureText(label).width > max) label = label.slice(0, -1);
      ctx.fillText(label === s ? s : `${label.slice(0, -1)}…`, x, y + 11);
    };

    const draw = (now: number) => {
      const c = cols();
      ctx.clearRect(0, 0, width, HEIGHT);
      ctx.font = font;
      text('key', c.k, 0, ink.faint);
      text('q·k', c.bar, 0, ink.faint);
      text('value', c.v, 0, ink.faint);

      if (!rows.length) {
        text('Fills as the reply is generated', 0, HEAD_H + ROW_H * 2, ink.faint, width);
        return false;
      }
      const sweep = reduced ? 1 : Math.min(1, (now - sweepStart) / SWEEP_MS);
      const sweepRow = sweep * rows.length;
      const max = Math.max(...rows.map((r) => r.shown), 1e-6);
      let easing = false;
      rows.forEach((row, r) => {
        const y = HEAD_H + (ROWS - rows.length + r) * ROW_H;
        if (r < sweepRow) {
          row.shown += (row.target - row.shown) * 0.35;
          if (Math.abs(row.target - row.shown) > 0.002) easing = true;
        }
        const strength = row.shown / max;
        if (sweep < 1 && Math.floor(sweepRow) === r) {
          ctx.fillStyle = ink.line;
          ctx.fillRect(0, y, width, ROW_H);
        }
        text(row.text, 0, y, strength > 0.6 ? ink.fg : ink.muted);
        vec(c.k, y, row.k);
        ctx.fillStyle = ink.line;
        ctx.fillRect(c.bar, y + 7, c.barW, 1);
        const grad = ctx.createLinearGradient(c.bar, 0, c.bar + c.barW, 0);
        grad.addColorStop(0, ink.r);
        grad.addColorStop(1, ink.b);
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.4 + 0.6 * strength;
        ctx.fillRect(c.bar, y + 5, Math.max(1, c.barW * strength), 5);
        ctx.globalAlpha = 1;
        vec(c.v, y, row.v, 0.25 + 0.75 * strength);
      });

      const yQ = HEAD_H + ROWS * ROW_H + GAP;
      ctx.fillStyle = ink.line;
      ctx.fillRect(0, yQ - GAP / 2, width, 1);
      if (q) {
        text('q', 0, yQ, ink.r);
        text(q.text, 12, yQ, ink.fg, LABEL_W - 20);
        vec(c.k, yQ, q.vec);
      }
      if (out) {
        text('Σ w·v', c.bar, yQ + ROW_H, ink.muted, c.barW + 12);
        vec(c.v, yQ + ROW_H, out, 1.6);
      }
      return sweep < 1 || easing;
    };

    const loop = (now: number) => {
      raf = draw(now) ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const size = () => {
      width = Math.max(200, box.clientWidth);
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = HEIGHT * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(box);

    frame.current = {
      push({ text: current, history, attention }) {
        const n = history.length - 1;
        const from = Math.max(0, n - ROWS);
        const previous = new Map(rows.map((r) => [r.text + r.k[0], r.shown]));
        rows = history.slice(from, n).map((t, i) => {
          const k = keyOf(t);
          return {
            text: t,
            k,
            v: valueOf(t),
            target: attention.weights[from + i],
            shown: previous.get(t + k[0]) ?? 0,
          };
        });
        q = { text: current, vec: attention.q };
        out = attention.out;
        sweepStart = performance.now();
        if (countRef.current) countRef.current.textContent = `${history.length} tokens`;
        wake();
      },
      clear() {
        rows = [];
        q = null;
        out = null;
        if (countRef.current) countRef.current.textContent = '0 tokens';
        draw(performance.now());
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      frame.current = { push() {}, clear() {} };
    };
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => frame.current.clear(),
    context() {},
    sent() {},
    token: (e) => frame.current.push(e),
    done() {},
  }));

  return (
    <aside aria-hidden="true" className={cn('text-small', className)}>
      <p className="mb-4 flex justify-between gap-3 font-medium text-fg-muted">
        <span>{ABOUT_CHAT.rails.kvCache}</span>
        <span ref={countRef} className="text-fg-faint tabular-nums">
          0 tokens
        </span>
      </p>
      <div ref={boxRef} className="border-t border-line pt-3">
        <canvas ref={canvasRef} className="block" />
      </div>
    </aside>
  );
}
