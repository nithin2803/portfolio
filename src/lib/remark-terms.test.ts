import { compile } from '@mdx-js/mdx';
import { expect, test } from 'bun:test';
import remarkTerms from './remark-terms.mjs';

const terms = async (mdx: string) => {
  const js = String(await compile(mdx, { remarkPlugins: [remarkTerms] }));
  return [...js.matchAll(/_jsx\(Term, \{\s*id: "([^"]+)",\s*children: "([^"]+)"/g)].map(
    (m) => `${m[2]}@${m[1]}`,
  );
};

test('posts get the same names, markers and first-mention rule as the chat', async () => {
  expect(await terms('Built on Next.js and Next.js again, with nythos-6.')).toEqual([
    'Next.js@nextjs',
    'nythos-6@nythos-6',
  ]);
  expect(await terms('Go Dawgs. I rewrote it in [Go](@go).')).toEqual(['Go@go']);
  expect(await terms('[Iceland](@-) first, then Iceland.')).toEqual(['Iceland@iceland']);
});

test('names in code and headings stay plain, and a name gets one icon per post', async () => {
  expect(await terms('`Next.js`\n\n## Next.js\n\nNext.js\n\n## More\n\nNext.js')).toEqual(['Next.js@nextjs']);
});

test('a marker with an unknown id fails the build', async () => {
  expect(terms('[Rust](@rust)')).rejects.toThrow('no term "rust"');
});
