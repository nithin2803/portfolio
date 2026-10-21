// A blog link's hover preview: its title, its icon and a short address for the card's footer (the image, a
// screenshot, is served by ./image).
import { iconFor } from '@/lib/brands';
import { getPreview, previewable } from '@/lib/linkPreview';

const CACHE = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400';

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') ?? '';
  if (!previewable(url)) return new Response(null, { status: 404 });
  const { title } = await getPreview(url);
  const { host, pathname } = new URL(url);
  const address = `${host.replace(/^www\./, '')}${pathname === '/' ? '' : pathname}`;
  return Response.json({ title, address, icon: iconFor(url) }, { headers: { 'cache-control': CACHE } });
}
