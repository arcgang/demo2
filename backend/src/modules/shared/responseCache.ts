import { createHash } from 'crypto';

interface CacheEntry {
  body: unknown;
  etag: string;
  cacheControl: string;
}

const store = new Map<string, CacheEntry>();

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
  return store.get(key);
}

export function setCached(key: string, body: unknown, cacheControl: string): CacheEntry {
  const etag = computeEtag(body);
  const entry: CacheEntry = { body, etag, cacheControl };
  store.set(key, entry);
  return entry;
}

export function clearCache(): void {
  store.clear();
}
