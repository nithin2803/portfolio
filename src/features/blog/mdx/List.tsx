import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export function UnorderedList({ className, ...rest }: ComponentPropsWithoutRef<'ul'>) {
  return (
    <ul className={cn('flex list-[square] flex-col gap-2 pl-5 marker:text-fg-faint', className)} {...rest} />
  );
}

export function OrderedList({ className, ...rest }: ComponentPropsWithoutRef<'ol'>) {
  return (
    <ol
      className={cn(
        'flex list-decimal flex-col gap-2 pl-6 marker:text-small marker:text-fg-faint',
        className,
      )}
      {...rest}
    />
  );
}

export function ListItem({ className, ...rest }: ComponentPropsWithoutRef<'li'>) {
  return <li className={cn('pl-1', className)} {...rest} />;
}
