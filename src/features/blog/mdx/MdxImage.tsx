import Image from 'next/image';
import type { ComponentPropsWithoutRef } from 'react';

export function MdxImage({ src, alt = '', title }: ComponentPropsWithoutRef<'img'>) {
  if (typeof src !== 'string') return null;
  const img = src.startsWith('/') ? (
    <Image
      src={src}
      alt={alt}
      width={0}
      height={0}
      sizes="(min-width: 736px) 46rem, 100vw"
      className="h-auto w-full"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- remote host unknown to next/image config
    <img src={src} alt={alt} loading="lazy" className="h-auto w-full" />
  );
  return (
    <figure className="my-2 flex flex-col gap-3">
      <span className="block border border-line">{img}</span>
      {title && <figcaption className="text-small text-fg-faint">{title}</figcaption>}
    </figure>
  );
}
