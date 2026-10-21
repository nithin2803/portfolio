import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type KeycapProps = {
  children: ReactNode;
  pressed?: boolean;
  className?: string;
};

export function Keycap({ children, pressed = false, className }: KeycapProps) {
  return <kbd className={cn('keycap', pressed && 'is-pressed', className)}>{children}</kbd>;
}
