'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServerEvent } from '@/features/chat/agent';
import type { Action, Canned } from '@/features/chat/knowledge';
import { CHAT_BUDGET, NYTHOS } from '@/features/chat/nythos';
import type { ReservedId } from '@/features/chat/types';
import { ABOUT_CHAT } from './content';
import type { ChatEvents } from './events';

export type Phase = 'thinking' | 'streaming' | 'done';
export type Source = { label: string; href?: string };

export type Message =
  | { key: number; role: 'user'; text: string; photo?: boolean }
  | {
      key: number;
      role: 'assistant';
      text: string;
      phase: Phase;
      sources: Source[];
      followUps: string[];
      actions: Action[];
      // the me.md facets it drew on, sent back so later answers don't suggest them again
      about: string[];
      // the facet behind each follow-up, sent back so tapping one can bring it in
      followUpFacets: string[];
      canned: boolean;
    };

type Assistant = Extract<Message, { role: 'assistant' }>;

export type ComposerControl = {
  write(text: string): void;
  press(down: boolean): void;
};

const T = ABOUT_CHAT.timing;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

async function* readEvents(res: Response) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let split: number;
    while ((split = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const data = frame.replace(/^data:\s?/, '');
      try {
        yield JSON.parse(data) as ServerEvent;
      } catch {
        // ignore malformed frames
      }
    }
  }
}

