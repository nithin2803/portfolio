import { TextLink } from '@/components/ui';
import { BLOG_COPY } from '../content';
import { formatDate } from '../format';
import type { PostSummary } from '../types';
import { PostCover } from './PostCover';
import { PostTags } from './PostTags';

export function PostHeader({ post }: { post: PostSummary }) {
  return (
    <header className="flex flex-col gap-8">
      <TextLink href="/blog" quiet className="self-start text-small uppercase">
        <span aria-hidden="true">&larr; </span>
        {BLOG_COPY.allPosts}
      </TextLink>
      {/* only a post's own cover, never a generated one */}
      {post.cover && (
        <PostCover
          slug={post.slug}
          src={post.cover}
          alt=""
          priority
          sizes="(min-width: 736px) 46rem, 100vw"
          framed
        />
      )}
      <div className="flex flex-col gap-4">
        <h1 className="text-display font-medium text-fg">{post.title}</h1>
        <p className="flex flex-wrap gap-x-2 text-small text-fg-faint tabular-nums">
          {post.draft && <span className="text-fringe-r">{BLOG_COPY.draft} ·</span>}
          <span>{formatDate(post.date)}</span>
          <span aria-hidden="true">·</span>
          <span>{BLOG_COPY.readingTime(post.readingTime)}</span>
        </p>
        <PostTags tags={post.tags} />
      </div>
    </header>
  );
}
