'use client';

import type { KeyboardEvent, Ref } from 'react';
import { Keycap } from '@/components/ui';
import { CHAT_BUDGET } from '@/features/chat/nythos';
import { ABOUT_CHAT } from './content';

type ComposerProps = {
  inputRef: Ref<HTMLTextAreaElement>;
  draft: string;
  pressed: boolean;
  full: boolean;
  onDraft: (text: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  onHistory: (step: -1 | 1) => boolean;
};

// history only takes ↑ on the first line and ↓ on the last, so multi-line drafts stay navigable
function onFirstLine(el: HTMLTextAreaElement) {
  return !el.value.slice(0, el.selectionStart).includes('\n');
}
function onLastLine(el: HTMLTextAreaElement) {
  return !el.value.slice(el.selectionEnd).includes('\n');
}

export function Composer({
  inputRef,
  draft,
  pressed,
  full,
  onDraft,
  onSend,
  onNewChat,
  onHistory,
}: ComposerProps) {
  if (full) {
    return (
      <div className="flex items-center gap-3 border-t border-line px-4 py-3 text-chat">
        <p className="flex-1 text-fringe-r">{ABOUT_CHAT.contextFull}</p>
        <button type="button" onClick={onNewChat} className="ghost-button">
          {ABOUT_CHAT.newChat}
        </button>
      </div>
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSend();
    } else if (e.key === 'ArrowUp' && onFirstLine(el) && onHistory(-1)) {
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && onLastLine(el) && onHistory(1)) {
      e.preventDefault();
    }
  };

  return (
    <form
      className="flex items-end gap-3 border-t border-line px-4 py-3 text-chat"
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
    >
      <span aria-hidden="true" className="self-start text-white">
        &gt;
      </span>
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={CHAT_BUDGET.maxQuestionChars}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={ABOUT_CHAT.placeholder}
          placeholder={ABOUT_CHAT.placeholder}
          className="block field-sizing-content max-h-[9em] w-full resize-none bg-transparent text-fg caret-fringe-b outline-none placeholder:text-fg-faint"
        />
      </div>
      <button type="submit" aria-label="Send" className="cursor-pointer">
        <Keycap pressed={pressed}>↵</Keycap>
      </button>
    </form>
  );
}
