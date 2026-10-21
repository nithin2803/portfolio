import Link from 'next/link';
import type { PostSummary } from '../types';
import { PostCover } from './PostCover';
import { PostMetaRow } from './PostMetaRow';
import { PostTags } from './PostTags';

export function PostCard({ post, priority = false }: { post: PostSummary; priority?: boolean }) {
  return (
    // a panel in the site's bracket frame that brightens on hover, so it reads as something to open
    <Link
      href={`/blog/${post.slug}`}
      className="group bracket-frame flex h-full flex-col gap-4 border border-line bg-white/[0.02] p-5 transition-colors duration-300 outline-none hover:border-line-strong/50 hover:bg-white/[0.045] focus-visible:border-line-strong/50 focus-visible:bg-white/[0.045]"
    >
      {/* only a post's own cover, like its header */}
      {post.cover && (
        <PostCover
          slug={post.slug}
          src={post.cover}
          alt=""
          priority={priority}
          sizes="(min-width: 1024px) 24rem, (min-width: 768px) 50vw, 100vw"
          glitchOnHover
          framed
          className="transition-colors duration-300 group-hover:border-line-strong group-focus-visible:border-line-strong"
        />
      )}
      <div className="flex flex-1 flex-col gap-2">
        <PostMetaRow post={post} />
        <h2 className="text-body font-medium text-fg transition-colors group-hover:text-white">
          {post.title}
        </h2>
        <p className="text-chat text-fg-muted">{post.summary}</p>
      </div>
      <div className="flex items-end justify-between gap-4">
        <PostTags tags={post.tags} />
        <span
          aria-hidden="true"
          className="ml-auto text-fg-faint transition-[translate,color] duration-300 ease-out-quint group-hover:translate-x-0.5 group-hover:text-white group-focus-visible:translate-x-0.5 group-focus-visible:text-white"
        >
          →
        </span>
      </div>
    </Link>
  );
}