export function useConversation(
  reserved: Record<ReservedId, Canned>,
  composer: ComposerControl,
  events: ChatEvents,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const nextKey = useRef(0);
  const pending = useRef<{ question: string; keys: number[] } | null>(null);

  const patch = useCallback((key: number, update: (m: Assistant) => Partial<Assistant>) => {
    setMessages((list) =>
      list.map((m) => (m.key === key && m.role === 'assistant' ? { ...m, ...update(m) } : m)),
    );
  }, []);

  // aborts whatever is playing and hands out the signal for what replaces it
  const restart = useCallback(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    return controller.current.signal;
  }, []);

  // adds the question and a thinking reply; `draft` is what Escape puts back in the box
  const open = useCallback(
    (question: string, draft: string, photo?: boolean) => {
      composer.write('');
      const userKey = nextKey.current++;
      const replyKey = nextKey.current++;
      pending.current = { question: draft, keys: [userKey, replyKey] };
      setMessages((list) => [
        ...list,
        { key: userKey, role: 'user', text: question, photo },
        {
          key: replyKey,
          role: 'assistant',
          text: '',
          phase: 'thinking',
          sources: [],
          followUps: [],
          actions: [],
          about: [],
          followUpFacets: [],
          canned: false,
        },
      ]);
      events.sent(question);
      return { userKey, replyKey };
    },
    [composer, events],
  );

  const run = useCallback(
    async (question: string, history: Message[], signal: AbortSignal) => {
      const { userKey, replyKey } = open(question, question);
      // a question that got a canned reply (refused, not written, an error) is left out with its reply, or the
      // model answers it late, on the next turn
      const answered = (m: Message, i: number) => {
        const reply = m.role === 'user' ? history[i + 1] : m;
        return reply?.role === 'assistant' && !reply.canned && Boolean(reply.text);
      };
      const turns = [
        ...history.filter(answered).map((m) =>
          m.role === 'user'
            ? { role: m.role, content: m.text }
            : {
                role: m.role,
                content: m.text,
                about: m.about,
                offered: m.followUps,
                offeredFacets: m.followUpFacets,
              },
        ),
        { role: 'user', content: question },
      ];
      const canned = (id: ReservedId) => {
        const { text, followUps, actions } = reserved[id];
        patch(replyKey, () => ({ text, followUps, actions, canned: true }));
      };

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages: turns }),
          signal,
        });
        if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
        for await (const e of readEvents(res)) {
          if (e.type === 'text') patch(replyKey, (m) => ({ text: m.text + e.delta, phase: 'streaming' }));
          else if (e.type === 'tool')
            patch(replyKey, (m) => ({ sources: [...m.sources, { label: e.label, href: e.href }] }));
          else if (e.type === 'canned') canned(e.id);
          else if (e.type === 'error') patch(replyKey, () => ({ text: ABOUT_CHAT.hiccup, canned: true }));
          else if (e.type === 'context_full') {
            setMessages((list) => list.filter((m) => m.key !== userKey && m.key !== replyKey));
            setFull(true);
            composer.write(question);
            pending.current = null;
            setBusy(false);
            return;
          } else if (e.type === 'done') {
            patch(replyKey, (m) =>
              m.canned
                ? {}
                : {
                    followUps: e.followUps,
                    followUpFacets: e.followUpFacets,
                    actions: e.actions,
                    about: e.about,
                  },
            );
            const total = e.promptTokens + e.completionTokens;
            if (total) {
              events.context(total, NYTHOS.contextWindow);
              if (total + CHAT_BUDGET.maxOutputTokens > NYTHOS.contextWindow) setFull(true);
            }
            events.done({
              promptTokens: e.promptTokens,
              completionTokens: e.completionTokens,
              generationMs: e.generationMs,
            });
          }
        }
      } catch (err) {
        if (signal.aborted) throw err;
        patch(replyKey, () => ({ text: ABOUT_CHAT.hiccup, canned: true }));
      }
      patch(replyKey, (m) => ({ phase: 'done', text: m.text || ABOUT_CHAT.hiccup }));
      pending.current = null;
      setBusy(false);
    },
    [composer, events, open, patch, reserved],
  );

  const send = useCallback(
    (question: string) => {
      const text = question.trim().slice(0, CHAT_BUDGET.maxQuestionChars);
      if (!text || busy || full) return;
      setBusy(true);
      run(text, messages, restart()).catch(() => {});
    },
    [busy, full, messages, restart, run],
  );

  const askChip = useCallback(
    async (question: string) => {
      if (busy || full) return;
      const signal = restart();
      pending.current = { question, keys: [] };
      setBusy(true);
      try {
        for (let i = 1; i <= question.length; i++) {
          composer.write(question.slice(0, i));
          await sleep(T.chipTypeMs, signal);
        }
        await sleep(T.sendMs, signal);
        composer.press(true);
        await sleep(140, signal);
        composer.press(false);
        await run(question, messages, signal);
      } catch {
        // aborted by new chat
      }
    },
    [busy, full, composer, messages, restart, run],
  );

  // the empty-chat photo: the question and its answer are fixed (content/chat/photo.md), so it plays
  // out locally like a model reply and stays in the history for follow-ups
  const askPhoto = useCallback(async () => {
    if (busy || full) return;
    const { question, text, followUps, actions } = reserved.photo;
    const signal = restart();
    setBusy(true);
    const { replyKey } = open(question, '', true);
    try {
      await sleep(T.photoThinkMs, signal);
      for (const chunk of text.split(/(?<=\s)/)) {
        patch(replyKey, (m) => ({ text: m.text + chunk, phase: 'streaming' }));
        await sleep(T.photoWordMs, signal);
      }
      patch(replyKey, () => ({ phase: 'done', followUps, actions }));
      events.done();
      pending.current = null;
      setBusy(false);
    } catch {
      // aborted by new chat or escape
    }
  }, [busy, full, events, open, patch, reserved, restart]);

  const newChat = useCallback(() => {
    pending.current = null;
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
    setBusy(false);
    setFull(false);
    events.reset();
    events.context(0, NYTHOS.contextWindow);
  }, [events]);

  useEffect(() => () => controller.current?.abort(), []);

  const cancel = useCallback((): string | null => {
    const p = pending.current;
    if (!p) return null;
    pending.current = null;
    controller.current?.abort();
    controller.current = null;
    if (p.keys.length) setMessages((list) => list.filter((m) => !p.keys.includes(m.key)));
    composer.write(p.question);
    setBusy(false);
    return p.question;
  }, [composer]);

  return { messages, busy, full, send, askChip, askPhoto, newChat, cancel };
}
