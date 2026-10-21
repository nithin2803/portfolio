import type { ReactNode } from 'react';
import { InlineIcon, InlineLinkIcon, TextLink } from '@/components/ui';
import type { Paragraph, Segment } from '@/features/chat/types';
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

export function AnswerBody({ paragraphs, caretAt = -1 }: AnswerBodyProps) {
  const ctx: Ctx = { caretAt, count: 0 };
  return paragraphs.map((segments, i) => (
    <p key={i} className="mb-[0.9em] text-chat text-fg-muted last:mb-0">
      {segments.map((s, k) => renderSegment(s, `${i}-${k}`, ctx))}
    </p>
  ));
}
