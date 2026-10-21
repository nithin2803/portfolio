import { expect, test } from 'bun:test';
import fs from 'node:fs';
import {
  buildGlossary,
  contentHash,
  corpus,
  JSON_PATH,
  readIconsFile,
  serialize,
  thesvgIndex,
  wordRe,
} from '../../scripts/glossary';

test('glossary.generated.json is up to date with content/icons.yaml (run `bun run icons`)', async () => {
  // building also validates every entry: one emoji, a real thesvg slug, an existing image, a place to search
  expect(fs.readFileSync(JSON_PATH, 'utf8')).toBe(serialize(await buildGlossary()));
});

const docs = corpus();
const text = docs.map((d) => d.text).join('\n');
// anywhere in a file, links included: a name the chat model may still write plainly
const raw = docs.map((d) => d.raw).join('\n');
const file = readIconsFile();
const known = new Set([
  ...Object.entries(file.terms).flatMap(([n, d]) => [n, ...(typeof d === 'string' ? [] : (d.aliases ?? []))]),
  ...(file.ignore ?? []),
  ...Object.keys(file.skipped ?? {}),
]);

test('every glossary name is used somewhere (or only gives links to its sites their icon)', () => {
  const unused = Object.entries(file.terms)
    .filter(([, d]) => typeof d === 'string' || (d.auto !== false && !d.sites?.length))
    .map(([name, d]) => [name, ...(typeof d === 'string' ? [] : (d.aliases ?? []))])
    .filter((names) => !names.some((n) => wordRe(n).test(raw)))
    .map(([name]) => name);
  expect(unused).toEqual([]);
});

test('every brand thesvg knows that content/ names has an icon, or is ignored or skipped', () => {
  const missed = thesvgIndex()
    .flatMap((b) => b.names)
    .filter(
      (n) => n.length > 1 && /\p{Lu}/u.test(n) && !known.has(n) && text.includes(n) && wordRe(n).test(text),
    );
  expect([...new Set(missed)].sort()).toEqual([]);
});

test('content/ changed since the last `bun run icons --suggest`', () => {
  if (file.suggested !== contentHash())
    console.warn(
      'content/ changed since `bun run icons --suggest` last ran: run it to find new names worth an icon',
    );
});
