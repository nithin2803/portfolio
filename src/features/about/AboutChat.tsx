'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Canned } from '@/features/chat/knowledge';
import type { LinkCatalog } from '@/features/chat/markdown';
import { NYTHOS } from '@/features/chat/nythos';
import type { ReservedId } from '@/features/chat/types';
import { cn } from '@/lib/cn';
import { ActivationRail } from './ActivationRail';
import { AssistantMessage } from './AssistantMessage';
import { ChatWindow } from './ChatWindow';
import { Composer } from './Composer';
import { EmptyChat } from './EmptyChat';
import type { ChatEvents } from './events';
import { KVCacheRail } from './KVCacheRail';
import { attend } from './model';
import { ModelCardRail } from './ModelCardRail';
import { useConversation, type ComposerControl } from './useConversation';
import { useHeroJoin } from './useHeroJoin';
import { UserMessage } from './UserMessage';

type AboutChatProps = {
  heroId: string;
  lead: ReactNode;
  opener: string;
  reserved: Record<ReservedId, Canned>;
  links: LinkCatalog;
};

const FADE = 'opacity-0 transition-opacity duration-500 ease-out-quint data-active:opacity-100';
const COLUMNS = 'xl:grid-cols-[minmax(0,1fr)_minmax(0,var(--container-reading))_minmax(0,1fr)]';
const RAIL =
  'relative hidden h-chat w-full flex-col justify-center gap-10 self-center xl:row-start-2 xl:flex';
const KEEP_IN_VIEW = 24;
// elements that handle Enter themselves
const HANDLES_ENTER = 'input, textarea, select, button, a, [contenteditable]';

const stripEmoji = (s: string) => s.replace(/[\p{Extended_Pictographic}️]/gu, '').trim();

