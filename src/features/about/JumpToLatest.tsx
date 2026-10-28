import { cn } from '@/lib/cn';
import { ABOUT_CHAT } from './content';

type JumpToLatestProps = { visible: boolean; onJump: () => void };

export function JumpToLatest({ visible, onJump }: JumpToLatestProps) {
  return (
    <button
      type="button"
      onClick={onJump}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible || undefined}
      className={cn(
        'absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 border border-line bg-glass px-2.5 py-1 text-small text-fg-muted shadow-bubble backdrop-blur-sm transition-[opacity,translate,color,border-color] duration-200 ease-out-quint hover:border-line-strong hover:text-fg focus-visible:border-line-strong focus-visible:text-fg',
        !visible && 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <span aria-hidden="true">↓</span>
      {ABOUT_CHAT.jumpToLatest}
    </button>
  );
}
