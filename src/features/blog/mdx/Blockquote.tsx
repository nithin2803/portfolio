import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export function Blockquote({ className, ...rest }: ComponentPropsWithoutRef<'blockquote'>) {
  return (
    <blockquote
      className={cn('flex flex-col gap-4 border-l border-line-strong pl-5 text-fg-soft', className)}
      {...rest}
    />
  );
}
