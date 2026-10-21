const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 10 * 60 * 1000;

// for images the server fetched: a day in browsers, a month on the CDN, and an old copy while it refreshes
export const IMAGE_CACHE_CONTROL = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400';

// Memoizes `load` per key for a day on this server instance (the CDN keeps responses longer), but retries
// an empty result (a timeout, a hiccup) after a few minutes, and a failed one on the next call.
export function dailyCache<T>(load: (key: string) => Promise<T>, isEmpty: (value: T) => boolean) {
  const entries = new Map<string, { until: number; value: Promise<T> }>();
  return (key: string): Promise<T> => {
    const hit = entries.get(key);
    if (hit && Date.now() < hit.until) return hit.value;
    const value = load(key);
    const entry = { until: Date.now() + DAY_MS, value };
    entries.set(key, entry);
    value.then(
      (v) => {
        if (isEmpty(v)) entry.until = Date.now() + RETRY_MS;
      },
      () => entries.delete(key),
    );
    return value;
  };
}
