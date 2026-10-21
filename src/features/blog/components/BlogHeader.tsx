import { GlitchText, TextLink } from '@/components/ui';
import { iconFor } from '@/lib/brands';
import { BLOG_COPY } from '../content';

export function BlogHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-10">
      <div className="flex items-end justify-between gap-6">
        <GlitchText as="h1" className="cursor-default text-display font-medium text-fg">
          {BLOG_COPY.title}
        </GlitchText>
        <TextLink href="/rss.xml" quiet icon={iconFor('/rss.xml')} className="text-small uppercase">
          {BLOG_COPY.rssLabel}
        </TextLink>
      </div>
      <p className="max-w-reading text-body text-fg-muted">{BLOG_COPY.intro}</p>
    </header>
  );
}
