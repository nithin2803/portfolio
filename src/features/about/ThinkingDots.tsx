import { cn } from '@/lib/cn';

const DOTS = [
  { delay: '0ms', color: 'bg-fringe-r' },
  { delay: '180ms', color: 'bg-fg-muted' },
  { delay: '360ms', color: 'bg-fringe-b' },
];

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className}>
      {DOTS.map(({ delay, color }) => (
        <span key={delay} className={cn('size-1.5 animate-blink', color)} style={{ animationDelay: delay }} />
      ))}
    </span>
  );
}
