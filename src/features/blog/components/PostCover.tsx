import Image from 'next/image';
import { cn } from '@/lib/cn';
import { DitherCover } from '../cover';

type PostCoverProps = {
  slug: string;
  src?: string;
  alt: string;
  priority?: boolean;
  sizes: string;
  glitchOnHover?: boolean;
  framed?: boolean;
  className?: string;
};

export function PostCover({
  slug,
  src,
  alt,
  priority = false,
  sizes,
  glitchOnHover,
  framed = false,
  className,
}: PostCoverProps) {
  return (
    <div
      className={cn(
        'relative aspect-[16/10] overflow-hidden border border-line',
        framed && 'bracket-frame overflow-visible before:z-10 after:z-10',
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="object-cover"
        />
      ) : (
        <DitherCover slug={slug} glitchOnHover={glitchOnHover} className="absolute inset-0 h-full" />
      )}
    </div>
  );
}
