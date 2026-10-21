import type { ReactNode } from 'react';

export function Highlight({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap text-fg">{children}</span>;
}
