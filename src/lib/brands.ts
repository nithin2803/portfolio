// Server-only: keeps the glossary (content/icons.yaml) and its SVG strings out of the client bundle until a page
// or answer uses them.
import { svg as rss } from 'thesvg/rss';
import { glossary } from './glossary';
import type { LinkIcon } from './icons';
import { PLAY_GAME } from './site';

// an external link shows the favicon of the site it points to, unless the glossary says to borrow another
// site's (a Maps link's own favicon is Google's G). A prefix matches the host and its subdomains, or host + path.
function linkIcon(url: URL): LinkIcon {
  const host = url.host.replace(/^www\./, '');
  const key = `${host}${url.pathname}`;
  const hit = glossary.links.find(({ prefix }) =>
    prefix.includes('/') ? key.startsWith(prefix) : host === prefix || host.endsWith(`.${prefix}`),
  );
  return hit?.icon ?? { kind: 'favicon', site: host };
}

export function iconFor(href: string): LinkIcon | null {
  if (href.startsWith('mailto:')) return { kind: 'mail' };
  if (href === PLAY_GAME.href) return { kind: 'play' };
  if (href.endsWith('.xml')) return { kind: 'svg', svg: rss };
  if (href.endsWith('.pdf')) return { kind: 'doc' };
  if (href.startsWith('/')) return { kind: 'site' };
  if (!/^https?:/.test(href)) return null;
  try {
    return linkIcon(new URL(href));
  } catch {
    return null;
  }
}
