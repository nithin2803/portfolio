import { afterEach, expect, test } from 'bun:test';
import { admit, admitInMemory, recordSpend } from './guards';

const realFetch = globalThis.fetch;
const env = { ...process.env };
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...env };
});

const MINUTE = 60_000;

test('a visitor gets a burst of 8, then one more a minute', () => {
  const t = 1_000_000;
  const sent = Array.from({ length: 9 }, () => admitInMemory('burst', t).limited);
  expect(sent).toEqual([false, false, false, false, false, false, false, false, true]);
  expect(admitInMemory('burst', t + MINUTE / 2).limited).toBe(true);
  expect(admitInMemory('burst', t + MINUTE).limited).toBe(false);
  expect(admitInMemory('burst', t + MINUTE + 1).limited).toBe(true);
});

test('visitors have their own buckets', () => {
  for (let i = 0; i < 8; i++) admitInMemory('a', 0);
  expect(admitInMemory('a', 0).limited).toBe(true);
  expect(admitInMemory('b', 0).limited).toBe(false);
});

test('no more than 100 a day, however slowly they come', () => {
  const day = Date.UTC(2026, 9, 28);
  let allowed = 0;
  for (let i = 0; i < 120; i++) if (!admitInMemory('steady', day + i * MINUTE).limited) allowed++;
  expect(allowed).toBe(100);
  expect(admitInMemory('steady', day + 24 * 60 * MINUTE).limited).toBe(false);
});

function redisReturning(replies: unknown[]) {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  const calls: { url: string; body: string[][] }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return Response.json(replies);
  }) as typeof fetch;
  return calls;
}

test('with Redis, one round trip answers both the rate limit and the budget', async () => {
  const calls = redisReturning([{ result: 0 }, { result: '1.25' }]);
  expect(await admit('203.0.113.7')).toEqual({ limited: false, overBudget: true });
  expect(calls).toHaveLength(1);
  expect(calls[0].url).toBe('https://redis.test/pipeline');
  const [evalCmd, getCmd] = calls[0].body;
  expect(evalCmd[0]).toBe('EVAL');
  expect(evalCmd.join(' ')).not.toContain('203.0.113.7');
  expect(getCmd[0]).toBe('GET');
});

test('Redis saying no limits the visitor', async () => {
  redisReturning([{ result: 1 }, { result: null }]);
  expect(await admit('198.51.100.1')).toEqual({ limited: true, overBudget: false });
});

test('a failing Redis falls back to memory instead of blocking the chat', async () => {
  redisReturning([{ error: 'ERR something' }, { result: null }]);
  expect((await admit('fallback')).limited).toBe(false);
});

test('spend is added to the shared counter, and nothing is sent for a free reply', async () => {
  const calls = redisReturning([{ result: '0.002' }, { result: 1 }]);
  await recordSpend(0);
  expect(calls).toHaveLength(0);
  await recordSpend(0.002);
  expect(calls[0].body.map((c) => c[0])).toEqual(['INCRBYFLOAT', 'EXPIRE']);
});
