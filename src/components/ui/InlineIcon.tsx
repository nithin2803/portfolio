import { cn } from '@/lib/cn';
import type { LinkIcon } from '@/lib/icons';
import { LinkIconView } from './LinkIconView';

// a name's icon (a logo, or an emoji), on its left; unlike a link's icon it stays still
const SPACING = 'mr-[0.3em] inline-block';

export function InlineIcon({
  icon,
  emoji,
  className,
}: {
  icon?: LinkIcon;
  emoji?: string;
  className?: string;
}) {
  if (icon) return <LinkIconView icon={icon} className={cn(SPACING, className)} />;
  if (!emoji) return null;
  return (
    <span aria-hidden="true" className={cn(SPACING, 'not-italic', className)}>
      {emoji}
    </span>
  );
}
