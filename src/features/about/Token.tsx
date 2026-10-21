import type { ReactNode } from 'react';

export function Token({ caret = false, children }: { caret?: boolean; children: ReactNode }) {
  return (
    <span data-token data-caret={caret || undefined} className="stream-token">
      {children}
    </span>
  );
}
