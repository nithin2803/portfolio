import type { ReactNode } from 'react';
import { InlineIcon } from '@/components/ui';
import { glossary } from '@/lib/glossary';
import { Anchor } from './Anchor';

// a glossary name, marked up by src/lib/remark-terms.mjs: the name, its icon, and its link if it has one
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const term = glossary.terms.find((t) => t.id === id);
  if (!term) return children;
  if (term.href)
    return (
      <Anchor href={term.href} icon={term.icon}>
        {children}
      </Anchor>
    );
  return (
    <span className="whitespace-nowrap">
      <InlineIcon icon={term.icon} emoji={term.emoji} />
      {children}
    </span>
  );
}
