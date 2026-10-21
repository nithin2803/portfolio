import { expect, test } from 'bun:test';
import { ReplyFilter } from './replyFilter';

// streams `reply` in small chunks, the way the model does, so markers get split across deltas
function run(reply: string, size = 3) {
  let shown = '';
  const filter = new ReplyFilter((t) => (shown += t));
  for (let i = 0; i < reply.length; i += size) filter.push(reply.slice(i, i + size));
  return { shown, ...filter.finish() };
}

test('holds back the SOURCES and FOLLOWUPS lines', () => {
  const r = run('SOURCES: work, eval-infra\nI build eval infra.\n\nFOLLOWUPS: inference | favorite-project');
  expect(r.shown).toBe('I build eval infra.\n\n');
  expect(r.sources).toEqual(['work', 'eval-infra']);
  expect(r.followUps).toEqual(['inference', 'favorite-project']);
  expect(r.refused).toBe(false);
});

test('tolerates bracketed ids and odd spacing', () => {
  const r = run('  sources : [work] | [about-me]\nHi.\nFOLLOWUPS: [work], "school".');
  expect(r.sources).toEqual(['work', 'about-me']);
  expect(r.followUps).toEqual(['work', 'school']);
  expect(r.shown).toBe('Hi.\n');
});

test('SOURCES: NONE shows nothing and is not a refusal', () => {
  const r = run('SOURCES: NONE\nWell, I think dogs are great.');
  expect(r.shown).toBe('');
  expect(r.sources).toEqual([]);
  expect(r.refused).toBe(false);
});

test('OUT_OF_SCOPE after a SOURCES line still refuses', () => {
  const r = run('SOURCES: about-me\nOUT_OF_SCOPE');
  expect(r.shown).toBe('');
  expect(r.refused).toBe(true);
});

test('a reply without a SOURCES line still streams', () => {
  const r = run('I build eval infra.\nFOLLOWUPS: work');
  expect(r.shown).toBe('I build eval infra.\n');
  expect(r.sources).toBeUndefined();
  expect(r.followUps).toEqual(['work']);
});

test('an empty reply is a refusal', () => {
  expect(run('').refused).toBe(true);
});
