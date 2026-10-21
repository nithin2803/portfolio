// A blog link's preview image: a screenshot of the page (or its og:image), fetched by the server so visitors
// never talk to the linked site or the screenshot service, then cached by the CDN.
import { IMAGE_CACHE_CONTROL } from '@/lib/cache';
import { previewable } from '@/lib/linkPreview';
import { getScreenshot } from '@/lib/linkScreenshot';

// a first screenshot waits for the page to draw
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') ?? '';
  if (!previewable(url)) return new Response(null, { status: 404 });
  const image = await getScreenshot(url);
  if (!image) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(new Uint8Array(image), {
    headers: { 'content-type': 'image/webp', 'cache-control': IMAGE_CACHE_CONTROL },
  });
}
