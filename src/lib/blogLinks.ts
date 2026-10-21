// Server-only: every external link in a blog post. The favicon and preview routes only fetch for these, so
// they can't be used to pull arbitrary pages through this server.
import fs from 'node:fs';
import path from 'node:path';

const BLOG = path.join(process.cwd(), 'content/blog');
const LINK = /\]\((https?:\/\/[^)\s]+)\)|href="(https?:\/\/[^"]+)"/g;

const read = () =>
  fs
    .readdirSync(BLOG)
    .filter((f) => f.endsWith('.mdx') && !f.startsWith('_'))
    .flatMap((f) => [...fs.readFileSync(path.join(BLOG, f), 'utf8').matchAll(LINK)].map((m) => m[1] ?? m[2]));

// posts are fixed for a deployment, so production reads them once; dev re-reads so new links work
let links: Set<string> | undefined;
export function blogLinks(): ReadonlySet<string> {
  if (process.env.NODE_ENV !== 'production') return new Set(read());
  links ??= new Set(read());
  return links;
}
