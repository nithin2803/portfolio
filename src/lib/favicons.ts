// Server-only: which sites /api/favicon will fetch a favicon for. Only sites the content links to, so the route
// can't be used to pull arbitrary favicons through this server.
import { getKnowledge } from '@/features/chat/knowledge';
import { blogLinks } from './blogLinks';
import { iconFor } from './brands';
import { glossary } from './glossary';
import type { LinkIcon } from './icons';

const faviconOf = (icon: LinkIcon | null | undefined) => (icon?.kind === 'favicon' ? [icon.site] : []);

async function collect() {
  const { links } = await getKnowledge();
  return new Set([
    // the chat's allowlist (contact links, links in chat content), already resolved to icons
    ...Object.values(links.hrefs).flatMap(faviconOf),
    ...[...blogLinks()].flatMap((href) => faviconOf(iconFor(href))),
    // names whose icon is a favicon (Stripe), and sites others borrow theirs from (maps.google.com)
    ...glossary.terms.flatMap((t) => faviconOf(t.icon)),
    ...glossary.links.flatMap((l) => faviconOf(l.icon)),
  ]);
}

// content is fixed for a deployment, so production works it out once; dev re-reads so new links work
let sites: Promise<Set<string>> | undefined;
export function faviconSites() {
  if (process.env.NODE_ENV !== 'production') return collect();
  sites ??= collect();
  return sites;
}
