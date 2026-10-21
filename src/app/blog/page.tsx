import type { Metadata } from 'next';
import { BLOG_COPY, BlogHeader, EmptyState, getPosts, PostList } from '@/features/blog';

export const metadata: Metadata = {
  title: BLOG_COPY.title,
  description: BLOG_COPY.intro,
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
};

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <main className="mx-auto flex max-w-page flex-col gap-14 px-edge pt-40 pb-32">
      <BlogHeader />
      {posts.length > 0 ? <PostList posts={posts} priority /> : <EmptyState />}
    </main>
  );
}
