// Bun has no MDX loader, so tests that load blog posts would get an empty module. For tests a post
// only needs its `meta`: keep that export and stand in a null component for the body.
import { plugin } from 'bun';

const META = /export const meta\s*=\s*\{[\s\S]*?\n\};?/;

plugin({
  name: 'mdx-meta',
  setup(build) {
    build.onLoad({ filter: /\.mdx$/ }, async ({ path }) => {
      const meta = (await Bun.file(path).text()).match(META)?.[0] ?? '';
      return { contents: `${meta}\nexport default function Post() { return null; }`, loader: 'js' };
    });
  },
});