export function AboutChat({ heroId, lead, opener, reserved, links }: AboutChatProps) {
  const leadRef = useRef<HTMLParagraphElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modelCard = useRef<ChatEvents>(null);
  const activations = useRef<ChatEvents>(null);
  const kvCache = useRef<ChatEvents>(null);
  const history = useRef<string[]>([]);
  const sentQuestions = useRef<string[]>([]);
  const recall = useRef<{ index: number; stash: string } | null>(null);
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState('');
  const [pressed, setPressed] = useState(false);

  const events = useMemo<ChatEvents>(() => {
    const each = (fn: (rail: ChatEvents) => void) => {
      for (const rail of [modelCard, activations, kvCache]) if (rail.current) fn(rail.current);
    };
    return {
      reset() {
        history.current = [];
        each((r) => r.reset());
      },
      context: (used, window) => each((r) => r.context(used, window)),
      sent(question) {
        sentQuestions.current.push(question);
        history.current.push(...question.split(/\s+/).map(stripEmoji).filter(Boolean));
        each((r) => r.sent(question));
      },
      token: (e) => each((r) => r.token(e)),
      done: (usage) => each((r) => r.done(usage)),
    };
  }, []);

  const composer = useMemo<ComposerControl>(() => ({ write: setDraft, press: setPressed }), []);
  const { messages, busy, full, send, askChip, askPhoto, newChat, cancel } = useConversation(
    reserved,
    composer,
    events,
  );
  const started = messages.length > 0;

  useEffect(() => events.context(0, NYTHOS.contextWindow), [events]);

  const editDraft = (text: string) => {
    recall.current = null;
    setDraft(text);
  };
  const submit = () => {
    recall.current = null;
    send(draft);
  };

  const stepHistory = (step: -1 | 1) => {
    const sent = sentQuestions.current;
    if (!sent.length || (step === 1 && !recall.current)) return false;
    const r = recall.current ?? { index: sent.length, stash: draft };
    const index = Math.max(0, r.index + step);
    if (index >= sent.length) {
      recall.current = null;
      setDraft(r.stash);
    } else {
      recall.current = { ...r, index };
      setDraft(sent[index]);
    }
    return true;
  };
  const startNewChat = () => {
    newChat();
    setDraft('');
  };

  // the hero join stays made all the way down the page, so focus and the chat's keys also need the
  // box itself on screen; scrolling past it hands the keyboard back to the page
  const inView = useRef(false);

  // pointer: fine only, so phones don't pop the keyboard just from scrolling
  const focusComposer = () => {
    const el = inputRef.current;
    const elsewhere = document.activeElement && document.activeElement !== document.body;
    if (!el || elsewhere || !inView.current || !matchMedia('(pointer: fine)').matches) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  };

  // a clicked photo or chip unmounts as it sends, dropping focus to the body: hand it back to the box
  const refocus = useEffectEvent(() => {
    if (active) focusComposer();
  });
  useEffect(() => {
    if (started) refocus();
  }, [busy, started]);

  const onComposerView = useEffectEvent((visible: boolean) => {
    inView.current = visible;
    if (visible && active) focusComposer();
    else if (!visible && document.activeElement === inputRef.current) inputRef.current?.blur();
  });
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => onComposerView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useHeroJoin(leadRef, heroId, {
    onJoin() {
      setActive(true);
      focusComposer();
    },
    onLeave() {
      setActive(false);
      if (document.activeElement === inputRef.current) inputRef.current?.blur();
    },
  });

  const onGlobalKey = useEffectEvent((e: KeyboardEvent) => {
    if (!inView.current) return;
    if (e.key === 'Escape' && active) {
      if (cancel() === null) return;
      e.preventDefault();
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      return;
    }
    if (e.key !== 'Enter' || !active || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest(HANDLES_ENTER)) return;
    e.preventDefault();
    submit();
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onGlobalKey(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const lastUserKey = [...messages].reverse().find((m) => m.role === 'user')?.key;
  useEffect(() => {
    const b = scrollRef.current;
    const el = b?.querySelector<HTMLElement>(`[data-user="${lastUserKey}"]`);
    if (b && el) b.scrollTo({ top: el.offsetTop - KEEP_IN_VIEW, behavior: 'smooth' });
  }, [lastUserKey]);

  const keepCaretInView = () => {
    const b = scrollRef.current;
    const caret = b?.querySelector<HTMLElement>('[data-caret]');
    if (!b || !caret) return;
    const over = caret.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom + KEEP_IN_VIEW;
    if (over > 0) b.scrollTop += over;
  };

  const onWord = (raw: string) => {
    const text = stripEmoji(raw);
    if (!text) return;
    const last = history.current.length - 1;
    if (!/[\p{L}\p{N}]/u.test(text) && last >= 0) {
      history.current[last] += text;
      return;
    }
    history.current.push(text);
    events.token({ text, history: history.current, attention: attend(history.current) });
  };

  return (
    <section id="about" className="relative px-edge py-[18vh]">
      <div className={cn('mx-auto grid max-w-page gap-x-16', COLUMNS)}>
        <p
          ref={leadRef}
          aria-hidden="true"
          className="invisible mb-6 text-display whitespace-nowrap text-fg-soft data-joined:visible xl:col-start-2"
        >
          {lead}
        </p>
        <div
          aria-hidden={!started || undefined}
          className={cn(
            RAIL,
            'max-w-60 justify-self-end transition-[opacity,translate] duration-700 ease-out-quint xl:col-start-1',
            active && started ? 'opacity-100' : 'pointer-events-none -translate-x-6 opacity-0',
          )}
        >
          <ModelCardRail ref={modelCard} live={started} />
        </div>
        <div
          data-active={active || undefined}
          className={cn(FADE, 'self-center xl:col-start-2 xl:row-start-2')}
        >
          <ChatWindow
            scrollRef={scrollRef}
            busy={busy}
            canReset={started}
            onNewChat={startNewChat}
            composer={
              <Composer
                inputRef={inputRef}
                draft={draft}
                pressed={pressed}
                full={full}
                onDraft={editDraft}
                onHistory={stepHistory}
                onSend={submit}
                onNewChat={startNewChat}
              />
            }
          >
            {!started && (
              <EmptyChat
                opener={opener}
                question={reserved.photo.question}
                onAsk={askChip}
                onPhoto={askPhoto}
              />
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserMessage key={m.key} id={m.key} text={m.text} photo={m.photo} />
              ) : (
                <AssistantMessage
                  key={m.key}
                  message={m}
                  links={links}
                  latest={i === messages.length - 1}
                  canAsk={!busy && !full}
                  onWord={onWord}
                  onGrow={keepCaretInView}
                  onAsk={askChip}
                />
              ),
            )}
          </ChatWindow>
        </div>
        <div
          aria-hidden={!started || undefined}
          className={cn(
            RAIL,
            'max-w-64 transition-[opacity,translate] duration-700 ease-out-quint xl:col-start-3',
            active && started ? 'opacity-100' : 'pointer-events-none translate-x-6 opacity-0',
          )}
        >
          <ActivationRail ref={activations} />
          <KVCacheRail ref={kvCache} />
        </div>
      </div>
    </section>
  );
}
