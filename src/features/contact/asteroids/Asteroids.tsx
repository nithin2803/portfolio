'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Keycap } from '@/components/ui';
import { cn } from '@/lib/cn';
import { cssVar } from '@/lib/cssVar';
import { PLAY_GAME } from '@/lib/site';
import { GAME } from '../content';
import { SHIP_ANCHOR_ANGLE, SHIP_ANCHOR_ID, SKYLINE_ANCHOR_ID } from './anchor';
import { POWERS, type PowerKind } from './cast';
import { createGame, irisColors, type Booster, type Box, type Game, type Input, type Pose } from './engine';
import { HelpCard } from './HelpCard';
import { SHIP_HULL } from './sprites';

// the section must fill most of the screen before space starts a game instead of scrolling
const VISIBLE = 0.6;
const RESTART_AFTER_MS = 700;
// fallback for browsers without scrollend
const PLAY_SCROLL_MS = 1200;
const BANNER_MS = 2800;
const BEST_KEY = 'asteroids-best';
// once someone has seen the help card it stops opening on its own
const HELP_SEEN_KEY = 'asteroids-help-seen';
const HULL_PATH = `M${SHIP_HULL.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

const KEYS: Record<string, keyof Input> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'thrust',
  KeyW: 'thrust',
  Space: 'fire',
};

const typing = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

function anchor(): Pose {
  const rect = document.getElementById(SHIP_ANCHOR_ID)!.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    angle: SHIP_ANCHOR_ANGLE,
    size: rect.width,
  };
}

function skylineBox(): Box | null {
  const rect = document.getElementById(SKYLINE_ANCHOR_ID)?.getBoundingClientRect();
  return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
}

// storage can be blocked (private windows, strict settings); the game just doesn't remember then
function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function lockPage(on: boolean) {
  const root = document.documentElement;
  root.toggleAttribute('data-game', on);
  root.style.overflow = on ? 'hidden' : '';
}

export function Asteroids() {
  const [phase, setPhase] = useState<'off' | 'on' | 'leaving'>('off');
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(0);
  const [banner, setBanner] = useState({ title: '', at: 0 });
  const [help, setHelp] = useState<{ first: boolean } | null>(null);
  const [powerUp, setPowerUp] = useState<{ kind: PowerKind; at: number } | null>(null);
  const [overAt, setOverAt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelsRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const phaseRef = useRef(phase);
  const overRef = useRef(overAt);
  const bestRef = useRef(0);
  const helpRef = useRef<{ first: boolean } | null>(null);

  // the help card pauses the game behind it
  const openHelp = useCallback((first: boolean) => {
    helpRef.current = { first };
    game.current?.pause(true);
    setHelp({ first });
  }, []);
  const closeHelp = useCallback(() => {
    if (helpRef.current?.first) save(HELP_SEEN_KEY, '1');
    helpRef.current = null;
    game.current?.pause(false);
    setHelp(null);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
    overRef.current = overAt;
  }, [phase, overAt]);

  useEffect(() => {
    if (phase !== 'on' || game.current || !canvasRef.current || !pixelsRef.current) return;
    const booster: Booster = {
      core: cssVar('--color-booster-core'),
      mid: cssVar('--color-booster-mid'),
      tail: cssVar('--color-booster-tail'),
    };
    const g = createGame(canvasRef.current, pixelsRef.current, {
      booster,
      iris: irisColors(),
      font: cssVar('--font-arcade'),
      skyline: skylineBox(),
      still: matchMedia('(prefers-reduced-motion: reduce)').matches,
      hooks: {
        onScore: (n) => {
          setScore(n);
          if (n <= bestRef.current) return;
          bestRef.current = n;
          setBest(n);
          save(BEST_KEY, String(n));
        },
        onLives: setLives,
        onWave: (n) => setBanner({ title: `${GAME.wave} ${n}`, at: performance.now() }),
        onLaunched: () => {
          if (!load(HELP_SEEN_KEY)) openHelp(true);
        },
        onPower: (kind) => {
          setPowerUp(kind && POWERS[kind].seconds ? { kind, at: performance.now() } : null);
        },
        onOver: () => setOverAt(performance.now()),
        onLanded: () => {
          g.dispose();
          game.current = null;
          lockPage(false);
          setPhase('off');
        },
      },
    });
    game.current = g;
    g.launch(anchor());
    requestAnimationFrame(() => setShown(true));
  }, [phase, openHelp]);

  useEffect(() => {
    if (!banner.at) return;
    const id = window.setTimeout(() => setBanner((b) => ({ ...b, at: 0 })), BANNER_MS);
    return () => clearTimeout(id);
  }, [banner.at]);

  useEffect(() => {
    const section = document.getElementById('contact');
    if (!section) return;
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= VISIBLE;
      },
      { threshold: [0, VISIBLE, 1] },
    );
    io.observe(section);

    const start = () => {
      (document.activeElement as HTMLElement | null)?.blur();
      lockPage(true);
      setScore(0);
      setLives(3);
      setOverAt(0);
      bestRef.current = Number(load(BEST_KEY)) || 0;
      setBest(bestRef.current);
      setPhase('on');
    };

    // the game's city lands exactly where the section's is, so the section has to fill the screen
    // first; from part-way (or overscrolled), it glides into place and the game starts once it settles
    let settling = false;
    const startInPlace = () => {
      if (settling) return;
      if (Math.abs(section.getBoundingClientRect().top) < 2) return start();
      settling = true;
      section.scrollIntoView({ behavior: 'smooth' });
      const go = () => {
        if (!settling) return;
        settling = false;
        window.removeEventListener('scrollend', go);
        if (phaseRef.current === 'off') start();
      };
      window.addEventListener('scrollend', go, { once: true });
      window.setTimeout(go, PLAY_SCROLL_MS);
    };

    // the chat's play button
    const play = () => {
      if (fine.matches && phaseRef.current === 'off') startInPlace();
    };

    const replay = () => {
      setOverAt(0);
      game.current?.restart();
    };

    const leave = () => {
      setShown(false);
      setPhase('leaving');
      game.current?.land(anchor());
    };

    const onKey = (e: KeyboardEvent) => {
      const down = e.type === 'keydown';
      const mods = e.metaKey || e.ctrlKey || e.altKey;
      if (phaseRef.current === 'off') {
        const wantsGame = e.code === 'Space' && inView && fine.matches && !typing(e.target);
        if (down && wantsGame && !e.repeat && !mods) {
          e.preventDefault();
          startInPlace();
        }
        return;
      }
      if (helpRef.current) {
        const closes = e.code === 'Space' || e.code === 'Escape' || e.code === 'KeyH';
        if (closes || KEYS[e.code]) e.preventDefault();
        if (closes && down && !e.repeat) {
          closeHelp();
          // the card offers SPACE to play again when it's opened from Game Over
          if (e.code === 'Space' && overRef.current) replay();
        }
        return;
      }
      if (e.code === 'KeyH') {
        if (down && !e.repeat && !mods && phaseRef.current === 'on') openHelp(false);
        return;
      }
      if (e.code === 'Escape') {
        if (down && phaseRef.current === 'on') leave();
        return;
      }
      const key = KEYS[e.code];
      if (!key || mods) return;
      e.preventDefault();
      const g = game.current;
      if (!g || phaseRef.current !== 'on') return;
      if (overRef.current) {
        const ready = performance.now() - overRef.current > RESTART_AFTER_MS;
        if (down && key === 'fire' && !e.repeat && ready) replay();
        return;
      }
      g.input[key] = down;
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener(PLAY_GAME.event, play);
    return () => {
      io.disconnect();
      window.removeEventListener(PLAY_GAME.event, play);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      game.current?.dispose();
      lockPage(false);
    };
  }, [openHelp, closeHelp]);

  if (phase === 'off') return null;

  const layer = cn(
    'absolute inset-0 transition-opacity duration-500 ease-out-quint',
    shown ? 'opacity-100' : 'opacity-0',
  );
  return createPortal(
    <div role="application" aria-label={GAME.label} className="fixed inset-0 z-100 select-none">
      <div className={cn(layer, 'bg-black')} />
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full" />
      <canvas ref={pixelsRef} className="pointer-events-none absolute inset-0 size-full" />
      <div className={cn(layer, 'pointer-events-none font-arcade text-arcade text-white')}>
        <div className="absolute inset-x-0 top-0 flex items-start justify-between px-edge pt-6">
          <div>
            {powerUp && (
              <span key={powerUp.at} className="flex flex-col gap-2">
                {POWERS[powerUp.kind].title}
                <span
                  className="block h-0.5 w-28 origin-left animate-drain bg-white"
                  style={{ animationDuration: `${POWERS[powerUp.kind].seconds}s` }}
                />
              </span>
            )}
          </div>
          <dl className="grid grid-cols-[auto_auto] items-center justify-items-end gap-x-4 gap-y-2.5">
            <dt className="text-fg-muted">{GAME.score}</dt>
            <dd aria-live="polite">{score.toLocaleString('en-US')}</dd>
            <dt className="text-fg-muted">{GAME.best}</dt>
            <dd>{best.toLocaleString('en-US')}</dd>
            <dt className="sr-only">{GAME.lives}</dt>
            <dd className="col-span-2 flex gap-2">
              {Array.from({ length: lives }, (_, i) => (
                <svg key={i} viewBox="-1.2 -1.2 2.4 2.4" aria-hidden="true" className="size-4 -rotate-90">
                  <path d={HULL_PATH} fill="none" stroke="currentColor" strokeWidth={0.14} />
                </svg>
              ))}
            </dd>
          </dl>
        </div>

        {banner.at > 0 && !overAt && (
          <div
            key={banner.at}
            className="absolute inset-x-0 top-[20%] grid animate-rise justify-items-center gap-4 text-center"
          >
            <p className="text-arcade-lg">{banner.title}</p>
          </div>
        )}

        {overAt > 0 && (
          <div className="absolute inset-0 grid animate-rise place-content-center gap-4 text-center">
            <p className="text-arcade-lg">{GAME.over}</p>
            <p className="text-fg-muted">
              {GAME.score} {score.toLocaleString('en-US')}
            </p>
            <p className="mt-4 font-sans text-small">
              <Keycap>SPACE</Keycap> {GAME.restart}
            </p>
          </div>
        )}

        <p className="absolute inset-x-0 bottom-6 flex justify-center gap-6 font-sans text-small">
          <span>
            <Keycap>ESC</Keycap> {GAME.exit}
          </span>
          <span>
            <Keycap>H</Keycap> {GAME.help}
          </span>
        </p>
      </div>
      {help && <HelpCard first={help.first} over={overAt > 0} />}
    </div>,
    document.body,
  );
}
