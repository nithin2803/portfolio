import type { MetadataRoute } from 'next';
import { getPosts } from '@/features/blog';
import { SITE } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();
  return [
    { url: SITE.url, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE.url}/blog`, lastModified: posts[0]?.date, changeFrequency: 'weekly', priority: 0.8 },
    ...posts.map((p) => ({ url: `${SITE.url}/blog/${p.slug}`, lastModified: p.date, priority: 0.6 })),
  ];
}
