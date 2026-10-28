import { expect, test } from 'bun:test';
import { cannedFor, getKnowledge } from './knowledge';

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
  const actions = [k.me, ...Object.values(k.reserved)].flatMap((f) => f.actions);
  expect(actions.filter((a) => !(a.href in k.links.hrefs))).toEqual([]);
});
