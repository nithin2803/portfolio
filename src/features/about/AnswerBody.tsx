import type { ReactNode } from 'react';
import { INLINE_LINK, InlineIcon, InlineLinkIcon, TextLink } from '@/components/ui';
import type { Paragraph, Segment } from '@/features/chat/types';
import { cn } from '@/lib/cn';
import { PLAY_GAME } from '@/lib/site';
import { Highlight } from './Highlight';
import { Token } from './Token';

type Ctx = { caretAt: number; count: number };

// `head` rides on the first word (a link's or name's icon, on its left), so it streams in with its word
function words(text: string, key: string, ctx: Ctx, head?: ReactNode) {
  const parts = text.split(/(\s+)/).filter(Boolean);
  const first = parts.findIndex((p) => !/^\s+$/.test(p));
  return parts.map((part, i) => {
    if (/^\s+$/.test(part)) return part;
    const index = ctx.count++;
    return (
      <Token key={`${key}-${i}`} caret={index === ctx.caretAt}>
        {i === first && head}
        {part}
      </Token>
    );
  });
}

function renderSegment(segment: Segment, key: string, ctx: Ctx) {
  if ('link' in segment) {
    const icon = segment.icon && <InlineLinkIcon icon={segment.icon} />;
    // the game isn't a page: the link starts it. It needs a keyboard, so touch screens get plain text
    if (segment.href === PLAY_GAME.href) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => window.dispatchEvent(new Event(PLAY_GAME.event))}
          className={cn(
            INLINE_LINK,
            'cursor-pointer whitespace-nowrap pointer-coarse:pointer-events-none pointer-coarse:no-underline',
          )}
        >
          {words(segment.link, key, ctx, icon)}
        </button>
      );
    }
    return (
      <TextLink key={key} href={segment.href} className="whitespace-nowrap">
        {words(segment.link, key, ctx, icon)}
      </TextLink>
    );
  }
  if ('highlight' in segment && segment.brand?.href) {
    const icon = <InlineLinkIcon icon={segment.brand.icon} />;
    return (
      <TextLink key={key} href={segment.brand.href} className="whitespace-nowrap">
        {words(segment.highlight, key, ctx, icon)}
      </TextLink>
    );
  }
  if ('highlight' in segment) {
    const icon = <InlineIcon icon={segment.brand?.icon} emoji={segment.emoji} />;
    return <Highlight key={key}>{words(segment.highlight, key, ctx, icon)}</Highlight>;
  }
  return words(segment.text, key, ctx);
}

type AnswerBodyProps = { paragraphs: readonly Paragraph[]; caretAt?: number };

// each paragraph is its own message, the way you'd text
export function AnswerBody({ paragraphs, caretAt = -1 }: AnswerBodyProps) {
  const ctx: Ctx = { caretAt, count: 0 };
  return (
    <div className="flex flex-col items-start gap-2">
      {paragraphs.map((segments, i) => (
        <p
          key={i}
          className="w-fit max-w-[85%] animate-rise border border-line bg-fg/[0.03] px-3.5 py-2 text-chat text-fg-soft motion-reduce:animate-none"
        >
          {segments.map((s, k) => renderSegment(s, `${i}-${k}`, ctx))}
        </p>
      ))}
    </div>
  );
}
