// Required by @next/mdx; the components live in features/blog/mdx.
import type { MDXComponents } from 'mdx/types';
import { mdxComponents } from '@/features/blog/mdx';

export function useMDXComponents(): MDXComponents {
  return mdxComponents;
}
