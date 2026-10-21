import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { LinkIcon } from '@/lib/icons';
import { AppLink } from './AppLink';
import { LinkIconView } from './LinkIconView';

// The site's two kinds of text link (cards, chips and the big email link are blocks, styled on their own):
// - inline: a link inside text (chat answers, blog posts, Contact). Near-white with a faint underline that turns
//   white on hover; its icon sits on the left and lifts.
// - quiet: an interface link (the nav, back links, RSS, "All posts", the chat's sources). Grey, white on
//   hover, no underline.
export const INLINE_LINK =
  'group/link text-fg underline decoration-fg-faint decoration-1 underline-offset-4 outline-none transition-[text-decoration-color] hover:decoration-fg focus-visible:decoration-fg';
export const QUIET_LINK =
  'text-fg-muted outline-none transition-colors hover:text-white focus-visible:text-white';

const LIFT =
  'mr-[0.3em] transition-transform duration-300 ease-pop group-hover/link:-translate-y-[2px] group-hover/link:-rotate-8 group-focus-visible/link:-translate-y-[2px] group-focus-visible/link:-rotate-8';

// an inline link's icon: on the left, lifting when the link is hovered (a name's icon, not a link, stays still)
export function InlineLinkIcon({ icon, className }: { icon: LinkIcon; className?: string }) {
  return <LinkIconView icon={icon} className={cn(LIFT, className)} />;
}

type TextLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: string;
  quiet?: boolean;
  icon?: LinkIcon | null;
  children: ReactNode;
};

export function TextLink({ href, quiet = false, icon, className, children, ...rest }: TextLinkProps) {
  return (
    <AppLink href={href} className={cn(quiet ? QUIET_LINK : INLINE_LINK, className)} {...rest}>
      {icon && <InlineLinkIcon icon={icon} />}
      {children}
    </AppLink>
  );
}
