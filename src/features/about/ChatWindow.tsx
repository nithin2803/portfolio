import { useEffect, useRef, type ReactNode, type Ref } from 'react';
import { NYTHOS } from '@/features/chat/nythos';
import { ABOUT_CHAT } from './content';

type ChatWindowProps = {
  scrollRef: Ref<HTMLDivElement>;
  busy: boolean;
  canReset: boolean;
  onNewChat: () => void;
  composer: ReactNode;
  children: ReactNode;
};

// how long after the page stops scrolling before the conversation can take the wheel
const PASS_THROUGH_MS = 500;

export function ChatWindow({ scrollRef, busy, canReset, onNewChat, composer, children }: ChatWindowProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // while the page is scrolling, the conversation can't, so a page scroll that passes over the window
  // carries on instead of getting caught in it; a fresh scroll once the page has settled reaches it
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      rootRef.current?.setAttribute('data-passing', '');
      clearTimeout(timer);
      timer = window.setTimeout(() => rootRef.current?.removeAttribute('data-passing'), PASS_THROUGH_MS);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);

  // the prism light falls behind the window and fades in with it; the glass is tinted rather than
  // blurred, since a backdrop blur can't render while the window is still fading in
  return (
    <div ref={rootRef} className="relative">
      <div
        aria-hidden="true"
        className="prism-light absolute top-0 left-1/2 -z-10 h-[140vh] w-[200vw] -translate-x-1/2"
      />
      <div className="bracket-frame flex h-chat flex-col border border-line bg-black/55">
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-2 text-small">
          <span className="flex items-center gap-2 font-medium text-fg-muted">
            <span className={busy ? 'size-1.5 animate-blink bg-fringe-b' : 'size-1.5 bg-fg-faint'} />
            {ABOUT_CHAT.title}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-fg-faint">{NYTHOS.name}</span>
            <button type="button" onClick={onNewChat} disabled={!canReset} className="ghost-button">
              <span aria-hidden="true">+</span>
              {ABOUT_CHAT.newChat}
            </button>
          </span>
        </header>
        {/* a vignette under the header, as the message area's own background so text stays on top of it */}
        <div className="relative flex min-h-0 flex-1 flex-col bg-[linear-gradient(to_bottom,rgb(0_0_0/0.2),rgb(0_0_0/0.05)_60%,transparent)] bg-[length:100%_320px] bg-no-repeat">
          <div
            ref={scrollRef}
            className="relative flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col gap-7 overflow-y-auto px-5 py-6 sm:px-6 [[data-passing]_&]:overflow-y-hidden"
          >
            {children}
          </div>
        </div>
        {composer}
      </div>
    </div>
  );
}
