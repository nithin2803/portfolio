// Per-instance memory: fine for very low traffic; move to a shared store (e.g. Vercel KV) if it grows.
import { CHAT_BUDGET } from './nythos';

const WINDOWS = [
  { ms: 60_000, max: 8 },
  { ms: 60 * 60_000, max: 60 },
  { ms: 24 * 60 * 60_000, max: 100 },
] as const;
const LONGEST = WINDOWS[WINDOWS.length - 1].ms;
const MAX_KEYS = 10_000;

const hits = new Map<string, number[]>();

export function rateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < LONGEST);
  const limited = WINDOWS.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max);
  if (!limited) recent.push(now);
  hits.delete(key);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value!);
  return limited;
}

const today = () => new Date().toISOString().slice(0, 10);
let spend = { day: today(), usd: 0 };

export function overBudget(): boolean {
  if (spend.day !== today()) spend = { day: today(), usd: 0 };
  return spend.usd >= CHAT_BUDGET.dailySpendUsd;
}

export function recordSpend(usd: number) {
  if (spend.day !== today()) spend = { day: today(), usd: 0 };
  spend.usd += Math.max(0, usd);
}
