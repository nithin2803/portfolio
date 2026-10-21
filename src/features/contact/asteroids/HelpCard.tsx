'use client';

import { useEffect, useRef } from 'react';
import { Keycap } from '@/components/ui';
import { GAME } from '../content';
import { BUGS, ENEMIES, PIXEL_SIZE, POWER_KINDS, POWERS, type BugSize } from './cast';
import { bake, draw, type SpriteDef, type Tint } from './pixels/bake';
import { starTint } from './pixels/powerups';

const FACING_RIGHT = 2;
const STAR_HUE = 48;
const SIZES: BugSize[] = [3, 2, 1];

function SpriteIcon({ def, tint, heading = 0 }: { def: SpriteDef; tint: Tint; heading?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = devicePixelRatio;
    const baked = bake(def, tint, Math.round(PIXEL_SIZE * dpr));
    const { w, h } = baked.frames[heading % baked.frames.length][0];
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w / dpr}px`;
    canvas.style.height = `${h / dpr}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    draw(ctx, baked, { x: w / 2, y: h / 2, heading });
  }, [def, tint, heading]);

  return <canvas ref={ref} aria-hidden="true" className="block" />;
}

const CONTROLS = [
  { keys: ['←', '→'], alt: ['A', 'D'], label: GAME.card.turn },
  { keys: ['↑'], alt: ['W'], label: GAME.card.thrust },
  { keys: ['SPACE'], alt: [], label: GAME.card.fire },
  { keys: ['H'], alt: [], label: GAME.card.help },
  { keys: ['ESC'], alt: [], label: GAME.card.exit },
];

const SCORES = [
  ...SIZES.flatMap((size) => BUGS[size].species.map((s) => ({ ...s, points: BUGS[size].points }))),
  ...Object.values(ENEMIES).map((e) => ({ name: e.title, art: e.art, tint: e.tint, points: e.points })),
];

// the arcade instruction card: controls, what each thing is worth, what the pickups do
// `over` when it's opened from Game Over, where SPACE plays again rather than resuming
export function HelpCard({ first, over }: { first: boolean; over: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-black/75 p-4 font-arcade text-arcade text-white">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-help-title"
        className="w-full max-w-3xl animate-rise border border-line-strong bg-black px-6 py-8 sm:px-10"
      >
        <h2 id="game-help-title" className="text-center text-arcade-lg">
          {GAME.card.title}
        </h2>

        <div className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          <section>
            <h3>{GAME.card.controls}</h3>
            <ul className="mt-4 grid gap-3 font-sans text-small">
              {CONTROLS.map(({ keys, alt, label }) => (
                <li key={label} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-fg-muted">
                    {keys.map((k) => (
                      <Keycap key={k}>{k}</Keycap>
                    ))}
                    {alt.length > 0 && <span className="px-1">{GAME.card.or}</span>}
                    {alt.map((k) => (
                      <Keycap key={k}>{k}</Keycap>
                    ))}
                  </span>
                  <span className="text-white">{label}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8">{GAME.card.points}</h3>
            <ul className="mt-4 grid gap-2.5">
              {SCORES.map(({ name, art, tint, points }) => (
                <li key={name} className="flex items-center gap-3">
                  <span className="grid w-12 place-items-center">
                    <SpriteIcon def={art} tint={tint} heading={FACING_RIGHT} />
                  </span>
                  <span className="font-sans text-small text-fg-soft">{name}</span>
                  <span className="flex-1 border-b border-dotted border-line" />
                  <span>{points.toLocaleString('en-US')}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3>{GAME.card.powers}</h3>
            <ul className="mt-4 grid gap-5">
              {POWER_KINDS.map((kind) => {
                const { title, hint, art, tint } = POWERS[kind];
                return (
                  <li key={kind} className="flex items-center gap-4">
                    <span className="grid w-12 shrink-0 place-items-center">
                      <SpriteIcon def={art} tint={tint ?? starTint(STAR_HUE)} />
                    </span>
                    <span className="grid gap-1.5">
                      {title}
                      <span className="font-sans text-small text-fg-soft">{hint}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <p className="mt-10 text-center font-sans text-small">
          <span className="motion-safe:animate-blink">
            <Keycap>SPACE</Keycap>
          </span>{' '}
          {first ? GAME.card.start : over ? GAME.restart : GAME.card.resume}
        </p>
      </div>
    </div>
  );
}
