import { expect, test } from 'bun:test';
import { entryFor, getKnowledge } from './knowledge';

test('a question asked word for word gets its entry, ignoring case and punctuation', async () => {
  const k = await getKnowledge();
  expect(entryFor(k, 'Who are you?')?.id).toBe('about-me');
  expect(entryFor(k, '  who ARE you ')?.id).toBe('about-me');
  expect(entryFor(k, 'who are you, really?')).toBeUndefined();
});

test('reserved replies and entries with placeholders go to the model', async () => {
  const k = await getKnowledge();
  expect(entryFor(k, k.reserved.photo.question)).toBeUndefined();
  const withPlaceholder = k.entries.find((e) => e.id === 'cooking');
  if (withPlaceholder?.body.includes('[')) expect(entryFor(k, withPlaceholder.question)).toBeUndefined();
});

test('every action is an allowlisted link', async () => {
  const k = await getKnowledge();
  const bad = k.entries.flatMap((e) => e.actions.filter((a) => !(a.href in k.links.hrefs)));
  expect(bad).toEqual([]);
});
