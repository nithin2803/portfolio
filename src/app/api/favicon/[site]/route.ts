// A site's favicon for link icons, fetched from Google's favicon service by the server so visitors never talk
// to Google, then cached by the CDN. Dark favicons (a black logo) are flipped light for the dark page.
import sharp from 'sharp';
import { IMAGE_CACHE_CONTROL } from '@/lib/cache';
import { faviconSites } from '@/lib/favicons';
import { DARK_IMAGE, imageLuminance } from '@/lib/luminance';

const UPSTREAM = (site: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=64`;
const TIMEOUT_MS = 5000;

export async function GET(_request: Request, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  if (!(await faviconSites()).has(site)) return new Response(null, { status: 404 });

  // Google answers 404 with a generic globe for sites without a favicon, which is still worth showing
  const res = await fetch(UPSTREAM(site), { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => null);
  if (!res?.headers.get('content-type')?.startsWith('image/'))
    return new Response(null, { status: 502, headers: { 'cache-control': 'no-store' } });
  const original = Buffer.from(await res.arrayBuffer());
  const dark = (await imageLuminance(original)) < DARK_IMAGE;
  const png = await (dark ? sharp(original).negate({ alpha: false }) : sharp(original)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { 'content-type': 'image/png', 'cache-control': IMAGE_CACHE_CONTROL },
  });
}
