// Server-only: per-visitor rate limits and the daily spend budget, shared by every server instance through Redis
// (lib/redis.ts). Without Redis, or while it's failing, each instance keeps its own in memory instead.
import { createHash } from 'node:crypto';
import { pipeline, redisConfigured } from '@/lib/redis';
import { CHAT_BUDGET } from './nythos';

// a token bucket per visitor: a burst of BURST messages, then one more every REFILL_MS (60 an hour), and at most
// DAILY_MAX in a day
const BURST = 8;
const REFILL_MS = 60_000;
const DAILY_MAX = 100;
// counters outlive their day so a late request near midnight still finds them
const DAY_TTL_S = 2 * 24 * 60 * 60;
const MAX_VISITORS = 10_000;

// atomic in Redis, so two messages at once can't both take the last token
const BUCKET = `
local now, burst, refill, daily_max, day_ttl = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]), tonumber(ARGV[5])
local b = redis.call('HMGET', KEYS[1], 'tokens', 'at')
local tokens = math.min(burst, (tonumber(b[1]) or burst) + (now - (tonumber(b[2]) or now)) / refill)
local sent = tonumber(redis.call('GET', KEYS[2]) or '0')
local limited = tokens < 1 or sent >= daily_max
if not limited then
  tokens = tokens - 1
  redis.call('INCR', KEYS[2])
  redis.call('EXPIRE', KEYS[2], day_ttl)
end
redis.call('HSET', KEYS[1], 'tokens', tostring(tokens), 'at', tostring(now))
redis.call('PEXPIRE', KEYS[1], math.ceil(burst * refill))
if limited then return 1 end
return 0`;

const today = () => new Date().toISOString().slice(0, 10);
// keys hold a hash of the visitor's address, never the address itself
const visitorId = (key: string) => createHash('sha256').update(key).digest('hex').slice(0, 16);
const spendKey = () => `chat:spend:${today()}`;

export type Admission = { limited: boolean; overBudget: boolean };

// whether this visitor may send another message, and whether today's budget is spent, in one round trip
export async function admit(visitor: string, now = Date.now()): Promise<Admission> {
  if (!redisConfigured()) return admitInMemory(visitor, now);
  const id = visitorId(visitor);
  const started = performance.now();
  try {
    const [limited, spent] = await pipeline([
      [
        'EVAL',
        BUCKET,
        2,
        `chat:bucket:${id}`,
        `chat:sent:${id}:${today()}`,
        now,
        BURST,
        REFILL_MS,
        DAILY_MAX,
        DAY_TTL_S,
      ],
      ['GET', spendKey()],
    ]);
    console.info(`[chat] guards: redis ${Math.round(performance.now() - started)}ms`);
    return { limited: Number(limited) === 1, overBudget: Number(spent ?? 0) >= CHAT_BUDGET.dailySpendUsd };
  } catch (err) {
    console.error('[chat] guards: redis failed, using memory:', err instanceof Error ? err.message : err);
    return admitInMemory(visitor, now);
  }
}

export async function recordSpend(usd: number) {
  const amount = Math.max(0, usd);
  if (!amount) return;
  spendInMemory(amount);
  if (!redisConfigured()) return;
  try {
    await pipeline([
      ['INCRBYFLOAT', spendKey(), amount],
      ['EXPIRE', spendKey(), DAY_TTL_S],
    ]);
  } catch (err) {
    console.error('[chat] guards: recording spend failed:', err instanceof Error ? err.message : err);
  }
}

// the same rules in this instance's memory, for when Redis isn't there

type Bucket = { tokens: number; at: number; day: string; sent: number };
const buckets = new Map<string, Bucket>();
let spend = { day: today(), usd: 0 };

export function admitInMemory(visitor: string, now = Date.now()): Admission {
  const day = new Date(now).toISOString().slice(0, 10);
  const prev = buckets.get(visitor);
  const b: Bucket = prev
    ? {
        tokens: Math.min(BURST, prev.tokens + (now - prev.at) / REFILL_MS),
        at: now,
        day,
        sent: prev.day === day ? prev.sent : 0,
      }
    : { tokens: BURST, at: now, day, sent: 0 };
  const limited = b.tokens < 1 || b.sent >= DAILY_MAX;
  if (!limited) {
    b.tokens -= 1;
    b.sent += 1;
  }
  buckets.delete(visitor);
  buckets.set(visitor, b);
  if (buckets.size > MAX_VISITORS) buckets.delete(buckets.keys().next().value!);
  if (spend.day !== today()) spend = { day: today(), usd: 0 };
  return { limited, overBudget: spend.usd >= CHAT_BUDGET.dailySpendUsd };
}

function spendInMemory(usd: number) {
  if (spend.day !== today()) spend = { day: today(), usd: 0 };
  spend.usd += usd;
}
