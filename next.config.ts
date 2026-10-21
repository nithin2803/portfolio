import path from 'node:path';
import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // .mdx files can be imported (blog posts live in content/blog)
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  outputFileTracingIncludes: {
    '/api/chat': ['./content/chat/**', './content/blog/**'],
    // which sites it may fetch favicons for comes from the content's links
    '/api/favicon/[site]': ['./content/chat/**', './content/blog/**'],
    // previews are only for links in blog posts
    '/api/preview': ['./content/blog/**'],
    '/api/preview/image': ['./content/blog/**'],
  },
  turbopack: {
    rules: {
      // Tailwind v4 runs as a Turbopack loader over every stylesheet
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
};

// GitHub-flavoured Markdown (~~strikethrough~~, tables), and glossary names in posts get their icons (see
// content/icons.yaml); plugins go by name or path for Turbopack
const withMDX = createMDX({
  options: { remarkPlugins: ['remark-gfm', path.join(process.cwd(), 'src/lib/remark-terms.mjs')] },
});

export default withMDX(nextConfig);
