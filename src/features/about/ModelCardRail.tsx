'use client';

import { useImperativeHandle, useRef, type Ref } from 'react';
import { estimateTokens, NYTHOS } from '@/features/chat/nythos';
import { cn } from '@/lib/cn';
import { ABOUT_CHAT } from './content';
import type { ChatEvents } from './events';

type ModelCardRailProps = {
  ref: Ref<ChatEvents>;
  live: boolean;
  className?: string;
};

const REVEAL = 'transition-[opacity,translate] duration-500 ease-out-quint';
const STAGGER_MS = 90;
// scripted replies (the opener, the photo) report no usage, so their tokens are estimated from what's shown
const TOKENS_PER_WORD = 1.3;

const EMPTY = '—';
const fmt = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const STATIC_ROWS = [
  ['Model', NYTHOS.name],
  ['Params', `${NYTHOS.params} · MoE`],
  ['Experts', `${NYTHOS.experts} · Top ${NYTHOS.activeExperts}`],
] as const;

export function ModelCardRail({ ref, live, className }: ModelCardRailProps) {
  const ttft = useRef<HTMLElement>(null);
  const speed = useRef<HTMLElement>(null);
  const context = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const clock = useRef({ sent: 0, first: 0, words: 0, asked: 0, estimating: false });
  const used = useRef(0);

  const liveRows = [
    { label: 'TTFT', ref: ttft, initial: EMPTY },
    { label: 'Speed', ref: speed, initial: EMPTY },
    { label: ABOUT_CHAT.rails.context, ref: context, initial: `${EMPTY} / ${fmt(NYTHOS.contextWindow)}` },
  ];

  const write = (el: HTMLElement | null, text: string) => {
    if (el) el.textContent = text;
  };
  const setContext = (used: number, window: number) => {
    write(context.current, used ? `${fmt(used)} / ${fmt(window)}` : `${EMPTY} / ${fmt(window)}`);
    const f = fill.current;
    if (!f) return;
    const share = Math.min(1, used / window);
    f.style.width = `${share * 100}%`;
    f.style.backgroundSize = `${100 / Math.max(share, 0.001)}% 100%`;
  };

  // a scripted reply finishes "streaming" before its words have all appeared, so its estimate keeps
  // updating as the rest land
  const estimate = () => {
    const c = clock.current;
    const tokens = Math.round(c.words * TOKENS_PER_WORD);
    const secs = (performance.now() - c.first) / 1000;
    if (tokens && secs > 0.05) write(speed.current, `${Math.round(tokens / secs)} tok/s`);
    setContext(used.current + c.asked + tokens, NYTHOS.contextWindow);
  };

  useImperativeHandle(ref, () => ({
    reset() {
      used.current = 0;
      write(ttft.current, EMPTY);
      write(speed.current, EMPTY);
    },
    context(total, window) {
      used.current = total;
      setContext(total, window);
    },
    sent(question) {
      const c = clock.current;
      if (c.estimating) used.current += c.asked + Math.round(c.words * TOKENS_PER_WORD);
      const asked = estimateTokens(question);
      clock.current = { sent: performance.now(), first: 0, words: 0, asked, estimating: false };
    },
    token() {
      const c = clock.current;
      c.words++;
      if (!c.first) {
        c.first = performance.now();
        write(ttft.current, `${Math.round(c.first - c.sent)} ms`);
      }
      if (c.estimating) estimate();
    },
    done(usage) {
      const c = clock.current;
      if (!usage?.completionTokens) {
        c.estimating = true;
        if (c.first) estimate();
        return;
      }
      const secs = usage.generationMs / 1000;
      write(speed.current, secs > 0.05 ? `${Math.round(usage.completionTokens / secs)} tok/s` : EMPTY);
    },
  }));

  return (
    <aside aria-hidden="true" className={cn('text-small', className)}>
      <p className="mb-4 font-medium text-fg-muted">{ABOUT_CHAT.rails.modelCard}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 border-t border-line pt-4 tabular-nums">
        {STATIC_ROWS.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-fg-faint">{label}</dt>
            <dd className="text-right text-fg-muted">{value}</dd>
          </div>
        ))}
        {liveRows.map(({ label, ref: rowRef, initial }, i) => {
          const reveal = cn(REVEAL, live ? 'opacity-100' : 'translate-y-1 opacity-0');
          const style = { transitionDelay: live ? `${i * STAGGER_MS}ms` : '0ms' };
          return (
            <div key={label} className="contents">
              <dt className={cn('text-fg-faint', reveal)} style={style}>
                {label}
              </dt>
              <dd ref={rowRef} className={cn('text-right text-fg-muted', reveal)} style={style}>
                {initial}
              </dd>
            </div>
          );
        })}
      </dl>
      <span
        className={cn('mt-3 block h-1 bg-line', REVEAL, live ? 'opacity-100' : 'translate-y-1 opacity-0')}
        style={{ transitionDelay: live ? `${3 * STAGGER_MS}ms` : '0ms' }}
      >
        <span
          ref={fill}
          className="block h-full w-0 bg-linear-to-r from-fringe-b to-fringe-r transition-[width] duration-500 ease-out-quint"
        />
      </span>
    </aside>
  );
}
