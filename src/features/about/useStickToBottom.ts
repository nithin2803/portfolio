import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

// how close to the end still counts as at the bottom
const AT_BOTTOM_PX = 32;
// a scroll this soon after a wheel, touch, drag or key is the visitor's; any other is the chat's own
const INPUT_MS = 300;

// Keeps the conversation with its newest message unless the visitor has scrolled up on purpose, and says when
// it's away from the bottom so a jump button can show
export function useStickToBottom(scrollRef: RefObject<HTMLDivElement | null>) {
  const pinned = useRef(true);
  const lastInput = useRef(0);
  const [away, setAway] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight < AT_BOTTOM_PX;
    const input = () => (lastInput.current = performance.now());
    const onScroll = () => {
      setAway(!atBottom());
      if (performance.now() - lastInput.current < INPUT_MS) pinned.current = atBottom();
    };
    // a reply growing under a visitor who scrolled up moves the bottom away without a scroll
    const grown = new MutationObserver(() => setAway(!atBottom()));
    grown.observe(el, { childList: true, subtree: true, characterData: true });
    const inputs = ['wheel', 'touchmove', 'pointerdown', 'keydown'] as const;
    for (const type of inputs) el.addEventListener(type, input, { passive: true });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      grown.disconnect();
      for (const type of inputs) el.removeEventListener(type, input);
      el.removeEventListener('scroll', onScroll);
    };
  }, [scrollRef]);

  const toBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    pinned.current = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [scrollRef]);

  const isPinned = useCallback(() => pinned.current, []);
  const repin = useCallback(() => {
    pinned.current = true;
  }, []);

  return { away, isPinned, repin, toBottom };
}
