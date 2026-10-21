'use client';

import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { NMark } from '@/components/ui';
import { parseReply, stableText, words, type LinkCatalog } from '@/features/chat/markdown';
import { Actions } from './Actions';
import { ABOUT_CHAT } from './content';
import { AnswerBody } from './AnswerBody';
import { FollowUps } from './FollowUps';
import { Sources } from './Sources';
import { ThinkingDots } from './ThinkingDots';
import type { Message } from './useConversation';

type AssistantMessageProps = {
  message: Extract<Message, { role: 'assistant' }>;
  links: LinkCatalog;
  latest: boolean;
  canAsk: boolean;
  onWord: (word: string) => void;
  onGrow: () => void;
  onAsk: (question: string) => void;
};

export function AssistantMessage({
  message,
  links,
  latest,
  canAsk,
  onWord,
  onGrow,
  onAsk,
}: AssistantMessageProps) {
  const { text, phase, sources, followUps, actions, canned } = message;
  const streaming = phase !== 'done';
  const paragraphs = useMemo(
    () => parseReply(streaming ? stableText(text) : text, links),
    [text, streaming, links],
  );
  const list = useMemo(() => words(paragraphs), [paragraphs]);
  // a link the answer already makes inline doesn't need a chip too
  const extra = useMemo(() => {
    const inline = new Set(paragraphs.flatMap((p) => p.flatMap((s) => ('href' in s ? [s.href] : []))));
    return actions.filter((a) => !inline.has(a.href));
  }, [actions, paragraphs]);
  const emitted = useRef(0);
  const word = useEffectEvent(onWord);
  const grow = useEffectEvent(onGrow);

  useEffect(() => {
    if (canned) return;
    for (; emitted.current < list.length; emitted.current++) word(list[emitted.current]);
    grow();
  }, [list, canned]);

  return (
    <div className="flex animate-rise gap-4">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center border border-line bg-black"
      >
        <NMark size={13} />
      </span>
      <div className="relative min-w-0 flex-1" aria-live={latest ? 'polite' : undefined}>
        <p className="mb-3 text-small leading-8 font-medium text-fg-faint">{ABOUT_CHAT.author}</p>
        <Sources sources={sources} />
        {phase === 'thinking' && !text && <ThinkingDots className="flex gap-1.5 pt-2" />}
        <AnswerBody paragraphs={paragraphs} caretAt={streaming && list.length ? list.length - 1 : -1} />
        {phase === 'done' && extra.length > 0 && (
          <div className="mt-4 animate-rise">
            <Actions actions={extra} links={links} />
          </div>
        )}
        {phase === 'done' && latest && followUps.length > 0 && (
          <div className="mt-5 animate-rise">
            <FollowUps questions={followUps} disabled={!canAsk} onAsk={onAsk} />
          </div>
        )}
      </div>
    </div>
  );
}
