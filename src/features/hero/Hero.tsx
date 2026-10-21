import { NGlyph } from '@/features/n-glyph';
import { HeroHeadline } from './HeroHeadline';

export function Hero() {
  return (
    <section aria-label="Intro" className="relative h-svh bg-black">
      <NGlyph className="absolute inset-0" />
      {/* the grid dissolves into black, so the About light rises out of it rather than meeting an edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[22vh] bg-linear-to-b from-transparent to-black"
      />
      <HeroHeadline />
    </section>
  );
}
