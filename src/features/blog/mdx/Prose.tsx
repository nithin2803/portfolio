import type { ReactNode } from 'react';

// MDX leaves tags written by hand (<kbd>SPACE</kbd>) as plain HTML, so they're styled here: a <kbd> is the same
// keycap as the Contact section's
export function Prose({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5 text-prose text-fg-muted [&_kbd]:keycap">{children}</div>;
}
