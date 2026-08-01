import { createHash } from 'crypto';

interface CacheEntry {
  body: unknown;
  etag: string;
  cacheControl: string;
  storedAt: number;
  maxAgeMs: number;
}

const store = new Map<string, CacheEntry>();

function parseMaxAgeMs(cacheControl: string): number {
  const match = /max-age=(\d+)/.exec(cacheControl);
  if (!match) return Infinity;
  return parseInt(match[1], 10) * 1000;
}

export function makeCacheKey(namespace: string, params: Record<string, string | undefined>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k] ?? ''}`)
    .join('&');
  return `${namespace}:${sorted}`;
}

export function computeEtag(body: unknown): string {
  const hash = createHash('sha1')
    .update(JSON.stringify(body))
    .digest('hex')
    .slice(0, 16);
  return `"${hash}"`;
}

export function getCached(key: string): CacheEntry | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  // Intentional mutation-on-read: evict expired entries lazily rather than via a background sweep timer.
  if (Date.now() - entry.storedAt > entry.maxAgeMs) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

export function setCached(key: string, body: unknown, cacheControl: string): CacheEntry {
  const etag = computeEtag(body);
  const entry: CacheEntry = { body, etag, cacheControl, storedAt: Date.now(), maxAgeMs: parseMaxAgeMs(cacheControl) };
  store.set(key, entry);
  return entry;
}

export function clearCache(): void {
  store.clear();
}
