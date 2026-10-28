// Server-only: Upstash Redis over its REST API, so a serverless function needs no connection to keep. Set up through
// the Vercel Marketplace, which adds the URL and token as UPSTASH_REDIS_REST_* or KV_REST_API_* env vars, the latter
// with whatever prefix was picked when connecting it (this project's is REDIS_).

// a slow Redis shouldn't hold up a chat: callers fall back to memory instead
const TIMEOUT_MS = 1000;

function config() {
  const env = process.env;
  const url = env.UPSTASH_REDIS_REST_URL || env.REDIS_KV_REST_API_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.REDIS_KV_REST_API_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export const redisConfigured = () => Boolean(config());

type Reply = { result?: unknown; error?: string };

// several commands in one round trip, their results in order; throws if any fails
export async function pipeline(commands: readonly (readonly (string | number)[])[]): Promise<unknown[]> {
  const c = config();
  if (!c) throw new Error('Redis is not configured');
  const res = await fetch(`${c.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands.map((command) => command.map(String))),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const replies = (await res.json()) as Reply[];
  const failed = replies.find((r) => r.error);
  if (failed) throw new Error(`Redis: ${failed.error}`);
  return replies.map((r) => r.result);
}
