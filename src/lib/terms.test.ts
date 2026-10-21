import { expect, test } from 'bun:test';
import { annotate } from './terms.mjs';

const TERMS = [
  { id: 'glacier', names: ['glacier'] },
  { id: 'glacier-hiking', names: ['glacier hiking'] },
  { id: 'nextjs', names: ['Next.js', 'NextJS'] },
  { id: 'x', names: ['X'], auto: false },
];
const ids = (text: string, seen = new Set<string>()) =>
  annotate(text, TERMS, seen).flatMap((s) => s.id ?? []);

test('the longest name wins', () => {
  expect(ids('I tried glacier hiking')).toEqual(['glacier-hiking']);
});

test('whole words, exact case', () => {
  expect(ids('built on Next.js.')).toEqual(['nextjs']);
  expect(ids('next.js and nextjs and Next.jsx and a.Next.js')).toEqual([]);
});

test('only the first mention gets an icon, across calls too', () => {
  const seen = new Set<string>();
  expect(annotate('Next.js, then NextJS', TERMS, seen).filter((s) => s.id)).toEqual([
    { text: 'Next.js', id: 'nextjs' },
  ]);
  expect(ids('Next.js again', seen)).toEqual([]);
});

test('auto: false names only come from markup', () => {
  expect(ids('a post on X')).toEqual([]);
});

test('the text is kept exactly', () => {
  const text = 'From glacier hiking to Next.js, and back.';
  expect(
    annotate(text, TERMS, new Set())
      .map((s) => s.text)
      .join(''),
  ).toBe(text);
});
