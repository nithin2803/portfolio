// Server-only: a blog link's title and og:image (the screenshot's fallback, see ./linkScreenshot), read from
// the page itself. Only for links that are in a blog post, so the preview routes can't fetch anything else.
import { blogLinks } from './blogLinks';
import { dailyCache } from './cache';

export type Preview = { title: string | null; site: string; image: string | null };

// YouTube puts its og tags ~770KB in
const MAX_HTML = 2 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const HEADERS = { 'user-agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)', accept: 'text/html' };

export const previewable = (url: string) => blogLinks().has(url);

// the head is enough: stop reading once it's past MAX_HTML or the </head>
async function head(url: string) {
  const res = await fetch(url, {
    headers: HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok || !res.body || !res.headers.get('content-type')?.includes('html')) return '';
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let html = '';
  while (html.length < MAX_HTML && !html.includes('</head>')) {
    const { done, value } = await reader.read();
    if (done) break;
    html += value;
  }
  void reader.cancel();
  return html;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

function metaTags(html: string) {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [
        m[1].toLowerCase(),
        m[2] ?? m[3],
      ]),
    );
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    if (key && attrs.content && !tags.has(key)) tags.set(key, decode(attrs.content));
  }
  return tags;
}

// a page's og:image must be a public https URL (not an address inside the host's network)
function publicImage(raw: string | undefined, base: string) {
  if (!raw) return null;
  try {
    const url = new URL(raw, base);
    const internal = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(
      url.hostname,
    );
    return url.protocol === 'https:' && !internal ? url.href : null;
  } catch {
    return null;
  }
}

async function read(url: string): Promise<Preview> {
  const site = new URL(url).host.replace(/^www\./, '');
  try {
    const html = await head(url);
    const tags = metaTags(html);
    const title = tags.get('og:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const image = tags.get('og:image') ?? tags.get('og:image:url') ?? tags.get('twitter:image');
    return { title: title ? decode(title) : null, site, image: publicImage(image, url) };
  } catch {
    return { title: null, site, image: null };
  }
}

// pages change rarely, but one that came back empty is worth another try
export const getPreview = dailyCache(read, (p) => !p.title && !p.image);
