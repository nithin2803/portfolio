import { expect, test } from 'bun:test';
import { cannedFor, getKnowledge, parseFacets } from './knowledge';

test('the opener asked word for word gets its canned reply, ignoring case and punctuation', async () => {
  const k = await getKnowledge();
  expect(cannedFor(k, 'Who are you?')).toBe(k.reserved['about-me']);
  expect(cannedFor(k, '  who ARE you ')).toBe(k.reserved['about-me']);
  expect(cannedFor(k, 'who are you, really?')).toBeUndefined();
});

test('everything else goes to the model', async () => {
  const k = await getKnowledge();
  expect(cannedFor(k, k.reserved.photo.question)).toBeUndefined();
  expect(cannedFor(k, 'What do you work on?')).toBeUndefined();
});

test('every action is an allowlisted link', async () => {
  const k = await getKnowledge();
  const actions = [...Object.values(k.chips), ...Object.values(k.reserved).flatMap((f) => f.actions)];
  expect(actions.filter((a) => !(a.href in k.links.hrefs))).toEqual([]);
});

test('me.md splits into facets: each paragraph or bullet under the nearest heading', () => {
  const { prompt, facets } = parseFacets(
    [
      '# Projects',
      '',
      '## Orbi',
      '',
      'What it was.',
      'Still the same paragraph.',
      '',
      'Why it ended.',
      '',
      '## Rapid Fire',
      '',
      '- **Coffee:** black.',
      '- **Food:** ribeye.',
    ].join('\n'),
  );
  expect(facets.map((f) => [f.id, f.section, f.text])).toEqual([
    ['Orbi #1', 'Orbi', 'What it was. Still the same paragraph.'],
    ['Orbi #2', 'Orbi', 'Why it ended.'],
    ['Rapid Fire #1', 'Rapid Fire', '**Coffee:** black.'],
    ['Rapid Fire #2', 'Rapid Fire', '**Food:** ribeye.'],
  ]);
  expect(prompt).toContain('[Orbi #2] Why it ended.');
});

test('every section of me.md has a name of its own', async () => {
  expect(() => parseFacets('## Orbi\n\nOne.\n\n## Orbi\n\nTwo.')).toThrow('two headings');
  const { me } = await getKnowledge();
  expect(me.facets.length).toBeGreaterThan(0);
});

test('facets after <!-- more --> are held back, shown to the model as a teaser', () => {
  const { prompt, facets } = parseFacets(
    [
      '## Orbi',
      '',
      'What it was.',
      '',
      '<!-- more -->',
      '',
      'How the compiler handled generics across files in one call.',
      '',
      '## Nitix',
      '',
      'A language.',
    ].join('\n'),
  );
  expect(facets.map((f) => [f.id, f.more])).toEqual([
    ['Orbi #1', false],
    ['Orbi #2', true],
    ['Nitix #1', false],
  ]);
  expect(prompt).toContain('[Orbi #2] (more) How the compiler handled generics across files in…');
  expect(prompt).not.toContain('one call');
});
