import { TextLink } from '@/components/ui';
import { ABOUT_CHAT } from './content';
import type { Source } from './useConversation';

export function Sources({ sources }: { sources: readonly Source[] }) {
  if (!sources.length) return null;
  return (
    <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-small text-fg-faint">
      <span className="text-fringe-b">↳ {ABOUT_CHAT.sourcesLabel}</span>
      {sources.map((s, i) => (
        <span key={`${s.label}-${i}`}>
          {s.href ? (
            <TextLink href={s.href} quiet>
              {s.label}
            </TextLink>
          ) : (
            s.label
          )}
          {i < sources.length - 1 && ' ·'}
        </span>
      ))}
    </p>
  );
}
