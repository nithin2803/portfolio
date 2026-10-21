import { BUILD_INFO } from '@/lib/build-info';
import { SITE } from '@/lib/site';

const FOOTER = {
  madeWith: { before: 'Made with', heart: '❤️', heartLabel: 'love', after: `in ${SITE.location}` },
  copyright: (year: string) => `© ${year} ${SITE.author}`,
} as const;

export function Footer() {
  const { before, heart, heartLabel, after } = FOOTER.madeWith;
  return (
    <footer className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 bg-black px-edge py-5 text-small text-fg-faint uppercase">
      {/* the heart is full opacity: the faint footer colour would dim the emoji */}
      <p>
        {before}{' '}
        <span role="img" aria-label={heartLabel} className="text-white">
          {heart}
        </span>{' '}
        {after}
      </p>
      <p className="tabular-nums">{FOOTER.copyright(BUILD_INFO.year)}</p>
    </footer>
  );
}
