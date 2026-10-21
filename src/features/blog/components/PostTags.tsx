import { cn } from '@/lib/cn';

export function PostTags({ tags, className }: { tags?: readonly string[]; className?: string }) {
  if (!tags?.length) return null;
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag} className="border border-line bg-white/[0.04] px-2 py-0.5 text-small text-fg-muted">
          {tag}
        </li>
      ))}
    </ul>
  );
}
