import Link from 'next/link';
import { GlitchText, QUIET_LINK } from '@/components/ui';
import { cn } from '@/lib/cn';
import { BLOG_COPY } from '../content';
import { getPosts } from '../posts';
import { EmptyState } from './EmptyState';
import { PostList } from './PostList';

const COUNT = 3;

// the newest posts on the home page, in the same cards as /blog
export async function LatestPosts() {
  const posts = (await getPosts()).slice(0, COUNT);
  return (
    <section aria-labelledby="blog-heading" className="px-edge pb-[18vh]">
      <div className="mx-auto flex max-w-page flex-col gap-14">
        <header className="flex items-end justify-between gap-6 border-b border-line pb-10">
          <GlitchText as="h2" id="blog-heading" className="cursor-default text-display font-medium text-fg">
            {BLOG_COPY.title}
          </GlitchText>
          <Link href="/blog" className={cn('group text-small uppercase', QUIET_LINK)}>
            {BLOG_COPY.allPosts}{' '}
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 ease-out-quint group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </header>
        {posts.length > 0 ? <PostList posts={posts} /> : <EmptyState />}
      </div>
    </section>
  );
}
