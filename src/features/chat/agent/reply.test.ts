import { expect, test } from 'bun:test';
import { facetIndex, partialMessages, ReplyStream, replySchema, tappedFacet } from './reply';

const FACETS = [
  { id: 'Orbi #1', section: 'Orbi' },
  { id: 'Orbi #2', section: 'Orbi' },
  { id: 'Orbi #3', section: 'Orbi' },
  { id: 'Nitix #1', section: 'Nitix' },
  { id: 'Nitix #2', section: 'Nitix' },
  { id: 'Background #1', section: 'Background' },
];

// streams `reply` in small chunks, the way the model does, so strings and escapes get split across deltas
function run(reply: unknown, size = 3, covered: string[] = []) {
  const raw = typeof reply === 'string' ? reply : JSON.stringify(reply, null, 1);
  let shown = '';
  const emitted: string[] = [];
  const stream = new ReplyStream(
    (t) => {
      shown += t;
      emitted.push(t);
    },
    facetIndex(FACETS),
    new Set(covered),
  );
  for (let i = 0; i < raw.length; i += size) stream.push(raw.slice(i, i + size));
  return { shown, emitted, ...stream.finish() };
}

test('streams each message as its own paragraph, with sources and follow-ups', () => {
  const r = run({
    refused: false,
    sources: ['me', 'partial'],
    messages: ['A compliance platform for AI agents.', 'The market was the hard part.'],
    about: ['Orbi #1'],
    followUps: [
      { question: 'Why did it stop?', facet: 'Orbi #2' },
      { question: 'YC interview?', facet: 'Orbi #3' },
    ],
  });
  expect(r.shown).toBe('A compliance platform for AI agents.\n\nThe market was the hard part.');
  expect(r.emitted.length).toBeGreaterThan(2);
  expect(r.sources).toEqual(['me', 'partial']);
  expect(r.about).toEqual(['Orbi #1']);
  expect(r.followUps.map((f) => f.question)).toEqual(['Why did it stop?', 'YC interview?']);
  expect(r.refused).toBe(false);
});

test('escapes split across chunks decode cleanly', () => {
  const r = run(
    { refused: false, sources: ['me'], messages: ['He said "hi" — I’m in \\ out'], followUps: [] },
    1,
  );
  expect(r.shown).toBe('He said "hi", I’m in \\ out');
});

test('a refusal shows nothing', () => {
  const r = run({ refused: true, sources: [], messages: [], followUps: [] });
  expect(r.shown).toBe('');
  expect(r.refused).toBe(true);
});

test('no sources shows nothing and is not a refusal', () => {
  const r = run({ refused: false, sources: [], messages: ['Dogs are great.'], followUps: [] });
  expect(r.shown).toBe('');
  expect(r.sources).toEqual([]);
  expect(r.refused).toBe(false);
});

test('sources with nothing to say counts as a refusal', () => {
  expect(run({ refused: false, sources: ['me'], messages: [''], followUps: [] }).refused).toBe(true);
});

test('a reply cut off mid-message keeps what streamed and its sources', () => {
  const r = run('{"refused": false, "sources": ["me"], "messages": ["I build eval infra", "and al');
  expect(r.shown).toBe('I build eval infra\n\nand al');
  expect(r.sources).toEqual(['me']);
  expect(r.refused).toBe(false);
  expect(r.followUps.map((f) => f.question)).toEqual([]);
});

test('partialMessages reads an unfinished array', () => {
  expect(partialMessages('{"messages": ["one", "tw')).toEqual(['one', 'tw']);
  expect(partialMessages('{"messages": ["a\\')).toEqual(['a']);
  expect(partialMessages('{"refused": false')).toEqual([]);
});

test('em dashes become commas, even split from the words around them', () => {
  const r = run(
    { refused: false, sources: ['me'], messages: ['Mostly data — then models got good'], followUps: [] },
    1,
  );
  expect(r.shown).toBe('Mostly data, then models got good');
});

test('a follow-up naming an unknown facet is dropped', () => {
  const r = run({
    refused: false,
    sources: ['me'],
    messages: ['Hi.'],
    about: ['Orbi #1'],
    followUps: [
      { question: 'Why did it stop?', facet: 'Orbi #2' },
      { question: 'Favorite movie?', facet: 'Movies #1' },
    ],
  });
  expect(r.followUps.map((f) => f.question)).toEqual(['Why did it stop?']);
});

test('follow-ups must name a facet of me.md', () => {
  const ids = FACETS.map((f) => f.id);
  const schema = replySchema(ids, ['resume']);
  expect(schema.properties.followUps.items.properties.facet.enum).toEqual(ids);
});

test('a facet named loosely still counts', () => {
  const r = run({
    refused: false,
    sources: ['me'],
    messages: ['Hi.'],
    about: ['orbi 1'],
    followUps: [{ question: 'Why did it stop?', facet: 'orbi#2' }],
  });
  expect(r.about).toEqual(['Orbi #1']);
  expect(r.followUps.map((f) => f.question)).toEqual(['Why did it stop?']);
});

test('a follow-up about another section is dropped', () => {
  const r = run({
    refused: false,
    sources: ['me'],
    messages: ['My own programming language, built the summer after high school.'],
    about: ['Nitix #1'],
    followUps: [
      { question: 'Did you learn compilers later?', facet: 'Nitix #2' },
      { question: "What's Orbi?", facet: 'Orbi #1' },
    ],
  });
  expect(r.followUps.map((f) => f.question)).toEqual(['Did you learn compilers later?']);
});

test('a follow-up that this answer or an earlier one already covered is dropped, however it is worded', () => {
  const r = run(
    {
      refused: false,
      sources: ['me'],
      messages: ['It ran out of training data.'],
      about: ['Orbi #2'],
      followUps: [
        { question: "Why'd it stop?", facet: 'Orbi #2' },
        { question: 'What was it?', facet: 'Orbi #1' },
        { question: 'Any YC luck?', facet: 'Orbi #3' },
      ],
    },
    3,
    ['Orbi #1'],
  );
  expect(r.followUps.map((f) => f.question)).toEqual(['Any YC luck?']);
});

test('two follow-ups for the same facet keep only the first', () => {
  const r = run({
    refused: false,
    sources: ['me'],
    messages: ['Hi.'],
    about: ['Orbi #1'],
    followUps: [
      { question: 'Why did it stop?', facet: 'Orbi #2' },
      { question: "Why'd it end?", facet: 'Orbi #2' },
    ],
  });
  expect(r.followUps.map((f) => f.question)).toEqual(['Why did it stop?']);
});

test('chips the model picked come through as ids', () => {
  const r = run({
    refused: false,
    sources: ['me'],
    messages: ['Hi.'],
    about: [],
    actions: ['resume', 'nope'],
    followUps: [],
  });
  expect(r.actions).toEqual(['resume', 'nope']);
});

test('a tapped follow-up brings in the held-back facet it pointed at, and only then', () => {
  const facets = [
    { id: 'Orbi #1', more: false },
    { id: 'Orbi #6', more: true },
  ];
  const answer = {
    role: 'assistant' as const,
    content: 'A codegraph.',
    offered: ['How did generics work?', 'Why did it stop?'],
    offeredFacets: ['Orbi #6', 'Orbi #1'],
  };
  const ask = (content: string) => [answer, { role: 'user' as const, content }];
  expect(tappedFacet(facets, ask('How did generics work?'))?.id).toBe('Orbi #6');
  expect(tappedFacet(facets, ask('Why did it stop?'))).toBeUndefined();
  expect(tappedFacet(facets, ask('how did generics work'))).toBeUndefined();
});
