// Server-only: what a blog link's hover preview shows, a screenshot of the page as a visitor would see it,
// taken by Microlink (free for ~50 a day; set MICROLINK_API_KEY for more). Falls back to the page's og:image
// when a screenshot fails or comes back blank. Cached per server instance, and by the CDN in front of it.
import sharp from 'sharp';
import { dailyCache } from './cache';
import { getPreview } from './linkPreview';

const WIDTH = 640;
// long enough for WebGL and fade-in sites to draw their first frame
const WAIT_MS = 4000;
const TIMEOUT_MS = 25_000;

async function download(src: string, timeout = 10_000) {
  const res = await fetch(src, { signal: AbortSignal.timeout(timeout) }).catch(() => null);
  if (!res?.ok || !res.headers.get('content-type')?.startsWith('image/')) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function screenshot(url: string, viewport = { width: 1280, height: 800 }) {
  const key = process.env.MICROLINK_API_KEY;
  const api = new URL(key ? 'https://pro.microlink.io' : 'https://api.microlink.io');
  for (const [k, v] of Object.entries({
    url,
    screenshot: 'true',
    meta: 'false',
    'viewport.width': String(viewport.width),
    'viewport.height': String(viewport.height),
    waitForTimeout: String(WAIT_MS),
  }))
    api.searchParams.set(k, v);
  const res = await fetch(api, {
    headers: key ? { 'x-api-key': key } : {},
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => null);
  const body = (await res?.json().catch(() => null)) as { data?: { screenshot?: { url?: string } } } | null;
  const src = body?.data?.screenshot?.url;
  return src ? download(src) : null;
}

// a page that hadn't drawn yet (a black or white frame) is no better than nothing
async function blank(image: Buffer) {
  const { channels } = await sharp(image).stats();
  return channels.slice(0, 3).every((c) => c.stdev < 4);
}

// sites that put a sign-in or bot wall in front of logged-out visitors get a better picture of the page
const youtubeId = (u: URL) =>
  /(^|\.)youtube\.com$/.test(u.hostname)
    ? u.searchParams.get('v')
    : u.hostname === 'youtu.be'
      ? u.pathname.slice(1)
      : null;
const postId = (u: URL) =>
  /(^|\.)(x|twitter)\.com$/.test(u.hostname) ? u.pathname.match(/\/status\/(\d+)/)?.[1] : undefined;

// X's embed page is the post on its own, no login wall: trim the white page around the card
async function xPost(id: string) {
  const embed = `https://platform.twitter.com/embed/Tweet.html?id=${id}&theme=dark&dnt=true`;
  const shot = await screenshot(embed, { width: 550, height: 700 });
  if (!shot) return null;
  // its own shape: forcing the screenshots' 16:10 just pads it with black
  return sharp(shot).trim({ background: '#ffffff' }).toBuffer();
}

// a screenshot, cropped to the card's 16:10 by `resize` (`fit: false` keeps an image's own shape)
type Shot = { image: Buffer; fit?: false };

async function take(url: string): Promise<Shot | null> {
  const u = new URL(url);
  // a video's thumbnail is what a visitor expects (and YouTube shows bots a "confirm you're not a bot" page)
  const video = youtubeId(u);
  if (video) {
    const thumb =
      (await download(`https://i.ytimg.com/vi/${video}/maxresdefault.jpg`)) ??
      (await download(`https://i.ytimg.com/vi/${video}/hqdefault.jpg`));
    return thumb && { image: thumb };
  }
  const post = postId(u);
  if (post) {
    const card = await xPost(post);
    if (card) return { image: card, fit: false };
  }
  const shot = await screenshot(url);
  if (shot && !(await blank(shot))) return { image: shot };
  const { image } = await getPreview(url);
  const og = image && (await download(image));
  return og ? { image: og } : null;
}

const resize = ({ image, fit }: Shot) =>
  sharp(image)
    .resize(
      fit === false
        ? { width: WIDTH, withoutEnlargement: true }
        : { width: WIDTH, height: WIDTH / 1.6, fit: 'cover', position: 'top' },
    )
    .webp({ quality: 80 })
    .toBuffer();

export const getScreenshot = dailyCache(
  (url) =>
    take(url)
      .then((shot) => (shot ? resize(shot) : null))
      .catch(() => null),
  (image) => !image,
);
