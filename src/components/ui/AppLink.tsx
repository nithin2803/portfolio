import Link from 'next/link';
import type { ComponentProps } from 'react';

type AppLinkProps = Omit<ComponentProps<'a'>, 'href'> & { href: string };

// on-site pages route client-side; other sites and files open in a new tab
export function AppLink({ href, ...rest }: AppLinkProps) {
  if (href.startsWith('/') && !/\.(pdf|xml)$/.test(href)) return <Link href={href} {...rest} />;
  const newTab = /^https?:/.test(href) || href.endsWith('.pdf');
  return (
    <a href={href} target={newTab ? '_blank' : undefined} rel={newTab ? 'noreferrer' : undefined} {...rest} />
  );
}
