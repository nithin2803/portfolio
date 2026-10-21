import type { ComponentPropsWithoutRef } from 'react';
import { INLINE_LINK, InlineLinkIcon, TextLink } from '@/components/ui';
import { iconFor } from '@/lib/brands';
import { cn } from '@/lib/cn';
import type { LinkIcon } from '@/lib/icons';
import { PreviewLink } from './PreviewLink';

type AnchorProps = ComponentPropsWithoutRef<'a'> & { icon?: LinkIcon | null };

// a link in a post is the site's inline link, like the chat's: the site's logo or favicon on the left (same-page
// # links get none), and other sites show a preview of the page while hovered
export function Anchor({ href = '', className, icon = iconFor(href), children, ...rest }: AnchorProps) {
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <TextLink href={href} icon={href.startsWith('#') ? null : icon} className={className} {...rest}>
        {children}
      </TextLink>
    );
  }
  return (
    <PreviewLink
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(INLINE_LINK, className)}
      {...rest}
    >
      {icon && <InlineLinkIcon icon={icon} />}
      {children}
    </PreviewLink>
  );
}
