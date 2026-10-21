import type { PostSummary } from '../types';
import { PostCard } from './PostCard';

// `priority`: the list is at the top of the page, so its first row of covers loads first
export function PostList({ posts, priority = false }: { posts: PostSummary[]; priority?: boolean }) {
  return (
    <ul className="grid gap-x-edge gap-y-14 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, i) => (
        <li key={post.slug} className="h-full">
          <PostCard post={post} priority={priority && i < 3} />
        </li>
      ))}
    </ul>
  );
}
