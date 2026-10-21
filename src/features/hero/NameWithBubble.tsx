'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { useTapToggle } from '@/lib/useTapToggle';
import { HEADLINE } from './content';

type NameWithBubbleProps = {
  focusable?: boolean;
};

const BUBBLE = cn(
  'pointer-events-none inline-block h-[0.85em] w-0 scale-50 align-[-0.06em] opacity-0 shadow-bubble',
  'transition-[width,margin,scale,opacity] duration-380 ease-spring',
  'group-hover/name:ml-[0.22em] group-hover/name:w-[0.85em] group-hover/name:scale-100 group-hover/name:opacity-100',
  'group-focus-visible/name:ml-[0.22em] group-focus-visible/name:w-[0.85em] group-focus-visible/name:scale-100 group-focus-visible/name:opacity-100',
  'group-data-active/name:ml-[0.22em] group-data-active/name:w-[0.85em] group-data-active/name:scale-100 group-data-active/name:opacity-100',
);

export function NameWithBubble({ focusable = false }: NameWithBubbleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useTapToggle(ref);

  return (
    <span
      ref={ref}
      tabIndex={focusable ? 0 : undefined}
      className="group/name pointer-events-auto relative cursor-default text-white outline-none"
    >
      <span className="underline decoration-transparent decoration-2 underline-offset-[0.16em] transition-[text-decoration-color] duration-200 group-hover/name:decoration-current group-focus-visible/name:decoration-current group-data-active/name:decoration-current">
        {HEADLINE.name}
      </span>
      <span aria-hidden="true" className={cn('overflow-hidden rounded-full', BUBBLE)}>
        <Image
          src={HEADLINE.headshot.src}
          alt=""
          width={HEADLINE.headshot.size}
          height={HEADLINE.headshot.size}
          loading="eager"
          className="block size-full object-cover"
        />
      </span>
    </span>
  );
}
