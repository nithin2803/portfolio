import { expect, test } from 'bun:test';
import { partialMessages, ReplyStream, replySchema } from './reply';

// streams `reply` in small chunks, the way the model does, so strings and escapes get split across deltas
function run(reply: unknown, size = 3) {
  const raw = typeof reply === 'string' ? reply : JSON.stringify(reply, null, 1);
  let shown = '';
  const emitted: string[] = [];
  const stream = new ReplyStream((t) => {
    shown += t;
    emitted.push(t);
  });
  for (let i = 0; i < raw.length; i += size) stream.push(raw.slice(i, i + size));
  return { shown, emitted, ...stream.finish() };
}

test('streams each message as its own paragraph, with sources and follow-ups', () => {
  const r = run({
    refused: false,
    sources: ['me', 'partial'],
    messages: ['A compliance platform for AI agents.', 'The market was the hard part.'],
    followUps: ['What is Orbi?', 'Why Paxos, of all things?'],
  });
  expect(r.shown).toBe('A compliance platform for AI agents.\n\nThe market was the hard part.');
  expect(r.emitted.length).toBeGreaterThan(2);
  expect(r.sources).toEqual(['me', 'partial']);
  expect(r.followUps).toEqual(['What is Orbi?', 'Why Paxos, of all things?']);
  expect(r.refused).toBe(false);
});

test('escapes split across chunks decode cleanly', () => {
  const r = run(
    { refused: false, sources: ['me'], messages: ['He said "hi" — I’m in \\ out'], followUps: [] },
    1,
  );
  expect(r.shown).toBe('He said "hi" — I’m in \\ out');
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
  expect(r.followUps).toEqual([]);
});

test('partialMessages reads an unfinished array', () => {
  expect(partialMessages('{"messages": ["one", "tw')).toEqual(['one', 'tw']);
  expect(partialMessages('{"messages": ["a\\')).toEqual(['a']);
  expect(partialMessages('{"refused": false')).toEqual([]);
});

test('follow-ups are held to the given questions', () => {
  const schema = replySchema(['What is Orbi?', 'Where are you from?']);
  expect(schema.properties.followUps.items.enum).toEqual(['What is Orbi?', 'Where are you from?']);
});
