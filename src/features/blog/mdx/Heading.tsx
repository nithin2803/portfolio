import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Level = 1 | 2 | 3 | 4;

const STYLE: Record<Level, string> = {
  1: 'mt-10 text-display font-medium text-fg',
  2: 'mt-10 text-display font-medium text-fg',
  3: 'mt-6 text-body font-semibold text-fg',
  4: 'mt-4 text-small text-fg uppercase',
};

function slugify(children: ReactNode): string | undefined {
  const text =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.filter((c) => typeof c === 'string').join('')
        : '';
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return id || undefined;
}

type HeadingProps = ComponentPropsWithoutRef<'h2'> & { level: Level };

export function Heading({ level, className, children, ...rest }: HeadingProps) {
  const Tag = `h${level}` as const;
  const id = rest.id ?? slugify(children);
  return (
    <Tag id={id} className={cn('group scroll-mt-32', STYLE[level], className)} {...rest}>
      {children}
      {id && (
        <a
          href={`#${id}`}
          aria-label="Link to this section"
          className="ml-3 text-small text-fg-faint no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          #
        </a>
      )}
    </Tag>
  );
}
