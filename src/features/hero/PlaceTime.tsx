'use client';

import { useEffect, useRef } from 'react';
import { scrambleTo } from '@/lib/scramble';
import { useStaleHover } from '@/lib/useStaleHover';
import { useTapToggle } from '@/lib/useTapToggle';
import { HEADLINE } from './content';
import { formatLocalTime } from './localTime';
import { SpaceNeedle } from './SpaceNeedle';

const REFRESH_MS = 15_000;

type PlaceTimeProps = {
  focusable?: boolean;
};

// The time is written after mount so server and client HTML match.
export function PlaceTime({ focusable = false }: PlaceTimeProps) {
  const placeRef = useRef<HTMLSpanElement>(null);
  const cityRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const cancelCity = useRef(() => {});
  const cancelTime = useRef(() => {});

  useEffect(() => {
    const place = placeRef.current;
    const time = timeRef.current;
    if (!place || !time) return;
    time.textContent = formatLocalTime(HEADLINE.timeZone);
    const id = setInterval(() => {
      if (!('showTime' in place.dataset)) time.textContent = formatLocalTime(HEADLINE.timeZone);
    }, REFRESH_MS);
    const city = cancelCity;
    const clock = cancelTime;
    return () => {
      clearInterval(id);
      city.current();
      clock.current();
    };
  }, []);

  const show = () => {
    const place = placeRef.current;
    const time = timeRef.current;
    if (!place || !time || 'showTime' in place.dataset) return;
    place.dataset.showTime = '';
    cancelTime.current();
    cancelTime.current = scrambleTo((v) => (time.textContent = v), formatLocalTime(HEADLINE.timeZone));
  };

  const hide = () => {
    const place = placeRef.current;
    const city = cityRef.current;
    if (!place || !city || !('showTime' in place.dataset)) return;
    delete place.dataset.showTime;
    place.removeAttribute('data-active');
    cancelCity.current();
    cancelCity.current = scrambleTo((v) => (city.textContent = v), HEADLINE.place);
  };

  useStaleHover(placeRef, hide);
  useTapToggle(placeRef, { onOn: show, onOff: hide });

  return (
    <span
      ref={placeRef}
      tabIndex={focusable ? 0 : undefined}
      aria-label={HEADLINE.place}
      className="group/place pointer-events-auto cursor-default whitespace-nowrap outline-none"
      // touch fires enter and leave around every tap, so taps go through useTapToggle instead
      onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
      onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
      onFocus={show}
      onBlur={hide}
    >
      <span ref={cityRef} className="group-data-show-time/place:hidden">
        {HEADLINE.place}
      </span>
      <span aria-hidden="true" className="hidden text-white group-data-show-time/place:inline">
        <SpaceNeedle className="mr-[0.2em] h-[1.1em] w-auto align-[-0.2em]" />
        <span ref={timeRef} data-no-scramble className="tabular-nums" />
      </span>
    </span>
  );
}
