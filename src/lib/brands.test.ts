import { expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { getKnowledge } from '@/features/chat/knowledge';
import { iconFor } from './brands';
import { glossary } from './glossary';
import { NO_ICON } from './terms.mjs';

test("links to sites with a logo show it; every other link shows its site's favicon", async () => {
  const { links } = await getKnowledge();
  expect(Object.entries(links.hrefs).filter(([, icon]) => !icon)).toEqual([]);
  expect(iconFor('https://github.com/nithin2803')).toEqual(
    glossary.terms.find((t) => t.id === 'github')!.icon!,
  );
  expect(iconFor('https://directoryyy.com/')).toEqual({ kind: 'favicon', site: 'directoryyy.com' });
  // Maps links borrow maps.google.com's pin instead of Google's G
  expect(iconFor('https://www.google.com/maps/place/x')).toEqual({
    kind: 'favicon',
    site: 'maps.google.com',
  });
});

test('every [Name](@id) marker in content/ is a glossary term', () => {
  const files = ['content/chat', 'content/blog'].flatMap((d) =>
    fs.readdirSync(path.join(process.cwd(), d)).map((f) => path.join(process.cwd(), d, f)),
  );
  const ids = new Set([...glossary.terms.map((t) => t.id), NO_ICON]);
  const used = files.flatMap((f) =>
    [...fs.readFileSync(f, 'utf8').matchAll(/\]\(@([^)\s]*)\)/g)].map((m) => `${path.basename(f)}: @${m[1]}`),
  );
  expect(used.filter((u) => !ids.has(u.split('@').at(-1)!))).toEqual([]);
});
