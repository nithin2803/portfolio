import type { MDXContent } from 'mdx/types';

export type PostMeta = {
  title: string;
  date: string;
  summary: string;
  tags?: string[];
  cover?: string;
  draft?: boolean;
};

export type PostSummary = PostMeta & {
  slug: string;
  readingTime: number;
};

export type Post = PostSummary & {
  Content: MDXContent;
};
