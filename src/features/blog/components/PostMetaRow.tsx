import { cn } from '@/lib/cn';
import { BLOG_COPY } from '../content';
import { formatDate } from '../format';
import type { PostSummary } from '../types';

type PostMetaRowProps = {
  post: Pick<PostSummary, 'date' | 'readingTime' | 'draft'>;
  className?: string;
};

// the date line on /blog's cards (a post's own header lays its meta out itself)
export function PostMetaRow({ post, className }: PostMetaRowProps) {
  const items = [
    post.draft ? BLOG_COPY.draft : null,
    formatDate(post.date),
    BLOG_COPY.readingTime(post.readingTime),
  ].filter(Boolean);

  return (
    <p className={cn('flex flex-wrap gap-x-2.5 text-small text-fg-faint uppercase tabular-nums', className)}>
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="flex gap-x-2.5">
          {i > 0 && <span aria-hidden="true">/</span>}
          <span className={cn(item === BLOG_COPY.draft && 'text-fringe-r')}>{item}</span>
        </span>
      ))}
    </p>
  );
}
