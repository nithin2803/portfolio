import { BLOG_COPY } from '../content';

export function EmptyState() {
  return (
    <div className="bracket-frame flex flex-col gap-3 border border-line p-edge">
      <p className="text-small text-fg-faint uppercase tabular-nums">00 posts</p>
      <p className="text-body text-fg-muted">
        {BLOG_COPY.empty}
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] animate-blink bg-fg-muted"
        />
      </p>
    </div>
  );
}
